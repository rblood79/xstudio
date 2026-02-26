/**
 * XStudio ↔ Dropflow Fork Adapter
 *
 * XStudio의 Element/ComputedLayout 인터페이스와
 * Dropflow Fork의 Box/BoxArea/Layout 인터페이스를 연결하는 어댑터.
 *
 * Phase 3에서 BlockEngine을 Dropflow Fork로 교체할 때 사용.
 *
 * @since Phase 3 준비
 */

import { Style, EMPTY_STYLE } from '../style.js';
import { BoxArea, Layout, FormattingBox, prelayout, postlayout } from '../layout-box.js';
import type { InlineLevel } from '../layout-box.js';
import {
  BlockFormattingContext,
  BlockContainerOfBlocks,
  BlockContainerOfInlines,
  ReplacedBox,
  Inline,
  layoutBlockLevelBox,
} from '../layout-flow.js';

import type { ImageDimensions } from '../types.js';
import type { BlockContainer, BlockLevel, LayoutContext } from '../layout-flow.js';

// ---------------------------------------------------------------------------
// XStudio 타입 (apps/builder 의존 없이 재정의)
// ---------------------------------------------------------------------------

/**
 * XStudio Element의 최소 인터페이스
 *
 * apps/builder/src/types/builder/unified.types.ts의 Element에서
 * 레이아웃에 필요한 필드만 추출.
 */
export interface XElement {
  id: string;
  tag: string;
  props: Record<string, unknown>;
  parent_id?: string | null;
  order_num?: number;
}

/**
 * XStudio 레이아웃 결과 (기존 ComputedLayout과 호환)
 *
 * apps/builder/src/builder/workspace/canvas/layout/engines/LayoutEngine.ts의
 * ComputedLayout과 1:1 대응.
 */
export interface XComputedLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  elementId: string;
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
    collapsedTop?: number;
    collapsedBottom?: number;
  };
}

/**
 * XStudio 레이아웃 컨텍스트 (기존 LayoutContext와 호환)
 */
export interface XLayoutContext {
  bfcId: string;
  prevSiblingMarginBottom?: number;
  parentMarginCollapse?: boolean;
  viewportWidth?: number;
  viewportHeight?: number;
  parentDisplay?: string;
}

// ---------------------------------------------------------------------------
// Element → Style 변환
// ---------------------------------------------------------------------------

/**
 * XStudio Element의 inline style을 Dropflow Style로 변환
 *
 * 기존 BlockEngine의 parseMargin/parsePadding/parseBorder/parseBoxModel을
 * Dropflow Style 생성자로 대체.
 *
 * CSS 단위 지원: px, %, vh, vw (calc() 미지원 — auto 폴백)
 * min/max constraints: minWidth, maxWidth, minHeight, maxHeight
 */
export function elementStyleToDropflowStyle(
  element: XElement,
  _parentStyle?: Style,
): Style {
  const raw = element.props?.style as Record<string, unknown> | undefined;
  if (!raw) return EMPTY_STYLE;

  // 레이아웃에 영향을 주는 핵심 CSS 속성을 Dropflow Style로 변환
  return new Style({
    // Display
    display: parseDisplay(raw.display as string | undefined),

    // Box sizing — Web preview는 전역 * { box-sizing: border-box } 적용
    // Dropflow Style.getInlineSize()/getBlockSize()가 border-box 보정을 네이티브로 수행
    boxSizing: 'border-box',

    // Margin (number | Percentage | 'auto')
    // 개별 margin 속성이 있으면 우선 사용, 없으면 shorthand에서 해당 방향 값 추출
    marginTop: parseCSSMargin(raw.marginTop ?? parseMarginShorthand(raw.margin, 'top')),
    marginRight: parseCSSMargin(raw.marginRight ?? parseMarginShorthand(raw.margin, 'right')),
    marginBottom: parseCSSMargin(raw.marginBottom ?? parseMarginShorthand(raw.margin, 'bottom')),
    marginLeft: parseCSSMargin(raw.marginLeft ?? parseMarginShorthand(raw.margin, 'left')),

    // Padding (number | Percentage)
    // 개별 padding 속성이 있으면 우선 사용, 없으면 shorthand에서 해당 방향 값 추출
    paddingTop: parseCSSPadding(raw.paddingTop ?? parseMarginShorthand(raw.padding, 'top')),
    paddingRight: parseCSSPadding(raw.paddingRight ?? parseMarginShorthand(raw.padding, 'right')),
    paddingBottom: parseCSSPadding(raw.paddingBottom ?? parseMarginShorthand(raw.padding, 'bottom')),
    paddingLeft: parseCSSPadding(raw.paddingLeft ?? parseMarginShorthand(raw.padding, 'left')),

    // Border width (number only)
    borderTopWidth: parseCSSNumber(raw.borderTopWidth ?? raw.borderWidth),
    borderRightWidth: parseCSSNumber(raw.borderRightWidth ?? raw.borderWidth),
    borderBottomWidth: parseCSSNumber(raw.borderBottomWidth ?? raw.borderWidth),
    borderLeftWidth: parseCSSNumber(raw.borderLeftWidth ?? raw.borderWidth),

    // Width / Height
    width: parseCSSSize(raw.width),
    height: parseCSSSize(raw.height),

    // Min/Max constraints
    minWidth: parseCSSConstraint(raw.minWidth) as number | Percentage | undefined,
    maxWidth: parseCSSConstraint(raw.maxWidth) as number | Percentage | 'none' | undefined,
    minHeight: parseCSSConstraint(raw.minHeight) as number | Percentage | undefined,
    maxHeight: parseCSSConstraint(raw.maxHeight) as number | Percentage | 'none' | undefined,

    // Float / Clear
    float: (raw.float as 'left' | 'right' | 'none') ?? 'none',
    clear: (raw.clear as 'left' | 'right' | 'both' | 'none') ?? 'none',

    // Overflow (BFC 생성 판별용)
    overflow: parseOverflow(raw.overflow),

    // Position (fixed → absolute로 매핑, Dropflow는 fixed를 직접 지원하지 않음)
    position: parsePosition(raw.position as string | undefined),
  });
}

// ---------------------------------------------------------------------------
// CSS 값 파싱 헬퍼
// ---------------------------------------------------------------------------

import type { Percentage } from '../types.js';

/**
 * CSS margin shorthand 값에서 특정 방향의 값을 추출
 *
 * CSS shorthand 패턴:
 * - 1값: `10px` → top/right/bottom/left = 10px
 * - 2값: `10px 20px` → top/bottom = 10px, left/right = 20px
 * - 3값: `10px 20px 30px` → top = 10px, left/right = 20px, bottom = 30px
 * - 4값: `10px 20px 30px 40px` → top/right/bottom/left
 *
 * number 타입이면 그대로 반환 (단일 값으로 간주)
 */
function parseMarginShorthand(
  value: unknown,
  direction: 'top' | 'right' | 'bottom' | 'left',
): unknown {
  if (value === undefined || value === null) return undefined;
  // number 타입은 단일 값 — 그대로 반환하여 parseCSSMargin에 위임
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return undefined;

  const parts = value.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];

  // CSS shorthand 인덱스 매핑
  const directionIndex: Record<string, number[]> = {
    // [1값, 2값, 3값, 4값] 에서의 인덱스
    top:    [0, 0, 0, 0],
    right:  [0, 1, 1, 1],
    bottom: [0, 0, 2, 2],
    left:   [0, 1, 1, 3],
  };

  const indices = directionIndex[direction];
  const idx = indices[Math.min(parts.length, 4) - 1];
  return parts[idx];
}

/**
 * Parse CSS margin value (supports 'auto', number, px string)
 */
function parseCSSMargin(value: unknown): number | Percentage | 'auto' | undefined {
  if (value === undefined || value === null) return undefined;
  if (value === 'auto') return 'auto';
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === 'auto') return 'auto';
    if (trimmed.endsWith('%')) return { value: parseFloat(trimmed), unit: '%' };
    if (trimmed.endsWith('px')) return parseFloat(trimmed);
    const num = parseFloat(trimmed);
    if (!isNaN(num) && /^-?\d+(\.\d+)?$/.test(trimmed)) return num;
  }
  return undefined;
}

/**
 * Parse CSS padding value (supports number, %, px string)
 */
function parseCSSPadding(value: unknown): number | Percentage | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.endsWith('%')) return { value: parseFloat(trimmed), unit: '%' };
    if (trimmed.endsWith('px')) return parseFloat(trimmed);
    const num = parseFloat(trimmed);
    if (!isNaN(num) && /^-?\d+(\.\d+)?$/.test(trimmed)) return num;
  }
  return undefined;
}

/**
 * Parse CSS number-only value (border-width)
 */
function parseCSSNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.endsWith('px')) return parseFloat(trimmed);
    const num = parseFloat(trimmed);
    if (!isNaN(num) && /^-?\d+(\.\d+)?$/.test(trimmed)) return num;
  }
  return undefined;
}

/**
 * Parse overflow value to Dropflow's strict union
 */
function parseOverflow(value: unknown): 'visible' | 'hidden' | undefined {
  if (value === 'hidden' || value === 'auto' || value === 'scroll') return 'hidden';
  if (value === 'visible') return 'visible';
  return undefined;
}

/** 모듈 레벨 viewport 크기 (calculateBlockLayout에서 설정) */
let _viewportWidth = 1440;
let _viewportHeight = 900;

function parseCSSSize(
  value: unknown,
): number | Percentage | 'auto' | undefined {
  if (value === undefined || value === null) return undefined;
  if (value === 'auto') return 'auto';
  if (value === 'fit-content') return 'auto'; // fit-content → auto (Dropflow auto-sizes)
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === 'auto') return 'auto';
    if (trimmed.endsWith('%')) return { value: parseFloat(trimmed), unit: '%' };
    if (trimmed.endsWith('px')) return parseFloat(trimmed);
    if (trimmed.endsWith('vh')) return parseFloat(trimmed) * (_viewportHeight / 100);
    if (trimmed.endsWith('vw')) return parseFloat(trimmed) * (_viewportWidth / 100);
    const num = parseFloat(trimmed);
    if (!isNaN(num) && /^-?\d+(\.\d+)?$/.test(trimmed)) return num;
    // calc() 등 복잡한 CSS 함수는 미지원 — auto로 폴백
  }
  return undefined;
}

/**
 * Parse CSS min/max constraint value
 * 'none' → 'none', 기타는 parseCSSSize와 동일
 */
function parseCSSConstraint(
  value: unknown,
): number | Percentage | 'none' | undefined {
  if (value === undefined || value === null) return undefined;
  if (value === 'none') return 'none';
  const size = parseCSSSize(value);
  if (size === 'auto') return 'none'; // min/max에서 auto → none
  return size;
}

/**
 * CSS position 값을 Dropflow의 position 타입으로 변환
 *
 * CSS 명세에서 position: fixed는 absolute와 동일하게 BFC를 생성하며,
 * Dropflow는 fixed를 직접 지원하지 않으므로 absolute로 매핑.
 */
function parsePosition(value: string | undefined): 'static' | 'relative' | 'absolute' {
  switch (value) {
    case 'static':
    case 'relative':
    case 'absolute':
      return value;
    case 'fixed':
      // fixed는 Dropflow에서 absolute와 동일하게 처리 (BFC 생성)
      return 'absolute';
    case 'sticky':
      // sticky는 레이아웃 상으로는 relative와 동일
      return 'relative';
    default:
      return 'static';
  }
}

function parseDisplay(
  value: string | undefined,
): { outer: 'inline' | 'block' | 'none'; inner: 'flow' | 'flow-root' | 'none' } {
  switch (value) {
    case 'block':
      return { outer: 'block', inner: 'flow' };
    case 'inline':
    case 'inline-block':
      return { outer: 'inline', inner: 'flow' };
    case 'flow-root':
      return { outer: 'block', inner: 'flow-root' };
    case 'none':
      return { outer: 'none', inner: 'none' };
    default:
      // flex/grid 등은 block flow로 폴백 (Dropflow는 block만 처리)
      return { outer: 'block', inner: 'flow' };
  }
}

// ---------------------------------------------------------------------------
// 태그 기반 replaced element 판별
// ---------------------------------------------------------------------------

/**
 * HTML replaced element 태그 목록
 *
 * img, video 등은 ReplacedBox로 처리해야 하며
 * 고유 intrinsic 크기를 가진다.
 */
const REPLACED_ELEMENT_TAGS = new Set([
  'img',
  'video',
  'audio',
  'canvas',
  'iframe',
  'embed',
  'object',
]);

/**
 * XStudio 태그가 replaced element인지 판별
 */
function isReplacedElement(tag: string): boolean {
  return REPLACED_ELEMENT_TAGS.has(tag.toLowerCase());
}

/**
 * XStudio Element에서 ImageDimensions를 추출
 *
 * img/video 요소의 실제 크기 힌트 제공.
 * 스타일에서 width/height가 명시된 경우 그것을 사용.
 */
function extractImageDimensions(element: XElement): ImageDimensions | undefined {
  const raw = element.props?.style as Record<string, unknown> | undefined;
  if (!raw) return undefined;

  const w = parseCSSSize(raw.width);
  const h = parseCSSSize(raw.height);

  if (typeof w === 'number' && typeof h === 'number') {
    return { width: w, height: h };
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Element Tree → Dropflow Box Tree 변환
// ---------------------------------------------------------------------------

/**
 * XElement의 display 분류
 *
 * inline-block은 BlockContainerOfBlocks 안에 inline-level로 들어가므로
 * outer display가 'inline'이면서 inner가 'flow'인 BlockContainer로 처리.
 *
 * ⚠️ 제한사항: CSS 스펙에서 button/input 등은 기본 display가 inline-block이지만,
 * Dropflow IFC는 DOM 텍스트 노드(Run) 기반으로 동작하므로 XStudio의 prop 기반
 * 컴포넌트(Button, Badge 등)를 inline-block으로 처리할 수 없다.
 * display 미지정 시 block으로 폴백하여 세로 쌓임으로 렌더링한다.
 * 가로 배치가 필요하면 사용자가 부모에 display:flex를 명시적으로 설정해야 한다.
 */
type ChildDisplayClass =
  | 'block'       // outer=block → BlockContainerOfBlocks 자식으로 추가
  | 'inline'      // outer=inline → BlockContainerOfInlines 의 Inline 래핑
  | 'replaced'    // img/video → ReplacedBox
  | 'none';       // display:none → 트리에서 제외

function classifyChild(element: XElement): ChildDisplayClass {
  const raw = element.props?.style as Record<string, unknown> | undefined;
  const display = raw?.display as string | undefined;

  if (display === 'none') return 'none';

  // replaced elements는 항상 ReplacedBox
  if (isReplacedElement(element.tag)) return 'replaced';

  // inline / inline-block → inline class (명시적 설정만)
  if (display === 'inline' || display === 'inline-block') return 'inline';

  // block / flow-root / flex / grid / 미지정 → block class
  return 'block';
}

/**
 * BlockContainerOfBlocks 생성
 *
 * isBfcRoot 조건: flow-root, overflow hidden/scroll, display:inline-block(outer=inline)
 * Dropflow Box.BITS.isBfcRoot 플래그를 설정한다.
 */
function createBlockContainerOfBlocks(
  style: Style,
  isInlineLevel: boolean,
  isBfcRoot: boolean,
): BlockContainerOfBlocks {
  let attrs = 0;
  if (isInlineLevel) attrs |= 1 << 8;  // Box.BITS.isInline
  if (isBfcRoot) attrs |= 1 << 9;      // Box.BITS.isBfcRoot
  return new BlockContainerOfBlocks(style, attrs);
}

/**
 * BlockContainerOfInlines 생성 (anonymous block)
 *
 * 인라인 콘텐츠를 담는 익명 블록 컨테이너.
 * 항상 isBfcRoot = false (상위 BFC에 참여).
 */
function createBlockContainerOfInlines(
  style: Style,
  isInlineLevel: boolean,
  isBfcRoot: boolean,
): BlockContainerOfInlines {
  let attrs = 0;
  if (isInlineLevel) attrs |= 1 << 8;
  if (isBfcRoot) attrs |= 1 << 9;
  return new BlockContainerOfInlines(style, attrs);
}

/**
 * Style에서 BFC root 여부 판별
 *
 * CSS 명세의 BFC 생성 조건을 Dropflow Style 속성으로 매핑:
 * - display.inner === 'flow-root'
 * - display.outer === 'inline' (inline-block)
 * - overflow === 'hidden'
 * - float !== 'none'
 * - position === 'absolute'
 */
export function styleCreatesBfc(style: Style): boolean {
  if (style.display.inner === 'flow-root') return true;
  if (style.display.outer === 'inline') return true;  // inline-block
  if (style.overflow === 'hidden') return true;
  if (style.float !== 'none') return true;
  if (style.position === 'absolute') return true;
  return false;
}

/**
 * XStudio Element 트리를 Dropflow Box 트리로 변환
 *
 * 플랫 트리(Layout.tree) 구성 규칙:
 *
 * 1. tree[0] = 루트 BlockContainerOfBlocks (parent 요소)
 * 2. parent가 block-only 자식을 가지면:
 *    - 각 블록 자식 → BlockContainerOfBlocks
 *    - 인라인 자식들은 익명 BlockContainerOfInlines로 묶임
 *    - replaced 자식 → ReplacedBox
 * 3. parent가 인라인만 있으면:
 *    - tree[0] = BlockContainerOfInlines
 *    - tree[1] = Inline (루트 inline box)
 * 4. treeStart/treeFinal은 플랫 트리에서의 인덱스 범위
 *
 * Dropflow 플랫 트리 레이아웃:
 * [BCB_root, child_0, child_0_children..., child_1, ...]
 * 각 Box의 treeStart = 자신의 인덱스, treeFinal = 서브트리 마지막 인덱스
 */
export function buildBoxTree(
  parent: XElement,
  children: XElement[],
  _availableWidth: number,
  _availableHeight: number,
): Layout {
  const rawParentStyle = elementStyleToDropflowStyle(parent);
  // 부모의 padding/border는 이미 availableWidth에서 제외되어 있으므로 0으로 리셋
  // (BuilderCanvas의 ElementsLayer가 padding/border offset을 직접 적용)
  // TaffyFlexEngine과 동일한 패턴
  const parentStyle = new Style({
    ...rawParentStyle,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  });
  const parentIsBfcRoot = styleCreatesBfc(parentStyle) || true; // 루트는 항상 BFC

  // 유효한 자식만 필터링 (display:none 제외)
  const visibleChildren = children.filter(
    (c) => classifyChild(c) !== 'none',
  );

  // 자식들의 display 분류
  const childClasses = visibleChildren.map((c) => classifyChild(c));
  const hasBlocks = childClasses.some((cls) => cls === 'block' || cls === 'replaced');
  const hasInlines = childClasses.some((cls) => cls === 'inline');

  // 혼합 콘텐츠(block + inline)일 때 inline을 anonymous block으로 묶기
  // 순수 inline만 있으면 BlockContainerOfInlines 루트 생성
  const pureInlineOnly = hasInlines && !hasBlocks;

  // 플랫 트리 배열 구성
  const tree: InlineLevel[] = [];

  if (pureInlineOnly) {
    // 루트를 BlockContainerOfInlines로
    const root = createBlockContainerOfInlines(parentStyle, false, parentIsBfcRoot);
    tree.push(root);

    // 인라인 루트 Inline box
    const rootInline = new Inline(EMPTY_STYLE, 0);
    tree.push(rootInline);

    for (const child of visibleChildren) {
      const childStyle = elementStyleToDropflowStyle(child);
      const childIsBfc = styleCreatesBfc(childStyle);
      const childIsInlineLevel = childStyle.display.outer === 'inline';

      if (isReplacedElement(child.tag)) {
        const dims = extractImageDimensions(child);
        const replaced = new ReplacedBox(childStyle, child.id, dims);
        tree.push(replaced);
      } else {
        const inlineBox = new Inline(childStyle, childIsInlineLevel ? 1 << 8 : 0);
        tree.push(inlineBox);
        inlineBox.treeStart = tree.length - 1;

        // inline-block은 BlockContainerOfBlocks을 Inline 안에 중첩
        if (childStyle.display.outer === 'inline' && childStyle.display.inner === 'flow') {
          const innerBlock = createBlockContainerOfBlocks(childStyle, true, childIsBfc);
          tree.push(innerBlock);
          innerBlock.treeStart = tree.length - 1;
          innerBlock.treeFinal = tree.length - 1;
        }

        inlineBox.treeFinal = tree.length - 1;
      }
    }

    // 루트 Inline의 treeFinal 설정
    const rootInlineIdx = 1;
    (tree[rootInlineIdx] as Inline).treeStart = rootInlineIdx;
    (tree[rootInlineIdx] as Inline).treeFinal = tree.length - 1;

    root.treeStart = 0;
    root.treeFinal = tree.length - 1;
  } else {
    // 루트를 BlockContainerOfBlocks로
    const root = createBlockContainerOfBlocks(parentStyle, false, parentIsBfcRoot);
    tree.push(root);
    root.treeStart = 0;

    // 인라인 자식을 모으는 익명 BlockContainerOfInlines 버퍼
    let anonBlock: BlockContainerOfInlines | null = null;
    let anonStartIdx = -1;
    let anonInline: Inline | null = null;

    const flushAnonBlock = () => {
      if (anonBlock === null || anonInline === null) return;
      anonInline.treeStart = anonStartIdx + 1;
      anonInline.treeFinal = tree.length - 1;
      anonBlock.treeFinal = tree.length - 1;
      anonBlock = null;
      anonInline = null;
      anonStartIdx = -1;
    };

    for (const child of visibleChildren) {
      const cls = classifyChild(child);
      const childStyle = elementStyleToDropflowStyle(child);
      const childIsBfc = styleCreatesBfc(childStyle);
      const childIsInlineLevel = childStyle.display.outer === 'inline';

      if (cls === 'block') {
        // 블록 자식 전에 익명 인라인 블록 flush
        flushAnonBlock();

        const blockChild = createBlockContainerOfBlocks(childStyle, childIsInlineLevel, childIsBfc);
        const blockStartIdx = tree.length;
        tree.push(blockChild);
        blockChild.treeStart = blockStartIdx;
        blockChild.treeFinal = blockStartIdx; // 자식 없음 (leaf node)

      } else if (cls === 'inline') {
        // 인라인 자식: 익명 BlockContainerOfInlines 안에 수집
        if (anonBlock === null) {
          anonBlock = createBlockContainerOfInlines(EMPTY_STYLE, false, false);
          anonStartIdx = tree.length;
          tree.push(anonBlock);
          anonBlock.treeStart = anonStartIdx;

          anonInline = new Inline(EMPTY_STYLE, 1 << 0); // anonymous
          tree.push(anonInline);
        }

        const inlineBox = new Inline(childStyle, childIsInlineLevel ? 0 : 0);
        const inlineStartIdx = tree.length;
        tree.push(inlineBox);
        inlineBox.treeStart = inlineStartIdx;

        // inline-block: Inline 안에 BlockContainer 중첩
        if (childIsInlineLevel && childStyle.display.inner === 'flow') {
          const innerBlock = createBlockContainerOfBlocks(childStyle, true, childIsBfc);
          const innerIdx = tree.length;
          tree.push(innerBlock);
          innerBlock.treeStart = innerIdx;
          innerBlock.treeFinal = innerIdx;
        }

        inlineBox.treeFinal = tree.length - 1;

      } else if (cls === 'replaced') {
        // replaced element: 익명 블록 flush 후 추가
        flushAnonBlock();

        const dims = extractImageDimensions(child);
        const replaced = new ReplacedBox(childStyle, child.id, dims);
        const replacedIdx = tree.length;
        tree.push(replaced);
        replaced.treeStart = replacedIdx;
        replaced.treeFinal = replacedIdx;
      }
    }

    // 남은 익명 인라인 블록 flush
    flushAnonBlock();

    root.treeFinal = tree.length - 1;
  }

  return new Layout(tree);
}

// ---------------------------------------------------------------------------
// BoxArea → ComputedLayout 변환
// ---------------------------------------------------------------------------

/**
 * Dropflow 레이아웃 결과(BoxArea)를 XStudio ComputedLayout으로 변환
 *
 * BoxArea는 논리적 좌표(blockStart, lineLeft)를 사용하므로
 * writing-mode에 따라 물리적 좌표(x, y)로 변환 필요.
 * BoxArea.absolutify()가 이 변환을 수행하지만,
 * XStudio는 항상 horizontal-tb를 사용하므로 직접 매핑 가능.
 *
 * @param area - Dropflow BoxArea (content area)
 * @param box - 해당 Box
 * @param elementId - XStudio element ID
 */
export function boxAreaToComputedLayout(
  area: BoxArea,
  elementId: string,
): XComputedLayout {
  // horizontal-tb 전용 (XStudio 기본값)
  // BoxArea.absolutify() 호출 후의 좌표는 이미 물리적 좌표
  return {
    elementId,
    x: area.x,
    y: area.y,
    width: area.width,
    height: area.height,
    // TODO Phase 3: margin collapse 정보 추출
  };
}

// ---------------------------------------------------------------------------
// elementId → Box 매핑 추출 (Box 트리 순회)
// ---------------------------------------------------------------------------

/**
 * Layout 플랫 트리에서 루트의 직접 자식 FormattingBox를 추출하여
 * XElement 순서와 1:1 대응시켜 ComputedLayout을 구성.
 *
 * 트리 인덱스 기반 탐색:
 * - tree[0] = 루트 (parent)
 * - tree[1..root.treeFinal] = 자식 서브트리들
 * - 루트의 직접 자식은 인덱스 1부터 시작하며,
 *   각 자식의 treeFinal + 1이 다음 형제의 시작 인덱스.
 *
 * NOTE: getContainingBlock() === rootContent 참조 비교는
 * BoxArea 인스턴스가 다르므로 항상 실패한다. 대신 treeFinal을
 * 이용한 형제 탐색으로 깊이 1의 FormattingBox만 수집.
 */
function extractLayoutResults(
  layout: Layout,
  children: XElement[],
): XComputedLayout[] {
  const results: XComputedLayout[] = [];

  const root = layout.root();
  if (!root) return results;

  // 루트의 직접 자식 FormattingBox 수집 (tree index 기반 탐색)
  // tree[0] = 루트, tree[1..root.treeFinal] = 자식 서브트리
  // FormattingBox를 만나면 treeFinal+1로 서브트리를 건너뛴다.
  const formattingBoxes: Array<{
    box: FormattingBox;
    treeIdx: number;
  }> = [];

  let i = 1;
  while (i <= root.treeFinal) {
    const node = layout.tree[i];
    if (node.isFormattingBox()) {
      const fbox = node as FormattingBox;
      formattingBoxes.push({ box: fbox, treeIdx: i });
      // 서브트리 건너뛰기: 다음 형제는 treeFinal + 1
      i = fbox.treeFinal + 1;
    } else {
      i++;
    }
  }

  // 자식 XElement와 FormattingBox를 순서 대응
  // display:none이 아닌 자식만 해당
  const visibleChildren = children.filter((c) => classifyChild(c) !== 'none');

  const matchCount = Math.min(visibleChildren.length, formattingBoxes.length);
  for (let j = 0; j < matchCount; j++) {
    const child = visibleChildren[j];
    const { box } = formattingBoxes[j];

    // postlayout 후 absolutify()가 호출되어 border area 좌표가 절대좌표
    const borderArea = box.getBorderArea();

    results.push({
      elementId: child.id,
      x: borderArea.x,
      y: borderArea.y,
      width: borderArea.width,
      height: borderArea.height,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Dropflow Layout Adapter (메인 진입점)
// ---------------------------------------------------------------------------

/**
 * Dropflow Fork 기반 블록 레이아웃 계산
 *
 * 기존 BlockEngine.calculate()를 대체할 메인 함수.
 *
 * 파이프라인:
 * 1. Element → Style 변환
 * 2. Box Tree 구성 (buildBoxTree)
 * 3. prelayout()
 * 4. layoutBlockLevelBox()
 * 5. postlayout()
 * 6. BoxArea → ComputedLayout 변환
 */
export function calculateBlockLayout(
  parent: XElement,
  children: XElement[],
  availableWidth: number,
  availableHeight: number,
  _context?: XLayoutContext,
): XComputedLayout[] {
  if (children.length === 0) return [];

  // viewport 크기 설정 (vh/vw 단위 변환에 사용)
  _viewportWidth = _context?.viewportWidth ?? availableWidth;
  _viewportHeight = _context?.viewportHeight ?? availableHeight;

  // 1. Box 트리 구성
  const layout = buildBoxTree(parent, children, availableWidth, availableHeight);

  const root = layout.root();
  if (!root) return [];

  // 2. Initial Containing Block (ICB) 설정
  // ICB는 루트 Box의 부모 역할을 하는 가상 영역
  // BoxArea 생성자: (box, x, y, w, h)
  const icbBox = createBlockContainerOfBlocks(EMPTY_STYLE, false, true);
  const icb = new BoxArea(icbBox, 0, 0, availableWidth, availableHeight);
  icbBox.treeStart = -1;
  icbBox.treeFinal = -1;

  // 3. prelayout: 각 Box의 containing block 연결
  prelayout(layout, icb);

  // 4. 레이아웃 계산
  // 루트에 BFC를 생성해서 calculateBlockLayout 진행
  const bfc = new BlockFormattingContext(availableWidth);
  const ctx: LayoutContext = { bfc };

  try {
    layoutBlockLevelBox(layout, root as BlockLevel, ctx);
    bfc.finalize(root as BlockContainer);
  } catch (e) {
    // 레이아웃 계산 실패 시 에러 로깅 후 빈 배열 반환 (안전 폴백)
    console.error('[DropflowBlockEngine] layoutBlockLevelBox 실패:', e,
      { parentTag: parent.tag, childCount: children.length, availableWidth, availableHeight });
    return [];
  }

  // 5. postlayout: 절대 좌표 계산 (absolutify + snapPixels)
  postlayout(layout);

  // 6. Box 트리 → XComputedLayout[] 변환
  return extractLayoutResults(layout, children);
}

// ---------------------------------------------------------------------------
// 이식 필요 로직 식별 (Phase 3 계획)
// ---------------------------------------------------------------------------

/**
 * BlockEngine에서 이식할 로직 목록
 *
 * 1. clampSize(value, min, max)
 *    → Dropflow Fork 대응: Style에 minWidth/maxWidth/minHeight/maxHeight 있음
 *    → layout-flow.ts의 layoutBlockBox()에서 사용됨
 *    → 이식 불필요 (이미 Dropflow에 구현)
 *
 * 2. fit-content / intrinsic sizing
 *    → Dropflow: layoutContribution()에서 min-content/max-content 지원
 *    → BlockEngine의 FIT_CONTENT sentinel → Dropflow의 'auto' + 별도 처리
 *    → 부분 이식 필요: XStudio의 fit-content 시멘틱을 Dropflow에 매핑
 *
 * 3. computeEffectiveDisplay (CSS Blockification)
 *    → Dropflow는 이미 올바른 display 타입으로 Box를 생성한다고 가정
 *    → 이 로직은 buildBoxTree()에서 Element → Box 변환 시 적용
 *    → 어댑터에 이식 필요
 *
 * 4. BFC 생성 조건 (createsBFC)
 *    → Dropflow: BlockFormattingContext가 자동으로 BFC 관리
 *    → Style의 display/overflow/float/position으로 판별
 *    → 이식 불필요 (Dropflow에 이미 구현)
 *
 * 5. 빈 블록 self-collapse (isEmptyBlock + collapseEmptyBlockMargins)
 *    → Dropflow: BlockFormattingContext.collapseMargins()에서 처리
 *    → canCollapseThrough() 메서드로 빈 블록 감지
 *    → 이식 불필요
 *
 * 6. LineBox / inline-block vertical-align
 *    → Dropflow: 텍스트 라인박스는 layout-text.ts에서 처리 (Phase 2 Gate A 필요)
 *    → inline-block은 Inline + BlockContainer로 표현
 *    → 부분 이식: vertical-align 계산은 Dropflow에 있으나
 *      XStudio 전용 baseline 추정 로직은 어댑터에서 보완 필요
 *
 * 7. WASM 가속 (calculateViaWasm + scheduleWorkerBlock)
 *    → Dropflow Fork는 JS-only 엔진
 *    → WASM 가속은 별도 레이어로 유지하거나 제거
 *    → Phase 3에서 판단 (성능 프로파일링 후)
 *
 * 8. 컴포넌트별 콘텐츠 크기 추정 (calculateContentWidth/Height)
 *    → Dropflow는 실제 텍스트 측정을 TextShaper에 위임
 *    → XStudio 전용 컴포넌트 크기 추정은 어댑터에서 유지
 *    → buildBoxTree()에서 ReplacedBox의 imageDimensions로 주입
 *
 * 9. CSS Cascade / 상속 (cssResolver.ts)
 *    → Dropflow Style은 cascade 없음 (Phase 1에서 제거)
 *    → XStudio의 resolveStyle()로 computed style을 계산한 후
 *      결과를 Dropflow Style 생성자에 전달
 *    → 어댑터에서 처리 (elementStyleToDropflowStyle)
 */
