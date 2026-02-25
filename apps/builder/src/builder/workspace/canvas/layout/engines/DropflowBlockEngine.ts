/**
 * Dropflow Fork 기반 블록 레이아웃 엔진
 *
 * 기존 BlockEngine과 동일한 LayoutEngine 인터페이스를 구현하되,
 * 내부적으로 packages/layout-flow의 Dropflow Fork를 사용하여
 * CSS 명세에 더 부합하는 블록 레이아웃을 계산합니다.
 *
 * Feature Flag(dropflowBlockLayout)가 활성화된 경우에만 사용됩니다.
 *
 * 차이점 vs BlockEngine:
 * - margin collapse: Dropflow BFC가 완전한 CSS 명세를 구현
 * - float 지원: BlockEngine에 없는 float 레이아웃 처리
 * - replaced elements: img/video 등을 ReplacedBox로 올바르게 처리
 *
 * @since Phase 3 - BlockEngine → Dropflow Fork 교체
 */

import type { Element } from '../../../../../types/core/store.types';
import type { LayoutEngine, ComputedLayout, LayoutContext } from './LayoutEngine';
import {
  calculateBlockLayout,
  elementStyleToDropflowStyle,
} from '@xstudio/layout-flow';
import type {
  XElement,
  XComputedLayout,
  XLayoutContext,
} from '@xstudio/layout-flow';
import { enrichWithIntrinsicSize, INLINE_BLOCK_TAGS, calculateBaseline, parsePadding, parseBorder } from './utils';
import { resolveStyle, ROOT_COMPUTED_STYLE } from './cssResolver';
import type { ComputedStyle } from './cssResolver';
import {
  MIN_CONTENT,
  MAX_CONTENT,
  FIT_CONTENT,
  resolveCSSSizeValue,
} from './cssValueParser';
import type { CSSValueContext } from './cssValueParser';

// ---------------------------------------------------------------------------
// Element → XElement 변환
// ---------------------------------------------------------------------------

/**
 * apps/builder Element를 layout-flow XElement로 변환
 *
 * Element와 XElement는 구조가 거의 동일하지만
 * 패키지 간 의존을 피하기 위해 XElement로 재정의되어 있습니다.
 */
function elementToXElement(element: Element): XElement {
  return {
    id: element.id,
    tag: element.tag ?? 'div',
    props: (element.props ?? {}) as Record<string, unknown>,
    parent_id: element.parent_id ?? null,
    order_num: element.order_num,
  };
}

/**
 * LayoutContext를 XLayoutContext로 변환
 *
 * parentComputedStyle은 XLayoutContext에 없으므로 전달하지 않는다.
 * CSS 상속 처리는 DropflowBlockEngine 레이어에서 담당한다.
 */
function contextToXContext(context: LayoutContext | undefined): XLayoutContext | undefined {
  if (!context) return undefined;
  return {
    bfcId: context.bfcId,
    prevSiblingMarginBottom: context.prevSiblingMarginBottom,
    parentMarginCollapse: context.parentMarginCollapse,
    viewportWidth: context.viewportWidth,
    viewportHeight: context.viewportHeight,
    parentDisplay: context.parentDisplay,
  };
}

/**
 * XComputedLayout을 ComputedLayout으로 변환
 */
function xLayoutToComputedLayout(xl: XComputedLayout): ComputedLayout {
  return {
    elementId: xl.elementId,
    x: xl.x,
    y: xl.y,
    width: xl.width,
    height: xl.height,
    margin: xl.margin,
  };
}

// ---------------------------------------------------------------------------
// Inline-block 흐름 계산
// ---------------------------------------------------------------------------

/**
 * CSS/React Aria에서 vertical-align: middle이 기본인 태그.
 * Button.css, ToggleButton.css 등에서 설정됨.
 * 브라우저 UA stylesheet에서도 button/input 계열은 middle이 기본.
 */
const VERTICAL_ALIGN_MIDDLE_TAGS = new Set([
  'button', 'submitbutton', 'fancybutton', 'togglebutton',
  'checkbox', 'radio', 'switch', 'toggle',
  'togglebuttongroup',
  'badge', 'tag', 'chip',
  'textfield', 'numberfield', 'searchfield',
  'select', 'combobox',
  'colorpicker',
  'datepicker', 'daterangepicker',
  'slider',
]);

/**
 * 요소가 inline-block으로 배치되어야 하는지 판별
 *
 * CSS 스펙에서 기본 display가 inline-block인 태그이면서
 * 명시적으로 display: block 등이 설정되지 않은 경우 true.
 */
function isInlineBlockElement(element: Element): boolean {
  const style = element.props?.style as Record<string, unknown> | undefined;
  const display = style?.display as string | undefined;

  // 명시적 display가 있으면 그것을 따름
  if (display === 'block' || display === 'flex' || display === 'grid' ||
      display === 'flow-root' || display === 'none') {
    return false;
  }
  if (display === 'inline' || display === 'inline-block') {
    return true;
  }

  // display 미지정: 태그 기반 기본값
  const tag = (element.tag ?? '').toLowerCase();
  return INLINE_BLOCK_TAGS.has(tag);
}

/** 세그먼트 타입 */
type Segment = {
  type: 'inline' | 'block';
  children: Element[];
};

/**
 * 자식 요소들을 연속된 inline/block 세그먼트로 분할
 *
 * [button, button, div, button] →
 * [{ type: 'inline', [button, button] }, { type: 'block', [div] }, { type: 'inline', [button] }]
 */
function segmentChildren(children: Element[]): Segment[] {
  const segments: Segment[] = [];
  let current: Segment | null = null;

  for (const child of children) {
    const isInline = isInlineBlockElement(child);
    const type = isInline ? 'inline' : 'block';

    if (current && current.type === type) {
      current.children.push(child);
    } else {
      current = { type, children: [child] };
      segments.push(current);
    }
  }

  return segments;
}

/**
 * inline-block 요소들을 가로 배치 (줄바꿈 포함)
 *
 * CSS inline formatting context의 inline-block 배치를 에뮬레이트:
 * - 왼쪽에서 오른쪽으로 배치
 * - availableWidth 초과 시 다음 줄로 이동
 * - 각 줄 높이는 해당 줄 요소들의 최대 높이
 *
 * RC-3: cssCtx를 통해 em/rem/vh/vw 단위를 올바르게 해석
 */
function layoutInlineRun(
  children: Element[],
  availableWidth: number,
  availableHeight: number,
  startY: number,
  cssCtx: CSSValueContext = {},
): ComputedLayout[] {
  // --- Pass 1: 줄 분할 + 요소 크기 계산 ---
  type ItemInfo = {
    child: Element;
    w: number;
    h: number;
    margin: { top: number; right: number; bottom: number; left: number };
    verticalAlign: string;
  };
  type Line = { items: ItemInfo[]; lineHeight: number; lineX: number };

  const lines: Line[] = [];
  let currentLine: Line = { items: [], lineHeight: 0, lineX: 0 };
  lines.push(currentLine);

  for (const child of children) {
    const style = child.props?.style as Record<string, unknown> | undefined;

    // RC-3: cssCtx 전달로 em/rem 단위 올바르게 해석
    const w = resolveCSSLength(style?.width, availableWidth, cssCtx);
    const h = resolveCSSLength(style?.height, availableHeight, cssCtx);

    const marginLeft = parseNumericStyle(style?.marginLeft) ?? parseNumericStyle(style?.margin) ?? 0;
    const marginRight = parseNumericStyle(style?.marginRight) ?? parseNumericStyle(style?.margin) ?? 0;
    const marginTop = parseNumericStyle(style?.marginTop) ?? parseNumericStyle(style?.margin) ?? 0;
    const marginBottom = parseNumericStyle(style?.marginBottom) ?? parseNumericStyle(style?.margin) ?? 0;
    // vertical-align: 인라인 스타일 우선, 없으면 태그 기본값 사용
    // Button, Badge 등은 CSS(React Aria)에서 vertical-align: middle이 기본
    const tag = (child.tag ?? '').toLowerCase();
    const tagDefault = VERTICAL_ALIGN_MIDDLE_TAGS.has(tag) ? 'middle' : 'baseline';
    const verticalAlign = (style?.verticalAlign as string) ?? tagDefault;

    const totalW = marginLeft + w + marginRight;
    const totalH = marginTop + h + marginBottom;

    // 줄바꿈
    if (currentLine.lineX > 0 && currentLine.lineX + totalW > availableWidth) {
      currentLine = { items: [], lineHeight: 0, lineX: 0 };
      lines.push(currentLine);
    }

    const item: ItemInfo = { child, w, h, margin: { top: marginTop, right: marginRight, bottom: marginBottom, left: marginLeft }, verticalAlign };
    currentLine.items.push(item);
    currentLine.lineX += totalW;
    currentLine.lineHeight = Math.max(currentLine.lineHeight, totalH);
  }

  // --- Pass 2: 수직 정렬 적용 후 ComputedLayout 생성 ---
  const results: ComputedLayout[] = [];
  let lineY = startY;

  for (const line of lines) {
    // RC-5: baseline 정렬을 위한 line-level baseline 계산
    // 각 baseline-aligned 아이템의 baseline을 계산하고, line의 최대 baseline을 결정
    let lineBaseline = 0;
    for (const item of line.items) {
      if (item.verticalAlign === 'baseline' || item.verticalAlign === undefined) {
        const itemBaseline = item.margin.top + calculateBaseline(item.child, item.h);
        if (itemBaseline > lineBaseline) lineBaseline = itemBaseline;
      }
    }

    let x = 0;
    for (const item of line.items) {
      const { child, w, h, margin, verticalAlign } = item;
      const outerH = margin.top + h + margin.bottom;

      // vertical-align에 따른 Y 오프셋 계산
      let yOffset: number;
      switch (verticalAlign) {
        case 'top':
          yOffset = margin.top;
          break;
        case 'bottom':
          yOffset = line.lineHeight - h - margin.bottom;
          break;
        case 'middle':
          yOffset = (line.lineHeight - outerH) / 2 + margin.top;
          break;
        case 'baseline':
        default: {
          // RC-5: 실제 CSS baseline 정렬
          // 아이템의 baseline을 line의 공통 baseline에 맞춤
          const itemBaseline = margin.top + calculateBaseline(child, h);
          yOffset = lineBaseline - itemBaseline + margin.top;
          break;
        }
      }

      results.push({
        elementId: child.id,
        x: x + margin.left,
        y: lineY + yOffset,
        width: w,
        height: h,
        margin,
      });

      x += margin.left + w + margin.right;
    }

    lineY += line.lineHeight;
  }

  return results;
}

/**
 * CSS 길이 값을 pixel 숫자로 변환
 *
 * - number: 그대로 사용 (enrichWithIntrinsicSize가 주입한 값)
 * - '200px': 200
 * - '100%': available 기준으로 계산
 * - 'auto', 'fit-content', 'min-content', 'max-content': 0 (enrichWithIntrinsicSize가 이미 처리)
 * - sentinel 숫자(FIT_CONTENT=-2, MIN_CONTENT=-3, MAX_CONTENT=-4): 0으로 처리
 *   (layoutInlineRun에서 enriched 요소의 스타일을 읽으므로 sentinel이 그대로 전달될 수 있음)
 *
 * RC-3: cssCtx를 통해 em(parentSize), rem(rootFontSize), vh/vw 단위를 올바르게 해석
 */
function resolveCSSLength(value: unknown, available: number, cssCtx: CSSValueContext = {}): number {
  if (typeof value === 'number') {
    // RC-6: sentinel 값 fallback — enrichment 실패 시 available 사용
    // fit-content/max-content → 사용 가능 공간 전체로 fallback
    if (value === FIT_CONTENT || value === MAX_CONTENT) return available;
    // min-content → 0 유지 (최소 콘텐츠)
    if (value === MIN_CONTENT) return 0;
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    // RC-6: intrinsic 키워드 fallback — block context의 auto = 100%
    if (trimmed === 'auto' || trimmed === 'fit-content' || trimmed === 'max-content') {
      return available;
    }
    if (trimmed === 'min-content') return 0;
    if (trimmed.endsWith('%')) {
      return (parseFloat(trimmed) / 100) * available;
    }
    if (trimmed.endsWith('px')) {
      return parseFloat(trimmed);
    }
    // RC-6: resolveCSSSizeValue로 rem/em/vh/vw 등 CSS 단위 해석
    // RC-3: cssCtx의 parentSize(em 기준), rootFontSize(rem 기준) 전달
    const resolvedPx = resolveCSSSizeValue(trimmed, cssCtx);
    if (resolvedPx !== undefined && resolvedPx >= 0) return resolvedPx;
    // 단위 없는 숫자 문자열
    const n = parseFloat(trimmed);
    if (!isNaN(n) && /^-?\d+(\.\d+)?$/.test(trimmed)) return n;
  }
  return 0;
}

/**
 * 스타일 값을 숫자로 파싱 (undefined/비숫자는 null 반환)
 */
function parseNumericStyle(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    if (!isNaN(n)) return n;
  }
  return null;
}

// ---------------------------------------------------------------------------
// DropflowBlockEngine
// ---------------------------------------------------------------------------

/**
 * Dropflow Fork 기반 블록 레이아웃 엔진
 *
 * LayoutEngine 인터페이스를 구현하여 기존 BlockEngine의 드롭인 교체로 사용 가능.
 *
 * 내부적으로 Dropflow의 BlockFormattingContext를 사용하므로
 * CSS 명세에 더 부합하는 margin collapse, float 처리를 제공합니다.
 */
export class DropflowBlockEngine implements LayoutEngine {
  /**
   * 처리 가능한 display 타입 목록
   *
   * BlockEngine과 동일하게 block, inline-block, inline, flow-root를 처리.
   * flex/grid는 FlexEngine/GridEngine이 처리하므로 제외.
   */
  readonly displayTypes = ['block', 'inline-block', 'inline', 'flow-root'];

  calculate(
    parent: Element,
    children: Element[],
    availableWidth: number,
    availableHeight: number,
    context?: LayoutContext,
  ): ComputedLayout[] {
    if (children.length === 0) return [];

    // ── CSS 상속 체인 구성 ──────────────────────────────────────────
    // 부모의 computed style 결정:
    //   - context에 parentComputedStyle이 있으면 사용 (상위 엔진에서 전파됨)
    //   - 없으면 부모 요소 style을 ROOT_COMPUTED_STYLE 기반으로 직접 해석
    const parentRawStyle = parent.props?.style as Record<string, unknown> | undefined;
    const parentComputed: ComputedStyle = context?.parentComputedStyle
      ?? resolveStyle(parentRawStyle, ROOT_COMPUTED_STYLE);

    // intrinsic size 주입 (height + inline-block width)
    // 각 자식의 computed style을 계산하여 enrichWithIntrinsicSize에 전달
    const getChildElements = context?.getChildElements;
    const enriched = children.map(child => {
      const childRawStyle = child.props?.style as Record<string, unknown> | undefined;
      const childComputed = resolveStyle(childRawStyle, parentComputed);
      const childChildren = getChildElements?.(child.id);
      return enrichWithIntrinsicSize(child, availableWidth, availableHeight, childComputed, childChildren, getChildElements);
    });

    // border-box % 폭 변환: Web preview는 * { box-sizing: border-box } 전역 적용.
    // Dropflow는 content-box이므로 % width에 padding+border가 추가되어 부모를 초과함.
    // 해결: % width를 border-box 기준 pixel content width로 변환.
    const boxSizeConverted = enriched.map(child => {
      const style = child.props?.style as Record<string, unknown> | undefined;
      const rawW = style?.width;
      if (typeof rawW !== 'string' || !rawW.endsWith('%')) return child;
      const pct = parseFloat(rawW);
      if (isNaN(pct)) return child;
      const pad = parsePadding(style, availableWidth);
      const bdr = parseBorder(style);
      const padBorderH = pad.left + pad.right + bdr.left + bdr.right;
      if (padBorderH === 0) return child; // padding/border 없으면 변환 불필요
      const resolved = (pct / 100) * availableWidth;
      const contentW = Math.max(0, resolved - padBorderH);
      return {
        ...child,
        props: { ...child.props, style: { ...style, width: contentW } },
      } as Element;
    });

    // inline-block 태그 존재 여부 확인
    const hasInlineBlock = boxSizeConverted.some(child => isInlineBlockElement(child));

    // inline-block이 없으면 전통적인 Dropflow 경로
    if (!hasInlineBlock) {
      return this._dropflowCalculate(parent, boxSizeConverted, availableWidth, availableHeight, context);
    }

    // inline-block이 있으면 세그먼트 분할 후 혼합 레이아웃
    // RC-3: parentComputed를 전달하여 em/rem 단위 해석에 사용
    return this._mixedCalculate(parent, boxSizeConverted, availableWidth, availableHeight, context, parentComputed);
  }

  /**
   * 순수 block 레이아웃 (Dropflow 위임)
   */
  private _dropflowCalculate(
    parent: Element,
    children: Element[],
    availableWidth: number,
    availableHeight: number,
    context?: LayoutContext,
  ): ComputedLayout[] {
    const xParent = elementToXElement(parent);
    const xChildren = children.map(elementToXElement);
    const xContext = contextToXContext(context);

    const xLayouts = calculateBlockLayout(
      xParent,
      xChildren,
      availableWidth,
      availableHeight,
      xContext,
    );

    return xLayouts.map(xLayoutToComputedLayout);
  }

  /**
   * block + inline-block 혼합 레이아웃
   *
   * CSS 스펙에 따라 block 컨테이너 내에서:
   * - block 요소: full-width, 세로 쌓임 (Dropflow 위임)
   * - inline-block 요소: 가로 배치 + 줄바꿈 (직접 계산)
   *
   * 연속된 inline-block 요소들은 "inline run"으로 묶여 가로 배치됨.
   * block 요소가 나타나면 inline run을 끊고 세로 쌓임으로 전환.
   *
   * RC-3: parentComputed를 받아 em/rem 단위 해석용 cssCtx를 구성
   */
  private _mixedCalculate(
    parent: Element,
    children: Element[],
    availableWidth: number,
    availableHeight: number,
    context?: LayoutContext,
    parentComputed?: ComputedStyle,
  ): ComputedLayout[] {
    // 1. 세그먼트 분할: 연속된 inline-block → 'inline' 세그먼트, block → 'block' 세그먼트
    const segments = segmentChildren(children);

    const results: ComputedLayout[] = [];
    let currentY = 0;

    // 부모 margin 정보
    const parentStyle = parent.props?.style as Record<string, unknown> | undefined;
    const parentMarginTop = parseNumericStyle(parentStyle?.marginTop) ?? 0;
    currentY += parentMarginTop > 0 ? 0 : 0; // margin은 외부에서 처리

    // RC-3: 부모 computedStyle 기반 CSS 단위 해석 컨텍스트 구성
    // parentSize: em 단위 기준 (부모 font-size)
    // rootFontSize: rem 단위 기준 (16px 고정)
    const cssCtx: CSSValueContext = {
      parentSize: parentComputed?.fontSize ?? 16,
      rootFontSize: 16,
      viewportWidth: context?.viewportWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 1920),
      viewportHeight: context?.viewportHeight ?? (typeof window !== 'undefined' ? window.innerHeight : 1080),
    };

    for (const segment of segments) {
      if (segment.type === 'inline') {
        // inline-block 가로 배치 (줄바꿈 포함)
        const inlineResults = layoutInlineRun(
          segment.children,
          availableWidth,
          availableHeight,
          currentY,
          cssCtx,
        );
        results.push(...inlineResults);
        // H3: 다음 세그먼트의 Y 시작점 = inline run의 최대 하단 (margin 포함)
        for (const r of inlineResults) {
          const marginBottom = r.margin?.bottom ?? 0;
          currentY = Math.max(currentY, r.y + r.height + marginBottom);
        }
      } else {
        // block 요소 Dropflow 위임
        const blockResults = this._dropflowCalculate(
          parent,
          segment.children,
          availableWidth,
          availableHeight - currentY,
          context,
        );
        // Dropflow 결과에 Y 오프셋 적용
        for (const r of blockResults) {
          r.y += currentY;
          results.push(r);
        }
        // H3: 다음 세그먼트의 Y 시작점 (margin bottom 포함)
        for (const r of blockResults) {
          const marginBottom = r.margin?.bottom ?? 0;
          currentY = Math.max(currentY, r.y + r.height + marginBottom);
        }
      }
    }

    return results;
  }

  /**
   * 요소가 새로운 BFC(Block Formatting Context)를 생성하는지 확인
   *
   * Dropflow Style의 display/overflow/float/position으로 판별.
   * 기존 BlockEngine.createsBFC()와 동일한 조건을 사용합니다.
   */
  createsBFC(element: Element): boolean {
    const xElement = elementToXElement(element);
    const style = elementStyleToDropflowStyle(xElement);

    // display.inner === 'flow-root'
    if (style.display.inner === 'flow-root') return true;

    // display.outer === 'inline' (inline-block)
    if (style.display.outer === 'inline') return true;

    // overflow 기반 BFC (Dropflow Style은 'visible' | 'hidden'만 지원)
    if (style.overflow === 'hidden') return true;

    // float 기반 BFC
    if (style.float !== 'none') return true;

    // position 기반 BFC (absolute, fixed 모두 BFC 생성)
    if (style.position === 'absolute') return true;

    // display: flex / grid (Dropflow는 block으로 폴백하지만 BFC 생성 여부는 올바르게 판별)
    const raw = element.props?.style as Record<string, unknown> | undefined;
    const display = raw?.display as string | undefined;
    if (
      display === 'flex' ||
      display === 'inline-flex' ||
      display === 'grid' ||
      display === 'inline-grid'
    ) {
      return true;
    }

    // position: fixed도 BFC 생성 (Dropflow Style에서 absolute로 변환되므로 raw에서 별도 확인)
    const position = raw?.position as string | undefined;
    if (position === 'fixed') return true;

    return false;
  }
}
