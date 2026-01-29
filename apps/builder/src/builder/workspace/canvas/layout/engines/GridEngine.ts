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

      return {
        elementId: child.id,
        x: cellBounds.x,
        y: cellBounds.y,
        width: cellBounds.width,
        height: cellBounds.height,
      };
    });
  }
}
