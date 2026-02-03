/**
 * CSS Block/Inline-Block 레이아웃 엔진
 *
 * 구현 기능:
 * - Block: 수직 쌓임, width 100% 기본값
 * - Inline-Block: 가로 배치, 콘텐츠 기반 너비
 * - Margin Collapse: 인접 블록 마진 병합, 빈 블록 자기 collapse
 * - P1: 부모-자식 margin collapse, BFC 생성 조건
 * - P2: vertical-align (baseline, top, bottom, middle), LineBox
 *
 * @since 2026-01-28 Phase 3 - 하이브리드 레이아웃 엔진
 * @updated 2026-01-28 Phase 5 - P1 기능 (BFC, 부모-자식 margin collapse)
 * @updated 2026-01-28 Phase 6 - P2 기능 (vertical-align, LineBox)
 * @updated 2026-01-28 Phase 6 Fix - 기본 inline-block 요소 처리
 */

import type { Element } from '../../../../../types/core/store.types';
import type { LayoutEngine, ComputedLayout, LayoutContext } from './LayoutEngine';
import type { Margin, BoxModel, LineBoxItem, LineBox } from './types';
import {
  parseMargin,
  parseBoxModel,
  parsePadding,
  parseBorder,
  parseVerticalAlign,
  parseLineHeight,
  calculateBaseline,
} from './utils';

import {
  wasmBlockLayout,
  BLOCK_FIELD_COUNT,
  DISPLAY,
  VALIGN,
  AUTO,
  type BlockLayoutInput,
} from '../../wasm-bindings/layoutAccelerator';
import { getLayoutScheduler } from '../../wasm-worker';
import type { BlockLayoutParams } from '../../wasm-worker/LayoutScheduler';

/**
 * 🚀 Phase 11: 크기를 min/max로 제한
 *
 * CSS 명세: resolved size = clamp(min, base, max)
 */
function clampSize(value: number, min?: number, max?: number): number {
  let result = value;
  if (min !== undefined) result = Math.max(result, min);
  if (max !== undefined) result = Math.min(result, max);
  return result;
}

/**
 * CSS에서 기본적으로 inline-block으로 동작하는 요소들
 *
 * 이 요소들은 display가 명시되지 않아도 inline-block으로 취급
 * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input
 */
const DEFAULT_INLINE_BLOCK_TAGS = new Set([
  // 폼 요소
  'button',
  'input',
  'select',
  'textarea',
  // 미디어/대체 요소 (replaced elements)
  'img',
  'video',
  'audio',
  'canvas',
  'iframe',
  'embed',
  'object',
  // 인라인 요소
  'span',
  'a',
  'label',
  'code',
  'strong',
  'em',
  'small',
  'abbr',
  // UI 컴포넌트 (CSS inline-flex/inline-block)
  // element.tag가 PascalCase이고 line 218에서 toLowerCase() 적용됨
  'badge', 'tag', 'chip',                       // inline-flex (Badge 계열)
  'togglebutton',                                // inline-flex (버튼 계열)
  'submitbutton', 'fancybutton',                 // inline-block (버튼 계열)
  'link', 'anchor',                              // inline (링크 계열)
  'checkbox', 'switch', 'toggle', 'radio',       // inline-block (폼 컨트롤)
  'colorswatch',                                 // inline-block
  'avatar', 'logo', 'icon', 'thumbnail',         // inline-block (미디어)
  'skeleton', 'skeletonloader',                  // inline-block
]);

/**
 * BlockEngine 계산 결과 (내부용)
 *
 * 부모에게 전달할 margin collapse 정보 포함
 */
export interface BlockLayoutResult {
  layouts: ComputedLayout[];
  /** 첫 번째 자식의 margin-top (부모로 흘러나올 수 있음) */
  firstChildMarginTop: number;
  /** 마지막 자식의 margin-bottom (부모로 흘러나올 수 있음) */
  lastChildMarginBottom: number;
}

/**
 * CSS Block/Inline-Block 레이아웃 엔진
 */
export class BlockEngine implements LayoutEngine {
  readonly displayTypes = ['block', 'inline-block'];

  calculate(
    parent: Element,
    children: Element[],
    availableWidth: number,
    availableHeight: number,
    context?: LayoutContext
  ): ComputedLayout[] {
    const result = this.calculateWithMarginInfo(
      parent,
      children,
      availableWidth,
      availableHeight,
      context
    );
    return result.layouts;
  }

  /**
   * 레이아웃 계산 + margin collapse 정보 반환
   *
   * 부모-자식 margin collapse 처리를 위해 추가 정보 반환
   */
  calculateWithMarginInfo(
    parent: Element,
    children: Element[],
    availableWidth: number,
    availableHeight: number,
    context?: LayoutContext
  ): BlockLayoutResult {
    if (children.length === 0) {
      return { layouts: [], firstChildMarginTop: 0, lastChildMarginBottom: 0 };
    }

    // Phase 2: WASM 가속 경로 (children > 10개일 때 마샬링 비용 대비 이점)
    if (children.length > 10) {
      const wasmResult = this.calculateViaWasm(
        parent, children, availableWidth, availableHeight, context
      );
      if (wasmResult) return wasmResult;
      // WASM 실패 시 JS 폴백
    }

    // 부모의 padding/border 확인 (margin collapse 차단 여부)
    const parentStyle = parent.props?.style as Record<string, unknown> | undefined;
    const parentPadding = parsePadding(parentStyle);
    const parentBorder = parseBorder(parentStyle);
    const parentCreatesNewBFC = this.createsBFC(parent);

    // 부모-자식 margin collapse 가능 여부
    const canCollapseTop = this.canCollapseWithParentTop(
      parentPadding,
      parentBorder,
      parentCreatesNewBFC,
      context?.parentMarginCollapse
    );
    const canCollapseBottom = this.canCollapseWithParentBottom(
      parentPadding,
      parentBorder,
      parentStyle,
      parentCreatesNewBFC,
      context?.parentMarginCollapse
    );

    const layouts: ComputedLayout[] = [];
    let currentY = 0;
    let currentX = 0;
    let prevMarginBottom = context?.prevSiblingMarginBottom ?? 0;

    // 첫 번째/마지막 자식 margin 추적 (부모-자식 collapse용)
    let firstChildMarginTop = 0;
    let lastChildMarginBottom = 0;
    let isFirstBlock = true;

    // 🚀 Phase 6: LineBox 기반 inline-block 처리
    let currentLineBox: LineBoxItem[] = [];

    /**
     * 현재 LineBox를 플러시하고 layouts에 추가
     *
     * vertical-align 적용:
     * - baseline: 모든 요소의 baseline을 line box baseline에 정렬
     * - top: line box 상단에 정렬
     * - bottom: line box 하단에 정렬
     * - middle: line box 중앙에 정렬
     */
    const flushLineBox = (): void => {
      if (currentLineBox.length === 0) return;

      // 1. LineBox 높이 및 baseline 계산
      const lineBox = this.calculateLineBox(currentLineBox, currentY);

      // 2. 각 요소의 최종 y 위치 계산 (vertical-align 적용)
      for (const item of currentLineBox) {
        const finalY = this.calculateVerticalPosition(item, lineBox);

        layouts.push({
          elementId: item.elementId,
          x: item.x,
          y: finalY,
          width: item.width,
          height: item.height,
          margin: item.margin,
        });
      }

      // 3. 다음 줄 준비
      currentY = lineBox.y + lineBox.height;
      currentX = 0;
      currentLineBox = [];
    };

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const style = child.props?.style as Record<string, unknown> | undefined;
      const childDisplay = style?.display as string | undefined;
      const childTag = (child.tag ?? '').toLowerCase();
      const childPosition = style?.position as string | undefined;

      // 🚀 Phase 6 Fix: 기본 inline-block 요소 처리
      // 🚀 Phase 7: CSS Blockification 적용 (flex 자식의 inline-block → block)
      // 🚀 Phase 11: absolute/fixed는 blockification 제외
      const isInlineBlock = this.computeEffectiveDisplay(
        childDisplay,
        childTag,
        context?.parentDisplay,
        childPosition
      ) === 'inline-block';
      const margin = parseMargin(style);
      const boxModel = parseBoxModel(
        child,
        availableWidth,
        availableHeight,
        context?.viewportWidth,
        context?.viewportHeight
      );

      // 자식이 BFC를 생성하면 margin collapse 차단
      const childCreatesNewBFC = this.createsBFC(child);

      if (isInlineBlock) {
        // 🚀 Phase 6: Inline-block + vertical-align
        // 🚀 Phase 11: min/max clamp 적용
        const childContentWidth = clampSize(
          boxModel.width ?? boxModel.contentWidth,
          boxModel.minWidth,
          boxModel.maxWidth
        );
        const childContentHeight = clampSize(
          boxModel.height ?? boxModel.contentHeight,
          boxModel.minHeight,
          boxModel.maxHeight
        );

        // 🚀 Border-box 크기 계산 (content + padding + border)
        // CSS에서 inline-block 요소는 border-box 크기로 공간을 차지
        const { padding: ibPad, border: ibBdr } = boxModel;
        const ibPadBorderH = ibPad.left + ibPad.right + ibBdr.left + ibBdr.right;
        const ibPadBorderV = ibPad.top + ibPad.bottom + ibBdr.top + ibBdr.bottom;
        const childWidth = childContentWidth + ibPadBorderH;
        const childHeight = childContentHeight + ibPadBorderV;

        const totalWidth = childWidth + margin.left + margin.right;

        // 줄바꿈 필요 여부 확인
        if (currentX + totalWidth > availableWidth && currentX > 0) {
          flushLineBox();
        }

        // vertical-align, baseline, lineHeight 계산
        const verticalAlign = parseVerticalAlign(style);
        const baseline = calculateBaseline(child, childHeight);
        const childLineHeight = parseLineHeight(style);

        // LineBox에 요소 추가
        currentLineBox.push({
          elementId: child.id,
          index: i,
          x: currentX + margin.left,
          width: childWidth,
          height: childHeight,
          margin,
          verticalAlign,
          baseline,
          lineHeight: childLineHeight,
        });

        currentX += totalWidth;

        // inline-block은 BFC를 생성하므로 margin collapse 리셋
        prevMarginBottom = 0;
        isFirstBlock = false;
      } else {
        // Block: 수직 쌓임 + 마진 collapse

        // inline-block 줄이 있으면 먼저 플러시
        if (currentLineBox.length > 0) {
          flushLineBox();
        }

        // 빈 블록 처리: 자기 top/bottom 마진 collapse
        if (this.isEmptyBlock(child, boxModel)) {
          const collapsedSelfMargin = this.collapseEmptyBlockMargins(margin);
          const finalMargin = this.collapseMargins(prevMarginBottom, collapsedSelfMargin);

          layouts.push({
            elementId: child.id,
            x: margin.left,
            y: currentY + finalMargin,
            width: availableWidth - margin.left - margin.right,
            height: 0,
            margin: {
              ...margin,
              collapsedTop: finalMargin,
              collapsedBottom: 0,
            },
          });

          // 빈 블록의 margin도 부모-자식 collapse 대상
          if (isFirstBlock && canCollapseTop) {
            firstChildMarginTop = this.collapseMargins(firstChildMarginTop, collapsedSelfMargin);
          }
          lastChildMarginBottom = collapsedSelfMargin;

          prevMarginBottom = collapsedSelfMargin;
          continue;
        }

        // 첫 번째 블록의 margin-top 추적 (부모-자식 collapse용)
        if (isFirstBlock) {
          if (canCollapseTop && !childCreatesNewBFC) {
            firstChildMarginTop = margin.top;
            // 부모-자식 collapse 시 첫 번째 자식의 margin-top은 부모로 흘러나감
            // 자식 위치에서는 0으로 처리
            prevMarginBottom = 0;
          }
          isFirstBlock = false;
        }

        // 일반 블록: Margin Collapse 계산
        let collapsedMarginTop: number;
        if (childCreatesNewBFC) {
          // BFC를 생성하는 자식은 margin collapse 참여 안함
          collapsedMarginTop = prevMarginBottom + margin.top;
        } else {
          collapsedMarginTop = this.collapseMargins(prevMarginBottom, margin.top);
        }
        currentY += collapsedMarginTop;

        // Block 너비: 명시적 width 또는 100%
        // 🚀 Phase 11: min/max clamp 적용
        const childContentWidth = clampSize(
          boxModel.width ?? availableWidth - margin.left - margin.right,
          boxModel.minWidth,
          boxModel.maxWidth
        );
        const childContentHeight = clampSize(
          boxModel.height ?? boxModel.contentHeight,
          boxModel.minHeight,
          boxModel.maxHeight
        );

        // 🚀 Border-box 크기 계산 (content + padding + border)
        // CSS에서 블록 요소는 border-box 크기로 수직 공간을 차지
        const { padding: blkPad, border: blkBdr } = boxModel;
        const blkPadBorderH = blkPad.left + blkPad.right + blkBdr.left + blkBdr.right;
        const blkPadBorderV = blkPad.top + blkPad.bottom + blkBdr.top + blkBdr.bottom;

        // Auto-width: 'availableWidth - margins'는 이미 border-box 크기
        // Explicit width: content-box이므로 padding+border 추가
        const childWidth = boxModel.width !== undefined
          ? childContentWidth + blkPadBorderH
          : childContentWidth;
        const childHeight = childContentHeight + blkPadBorderV;

        layouts.push({
          elementId: child.id,
          x: margin.left,
          y: currentY,
          width: childWidth,
          height: childHeight,
          margin: {
            ...margin,
            collapsedTop: collapsedMarginTop,
          },
        });

        currentY += childHeight;

        // 마지막 자식의 margin-bottom 추적
        if (childCreatesNewBFC) {
          prevMarginBottom = margin.bottom;
          lastChildMarginBottom = 0; // BFC가 있으면 부모로 흘러나오지 않음
        } else {
          prevMarginBottom = margin.bottom;
          lastChildMarginBottom = margin.bottom;
        }
      }
    }

    // 남은 inline-block 줄 플러시
    if (currentLineBox.length > 0) {
      flushLineBox();
    }

    // 부모-자식 margin collapse가 차단되면 정보 초기화
    if (!canCollapseTop) {
      firstChildMarginTop = 0;
    }
    if (!canCollapseBottom) {
      lastChildMarginBottom = 0;
    }

    return {
      layouts,
      firstChildMarginTop,
      lastChildMarginBottom,
    };
  }

  /**
   * LineBox의 높이와 baseline 계산
   *
   * CSS 명세:
   * - LineBox 높이: 가장 높은 요소의 margin-box 기준
   * - LineBox baseline: baseline 정렬된 요소들의 baseline 중 가장 낮은 위치
   */
  private calculateLineBox(items: LineBoxItem[], startY: number): LineBox {
    if (items.length === 0) {
      return { y: startY, height: 0, baseline: 0, items: [] };
    }

    // 1. 각 요소의 총 높이 (margin 포함) 계산
    let maxTotalHeight = 0;
    let maxBaselineFromTop = 0; // baseline 요소 중 가장 깊은 baseline

    for (const item of items) {
      const totalHeight = item.height + item.margin.top + item.margin.bottom;
      maxTotalHeight = Math.max(maxTotalHeight, totalHeight);

      // CSS 명세: lineHeight가 요소 높이보다 크면 line box 최소 높이에 영향
      if (item.lineHeight !== undefined) {
        const lineHeightWithMargin = item.lineHeight + item.margin.top + item.margin.bottom;
        maxTotalHeight = Math.max(maxTotalHeight, lineHeightWithMargin);
      }

      // baseline 정렬 요소의 baseline 위치 추적
      if (item.verticalAlign === 'baseline') {
        // margin-top + baseline 위치
        const baselineFromTop = item.margin.top + item.baseline;
        maxBaselineFromTop = Math.max(maxBaselineFromTop, baselineFromTop);
      }
    }

    // 2. baseline 정렬로 인한 높이 조정
    // baseline 요소 중 baseline 아래 공간이 가장 큰 요소 찾기
    let maxBelowBaseline = 0;
    for (const item of items) {
      if (item.verticalAlign === 'baseline') {
        const belowBaseline = item.height - item.baseline + item.margin.bottom;
        maxBelowBaseline = Math.max(maxBelowBaseline, belowBaseline);
      }
    }

    // baseline 정렬 요소들로 인한 최소 높이
    const baselineHeight = maxBaselineFromTop + maxBelowBaseline;

    // 3. 최종 LineBox 높이: 모든 요소를 수용하는 높이
    const lineBoxHeight = Math.max(maxTotalHeight, baselineHeight);

    return {
      y: startY,
      height: lineBoxHeight,
      baseline: maxBaselineFromTop, // line box 상단 기준 baseline 위치
      items,
    };
  }

  /**
   * vertical-align에 따른 요소의 최종 y 위치 계산
   *
   * @param item - LineBox 내 요소 정보
   * @param lineBox - LineBox 정보
   * @returns 요소의 최종 y 좌표
   */
  private calculateVerticalPosition(item: LineBoxItem, lineBox: LineBox): number {
    const { verticalAlign, height, margin, baseline } = item;

    switch (verticalAlign) {
      case 'top':
        // line box 상단에 정렬 (margin-top 포함)
        return lineBox.y + margin.top;

      case 'bottom':
        // line box 하단에 정렬 (margin-bottom 포함)
        return lineBox.y + lineBox.height - height - margin.bottom;

      case 'middle':
        // line box 중앙에 정렬
        return lineBox.y + (lineBox.height - height - margin.top - margin.bottom) / 2 + margin.top;

      case 'baseline':
      default:
        // baseline을 line box의 baseline에 정렬
        // line box baseline 위치 - 요소의 baseline 위치 = 요소 상단 위치
        return lineBox.y + lineBox.baseline - baseline;
    }
  }

  /**
   * CSS Blockification 적용한 effective display 계산
   *
   * CSS Display Level 3 명세:
   * - flex/inline-flex 자식의 inline, inline-block → block
   * - grid/inline-grid 자식도 동일하게 blockified
   * - 🚀 Phase 11: out-of-flow 요소(absolute, fixed)는 blockification 제외
   *
   * @param childDisplay - 자식의 명시적 display 값
   * @param childTag - 자식의 태그 이름
   * @param parentDisplay - 부모의 display 값
   * @param childPosition - 자식의 position 값
   * @returns effective display ('block' | 'inline-block')
   */
  private computeEffectiveDisplay(
    childDisplay: string | undefined,
    childTag: string,
    parentDisplay: string | undefined,
    childPosition: string | undefined
  ): 'block' | 'inline-block' {
    // 기본 display 결정 (명시적 값 또는 태그 기본값)
    const baseDisplay = childDisplay ??
      (DEFAULT_INLINE_BLOCK_TAGS.has(childTag) ? 'inline-block' : 'block');

    // 🚀 Phase 11 이슈 6: out-of-flow 요소는 blockification 제외
    // CSS 명세: position: absolute/fixed 요소는 부모가 flex/grid라도 blockify되지 않음
    if (childPosition === 'absolute' || childPosition === 'fixed') {
      return baseDisplay === 'inline-block' ? 'inline-block' : 'block';
    }

    // CSS Blockification: flex/inline-flex/grid/inline-grid 자식
    if (
      parentDisplay === 'flex' ||
      parentDisplay === 'inline-flex' ||
      parentDisplay === 'grid' ||
      parentDisplay === 'inline-grid'
    ) {
      if (baseDisplay === 'inline' || baseDisplay === 'inline-block') {
        return 'block';
      }
    }

    return baseDisplay === 'inline-block' ? 'inline-block' : 'block';
  }

  /**
   * 요소가 새로운 BFC(Block Formatting Context)를 생성하는지 확인
   *
   * BFC 생성 조건 (CSS 명세):
   * - display: flow-root
   * - display: flex, inline-flex, grid, inline-grid
   * - display: inline-block
   * - overflow: hidden, auto, scroll (visible 외)
   * - float: left, right
   * - position: absolute, fixed
   * - contain: layout, content, paint
   */
  createsBFC(element: Element): boolean {
    const style = element.props?.style as Record<string, unknown> | undefined;
    if (!style) return false;

    const display = style.display as string | undefined;
    const overflow = style.overflow as string | undefined;
    const overflowX = style.overflowX as string | undefined;
    const overflowY = style.overflowY as string | undefined;
    const float = style.float as string | undefined;
    const position = style.position as string | undefined;
    const contain = style.contain as string | undefined;

    // display 기반 BFC
    if (display === 'flow-root') return true;
    if (display === 'flex' || display === 'inline-flex') return true;
    if (display === 'grid' || display === 'inline-grid') return true;
    if (display === 'inline-block') return true;

    // overflow 기반 BFC (visible 외) - overflow-x/y가 shorthand을 올바르게 fallback
    const effectiveOverflowX = overflowX ?? overflow ?? 'visible';
    const effectiveOverflowY = overflowY ?? overflow ?? 'visible';
    if (effectiveOverflowX !== 'visible' || effectiveOverflowY !== 'visible') return true;

    // float 기반 BFC
    if (float === 'left' || float === 'right') return true;

    // position 기반 BFC
    if (position === 'absolute' || position === 'fixed') return true;

    // contain 기반 BFC
    if (contain) {
      const containValues = contain.split(/\s+/);
      if (
        containValues.includes('layout') ||
        containValues.includes('content') ||
        containValues.includes('paint')
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * 부모의 상단과 첫 번째 자식의 margin-top이 collapse될 수 있는지 확인
   *
   * 차단 조건:
   * - 부모에 padding-top 있음
   * - 부모에 border-top 있음
   * - 부모가 새 BFC 생성 (부모 자체가 BFC면 자식과 collapse 안함)
   * - 상위에서 이미 collapse 차단됨
   */
  private canCollapseWithParentTop(
    parentPadding: Margin,
    parentBorder: Margin,
    parentCreatesNewBFC: boolean,
    parentContextBlocksCollapse?: boolean
  ): boolean {
    if (parentContextBlocksCollapse) return false;
    if (parentCreatesNewBFC) return false;
    if (parentPadding.top > 0) return false;
    if (parentBorder.top > 0) return false;
    return true;
  }

  /**
   * 부모의 하단과 마지막 자식의 margin-bottom이 collapse될 수 있는지 확인
   *
   * 차단 조건:
   * - 부모에 padding-bottom 있음
   * - 부모에 border-bottom 있음
   * - 부모에 height 또는 min-height 있음
   * - 부모가 새 BFC 생성
   * - 상위에서 이미 collapse 차단됨
   */
  private canCollapseWithParentBottom(
    parentPadding: Margin,
    parentBorder: Margin,
    parentStyle: Record<string, unknown> | undefined,
    parentCreatesNewBFC: boolean,
    parentContextBlocksCollapse?: boolean
  ): boolean {
    if (parentContextBlocksCollapse) return false;
    if (parentCreatesNewBFC) return false;
    if (parentPadding.bottom > 0) return false;
    if (parentBorder.bottom > 0) return false;
    // height 또는 min-height 있으면 하단 collapse 차단
    if (parentStyle?.height !== undefined && parentStyle.height !== 'auto') return false;
    if (parentStyle?.minHeight !== undefined) return false;
    return true;
  }

  /**
   * 두 마진 값 collapse (CSS 명세)
   *
   * - 둘 다 양수: 큰 값
   * - 둘 다 음수: 절대값이 큰 값 (더 작은 값)
   * - 양수/음수 혼합: 합산
   */
  private collapseMargins(marginA: number, marginB: number): number {
    if (marginA >= 0 && marginB >= 0) {
      return Math.max(marginA, marginB);
    }
    if (marginA < 0 && marginB < 0) {
      return Math.min(marginA, marginB);
    }
    return marginA + marginB;
  }

  /**
   * 빈 블록인지 확인
   *
   * CSS 명세: 다음 조건을 모두 만족하면 빈 블록
   * - height/min-height 없음
   * - border-top/bottom 없음
   * - padding-top/bottom 없음
   * - 콘텐츠 높이 0
   */
  private isEmptyBlock(element: Element, boxModel: BoxModel): boolean {
    const style = element.props?.style as Record<string, unknown> | undefined;

    // height 또는 min-height 있으면 빈 블록 아님
    if (boxModel.height !== undefined && boxModel.height > 0) return false;
    if (style?.minHeight) return false;

    // border 있으면 빈 블록 아님
    if (boxModel.border.top > 0 || boxModel.border.bottom > 0) return false;

    // padding 있으면 빈 블록 아님
    if (boxModel.padding.top > 0 || boxModel.padding.bottom > 0) return false;

    // 콘텐츠 높이가 0이면 빈 블록
    return boxModel.contentHeight === 0;
  }

  /**
   * 빈 블록의 자기 마진 collapse
   *
   * CSS 명세: 빈 블록의 top/bottom 마진은 하나로 collapse
   */
  private collapseEmptyBlockMargins(margin: Margin): number {
    return this.collapseMargins(margin.top, margin.bottom);
  }

  // ============================================
  // Phase 2: WASM 가속
  // ============================================

  /**
   * WASM을 통한 블록 레이아웃 계산
   *
   * JS 전처리 (스타일 파싱, effective display, BFC 판별) 후
   * 정규화된 데이터를 WASM에 전달하고 결과를 역직렬화한다.
   */
  private calculateViaWasm(
    parent: Element,
    children: Element[],
    availableWidth: number,
    availableHeight: number,
    context?: LayoutContext,
  ): BlockLayoutResult | null {
    const parentStyle = parent.props?.style as Record<string, unknown> | undefined;
    const parentPadding = parsePadding(parentStyle);
    const parentBorder = parseBorder(parentStyle);
    const parentCreatesNewBFC = this.createsBFC(parent);

    const canCollapseTop = this.canCollapseWithParentTop(
      parentPadding, parentBorder, parentCreatesNewBFC, context?.parentMarginCollapse
    );
    const canCollapseBottom = this.canCollapseWithParentBottom(
      parentPadding, parentBorder, parentStyle, parentCreatesNewBFC, context?.parentMarginCollapse
    );

    // JS 전처리: 각 자식의 정규화된 데이터 생성
    const inputs: BlockLayoutInput[] = [];
    const elementIds: string[] = [];
    const margins: Margin[] = [];

    for (const child of children) {
      const style = child.props?.style as Record<string, unknown> | undefined;
      const childDisplay = style?.display as string | undefined;
      const childTag = (child.tag ?? '').toLowerCase();
      const childPosition = style?.position as string | undefined;

      const isInlineBlock = this.computeEffectiveDisplay(
        childDisplay, childTag, context?.parentDisplay, childPosition,
      ) === 'inline-block';

      const margin = parseMargin(style);
      const boxModel = parseBoxModel(
        child, availableWidth, availableHeight,
        context?.viewportWidth, context?.viewportHeight,
      );

      const childCreatesNewBFC = this.createsBFC(child);
      const isEmpty = !isInlineBlock && this.isEmptyBlock(child, boxModel);

      // Padding + border combined
      const padBorderV = boxModel.padding.top + boxModel.padding.bottom
        + boxModel.border.top + boxModel.border.bottom;
      const padBorderH = boxModel.padding.left + boxModel.padding.right
        + boxModel.border.left + boxModel.border.right;

      let displayType: number;
      if (isEmpty) {
        displayType = DISPLAY.EMPTY_BLOCK;
      } else if (isInlineBlock) {
        displayType = DISPLAY.INLINE_BLOCK;
      } else {
        displayType = DISPLAY.BLOCK;
      }

      // vertical-align and baseline (for inline-block)
      const verticalAlign = isInlineBlock ? parseVerticalAlign(style) : 'baseline';
      const valignNum = verticalAlign === 'top' ? VALIGN.TOP
        : verticalAlign === 'bottom' ? VALIGN.BOTTOM
        : verticalAlign === 'middle' ? VALIGN.MIDDLE
        : VALIGN.BASELINE;

      const childHeight = boxModel.height ?? boxModel.contentHeight;
      const baseline = isInlineBlock
        ? calculateBaseline(child, childHeight + padBorderV)
        : 0;
      const lineHeight = isInlineBlock ? (parseLineHeight(style) ?? AUTO) : AUTO;

      inputs.push({
        display: displayType,
        width: boxModel.width ?? AUTO,
        height: boxModel.height ?? AUTO,
        marginTop: margin.top,
        marginRight: margin.right,
        marginBottom: margin.bottom,
        marginLeft: margin.left,
        bfcFlag: childCreatesNewBFC ? 1 : 0,
        padBorderV,
        padBorderH,
        minWidth: boxModel.minWidth ?? AUTO,
        maxWidth: boxModel.maxWidth ?? AUTO,
        minHeight: boxModel.minHeight ?? AUTO,
        maxHeight: boxModel.maxHeight ?? AUTO,
        contentWidth: boxModel.contentWidth,
        contentHeight: boxModel.contentHeight,
        verticalAlign: valignNum,
        baseline,
        lineHeight,
      });

      elementIds.push(child.id);
      margins.push(margin);
    }

    // WASM 호출
    const result = wasmBlockLayout(
      inputs,
      availableWidth,
      availableHeight,
      canCollapseTop,
      canCollapseBottom,
      context?.prevSiblingMarginBottom ?? 0,
    );

    if (!result) return null;

    // 역직렬화: Float32Array → ComputedLayout[]
    const layouts: ComputedLayout[] = [];
    for (let i = 0; i < children.length; i++) {
      const off = i * 4;
      layouts.push({
        elementId: elementIds[i],
        x: result.positions[off],
        y: result.positions[off + 1],
        width: result.positions[off + 2],
        height: result.positions[off + 3],
        margin: margins[i],
      });
    }

    // Phase 4: Worker 비동기 재검증 (SWR)
    this.scheduleWorkerBlock(
      parent.id, elementIds, inputs,
      availableWidth, availableHeight,
      canCollapseTop, canCollapseBottom,
      context?.prevSiblingMarginBottom ?? 0,
    );

    return {
      layouts,
      firstChildMarginTop: result.firstChildMarginTop,
      lastChildMarginBottom: result.lastChildMarginBottom,
    };
  }

  /**
   * Worker에 블록 레이아웃 비동기 계산을 스케줄링한다.
   * 결과는 RAF에서 LayoutScheduler.onUpdate로 전달.
   */
  private scheduleWorkerBlock(
    parentId: string,
    childIds: string[],
    inputs: BlockLayoutInput[],
    availableWidth: number,
    availableHeight: number,
    canCollapseTop: boolean,
    canCollapseBottom: boolean,
    prevSiblingMarginBottom: number,
  ): void {
    const scheduler = getLayoutScheduler();
    if (!scheduler) return;

    // inputs → flat Float32Array 직렬화
    const count = inputs.length;
    const data = new Float32Array(count * BLOCK_FIELD_COUNT);
    for (let i = 0; i < count; i++) {
      const c = inputs[i];
      const off = i * BLOCK_FIELD_COUNT;
      data[off] = c.display;
      data[off + 1] = c.width;
      data[off + 2] = c.height;
      data[off + 3] = c.marginTop;
      data[off + 4] = c.marginRight;
      data[off + 5] = c.marginBottom;
      data[off + 6] = c.marginLeft;
      data[off + 7] = c.bfcFlag;
      data[off + 8] = c.padBorderV;
      data[off + 9] = c.padBorderH;
      data[off + 10] = c.minWidth;
      data[off + 11] = c.maxWidth;
      data[off + 12] = c.minHeight;
      data[off + 13] = c.maxHeight;
      data[off + 14] = c.contentWidth;
      data[off + 15] = c.contentHeight;
      data[off + 16] = c.verticalAlign;
      data[off + 17] = c.baseline;
      data[off + 18] = c.lineHeight;
    }

    const params: BlockLayoutParams = {
      kind: 'block',
      parentId,
      childIds,
      data,
      childCount: count,
      availableWidth,
      availableHeight,
      canCollapseTop,
      canCollapseBottom,
      prevSiblingMarginBottom,
    };

    scheduler.scheduleAsync(params);
  }
}
