/**
 * CSS Grid 레이아웃 엔진
 *
 * GridLayout.utils.ts의 기존 로직을 LayoutEngine 인터페이스로 래핑
 *
 * @since 2026-01-28 Phase 2 - 하이브리드 레이아웃 엔진
 */

import type { Element } from '../../../../../types/core/store.types';
import type { LayoutEngine, ComputedLayout } from './LayoutEngine';
import {
  parseGridTemplate,
  parseGap,
  parseGridTemplateAreas,
  calculateGridCellBounds,
  parseGridLine,
  type GridStyle,
  type GridTrack,
} from '../GridLayout.utils';
import { parseBoxModel } from './utils';

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
  ): ComputedLayout[] {
    if (children.length === 0) return [];

    const style = parent.props?.style as GridStyle | undefined;

    // Phase 2: WASM 가속 경로 (단순 auto-flow + 명시적 배치 속성 없음)
    if (this.canUseWasmPath(style, children)) {
      const wasmResult = this.calculateViaWasm(
        parent, style, children, availableWidth, availableHeight,
      );
      if (wasmResult) return wasmResult;
      // WASM 실패 시 JS 폴백
    }

    // Gap 파싱 (트랙 파싱보다 먼저 — repeat(auto-fill)에 gap 필요)
    const gap = parseGap(style?.gap);
    const columnGap = parseGap(style?.columnGap) ?? gap;
    const rowGap = parseGap(style?.rowGap) ?? gap;

    // Grid 트랙 파싱 (gap을 전달하여 auto-fill/auto-fit 계산 지원)
    const columnTracks = parseGridTemplate(style?.gridTemplateColumns, availableWidth, columnGap);
    const rowTracks = parseGridTemplate(style?.gridTemplateRows, availableHeight, rowGap);

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

    // grid-auto-flow 파싱
    const autoFlow = style?.gridAutoFlow ?? 'row';
    const isDense = autoFlow.includes('dense');
    const isColumnFlow = autoFlow.includes('column');

    // dense 또는 명시적 배치가 있으면 고급 배치 알고리즘 사용
    const hasExplicitPlacement = children.some(child => {
      const cs = child.props?.style as GridStyle | undefined;
      return !!(cs?.gridArea || cs?.gridColumn || cs?.gridRow);
    });

    if (isDense || hasExplicitPlacement) {
      return this.calculateWithPlacement(
        children, effectiveColumnTracks, effectiveRowTracks,
        columnGap, rowGap, templateAreas, isDense, isColumnFlow,
      );
    }

    // 단순 auto-flow: 기존 로직 (성능 최적화)
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

      return this.applyAlignment(child, childStyle, cellBounds);
    });
  }

  /**
   * 셀 내 정렬 (align-self / justify-self) 적용
   */
  private applyAlignment(
    child: Element,
    childStyle: GridStyle | undefined,
    cellBounds: { x: number; y: number; width: number; height: number; column: number; row: number; columnSpan: number; rowSpan: number },
  ): ComputedLayout {
    const alignSelf = childStyle?.alignSelf as string | undefined;
    const justifySelf = childStyle?.justifySelf as string | undefined;

    let finalX = cellBounds.x;
    let finalY = cellBounds.y;
    let finalWidth = cellBounds.width;
    let finalHeight = cellBounds.height;

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
      }
    }

    return {
      elementId: child.id,
      x: finalX,
      y: finalY,
      width: finalWidth,
      height: finalHeight,
    };
  }

  /**
   * 고급 그리드 배치: 명시적 배치 우선 + auto-placement (dense 지원)
   *
   * CSS Grid 배치 알고리즘:
   * 1. 명시적 gridColumn/gridRow/gridArea 아이템 먼저 배치
   * 2. 나머지 아이템을 auto-placement로 배치
   *    - dense: 매번 (0,0)부터 빈 셀 탐색
   *    - sparse (기본): 현재 커서 위치부터 순방향 탐색
   */
  private calculateWithPlacement(
    children: Element[],
    columnTracks: GridTrack[],
    rowTracks: GridTrack[],
    columnGap: number,
    rowGap: number,
    templateAreas: Map<string, { rowStart: number; rowEnd: number; colStart: number; colEnd: number }>,
    isDense: boolean,
    isColumnFlow: boolean,
  ): ComputedLayout[] {
    const cols = columnTracks.length || 1;
    // 최대 행 수 추정 (필요하면 동적 확장)
    const estimatedRows = Math.max(rowTracks.length, Math.ceil(children.length / cols) + 4);

    // 점유 그리드 (true = 점유됨). [row][col] 0-indexed.
    const occupied: boolean[][] = [];
    const ensureRows = (maxRow: number) => {
      while (occupied.length < maxRow) {
        occupied.push(new Array(cols).fill(false));
      }
    };
    ensureRows(estimatedRows);

    // 셀 영역 점유 표시
    const markOccupied = (
      colStart: number, colEnd: number,
      rowStart: number, rowEnd: number
    ) => {
      ensureRows(rowEnd);
      for (let r = rowStart - 1; r < rowEnd - 1; r++) {
        for (let c = colStart - 1; c < colEnd - 1; c++) {
          if (c < cols) {
            occupied[r][c] = true;
          }
        }
      }
    };

    // 빈 셀 영역 탐색
    const findEmptySlot = (
      colSpan: number, rowSpan: number,
      startRow: number, startCol: number,
    ): { row: number; col: number } | null => {
      const maxSearchRows = occupied.length + children.length;
      ensureRows(maxSearchRows);

      if (isColumnFlow) {
        // column 방향 탐색
        for (let c = startCol; c < cols; c++) {
          const rStart = c === startCol ? startRow : 0;
          for (let r = rStart; r < maxSearchRows; r++) {
            if (this.canPlace(occupied, r, c, rowSpan, colSpan, cols)) {
              ensureRows(r + rowSpan + 1);
              return { row: r, col: c };
            }
          }
        }
      } else {
        // row 방향 탐색 (기본)
        for (let r = startRow; r < maxSearchRows; r++) {
          const cStart = r === startRow ? startCol : 0;
          for (let c = cStart; c <= cols - colSpan; c++) {
            if (this.canPlace(occupied, r, c, rowSpan, colSpan, cols)) {
              ensureRows(r + rowSpan + 1);
              return { row: r, col: c };
            }
          }
        }
      }
      return null;
    };

    // 결과 배열 (children과 같은 인덱스)
    interface Placement {
      colStart: number; colEnd: number;
      rowStart: number; rowEnd: number;
    }
    const placements: (Placement | null)[] = new Array(children.length).fill(null);

    // Phase 1: 명시적 배치 아이템 먼저 배치
    for (let i = 0; i < children.length; i++) {
      const childStyle = children[i].props?.style as GridStyle | undefined;
      if (!childStyle?.gridArea && !childStyle?.gridColumn && !childStyle?.gridRow) {
        continue; // auto 배치 아이템은 나중에
      }

      let colStart = 1;
      let colEnd = 2;
      let rowStart = 1;
      let rowEnd = 2;

      if (childStyle.gridArea) {
        // 이름 기반 영역 또는 숫자 기반
        const areaName = childStyle.gridArea;
        if (!areaName.includes('/')) {
          const namedArea = templateAreas.get(areaName);
          if (namedArea) {
            colStart = namedArea.colStart;
            colEnd = namedArea.colEnd;
            rowStart = namedArea.rowStart;
            rowEnd = namedArea.rowEnd;
          }
        } else {
          const parts = areaName.split('/').map(s => s.trim());
          rowStart = parseInt(parts[0], 10) || 1;
          colStart = parseInt(parts[1], 10) || 1;
          rowEnd = parseInt(parts[2], 10) || rowStart + 1;
          colEnd = parseInt(parts[3], 10) || colStart + 1;
        }
      } else {
        if (childStyle.gridColumn) {
          const parsed = parseGridLine(childStyle.gridColumn, 1);
          colStart = parsed.start;
          colEnd = parsed.end;
        }
        if (childStyle.gridRow) {
          const parsed = parseGridLine(childStyle.gridRow, 1);
          rowStart = parsed.start;
          rowEnd = parsed.end;
        }
      }

      markOccupied(colStart, colEnd, rowStart, rowEnd);
      placements[i] = { colStart, colEnd, rowStart, rowEnd };
    }

    // Phase 2: auto-placement 아이템 배치
    let cursorRow = 0;
    let cursorCol = 0;

    for (let i = 0; i < children.length; i++) {
      if (placements[i] !== null) continue; // 이미 배치됨

      const childStyle = children[i].props?.style as GridStyle | undefined;

      // span 크기 결정 (gridColumn/gridRow가 span만 있고 start가 auto인 경우)
      let colSpan = 1;
      let rowSpan = 1;

      if (childStyle?.gridColumn) {
        const parsed = parseGridLine(childStyle.gridColumn, 1);
        colSpan = parsed.end - parsed.start;
      }
      if (childStyle?.gridRow) {
        const parsed = parseGridLine(childStyle.gridRow, 1);
        rowSpan = parsed.end - parsed.start;
      }

      // dense: 매번 (0,0)부터 탐색
      const searchRow = isDense ? 0 : cursorRow;
      const searchCol = isDense ? 0 : cursorCol;

      const slot = findEmptySlot(colSpan, rowSpan, searchRow, searchCol);
      if (slot) {
        const colStart = slot.col + 1;
        const colEnd = colStart + colSpan;
        const rowStart = slot.row + 1;
        const rowEnd = rowStart + rowSpan;

        markOccupied(colStart, colEnd, rowStart, rowEnd);
        placements[i] = { colStart, colEnd, rowStart, rowEnd };

        // sparse 모드: 커서를 배치 위치 뒤로 이동
        if (!isDense) {
          cursorRow = slot.row;
          cursorCol = slot.col + colSpan;
          if (cursorCol >= cols) {
            cursorCol = 0;
            cursorRow++;
          }
        }
      } else {
        // 폴백: 그리드 끝에 배치
        const fallbackRow = occupied.length + 1;
        placements[i] = {
          colStart: 1, colEnd: 1 + colSpan,
          rowStart: fallbackRow, rowEnd: fallbackRow + rowSpan,
        };
      }
    }

    // Phase 3: 배치 결과를 픽셀 좌표로 변환
    return children.map((child, index) => {
      const placement = placements[index]!;
      const childStyle = child.props?.style as GridStyle | undefined;

      const cellBounds = this.placementToBounds(
        placement, columnTracks, rowTracks, columnGap, rowGap,
      );

      return this.applyAlignment(child, childStyle, {
        ...cellBounds,
        column: placement.colStart,
        row: placement.rowStart,
        columnSpan: placement.colEnd - placement.colStart,
        rowSpan: placement.rowEnd - placement.rowStart,
      });
    });
  }

  /**
   * 지정 위치에 colSpan x rowSpan 영역을 배치할 수 있는지 확인
   */
  private canPlace(
    occupied: boolean[][],
    row: number,
    col: number,
    rowSpan: number,
    colSpan: number,
    cols: number,
  ): boolean {
    if (col + colSpan > cols) return false;
    for (let r = row; r < row + rowSpan; r++) {
      if (r >= occupied.length) continue; // 아직 생성되지 않은 행 = 비어있음
      for (let c = col; c < col + colSpan; c++) {
        if (occupied[r][c]) return false;
      }
    }
    return true;
  }

  /**
   * 배치 정보를 픽셀 좌표 (x, y, width, height)로 변환
   */
  private placementToBounds(
    placement: { colStart: number; colEnd: number; rowStart: number; rowEnd: number },
    columnTracks: GridTrack[],
    rowTracks: GridTrack[],
    columnGap: number,
    rowGap: number,
  ): { x: number; y: number; width: number; height: number } {
    const { colStart, colEnd, rowStart, rowEnd } = placement;

    // x 좌표 계산 (calculateGridCellBounds와 동일한 로직)
    let x = 0;
    for (let i = 0; i < colStart - 1; i++) {
      x += columnTracks[i]?.size || 0;
      if (i < colStart - 2) x += columnGap;
    }

    // y 좌표 계산
    let y = 0;
    for (let i = 0; i < rowStart - 1; i++) {
      y += rowTracks[i]?.size || 0;
      if (i < rowStart - 2) y += rowGap;
    }

    // 너비 계산
    let width = 0;
    for (let i = colStart - 1; i < colEnd - 1; i++) {
      width += columnTracks[i]?.size || 0;
      if (i < colEnd - 2) width += columnGap;
    }

    // 높이 계산
    let height = 0;
    for (let i = rowStart - 1; i < rowEnd - 1; i++) {
      height += rowTracks[i]?.size || 0;
      if (i < rowEnd - 2) height += rowGap;
    }

    if (width === 0) width = columnTracks[0]?.size || 100;
    if (height === 0) height = rowTracks[0]?.size || 100;

    return { x, y, width, height };
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

    // dense auto-flow는 WASM 경로 미지원
    if (style?.gridAutoFlow?.includes('dense')) return false;

    // repeat()/minmax() 함수형 문법은 WASM에서 미지원 → JS 폴백
    const colTpl = style?.gridTemplateColumns ?? '';
    const rowTpl = style?.gridTemplateRows ?? '';
    if (colTpl.includes('(') || rowTpl.includes('(')) return false;

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
    parent: Element,
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
    this.scheduleWorkerGrid(
      parent.id,
      children.map(c => c.id),
      colTemplate, rowTemplate,
      availableWidth, availableHeight,
      colGap, rowGap,
      children.length,
    );

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
