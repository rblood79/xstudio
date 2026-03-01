/**
 * Phase 0: Full-Tree WASM Layout (Batch Build)
 *
 * 레벨별 독립 Taffy 호출을 단일 WASM 호출로 통합.
 * DFS post-order로 전체 트리를 배치 배열로 변환 후
 * build_tree_batch() 1회 → compute_layout() 1회 → get_layouts_batch() 1회.
 *
 * @see ADR-005 Phase 0
 * @since 2026-02-28
 */

import type { Element } from '../../../../../types/core/store.types';
import type { ComputedLayout } from './LayoutEngine';
import type { TaffyStyle } from '../../wasm-bindings/taffyLayout';
import { isRustWasmReady } from '../../wasm-bindings/rustWasm';
import { PersistentTaffyTree } from './persistentTaffyTree';
import type { PersistentBatchNode } from './persistentTaffyTree';
import { enrichWithIntrinsicSize, applyCommonTaffyStyle, applyFlexItemProperties, parseMargin, parsePadding, parseBorder, calculateContentHeight, parseBoxModel, parseCSSPropWithContext } from './utils';
import { resolveStyle, ROOT_COMPUTED_STYLE } from './cssResolver';
import type { ComputedStyle } from './cssResolver';
import { toTaffyDisplay, blockifyDisplay, getElementDisplay, needsBlockChildFullWidth } from './taffyDisplayAdapter';
import { elementToTaffyBlockStyle } from './TaffyBlockEngine';
import { elementToTaffyStyle } from './TaffyFlexEngine';
import { applyImplicitStyles } from './implicitStyles';
import { useScrollState } from '../../../../stores/scrollState';

// ─── 모듈 수준 상수 ──────────────────────────────────────────────────

/** flex/grid container 판별 집합 (CSS Blockification 적용 기준) */
const FLEX_GRID_DISPLAYS = new Set(['flex', 'inline-flex', 'grid', 'inline-grid']);

// ─── 페이지별 PersistentTaffyTree ──────────────────────────────────

/**
 * 페이지별 Persistent Taffy 트리 맵.
 *
 * 멀티페이지 캔버스에서 각 페이지의 ElementsLayer가 독립적으로
 * calculateFullTreeLayout()을 호출하므로, 싱글톤 트리는
 * 마지막 페이지의 rootHandle만 남아 다른 페이지 레이아웃이 깨진다.
 *
 * pageId별로 별도의 PersistentTaffyTree를 유지하여 해결한다.
 */
const persistentTrees = new Map<string, PersistentTaffyTree>();

/**
 * Persistent 트리 리셋.
 *
 * 전체 트리 재구축이 필요한 경우 호출한다.
 * 특정 pageId를 전달하면 해당 페이지만, 생략하면 모든 페이지를 리셋한다.
 */
export function resetPersistentTree(pageId?: string): void {
  if (pageId) {
    const tree = persistentTrees.get(pageId);
    if (tree) {
      tree.reset();
      persistentTrees.delete(pageId);
    }
  } else {
    for (const tree of persistentTrees.values()) {
      tree.reset();
    }
    persistentTrees.clear();
  }
}

// ─── 공유 Layout Map (Phase 3: SkiaOverlay에서 접근) ────────────────
// Multi-page: 페이지별 저장 → 머지 읽기 패턴
// 각 페이지의 ElementsLayer가 독립적으로 publish 호출.
// 싱글톤이면 마지막 페이지 데이터만 남아 다른 페이지 렌더링 실패.

const _perPageLayoutMaps = new Map<string, Map<string, ComputedLayout>>();
let _sharedLayoutVersion = 0;
let _mergedLayoutMap: Map<string, ComputedLayout> | null = null;
let _mergedLayoutVersion = -1;

/** fullTreeLayoutMap을 페이지 단위로 공유한다. */
export function publishLayoutMap(map: Map<string, ComputedLayout> | null, pageId?: string): void {
  const key = pageId ?? '__default__';
  if (map) {
    _perPageLayoutMaps.set(key, map);
  } else {
    _perPageLayoutMaps.delete(key);
  }
  _sharedLayoutVersion++;
}

/** 공유된 fullTreeLayoutMap 조회 (모든 페이지 머지, 버전 캐시) */
export function getSharedLayoutMap(): Map<string, ComputedLayout> | null {
  if (_perPageLayoutMaps.size === 0) return null;
  if (_mergedLayoutVersion === _sharedLayoutVersion) return _mergedLayoutMap;
  const merged = new Map<string, ComputedLayout>();
  for (const pageMap of _perPageLayoutMaps.values()) {
    for (const [k, v] of pageMap) merged.set(k, v);
  }
  _mergedLayoutMap = merged;
  _mergedLayoutVersion = _sharedLayoutVersion;
  return merged;
}

/** 공유 Layout Map 변경 버전 */
export function getSharedLayoutVersion(): number {
  return _sharedLayoutVersion;
}

// ─── 공유 Filtered Children Map (Fix 1: 트리 소스 일원화) ────────────
// Multi-page: 동일 페이지별 저장 패턴

const _perPageFilteredMaps = new Map<string, Map<string, string[]>>();
let _filteredVersion = 0;
let _mergedFilteredMap: Map<string, string[]> | null = null;
let _mergedFilteredVersion = -1;

/** filteredChildIdsMap을 페이지 단위로 공유 */
export function publishFilteredChildrenMap(map: Map<string, string[]> | null, pageId?: string): void {
  const key = pageId ?? '__default__';
  if (map) {
    _perPageFilteredMaps.set(key, map);
  } else {
    _perPageFilteredMaps.delete(key);
  }
  _filteredVersion++;
}

/** 공유된 filteredChildIdsMap 조회 (모든 페이지 머지, 버전 캐시) */
export function getSharedFilteredChildrenMap(): Map<string, string[]> | null {
  if (_perPageFilteredMaps.size === 0) return null;
  if (_mergedFilteredVersion === _filteredVersion) return _mergedFilteredMap;
  const merged = new Map<string, string[]>();
  for (const pageMap of _perPageFilteredMaps.values()) {
    for (const [k, v] of pageMap) merged.set(k, v);
  }
  _mergedFilteredMap = merged;
  _mergedFilteredVersion = _filteredVersion;
  return merged;
}

// ─── 내부 유틸리티 ───────────────────────────────────────────────────

// ─── Implicit Style 패치 ──────────────────────────────────────────────

/** CSS dimension 속성 (number → "${v}px" 변환) */
const IMPLICIT_DIM_PROPS = new Set([
  'marginLeft', 'marginRight', 'marginTop', 'marginBottom',
  'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom',
  'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
  'gap', 'rowGap', 'columnGap', 'flexBasis',
]);

/**
 * applyImplicitStyles가 변경한 CSS 속성을 batch record에 패치.
 *
 * DFS post-order에서 자식은 부모보다 먼저 처리되므로,
 * 부모의 applyImplicitStyles 결과가 자식 batch 엔트리에 반영되지 않는다.
 * 변경된 속성만 찾아 taffyStyleToRecord 형식으로 패치한다.
 */
function patchBatchStyleFromImplicit(
  batchStyle: Record<string, unknown>,
  origStyle: Record<string, unknown>,
  modStyle: Record<string, unknown>,
): void {
  for (const key of Object.keys(modStyle)) {
    if (modStyle[key] === origStyle[key]) continue;
    const val = modStyle[key];
    if (val === undefined) continue;

    // flex shorthand → flexGrow/flexShrink/flexBasis 분해
    if (key === 'flex') {
      const n = Number(val);
      if (!isNaN(n)) {
        batchStyle.flexGrow = n;
        batchStyle.flexShrink = 1;
        batchStyle.flexBasis = '0%';
      }
      continue;
    }

    // dimension 속성: number → "Npx", string → 그대로
    if (IMPLICIT_DIM_PROPS.has(key)) {
      batchStyle[key] = typeof val === 'number' ? `${val}px` : val;
      continue;
    }

    // numeric 속성
    if (key === 'flexGrow' || key === 'flexShrink' || key === 'order') {
      batchStyle[key] = Number(val);
      continue;
    }

    // string 속성 (display, flexDirection, alignItems 등)
    if (typeof val === 'string') {
      batchStyle[key] = val;
    }
  }
}

// ─── TaffyStyle → Record 변환 ────────────────────────────────────────

/**
 * TaffyStyle 객체를 JSON 직렬화 가능한 Record로 변환.
 *
 * TaffyLayout 클래스 내부의 normalizeStyle()과 동일한 변환 규칙을 적용한다.
 * - 숫자 dimension 값은 `${v}px` 문자열로 변환
 * - undefined 필드는 결과에서 제외
 * - 배열 필드(grid track)는 그대로 전달
 * - 문자열 필드는 그대로 전달
 */
function taffyStyleToRecord(style: TaffyStyle): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // dimension 값을 string으로 정규화하는 내부 헬퍼
  function dim(v: string | number): string {
    return typeof v === 'number' ? `${v}px` : v;
  }

  // Display & position
  if (style.display !== undefined) result.display = style.display;
  if (style.position !== undefined) result.position = style.position;
  if (style.overflowX !== undefined) result.overflowX = style.overflowX;
  if (style.overflowY !== undefined) result.overflowY = style.overflowY;

  // Flex container
  if (style.flexDirection !== undefined) result.flexDirection = style.flexDirection;
  if (style.flexWrap !== undefined) result.flexWrap = style.flexWrap;
  if (style.justifyContent !== undefined) result.justifyContent = style.justifyContent;
  if (style.justifyItems !== undefined) result.justifyItems = style.justifyItems;
  if (style.alignItems !== undefined) result.alignItems = style.alignItems;
  if (style.alignContent !== undefined) result.alignContent = style.alignContent;

  // Flex item
  if (style.flexGrow !== undefined) result.flexGrow = style.flexGrow;
  if (style.flexShrink !== undefined) result.flexShrink = style.flexShrink;
  if (style.flexBasis !== undefined) result.flexBasis = dim(style.flexBasis);
  if (style.alignSelf !== undefined) result.alignSelf = style.alignSelf;
  if (style.justifySelf !== undefined) result.justifySelf = style.justifySelf;
  if (style.order !== undefined) result.order = style.order;

  // Grid container
  if (style.gridTemplateColumns !== undefined) result.gridTemplateColumns = style.gridTemplateColumns;
  if (style.gridTemplateRows !== undefined) result.gridTemplateRows = style.gridTemplateRows;
  if (style.gridAutoFlow !== undefined) result.gridAutoFlow = style.gridAutoFlow;
  if (style.gridAutoColumns !== undefined) result.gridAutoColumns = style.gridAutoColumns;
  if (style.gridAutoRows !== undefined) result.gridAutoRows = style.gridAutoRows;

  // Grid item
  if (style.gridColumnStart !== undefined) result.gridColumnStart = String(style.gridColumnStart);
  if (style.gridColumnEnd !== undefined) result.gridColumnEnd = String(style.gridColumnEnd);
  if (style.gridRowStart !== undefined) result.gridRowStart = String(style.gridRowStart);
  if (style.gridRowEnd !== undefined) result.gridRowEnd = String(style.gridRowEnd);

  // Size
  if (style.width !== undefined) result.width = dim(style.width);
  if (style.height !== undefined) result.height = dim(style.height);
  if (style.minWidth !== undefined) result.minWidth = dim(style.minWidth);
  if (style.minHeight !== undefined) result.minHeight = dim(style.minHeight);
  if (style.maxWidth !== undefined) result.maxWidth = dim(style.maxWidth);
  if (style.maxHeight !== undefined) result.maxHeight = dim(style.maxHeight);

  // Margin
  if (style.marginTop !== undefined) result.marginTop = dim(style.marginTop);
  if (style.marginRight !== undefined) result.marginRight = dim(style.marginRight);
  if (style.marginBottom !== undefined) result.marginBottom = dim(style.marginBottom);
  if (style.marginLeft !== undefined) result.marginLeft = dim(style.marginLeft);

  // Padding
  if (style.paddingTop !== undefined) result.paddingTop = dim(style.paddingTop);
  if (style.paddingRight !== undefined) result.paddingRight = dim(style.paddingRight);
  if (style.paddingBottom !== undefined) result.paddingBottom = dim(style.paddingBottom);
  if (style.paddingLeft !== undefined) result.paddingLeft = dim(style.paddingLeft);

  // Border
  if (style.borderTop !== undefined) result.borderTop = dim(style.borderTop);
  if (style.borderRight !== undefined) result.borderRight = dim(style.borderRight);
  if (style.borderBottom !== undefined) result.borderBottom = dim(style.borderBottom);
  if (style.borderLeft !== undefined) result.borderLeft = dim(style.borderLeft);

  // Inset
  if (style.insetTop !== undefined) result.insetTop = dim(style.insetTop);
  if (style.insetRight !== undefined) result.insetRight = dim(style.insetRight);
  if (style.insetBottom !== undefined) result.insetBottom = dim(style.insetBottom);
  if (style.insetLeft !== undefined) result.insetLeft = dim(style.insetLeft);

  // Gap
  if (style.columnGap !== undefined) result.columnGap = dim(style.columnGap);
  if (style.rowGap !== undefined) result.rowGap = dim(style.rowGap);

  // Aspect ratio
  if (style.aspectRatio !== undefined) result.aspectRatio = style.aspectRatio;

  return result;
}

/**
 * Element와 display 정보로 TaffyStyle을 계산 후 Record로 변환.
 *
 * display 타입에 따라 적절한 변환 함수를 선택한다:
 * - flex / inline-flex  → elementToTaffyStyle() (TaffyFlexEngine)
 * - grid / inline-grid  → applyCommonTaffyStyle() 기반 grid 스타일 (간소화)
 * - 그 외 (block 계열)  → elementToTaffyBlockStyle() + toTaffyDisplay()
 */
function buildNodeStyle(
  element: Element,
  computedStyle: ComputedStyle,
  childDisplays: string[],
  parentDisplay: string,
): Record<string, unknown> {
  const display = getElementDisplay(element);
  const normalized = display.trim().toLowerCase();

  if (normalized === 'flex' || normalized === 'inline-flex') {
    const taffyStyle: TaffyStyle = elementToTaffyStyle(element, computedStyle);
    return taffyStyleToRecord(taffyStyle);
  }

  if (normalized === 'grid' || normalized === 'inline-grid') {
    // Grid: applyCommonTaffyStyle 기반 간소화 경로
    // 전체 grid 속성 변환은 TaffyGridEngine에 있으나
    // fullTreeLayout 배치에서는 size/padding/border/gap 처리가 핵심이므로
    // applyCommonTaffyStyle로 공통 부분을 처리하고 grid display를 주입한다.
    const style = (element.props?.style ?? {}) as Record<string, unknown>;
    const partial: Record<string, unknown> = { display: 'grid' };
    applyCommonTaffyStyle(partial, style, {});

    // Grid container 핵심 속성 직접 전달
    if (style.gridTemplateColumns) partial.gridTemplateColumns = style.gridTemplateColumns;
    if (style.gridTemplateRows) partial.gridTemplateRows = style.gridTemplateRows;
    if (style.gridAutoFlow) partial.gridAutoFlow = style.gridAutoFlow;
    if (style.gridAutoColumns) partial.gridAutoColumns = style.gridAutoColumns;
    if (style.gridAutoRows) partial.gridAutoRows = style.gridAutoRows;
    if (style.justifyContent) partial.justifyContent = style.justifyContent;
    if (style.alignItems) partial.alignItems = style.alignItems;
    if (style.alignContent) partial.alignContent = style.alignContent;
    if (style.justifyItems) partial.justifyItems = style.justifyItems;

    // Grid item 배치 속성
    if (style.gridColumnStart) partial.gridColumnStart = String(style.gridColumnStart);
    if (style.gridColumnEnd) partial.gridColumnEnd = String(style.gridColumnEnd);
    if (style.gridRowStart) partial.gridRowStart = String(style.gridRowStart);
    if (style.gridRowEnd) partial.gridRowEnd = String(style.gridRowEnd);
    if (style.alignSelf) partial.alignSelf = style.alignSelf;
    if (style.justifySelf) partial.justifySelf = style.justifySelf;

    // Position + Inset
    if (style.position === 'absolute' || style.position === 'fixed') {
      partial.position = 'absolute';
    } else if (style.position === 'relative') {
      partial.position = 'relative';
    }
    if (style.position === 'absolute' || style.position === 'fixed' || style.position === 'relative') {
      const top = parseCSSPropWithContext(style.top, {});
      const left = parseCSSPropWithContext(style.left, {});
      const right = parseCSSPropWithContext(style.right, {});
      const bottom = parseCSSPropWithContext(style.bottom, {});
      if (top !== undefined) partial.insetTop = top;
      if (left !== undefined) partial.insetLeft = left;
      if (right !== undefined) partial.insetRight = right;
      if (bottom !== undefined) partial.insetBottom = bottom;
    }

    const margin = parseMargin(style);
    if (margin.top !== 0) partial.marginTop = margin.top;
    if (margin.right !== 0) partial.marginRight = margin.right;
    if (margin.bottom !== 0) partial.marginBottom = margin.bottom;
    if (margin.left !== 0) partial.marginLeft = margin.left;

    // CSS: grid 요소가 flex/grid 부모의 자식이면 flex item 속성도 적용
    if (FLEX_GRID_DISPLAYS.has(parentDisplay)) {
      applyFlexItemProperties(partial, style);
    }

    return partial;
  }

  // block / inline-block / inline / flow-root / 기타 → TaffyBlockEngine 경로
  // taffyDisplayAdapter가 모든 block layout 시뮬레이션 규칙을 TaffyDisplayConfig에 포함하고,
  // elementToTaffyBlockStyle이 모든 필드를 패스스루하므로 수동 주입 불필요.
  const taffyConfig = toTaffyDisplay(display, childDisplays);
  const taffyStyle: TaffyStyle = elementToTaffyBlockStyle(element, taffyConfig);
  const record = taffyStyleToRecord(taffyStyle);

  // CSS: block 요소가 flex/grid 부모의 자식이면 flex item 속성 적용
  // 자식의 display는 내부 formatting context만 결정, flex item 참여는 부모 display로 결정
  if (FLEX_GRID_DISPLAYS.has(parentDisplay)) {
    const style = (element.props?.style ?? {}) as Record<string, unknown>;
    applyFlexItemProperties(record, style);
  }

  return record;
}

// ─── Fix 6: 자식 available size 추정 ────────────────────────────────

/**
 * 현재 요소의 명시적 크기 + padding/border를 고려하여
 * 자식에게 전달할 available width/height를 추정한다.
 */
function estimateChildAvailableSize(
  style: Record<string, unknown> | undefined,
  parentAvailWidth: number,
  parentAvailHeight: number,
): { width: number; height: number } {
  if (!style) return { width: parentAvailWidth, height: parentAvailHeight };

  // 명시적 width 해석
  let contentWidth = parentAvailWidth;
  const rawW = style.width;
  if (rawW != null) {
    const strW = String(rawW);
    if (strW.endsWith('%')) {
      const pct = parseFloat(strW);
      if (!isNaN(pct)) contentWidth = parentAvailWidth * pct / 100;
    } else if (strW !== 'auto') {
      const px = parseFloat(strW);
      if (!isNaN(px)) contentWidth = px;
    }
  }

  // 명시적 height 해석
  let contentHeight = parentAvailHeight;
  const rawH = style.height;
  if (rawH != null) {
    const strH = String(rawH);
    if (strH.endsWith('%')) {
      const pct = parseFloat(strH);
      if (!isNaN(pct)) contentHeight = parentAvailHeight * pct / 100;
    } else if (strH !== 'auto') {
      const px = parseFloat(strH);
      if (!isNaN(px)) contentHeight = px;
    }
  }

  // padding + border 차감 → content area
  const pad = parsePadding(style, contentWidth);
  const brd = parseBorder(style);
  contentWidth = Math.max(0, contentWidth - pad.left - pad.right - brd.left - brd.right);
  contentHeight = Math.max(0, contentHeight - pad.top - pad.bottom - brd.top - brd.bottom);

  return { width: contentWidth, height: contentHeight };
}

// ─── DFS post-order 순회 ─────────────────────────────────────────────

/**
 * DFS post-order 순회로 배치 배열 구성.
 *
 * 리프 노드를 먼저 배열에 추가하고, 이후 부모 노드가 자식 인덱스를
 * children 배열에 참조하는 방식으로 tree 구조를 평탄화한다.
 *
 * 이렇게 하면 Rust의 build_tree_batch()가 배열을 한 번만 순회하면서
 * 모든 자식이 이미 생성된 상태로 부모 노드를 생성할 수 있다.
 *
 * @param elementId      - 현재 처리 중인 노드의 요소 ID
 * @param elementsMap    - O(1) 요소 조회 맵
 * @param childrenMap    - O(1) 자식 ID 목록 조회 맵
 * @param availableWidth - 현재 노드에 사용 가능한 너비
 * @param availableHeight- 현재 노드에 사용 가능한 높이
 * @param getChildElements- 자식 Element 배열 accessor
 * @param parentComputed - 부모 computed style (CSS 상속용)
 * @param parentDisplay  - 부모 요소의 display 값 (CSS Blockification 적용 여부 결정)
 * @param batch          - 결과를 누적하는 배치 배열 (mutable)
 * @param indexMap       - elementId → batch 배열 인덱스 매핑 (mutable)
 */
function traversePostOrder(
  elementId: string,
  elementsMap: Map<string, Element>,
  childrenMap: Map<string, string[]>,
  availableWidth: number,
  availableHeight: number,
  getChildElements: (id: string) => Element[],
  parentComputed: ComputedStyle,
  parentDisplay: string,
  batch: PersistentBatchNode[],
  indexMap: Map<string, number>,
): void {
  const rawElement = elementsMap.get(elementId);
  if (!rawElement) return;

  // GAP 3: Implicit Style 통합 — 원본 자식 수집 후 applyImplicitStyles로 전처리
  const rawChildIds = childrenMap.get(elementId) ?? [];
  const rawChildren = rawChildIds
    .map(id => elementsMap.get(id))
    .filter((el): el is Element => el !== undefined);

  const { effectiveParent, filteredChildren } = applyImplicitStyles(
    rawElement,
    rawChildren,
    getChildElements,
    elementsMap,
  );

  // implicit style이 주입된 부모 요소 사용
  let element = effectiveParent;

  // filteredChildren 기반으로 유효한 자식 ID 목록 재구성
  const childIds = filteredChildren.map(child => child.id);

  // 1. computed style 계산 (CSS 상속 처리)
  const elementStyle = (element.props?.style ?? {}) as Record<string, unknown>;

  // GAP 1: CSS Blockification — 부모가 flex/grid면 현재 요소의 display를 blockify
  const shouldBlockify = FLEX_GRID_DISPLAYS.has(parentDisplay);
  let effectiveDisplay = getElementDisplay(element);

  if (shouldBlockify) {
    const blockified = blockifyDisplay(effectiveDisplay);
    if (blockified !== effectiveDisplay) {
      effectiveDisplay = blockified;
      element = {
        ...element,
        props: {
          ...element.props,
          style: {
            ...(element.props?.style as Record<string, unknown> ?? {}),
            display: blockified,
          },
        },
      };
    }
  }

  const computedStyle = resolveStyle(elementStyle, parentComputed);

  // 2. 자식들의 display 값 수집 (toTaffyDisplay inline-block 감지용)
  // filteredChildren 기준으로 blockified 값 사용
  const childDisplays: string[] = filteredChildren.map(childEl => {
    const rawDisplay = getElementDisplay(childEl);
    if (FLEX_GRID_DISPLAYS.has(effectiveDisplay)) {
      return blockifyDisplay(rawDisplay);
    }
    return rawDisplay;
  });

  // 3. 자식 먼저 재귀 (post-order)
  // Fix 6: 현재 요소의 content area 크기를 자식의 availableWidth/Height로 전달
  const childAvail = estimateChildAvailableSize(elementStyle, availableWidth, availableHeight);
  for (const childId of childIds) {
    traversePostOrder(
      childId,
      elementsMap,
      childrenMap,
      childAvail.width,
      childAvail.height,
      getChildElements,
      computedStyle,
      effectiveDisplay,   // 현재 요소의 display를 자식의 parentDisplay로 전달
      batch,
      indexMap,
    );
  }

  // 3.5. Synthetic children (e.g., `xxx__synlabel` from applyImplicitStyles) 처리
  // elementsMap에 없는 자식(Radio/Checkbox/Switch/Toggle의 합성 Label)을
  // leaf 노드로 Taffy 트리에 추가하여 레이아웃을 계산받게 한다.
  // 이를 통해 BuilderCanvas의 renderChildElement가 fullTreeLayoutMap에서 레이아웃을 조회 가능.
  for (const synthChild of filteredChildren) {
    if (elementsMap.has(synthChild.id) || indexMap.has(synthChild.id)) continue;

    const synthStyle = (synthChild.props?.style ?? {}) as Record<string, unknown>;
    const synthComputed = resolveStyle(synthStyle, computedStyle);
    const isSynthFlexChild = FLEX_GRID_DISPLAYS.has(effectiveDisplay);
    const synthEnriched = enrichWithIntrinsicSize(
      synthChild, childAvail.width, childAvail.height,
      synthComputed, [], getChildElements, isSynthFlexChild,
    );
    const synthRecord = buildNodeStyle(synthEnriched, synthComputed, [], effectiveDisplay);
    batch.push({ style: synthRecord, children: [], elementId: synthChild.id });
    indexMap.set(synthChild.id, batch.length - 1);
  }

  // 3.6. Implicit child style overrides → batch 반영
  // DFS post-order에서 자식은 부모보다 먼저 처리되어 원본 스타일로 batch에 등록됨.
  // applyImplicitStyles가 실제 자식(DB 요소)의 스타일을 변경한 경우
  // (e.g., Checkbox→Label marginLeft, SelectTrigger→SelectValue flex:1),
  // 이미 생성된 batch 엔트리에 변경사항을 패치한다.
  for (const filteredChild of filteredChildren) {
    const batchIdx = indexMap.get(filteredChild.id);
    if (batchIdx === undefined) continue;

    const originalEl = elementsMap.get(filteredChild.id);
    if (!originalEl) continue;

    // props.style 참조 비교 — 동일하면 applyImplicitStyles가 수정하지 않은 것
    if (filteredChild.props?.style === originalEl.props?.style) continue;

    const origStyle = (originalEl.props?.style ?? {}) as Record<string, unknown>;
    const modStyle = (filteredChild.props?.style ?? {}) as Record<string, unknown>;
    patchBatchStyleFromImplicit(batch[batchIdx].style, origStyle, modStyle);
  }

  // 4. enrichWithIntrinsicSize: intrinsic 크기 주입
  // CSS height:auto 일반 규칙:
  //   A. 컨테이너 (Taffy 자식 있음) → Taffy가 자식 border-box + padding + border로 자동 계산
  //   B. 리프 (Taffy 자식 없음) → intrinsic height 주입 (텍스트 측정 / spec shapes)
  const isFlexChild = parentDisplay === 'flex' || parentDisplay === 'inline-flex';
  const childElements = getChildElements(elementId);
  // hasTaffyChildren: 실제 Taffy 노드로 처리된 자식이 있는지 확인
  // synthetic children도 이제 indexMap에 포함되므로 정상적으로 true 반환
  const hasTaffyChildren = childIds.some(id => indexMap.has(id));

  // 모든 노드에 대해 전체 enrichment 수행 (width 등 유지)
  let enriched: Element = enrichWithIntrinsicSize(
    element, availableWidth, availableHeight,
    computedStyle, childElements, getChildElements, isFlexChild,
  );

  if (hasTaffyChildren) {
    // A. 컨테이너: CSS height:auto → enrichment가 주입한 height를 제거
    // 사용자가 명시한 CSS height는 보존, enrichment가 추가한 height만 제거
    // → Taffy가 자식 border-box + padding + border로 height를 자동 계산
    const originalHeight = elementStyle.height;
    if (!originalHeight || originalHeight === 'auto') {
      const enrichedStyle = (enriched.props?.style ?? {}) as Record<string, unknown>;
      if (enrichedStyle.height !== undefined && enrichedStyle.height !== originalHeight) {
        const { height: _, ...restStyle } = enrichedStyle;
        enriched = { ...enriched, props: { ...enriched.props, style: restStyle } };
      }
    }
  } else {
    // B. 리프: enrichWithIntrinsicSize의 early return guard로 height 미주입된 경우 보완
    // Panel 등 spec shapes 컴포넌트는 CSS height 없고 element children도 없지만
    // 시각적 콘텐츠가 있어 intrinsic height가 필요하다.
    const enrichedStyle = (enriched.props?.style ?? {}) as Record<string, unknown>;
    if (!enrichedStyle.height && (!elementStyle.height || elementStyle.height === 'auto')) {
      const intrinsicHeight = calculateContentHeight(
        element, availableWidth, childElements, getChildElements, computedStyle,
      );
      if (intrinsicHeight > 0) {
        const box = parseBoxModel(element, availableWidth, availableHeight);
        const borderBoxHeight = intrinsicHeight
          + box.padding.top + box.padding.bottom
          + box.border.top + box.border.bottom;
        enriched = {
          ...enriched,
          props: { ...enriched.props, style: { ...enrichedStyle, height: borderBoxHeight } },
        };
      }
    }
  }

  // 5. 현재 노드의 TaffyStyle 계산 → Record 변환
  const styleRecord = buildNodeStyle(enriched, computedStyle, childDisplays, parentDisplay);

  // 5.5. block→flex-row-wrap 변환 시 block-level 자식에 width:100% 주입
  // CSS block container 내 block-level 자식은 자동으로 부모 폭 100%이지만
  // Taffy flex-row-wrap 시뮬레이션에서는 명시적 설정 필요 (taffyDisplayAdapter 규칙)
  if (styleRecord.display === 'flex' && styleRecord.flexWrap === 'wrap') {
    for (let ci = 0; ci < childIds.length; ci++) {
      const childEl = elementsMap.get(childIds[ci]);
      const childStyle = (childEl?.props?.style ?? {}) as Record<string, unknown>;
      if (needsBlockChildFullWidth(childDisplays[ci], childStyle.width)) {
        const childBatchIdx = indexMap.get(childIds[ci]);
        if (childBatchIdx !== undefined) {
          batch[childBatchIdx].style.width = '100%';
        }
      }
    }
  }

  // 6. 자식 batch 인덱스 목록 구성 (filteredChildren 기반)
  const childIndices: number[] = [];
  for (const childId of childIds) {
    const childIdx = indexMap.get(childId);
    if (childIdx !== undefined) {
      childIndices.push(childIdx);
    }
  }

  // 7. 현재 노드를 배치 배열에 추가, 인덱스 매핑 저장
  const currentIndex = batch.length;
  batch.push({
    style: styleRecord,
    children: childIndices,
    elementId,
  });
  indexMap.set(elementId, currentIndex);
}

// ─── 증분 갱신 ──────────────────────────────────────────────────────

/**
 * Persistent 트리 증분 갱신.
 *
 * DFS 결과(batch)와 기존 persistent tree를 비교하여
 * 새 노드 추가 / 스타일 변경 / 자식 구조 변경 / 노드 삭제를 수행한다.
 *
 * PersistentTaffyTree 내부의 해시 비교로 실제 변경이 없는 노드는 자동 스킵되며,
 * Taffy의 dirty cache 덕분에 computeLayout()에서 변경 없는 서브트리는 O(1) 스킵된다.
 *
 * @returns DEV 전용: 실제 갱신된 스타일/자식/추가/삭제 수
 */
function incrementalUpdate(
  tree: PersistentTaffyTree,
  batch: PersistentBatchNode[],
  filteredChildIdsMap: Map<string, string[]>,
): { stylesUpdated: number; childrenUpdated: number; added: number; removed: number } {
  const stats = { stylesUpdated: 0, childrenUpdated: 0, added: 0, removed: 0 };
  const currentNodeIds = new Set(batch.map(n => n.elementId));

  // 1. 삭제된 노드 식별 (현재 batch에 없는 기존 노드)
  const allHandles = tree.getAllHandles();
  const removedIds: string[] = [];
  for (const existingId of allHandles.keys()) {
    if (!currentNodeIds.has(existingId)) {
      removedIds.push(existingId);
    }
  }

  // 2. post-order 순회: 새 노드 추가 + 기존 노드 스타일 갱신
  //    post-order 보장: 자식이 부모보다 먼저 처리되므로
  //    addNode 후 부모의 updateChildren 시 자식 handle이 이미 존재
  for (const node of batch) {
    if (tree.hasNode(node.elementId)) {
      if (tree.updateNodeStyle(node.elementId, node.style)) {
        stats.stylesUpdated++;
      }
    } else {
      tree.addNode(node.elementId, node.style);
      stats.added++;
    }
  }

  // 3. 자식 구조 갱신 (변경 감지는 PersistentTaffyTree 내부 hash 비교)
  for (const node of batch) {
    const childIds = filteredChildIdsMap.get(node.elementId) ?? [];
    if (tree.updateChildren(node.elementId, childIds)) {
      stats.childrenUpdated++;
    }
  }

  // 4. 삭제된 노드 제거 (자식 구조 갱신 후 → 더 이상 참조되지 않음)
  for (const id of removedIds) {
    tree.removeNode(id);
    stats.removed++;
  }

  return stats;
}

// ─── 공개 API ────────────────────────────────────────────────────────

/**
 * 전체 트리를 WASM Taffy로 레이아웃 계산.
 *
 * Phase 2: Persistent Taffy Tree
 * - Path A (초기 빌드): DFS → buildFull() → computeLayout() → getLayoutsBatch()
 * - Path B (증분 갱신): DFS → incrementalUpdate() → computeLayout() → getLayoutsBatch()
 *
 * DFS 순회는 항상 수행 (implicit style, enrichment, CSS resolve 필요).
 * 초기 빌드 후 증분 갱신은 변경된 노드만 WASM 호출하여
 * Taffy internal dirty cache를 최대한 활용한다.
 *
 * WASM 엔진이 사용 불가하거나 실패하면 null을 반환한다.
 * 호출부(BuilderCanvas)는 null 수신 시 레거시 레벨별 폴백으로 전환해야 한다.
 *
 * @param rootElementId  - 루트 컨테이너 요소 ID (보통 body 또는 page root)
 * @param elementsMap    - O(1) 요소 조회 맵 (store의 elementsMap)
 * @param childrenMap    - O(1) 자식 ID 목록 맵 (store의 childrenMap)
 * @param availableWidth - 루트에 제공할 가용 너비 (px)
 * @param availableHeight- 루트에 제공할 가용 높이 (px)
 * @param getChildElements - elementId → Element[] accessor
 * @returns elementId → ComputedLayout 맵, 실패 시 null
 */
export function calculateFullTreeLayout(
  rootElementId: string,
  elementsMap: Map<string, Element>,
  childrenMap: Map<string, string[]>,
  availableWidth: number,
  availableHeight: number,
  getChildElements: (id: string) => Element[],
): Map<string, ComputedLayout> | null {
  // WASM 가용성 확인
  if (!isRustWasmReady()) return null;

  // 루트 요소 존재 확인
  const rootEl = elementsMap.get(rootElementId);
  if (!rootEl) return null;

  // 페이지별 persistent tree 조회/생성
  const pageId = rootEl.page_id ?? '__default__';
  let persistentTree = persistentTrees.get(pageId);
  if (!persistentTree) {
    persistentTree = new PersistentTaffyTree();
    persistentTrees.set(pageId, persistentTree);
  }
  if (!persistentTree.isAvailable) return null;

  // ── Step 1: DFS post-order 순회 → 배치 배열 구성 ──────────────────
  //    (항상 수행 — implicit style, enrichment, CSS resolve 필요)
  const batch: PersistentBatchNode[] = [];
  const indexMap = new Map<string, number>();

  traversePostOrder(
    rootElementId,
    elementsMap,
    childrenMap,
    availableWidth,
    availableHeight,
    getChildElements,
    ROOT_COMPUTED_STYLE,
    'block',  // 루트의 부모 display (기본값: block)
    batch,
    indexMap,
  );

  if (batch.length === 0) return null;

  // ── Step 1.5: Body(root) 요소에 breakpoint 페이지 크기 명시 ─────────
  // CSS height:auto → block 요소는 콘텐츠 높이에 맞춤 (body 높이 = 24px 문제)
  // 빌더 특수 케이스: body 크기 = breakpoint 토글 크기
  // → 자식의 width/height:100%가 페이지 크기 기준으로 계산되도록 보장
  //
  // NOTE: availableWidth/Height는 content-box (pageWidth - padding - border)
  //       Taffy style.size = border-box → padding/border 포함한 전체 페이지 크기 필요
  const rootIdx = indexMap.get(rootElementId);
  if (rootIdx !== undefined) {
    const rootEl = elementsMap.get(rootElementId);
    if (rootEl && rootEl.tag.toLowerCase() === 'body') {
      const rootStyle = (rootEl.props?.style ?? {}) as Record<string, unknown>;
      const bp = parsePadding(rootStyle, availableWidth);
      const bb = parseBorder(rootStyle);
      const pageW = availableWidth + bp.left + bp.right + bb.left + bb.right;
      const pageH = availableHeight + bp.top + bp.bottom + bb.top + bb.bottom;
      batch[rootIdx].style.width = `${pageW}px`;
      batch[rootIdx].style.height = `${pageH}px`;
    }
  }

  // ── Step 2: filteredChildIds 맵 구성 (batch 인덱스 → elementId 변환) ──
  const filteredChildIdsMap = new Map<string, string[]>();
  for (const node of batch) {
    filteredChildIdsMap.set(
      node.elementId,
      node.children.map(idx => batch[idx].elementId),
    );
  }

  // Fix 1: 트리 소스 일원화 — filteredChildIdsMap 공유
  // Multi-page: rootElement의 page_id로 페이지별 저장
  const rootPageId = elementsMap.get(rootElementId)?.page_id;
  publishFilteredChildrenMap(filteredChildIdsMap, rootPageId ?? undefined);

  // ── Step 3: 초기 빌드 또는 증분 갱신 ──────────────────────────────
  try {
    if (!persistentTree.isInitialized) {
      // Path A: 초기 빌드 (buildTreeBatch 1회 WASM 호출)
      persistentTree.buildFull(rootElementId, batch, filteredChildIdsMap);
    } else {
      // Path B: 증분 갱신 (변경된 노드만 WASM 호출)
      const stats = incrementalUpdate(persistentTree, batch, filteredChildIdsMap);

      if (import.meta.env.DEV && (stats.stylesUpdated + stats.added + stats.removed > 0)) {
        console.log(
          `[fullTreeLayout] Incremental: styles=${stats.stylesUpdated}, ` +
          `children=${stats.childrenUpdated}, added=${stats.added}, removed=${stats.removed}`,
        );
      }
    }

    // ── Step 4: 레이아웃 계산 ─────────────────────────────────────────
    persistentTree.computeLayout(availableWidth, availableHeight);

    // ── Step 5: 결과 수집 → Map<elementId, ComputedLayout> ──────────
    const layoutBatch = persistentTree.getLayoutsBatch();
    const result = new Map<string, ComputedLayout>();

    for (let i = 0; i < batch.length; i++) {
      const node = batch[i];
      const handle = persistentTree.getHandle(node.elementId);
      if (handle === undefined) continue;
      const layoutResult = layoutBatch.get(handle);
      if (!layoutResult) continue;

      // margin 정보 (ComputedLayout.margin 필드용)
      const elementStyle = (elementsMap.get(node.elementId)?.props?.style ?? {}) as Record<string, unknown>;
      const margin = parseMargin(elementStyle);

      result.set(node.elementId, {
        elementId: node.elementId,
        x: layoutResult.x,
        y: layoutResult.y,
        width: layoutResult.width,
        height: layoutResult.height,
        margin: {
          top: margin.top,
          right: margin.right,
          bottom: margin.bottom,
          left: margin.left,
        },
      });
    }

    // GAP 4: overflow:scroll/auto 요소의 maxScroll 업데이트
    for (const [elementId, layout] of result) {
      const el = elementsMap.get(elementId);
      const elStyle = (el?.props?.style ?? {}) as Record<string, unknown>;
      const overflow = elStyle?.overflow as string | undefined;
      if (overflow === 'scroll' || overflow === 'auto') {
        const scrollChildIds = childrenMap.get(elementId) ?? [];
        let maxRight = 0;
        let maxBottom = 0;
        for (const cid of scrollChildIds) {
          const cl = result.get(cid);
          if (cl) {
            maxRight = Math.max(maxRight, cl.x + cl.width + (cl.margin?.right ?? 0));
            maxBottom = Math.max(maxBottom, cl.y + cl.height + (cl.margin?.bottom ?? 0));
          }
        }
        useScrollState.getState().updateMaxScroll(
          elementId,
          Math.max(0, maxBottom - layout.height),
          Math.max(0, maxRight - layout.width),
        );
      }
    }

    return result;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error('[fullTreeLayout] WASM failed:', err);
    }
    // 에러 시 해당 페이지의 persistent tree만 리셋 → 다음 프레임에 초기 빌드(Path A) 재시도
    resetPersistentTree(pageId);
    return null;
  }
  // Phase 1: finally { taffy.clear() } 제거 — persistent tree 유지
}
