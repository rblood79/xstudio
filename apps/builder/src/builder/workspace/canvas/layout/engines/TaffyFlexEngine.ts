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
import { parseMargin, parsePadding, parseBorder } from './utils';
import type { ComputedStyle } from './cssResolver';

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
 * styleToLayout.ts의 LayoutStyle과 달리 Taffy 네이티브 형식으로 직접 변환합니다.
 * fit-content, 태그별 크기 계산 등은 기존 styleToLayout 로직을 참조합니다.
 */
export function elementToTaffyStyle(
  element: Element,
  _computedStyle?: ComputedStyle,
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
  if (style.position === 'absolute' || style.position === 'fixed') {
    result.position = 'absolute';
  }

  // Size
  const widthVal = parseCSSProp(style.width);
  const heightVal = parseCSSProp(style.height);
  const widthStr = dimStr(widthVal);
  const heightStr = dimStr(heightVal);
  if (widthStr) result.width = widthStr;
  if (heightStr) result.height = heightStr;

  // Min/Max size
  const minW = dimStr(parseCSSProp(style.minWidth));
  const minH = dimStr(parseCSSProp(style.minHeight));
  const maxW = dimStr(parseCSSProp(style.maxWidth));
  const maxH = dimStr(parseCSSProp(style.maxHeight));
  if (minW) result.minWidth = minW;
  if (minH) result.minHeight = minH;
  if (maxW) result.maxWidth = maxW;
  if (maxH) result.maxHeight = maxH;

  // Flex direction
  if (style.flexDirection) {
    result.flexDirection = style.flexDirection as TaffyStyle['flexDirection'];
  }

  // Flex wrap
  if (style.flexWrap) {
    result.flexWrap = style.flexWrap as TaffyStyle['flexWrap'];
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
    const basis = parseCSSProp(style.flexBasis);
    if (basis !== undefined) result.flexBasis = dimStr(basis) ?? 'auto';
  }

  // Align self
  if (style.alignSelf) {
    result.alignSelf = style.alignSelf as TaffyStyle['alignSelf'];
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
  const gap = parseCSSProp(style.gap);
  const rowGap = parseCSSProp(style.rowGap);
  const columnGap = parseCSSProp(style.columnGap);
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
    const top = parseCSSProp(style.top);
    const left = parseCSSProp(style.left);
    const right = parseCSSProp(style.right);
    const bottom = parseCSSProp(style.bottom);
    if (top !== undefined) result.insetTop = dimStr(top);
    if (left !== undefined) result.insetLeft = dimStr(left);
    if (right !== undefined) result.insetRight = dimStr(right);
    if (bottom !== undefined) result.insetBottom = dimStr(bottom);
  }

  return result;
}

/** 간단한 CSS prop → number | string 파서 */
function parseCSSProp(value: unknown): number | string | undefined {
  if (value === undefined || value === null || value === '' || value === 'auto') return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // % 값은 그대로
    if (value.endsWith('%')) return value;
    // px, rem 등은 숫자로
    const num = parseFloat(value);
    if (!isNaN(num)) return num;
  }
  return undefined;
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
    _context?: LayoutContext,
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

    try {
      return this.computeWithTaffy(taffy, parent, children, availableWidth, availableHeight);
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
  ): ComputedLayout[] {
    // 1. 자식 노드 생성
    const childHandles: TaffyNodeHandle[] = [];
    const childMap = new Map<TaffyNodeHandle, Element>();

    for (const child of children) {
      const taffyStyle = elementToTaffyStyle(child);
      const handle = taffy.createNode(taffyStyle);
      childHandles.push(handle);
      childMap.set(handle, child);
    }

    // 2. 부모 노드 생성 (자식 포함)
    const parentStyle = elementToTaffyStyle(parent);
    // 부모의 display는 반드시 flex
    parentStyle.display = 'flex';
    // 부모의 width/height는 available space로 설정
    parentStyle.width = availableWidth;
    parentStyle.height = availableHeight;
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

      const margin = parseMargin(child.props?.style as Record<string, unknown> | undefined);

      results.push({
        elementId: child.id,
        x: layout.x,
        y: layout.y,
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
