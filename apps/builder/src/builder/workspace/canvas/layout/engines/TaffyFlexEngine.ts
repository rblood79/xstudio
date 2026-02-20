/**
 * Taffy 기반 Flexbox 레이아웃 엔진
 *
 * Yoga/@pixi/layout 위임 대신 Taffy WASM을 직접 호출하여
 * Flexbox 레이아웃을 계산합니다.
 *
 * Feature Flag(useTaffyFlex)가 활성화된 경우에만 사용됩니다.
 *
 * @since 2026-02-17 Phase 5 - Flex Yoga → Taffy 전환
 */

import type { Element } from '../../../../../types/core/store.types';
import type { LayoutEngine, ComputedLayout, LayoutContext } from './LayoutEngine';
import { TaffyLayout } from '../../wasm-bindings/taffyLayout';
import type { TaffyStyle, TaffyNodeHandle } from '../../wasm-bindings/taffyLayout';
import { parseMargin, parsePadding, parseBorder, enrichWithIntrinsicSize, INLINE_BLOCK_TAGS } from './utils';
import { resolveStyle, ROOT_COMPUTED_STYLE } from './cssResolver';
import type { ComputedStyle } from './cssResolver';
import { resolveCSSSizeValue } from './cssValueParser';
import type { CSSValueContext } from './cssValueParser';

// ─── Style conversion ────────────────────────────────────────────────

/**
 * CSS 값을 Taffy style 문자열로 변환
 * - number → "Npx"
 * - string (%, px 등) → 그대로 전달
 * - undefined → 생략
 */
function dimStr(value: number | string | undefined): string | undefined {
  if (value === undefined || value === null || value === '' || value === 'auto') return undefined;
  if (typeof value === 'number') return `${value}px`;
  return value;
}

/**
 * Element의 style을 TaffyStyle로 변환
 *
 * Taffy 네이티브 형식으로 직접 변환합니다.
 * fit-content, 태그별 크기 계산은 engines/utils.ts의 유틸리티를 사용합니다.
 */
export function elementToTaffyStyle(
  element: Element,
  _computedStyle?: ComputedStyle,
  ctx: CSSValueContext = {},
): TaffyStyle {
  const style = (element.props?.style || {}) as Record<string, unknown>;
  const result: TaffyStyle = {};

  // Display
  const display = style.display as string | undefined;
  if (display === 'flex' || display === 'inline-flex') {
    result.display = 'flex';
  } else if (display === 'none') {
    result.display = 'none';
  } else {
    // Flex 컨텍스트에서의 기본 자식은 flex item
    result.display = 'flex';
  }

  // Position
  // CSS position:absolute / position:fixed → Taffy Position::Absolute
  // CSS position:relative → Taffy Position::Relative (Taffy 기본값이지만 명시적으로 전달)
  // CSS position:static / 미지정 → Taffy 기본값(Relative)
  if (style.position === 'absolute' || style.position === 'fixed') {
    result.position = 'absolute';
  } else if (style.position === 'relative') {
    result.position = 'relative';
    // relative offset(top/left/right/bottom)은 Taffy가 직접 지원하지 않으므로
    // 레이아웃 계산 결과에 가산하는 방식으로 처리 (computeWithTaffy에서 적용)
  }
  // static / sticky / 미지정은 Taffy 기본값(relative)으로 처리되므로 별도 설정 불필요

  // Size
  const widthVal = parseCSSPropWithContext(style.width, ctx);
  const heightVal = parseCSSPropWithContext(style.height, ctx);
  const widthStr = dimStr(widthVal);
  const heightStr = dimStr(heightVal);
  if (widthStr) result.width = widthStr;
  if (heightStr) result.height = heightStr;

  // Min/Max size
  const minW = dimStr(parseCSSPropWithContext(style.minWidth, ctx));
  const minH = dimStr(parseCSSPropWithContext(style.minHeight, ctx));
  const maxW = dimStr(parseCSSPropWithContext(style.maxWidth, ctx));
  const maxH = dimStr(parseCSSPropWithContext(style.maxHeight, ctx));
  if (minW) result.minWidth = minW;
  if (minH) result.minHeight = minH;
  if (maxW) result.maxWidth = maxW;
  if (maxH) result.maxHeight = maxH;

  // flex-flow shorthand 파싱: "flex-direction flex-wrap" 복합 값
  // 개별 속성(flexDirection, flexWrap)이 이미 설정되어 있으면 shorthand보다 우선합니다.
  let resolvedFlexDirection = style.flexDirection as string | undefined;
  let resolvedFlexWrap = style.flexWrap as string | undefined;
  if (style.flexFlow) {
    const parts = String(style.flexFlow).split(/\s+/);
    for (const part of parts) {
      if (['row', 'column', 'row-reverse', 'column-reverse'].includes(part)) {
        resolvedFlexDirection = resolvedFlexDirection ?? part;
      } else if (['nowrap', 'wrap', 'wrap-reverse'].includes(part)) {
        resolvedFlexWrap = resolvedFlexWrap ?? part;
      }
    }
  }

  // Flex direction
  if (resolvedFlexDirection) {
    result.flexDirection = resolvedFlexDirection as TaffyStyle['flexDirection'];
  }

  // Flex wrap
  if (resolvedFlexWrap) {
    result.flexWrap = resolvedFlexWrap as TaffyStyle['flexWrap'];
  }

  // Justify content
  if (style.justifyContent) {
    result.justifyContent = style.justifyContent as TaffyStyle['justifyContent'];
  }

  // Align items
  if (style.alignItems) {
    result.alignItems = style.alignItems as TaffyStyle['alignItems'];
  }

  // Align content
  if (style.alignContent) {
    result.alignContent = style.alignContent as TaffyStyle['alignContent'];
  }

  // Flex item properties
  if (style.flexGrow !== undefined) result.flexGrow = Number(style.flexGrow);
  if (style.flexShrink !== undefined) result.flexShrink = Number(style.flexShrink);
  if (style.flexBasis !== undefined) {
    const basis = parseCSSPropWithContext(style.flexBasis, ctx);
    if (basis !== undefined) result.flexBasis = dimStr(basis) ?? 'auto';
  }

  // Align self
  if (style.alignSelf) {
    result.alignSelf = style.alignSelf as TaffyStyle['alignSelf'];
  }

  // Order (flex item 순서 제어)
  const order = parseInt(String(style.order ?? '0'), 10);
  if (!isNaN(order) && order !== 0) {
    result.order = order;
  }

  // Margin
  const margin = parseMargin(style);
  if (margin.top !== 0) result.marginTop = `${margin.top}px`;
  if (margin.right !== 0) result.marginRight = `${margin.right}px`;
  if (margin.bottom !== 0) result.marginBottom = `${margin.bottom}px`;
  if (margin.left !== 0) result.marginLeft = `${margin.left}px`;

  // Padding
  const padding = parsePadding(style);
  if (padding.top !== 0) result.paddingTop = `${padding.top}px`;
  if (padding.right !== 0) result.paddingRight = `${padding.right}px`;
  if (padding.bottom !== 0) result.paddingBottom = `${padding.bottom}px`;
  if (padding.left !== 0) result.paddingLeft = `${padding.left}px`;

  // Border
  const border = parseBorder(style);
  if (border.top !== 0) result.borderTop = `${border.top}px`;
  if (border.right !== 0) result.borderRight = `${border.right}px`;
  if (border.bottom !== 0) result.borderBottom = `${border.bottom}px`;
  if (border.left !== 0) result.borderLeft = `${border.left}px`;

  // Gap
  const gap = parseCSSPropWithContext(style.gap, ctx);
  const rowGap = parseCSSPropWithContext(style.rowGap, ctx);
  const columnGap = parseCSSPropWithContext(style.columnGap, ctx);
  if (gap !== undefined) {
    const gapStr = dimStr(gap);
    if (gapStr) {
      result.rowGap = gapStr;
      result.columnGap = gapStr;
    }
  }
  if (rowGap !== undefined) {
    const rg = dimStr(rowGap);
    if (rg) result.rowGap = rg;
  }
  if (columnGap !== undefined) {
    const cg = dimStr(columnGap);
    if (cg) result.columnGap = cg;
  }

  // Inset (position offsets)
  if (style.position === 'absolute' || style.position === 'fixed') {
    const top = parseCSSPropWithContext(style.top, ctx);
    const left = parseCSSPropWithContext(style.left, ctx);
    const right = parseCSSPropWithContext(style.right, ctx);
    const bottom = parseCSSPropWithContext(style.bottom, ctx);
    if (top !== undefined) result.insetTop = dimStr(top);
    if (left !== undefined) result.insetLeft = dimStr(left);
    if (right !== undefined) result.insetRight = dimStr(right);
    if (bottom !== undefined) result.insetBottom = dimStr(bottom);
  }

  return result;
}

/**
 * RC-3: CSS prop → number | string 파서 (단위 정규화 적용)
 *
 * rem, em, vh, vw, calc() 등을 resolveCSSSizeValue()로 해석.
 * % 값은 Taffy 네이티브 % 처리를 위해 문자열 그대로 반환.
 */
function parseCSSPropWithContext(
  value: unknown,
  ctx: CSSValueContext = {},
): number | string | undefined {
  if (value === undefined || value === null || value === '' || value === 'auto') return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // % 값은 Taffy가 네이티브로 처리
    if (value.endsWith('%')) return value;
    // intrinsic sizing 키워드는 Taffy에서 미지원 → undefined
    if (value === 'fit-content' || value === 'min-content' || value === 'max-content') return undefined;
    // resolveCSSSizeValue: rem, em, vh, vw, calc(), clamp(), min(), max() 해석
    const px = resolveCSSSizeValue(value, ctx);
    if (px !== undefined && px >= 0) return px;
    // fallback: parseFloat (순수 숫자 문자열)
    const num = parseFloat(value);
    if (!isNaN(num)) return num;
  }
  return undefined;
}

/**
 * CSS 오프셋 값(top/left/right/bottom)을 픽셀 숫자로 변환
 *
 * % 값은 현재 컨텍스트 없이는 계산 불가하므로 0으로 처리.
 * relative 오프셋 계산 전용으로 사용합니다.
 *
 * @returns 픽셀 수치, 변환 불가 시 0
 */
function resolvePxOffset(value: unknown, ctx: CSSValueContext = {}): number {
  const parsed = parseCSSPropWithContext(value, ctx);
  if (typeof parsed === 'number') return parsed;
  // % 문자열 등 변환 불가한 경우 0 반환 (conservative)
  return 0;
}

// ─── TaffyFlexEngine ─────────────────────────────────────────────────

/** 싱글톤 TaffyLayout 인스턴스 */
let taffyInstance: TaffyLayout | null = null;

function getTaffyLayout(): TaffyLayout | null {
  if (!taffyInstance) {
    taffyInstance = new TaffyLayout();
  }
  if (!taffyInstance.isAvailable()) {
    return null;
  }
  return taffyInstance;
}

/**
 * Taffy 기반 Flexbox 레이아웃 엔진
 *
 * Yoga 위임 대신 Taffy WASM으로 Flexbox 레이아웃을 직접 계산합니다.
 * shouldDelegate = false이므로 BuilderCanvas에서 calculate()를 직접 호출합니다.
 */
export class TaffyFlexEngine implements LayoutEngine {
  readonly displayTypes = ['flex', 'inline-flex'];

  /**
   * Taffy 엔진은 자체적으로 레이아웃을 계산하므로 위임하지 않음
   */
  readonly shouldDelegate = false;

  calculate(
    parent: Element,
    children: Element[],
    availableWidth: number,
    availableHeight: number,
    context?: LayoutContext,
  ): ComputedLayout[] {
    // 빈 children은 WASM 호출 없이 즉시 반환
    if (children.length === 0) {
      return [];
    }

    const taffy = getTaffyLayout();

    // Taffy WASM이 아직 로드되지 않았으면 빈 결과 반환
    // (Feature Flag off 경로로 폴백됨)
    if (!taffy) {
      if (import.meta.env.DEV) {
        console.warn('[TaffyFlexEngine] WASM not available, returning empty layout');
      }
      return [];
    }

    // ── CSS 상속 체인 구성 ──────────────────────────────────────────
    // 부모의 computed style 결정:
    //   - context에 parentComputedStyle이 있으면 사용 (상위 엔진에서 전파됨)
    //   - 없으면 부모 요소 style을 ROOT_COMPUTED_STYLE 기반으로 직접 해석
    const parentRawStyle = parent.props?.style as Record<string, unknown> | undefined;
    const parentComputed = context?.parentComputedStyle
      ?? resolveStyle(parentRawStyle, ROOT_COMPUTED_STYLE);

    // RC-3: CSS 단위 해석용 컨텍스트 구성
    const cssCtx: CSSValueContext = {
      viewportWidth: context?.viewportWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 1920),
      viewportHeight: context?.viewportHeight ?? (typeof window !== 'undefined' ? window.innerHeight : 1080),
    };

    try {
      return this.computeWithTaffy(taffy, parent, children, availableWidth, availableHeight, parentComputed, cssCtx);
    } finally {
      // 매 계산 후 트리를 클리어하여 메모리 누적 방지
      // 추후 증분 업데이트가 필요하면 노드 캐시 도입
      try {
        taffy.clear();
      } catch (cleanupError) {
        if (import.meta.env.DEV) {
          console.warn('[TaffyFlexEngine] cleanup error:', cleanupError);
        }
      }
    }
  }

  private computeWithTaffy(
    taffy: TaffyLayout,
    parent: Element,
    children: Element[],
    availableWidth: number,
    availableHeight: number,
    parentComputed: ComputedStyle,
    cssCtx: CSSValueContext = {},
  ): ComputedLayout[] {
    // §6 P3: 2-pass 레이아웃
    // 1차 pass: 부모 availableWidth로 enrichment → Taffy 계산
    // 2차 pass (조건부): inline-block 자식의 실제 Taffy 할당 width가
    //   enrichment 시 사용한 width와 다르면 → 정확한 width로 re-enrich → Taffy 재계산
    // 이는 flex row에서 자식 width가 flex-grow/shrink로 변경될 때 텍스트 wrap 높이를 교정

    // ── 자식별 computed style 캐시 (1차/2차 공용) ─────────────────────
    const childComputedStyles = children.map(child => {
      const childRawStyle = child.props?.style as Record<string, unknown> | undefined;
      return resolveStyle(childRawStyle, parentComputed);
    });

    // ── 1차 pass: enrichment + Taffy 계산 ─────────────────────────────
    const firstPassResult = this._runTaffyPass(
      taffy, parent, children, availableWidth, availableHeight, parentComputed, childComputedStyles, cssCtx,
    );

    // ── 2차 pass 필요성 판단 ──────────────────────────────────────────
    // inline-block 자식 중 height가 주입되고 실제 width가 enrichment width와 다른 경우
    let needsSecondPass = false;
    const WIDTH_TOLERANCE = 2; // 2px 이내 차이는 무시

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const tag = (child.tag ?? '').toLowerCase();
      if (!INLINE_BLOCK_TAGS.has(tag)) continue;

      const childStyle = child.props?.style as Record<string, unknown> | undefined;
      const rawHeight = childStyle?.height;
      const hasAutoHeight = !rawHeight || rawHeight === 'auto' || rawHeight === 'fit-content';
      if (!hasAutoHeight) continue;

      const layout = firstPassResult.find(l => l.elementId === child.id);
      if (!layout) continue;

      // enrichment 시 사용된 width와 Taffy가 계산한 실제 width 비교
      if (Math.abs(layout.width - availableWidth) > WIDTH_TOLERANCE) {
        needsSecondPass = true;
        break;
      }
    }

    if (!needsSecondPass) {
      return firstPassResult;
    }

    // ── 2차 pass: 실제 Taffy width로 re-enrich ───────────────────────
    // 1차 pass 결과에서 각 자식의 실제 width를 가져와 availableWidth로 사용
    taffy.clear();
    const actualWidths = new Map<string, number>();
    for (const layout of firstPassResult) {
      actualWidths.set(layout.elementId, layout.width);
    }

    const secondPassChildren = children.map((child, i) => {
      const tag = (child.tag ?? '').toLowerCase();
      if (!INLINE_BLOCK_TAGS.has(tag)) return child;

      const actualWidth = actualWidths.get(child.id);
      if (actualWidth === undefined) return child;

      return enrichWithIntrinsicSize(child, actualWidth, availableHeight, childComputedStyles[i]);
    });

    return this._runTaffyPassRaw(
      taffy, parent, secondPassChildren, children, availableWidth, availableHeight, parentComputed, cssCtx,
    );
  }

  /**
   * Taffy 1-pass: enrich + 노드 생성 + 계산 + 결과 수집
   */
  private _runTaffyPass(
    taffy: TaffyLayout,
    parent: Element,
    children: Element[],
    availableWidth: number,
    availableHeight: number,
    parentComputed: ComputedStyle,
    childComputedStyles: ComputedStyle[],
    cssCtx: CSSValueContext = {},
  ): ComputedLayout[] {
    const enrichedChildren = children.map((child, i) =>
      enrichWithIntrinsicSize(child, availableWidth, availableHeight, childComputedStyles[i]),
    );
    return this._runTaffyPassRaw(taffy, parent, enrichedChildren, children, availableWidth, availableHeight, parentComputed, cssCtx);
  }

  /**
   * Taffy pass 공통 로직: 노드 생성 → 계산 → 결과 수집
   *
   * @param enrichedChildren - enrichment 적용된 자식 (Taffy 스타일 변환용)
   * @param originalChildren - 원본 자식 (margin 파싱, elementId 매칭용)
   */
  private _runTaffyPassRaw(
    taffy: TaffyLayout,
    parent: Element,
    enrichedChildren: Element[],
    originalChildren: Element[],
    availableWidth: number,
    availableHeight: number,
    parentComputed: ComputedStyle,
    cssCtx: CSSValueContext = {},
  ): ComputedLayout[] {
    // 1. 자식 노드 생성
    const childHandles: TaffyNodeHandle[] = [];
    const childMap = new Map<TaffyNodeHandle, Element>();

    for (let i = 0; i < enrichedChildren.length; i++) {
      const enrichedChild = enrichedChildren[i];
      const originalChild = originalChildren[i];
      const childRawStyle = enrichedChild.props?.style as Record<string, unknown> | undefined;
      const childComputed = resolveStyle(childRawStyle, parentComputed);
      const taffyStyle = elementToTaffyStyle(enrichedChild, childComputed, cssCtx);
      const handle = taffy.createNode(taffyStyle);
      childHandles.push(handle);
      childMap.set(handle, originalChild);
    }

    // 2. 부모 노드 생성 (자식 포함)
    const parentStyle = elementToTaffyStyle(parent, parentComputed, cssCtx);
    // 부모의 display는 반드시 flex
    parentStyle.display = 'flex';
    // 부모의 width/height는 available space로 설정
    parentStyle.width = availableWidth;
    // RC-1: sentinel(-1) = height:auto → parentStyle.height 생략 → Taffy가 콘텐츠 기반 계산
    if (availableHeight >= 0) {
      parentStyle.height = availableHeight;
    }
    // 부모의 padding/border는 이미 availableWidth에서 제외되어 있으므로 0으로 리셋
    parentStyle.paddingTop = 0;
    parentStyle.paddingRight = 0;
    parentStyle.paddingBottom = 0;
    parentStyle.paddingLeft = 0;
    parentStyle.borderTop = 0;
    parentStyle.borderRight = 0;
    parentStyle.borderBottom = 0;
    parentStyle.borderLeft = 0;

    const rootHandle = taffy.createNodeWithChildren(parentStyle, childHandles);

    // 3. 레이아웃 계산
    taffy.computeLayout(rootHandle, availableWidth, availableHeight);

    // 4. 결과 수집 (배치 API 사용)
    const layoutMap = taffy.getLayoutsBatch(childHandles);
    const results: ComputedLayout[] = [];

    for (const handle of childHandles) {
      const child = childMap.get(handle);
      const layout = layoutMap.get(handle);
      if (!child || !layout) continue;

      const childStyle = child.props?.style as Record<string, unknown> | undefined;
      const margin = parseMargin(childStyle);

      // position:relative 오프셋 처리
      // Taffy는 relative offset을 직접 지원하지 않으므로,
      // Taffy가 계산한 정적 위치에 top/left/right/bottom을 수동으로 가산합니다.
      // CSS 명세에 따라: left/right 중 left가 우선, top/bottom 중 top이 우선
      let relativeOffsetX = 0;
      let relativeOffsetY = 0;

      if (childStyle?.position === 'relative') {
        const topVal = childStyle.top;
        const leftVal = childStyle.left;
        const rightVal = childStyle.right;
        const bottomVal = childStyle.bottom;

        // X축: left가 있으면 left 우선, 없으면 right의 반대 방향
        if (topVal !== undefined && topVal !== null && topVal !== 'auto') {
          relativeOffsetY = resolvePxOffset(topVal, cssCtx);
        } else if (bottomVal !== undefined && bottomVal !== null && bottomVal !== 'auto') {
          relativeOffsetY = -resolvePxOffset(bottomVal, cssCtx);
        }

        if (leftVal !== undefined && leftVal !== null && leftVal !== 'auto') {
          relativeOffsetX = resolvePxOffset(leftVal, cssCtx);
        } else if (rightVal !== undefined && rightVal !== null && rightVal !== 'auto') {
          relativeOffsetX = -resolvePxOffset(rightVal, cssCtx);
        }
      }

      results.push({
        elementId: child.id,
        x: layout.x + relativeOffsetX,
        y: layout.y + relativeOffsetY,
        width: layout.width,
        height: layout.height,
        margin: {
          top: margin.top,
          right: margin.right,
          bottom: margin.bottom,
          left: margin.left,
        },
      });
    }

    return results;
  }
}
