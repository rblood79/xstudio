/**
 * CSS Grid 레이아웃 엔진
 *
 * GridLayout.utils.ts의 기존 로직을 LayoutEngine 인터페이스로 래핑
 *
 * @since 2026-01-28 Phase 2 - 하이브리드 레이아웃 엔진
 */

import type { Element } from '../../../../../types/core/store.types';
import type { LayoutEngine, ComputedLayout, LayoutContext } from './LayoutEngine';
import {
  parseGridTemplate,
  parseGap,
  parseGridTemplateAreas,
  calculateGridCellBounds,
  type GridStyle,
} from '../GridLayout.utils';
import { parseBoxModel } from './utils';
import { WASM_FLAGS } from '../../wasm-bindings/featureFlags';
import { wasmParseTracks, wasmGridCellPositions } from '../../wasm-bindings/layoutAccelerator';
import { getLayoutScheduler } from '../../wasm-worker';
import type { GridLayoutParams } from '../../wasm-worker/LayoutScheduler';

/**
 * CSS Grid 레이아웃 엔진
 */
export class GridEngine implements LayoutEngine {
  readonly displayTypes = ['grid', 'inline-grid'];

  calculate(
    parent: Element,
    children: Element[],
    availableWidth: number,
    availableHeight: number,
    _context?: LayoutContext
  ): ComputedLayout[] {
    if (children.length === 0) return [];

    const style = parent.props?.style as GridStyle | undefined;

    // Phase 2: WASM 가속 경로 (단순 auto-flow + 명시적 배치 속성 없음)
    if (WASM_FLAGS.LAYOUT_ENGINE && this.canUseWasmPath(style, children)) {
      const wasmResult = this.calculateViaWasm(
        style, children, availableWidth, availableHeight,
      );
      if (wasmResult) return wasmResult;
      // WASM 실패 시 JS 폴백
    }

    // Grid 트랙 파싱
    const columnTracks = parseGridTemplate(style?.gridTemplateColumns, availableWidth);
    const rowTracks = parseGridTemplate(style?.gridTemplateRows, availableHeight);

    // Gap 파싱
    const gap = parseGap(style?.gap);
    const columnGap = parseGap(style?.columnGap) ?? gap;
    const rowGap = parseGap(style?.rowGap) ?? gap;

    // Template Areas 파싱
    const templateAreas = parseGridTemplateAreas(style?.gridTemplateAreas);

    // 기본 트랙 (없으면 1fr 1개)
    const effectiveColumnTracks =
      columnTracks.length > 0
        ? columnTracks
        : [{ size: availableWidth, unit: 'fr' as const, originalValue: '1fr' }];
    const effectiveRowTracks =
      rowTracks.length > 0
        ? rowTracks
        : [{ size: 50, unit: 'auto' as const, originalValue: 'auto' }];

    // 각 자식의 그리드 셀 위치 계산
    return children.map((child, index) => {
      const childStyle = child.props?.style as GridStyle | undefined;
      const cellBounds = calculateGridCellBounds(
        childStyle,
        effectiveColumnTracks,
        effectiveRowTracks,
        columnGap,
        rowGap,
        templateAreas,
        index
      );

      // align-self / justify-self 셀 내 정렬
      const alignSelf = childStyle?.alignSelf as string | undefined;
      const justifySelf = childStyle?.justifySelf as string | undefined;

      let finalX = cellBounds.x;
      let finalY = cellBounds.y;
      let finalWidth = cellBounds.width;
      let finalHeight = cellBounds.height;

      // justify-self 또는 align-self가 stretch가 아닌 값이면 자식 고유 크기 사용
      if (justifySelf && justifySelf !== 'stretch' && justifySelf !== 'normal') {
        const boxModel = parseBoxModel(child, cellBounds.width, cellBounds.height);
        const childWidth = boxModel.width ?? boxModel.contentWidth;
        if (childWidth < cellBounds.width) {
          finalWidth = childWidth;
          if (justifySelf === 'center') {
            finalX = cellBounds.x + (cellBounds.width - childWidth) / 2;
          } else if (justifySelf === 'end') {
            finalX = cellBounds.x + cellBounds.width - childWidth;
          }
          // 'start'는 기본 위치 유지
        }
      }

      if (alignSelf && alignSelf !== 'stretch' && alignSelf !== 'normal') {
        const boxModel = parseBoxModel(child, cellBounds.width, cellBounds.height);
        const childHeight = boxModel.height ?? boxModel.contentHeight;
        if (childHeight < cellBounds.height) {
          finalHeight = childHeight;
          if (alignSelf === 'center') {
            finalY = cellBounds.y + (cellBounds.height - childHeight) / 2;
          } else if (alignSelf === 'end') {
            finalY = cellBounds.y + cellBounds.height - childHeight;
          }
          // 'start'는 기본 위치 유지
        }
      }

      return {
        elementId: child.id,
        x: finalX,
        y: finalY,
        width: finalWidth,
        height: finalHeight,
      };
    });
  }

  // ============================================
  // Phase 2: WASM 가속
  // ============================================

  /**
   * WASM 경로 사용 가능 여부 확인.
   * gridArea, gridColumn, gridRow, gridTemplateAreas 등 명시적 배치가 있으면
   * WASM auto-flow 경로를 사용할 수 없다.
   */
  private canUseWasmPath(
    style: GridStyle | undefined,
    children: Element[],
  ): boolean {
    // gridTemplateAreas가 있으면 명시적 배치 → JS 폴백
    if (style?.gridTemplateAreas) return false;

    // 자식 중 명시적 배치 속성이 있으면 JS 폴백
    for (const child of children) {
      const cs = child.props?.style as GridStyle | undefined;
      if (cs?.gridArea || cs?.gridColumn || cs?.gridRow) return false;
      if (cs?.alignSelf || cs?.justifySelf) return false;
    }

    return true;
  }

  /**
   * WASM을 통한 그리드 레이아웃 계산.
   * auto-flow (row-major) 기준으로 셀 위치를 일괄 계산.
   */
  private calculateViaWasm(
    style: GridStyle | undefined,
    children: Element[],
    availableWidth: number,
    availableHeight: number,
  ): ComputedLayout[] | null {
    const gap = parseGap(style?.gap);
    const colGap = parseGap(style?.columnGap) ?? gap;
    const rowGap = parseGap(style?.rowGap) ?? gap;

    // WASM track 파싱
    const colTemplate = style?.gridTemplateColumns ?? '1fr';
    const rowTemplate = style?.gridTemplateRows ?? 'auto';

    const tracksX = wasmParseTracks(colTemplate, availableWidth, colGap);
    const tracksY = wasmParseTracks(rowTemplate, availableHeight, rowGap);
    if (!tracksX || !tracksY) return null;

    // tracksX가 비어있으면 기본 1 column
    const effectiveTracksX = tracksX.length > 0
      ? tracksX
      : new Float32Array([availableWidth]);
    const effectiveTracksY = tracksY.length > 0
      ? tracksY
      : new Float32Array([50]);

    const positions = wasmGridCellPositions(
      effectiveTracksX, effectiveTracksY,
      colGap, rowGap, children.length,
    );
    if (!positions) return null;

    const layouts = children.map((child, i) => ({
      elementId: child.id,
      x: positions[i * 4],
      y: positions[i * 4 + 1],
      width: positions[i * 4 + 2],
      height: positions[i * 4 + 3],
    }));

    // Phase 4: Worker 비동기 재검증 (SWR)
    if (WASM_FLAGS.LAYOUT_WORKER) {
      this.scheduleWorkerGrid(
        parent.id,
        children.map(c => c.id),
        colTemplate, rowTemplate,
        availableWidth, availableHeight,
        colGap, rowGap,
        children.length,
      );
    }

    return layouts;
  }

  /**
   * Worker에 그리드 레이아웃 비동기 계산을 스케줄링한다.
   */
  private scheduleWorkerGrid(
    parentId: string,
    childIds: string[],
    colTemplate: string,
    rowTemplate: string,
    availableWidth: number,
    availableHeight: number,
    colGap: number,
    rowGap: number,
    childCount: number,
  ): void {
    const scheduler = getLayoutScheduler();
    if (!scheduler) return;

    const params: GridLayoutParams = {
      kind: 'grid',
      parentId,
      childIds,
      colTemplate,
      rowTemplate,
      availableWidth,
      availableHeight,
      colGap,
      rowGap,
      childCount,
    };

    scheduler.scheduleAsync(params);
  }
}
