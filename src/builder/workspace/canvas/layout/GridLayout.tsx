/**
 * Grid Layout
 *
 * 🚀 Phase 11 B2.3: CSS Grid 레이아웃 (커스텀 구현)
 *
 * @pixi/layout이 CSS Grid를 지원하지 않으므로,
 * CSS Grid 속성을 파싱하여 수동으로 위치/크기를 계산합니다.
 *
 * @since 2025-12-11 Phase 11 B2.3
 */

import { memo, useMemo } from 'react';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';

// ============================================
// Types
// ============================================

/**
 * CSS Grid 스타일 속성
 */
export interface GridStyle {
  display?: 'grid' | 'inline-grid' | 'flex' | 'block' | 'none';
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridTemplateAreas?: string;
  gridAutoColumns?: string;
  gridAutoRows?: string;
  gridAutoFlow?: 'row' | 'column' | 'dense' | 'row dense' | 'column dense';
  gap?: number | string;
  rowGap?: number | string;
  columnGap?: number | string;
  justifyItems?: 'start' | 'end' | 'center' | 'stretch';
  alignItems?: 'start' | 'end' | 'center' | 'stretch';
  justifyContent?: 'start' | 'end' | 'center' | 'stretch' | 'space-around' | 'space-between' | 'space-evenly';
  alignContent?: 'start' | 'end' | 'center' | 'stretch' | 'space-around' | 'space-between' | 'space-evenly';
  // Grid Item 속성
  gridColumn?: string;
  gridRow?: string;
  gridArea?: string;
  justifySelf?: 'start' | 'end' | 'center' | 'stretch';
  alignSelf?: 'start' | 'end' | 'center' | 'stretch';
}

/**
 * 파싱된 그리드 트랙 정보
 */
export interface GridTrack {
  size: number;
  unit: 'px' | 'fr' | '%' | 'auto';
  originalValue: string;
}

/**
 * 계산된 셀 위치/크기
 */
export interface GridCellBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  column: number;
  row: number;
  columnSpan: number;
  rowSpan: number;
}

export interface GridLayoutProps {
  element: Element;
  containerWidth: number;
  containerHeight: number;
  isSelected?: boolean;
  children?: React.ReactNode;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Element가 Grid 컨테이너인지 확인
 */
export function isGridContainer(element: Element): boolean {
  const style = element.props?.style as CSSStyle | undefined;
  const display = style?.display;
  return display === 'grid' || display === 'inline-grid';
}

/**
 * CSS Grid 트랙 값을 파싱
 *
 * @example
 * parseGridTemplate('1fr 2fr 1fr', 800) // [{size: 200, unit: 'fr'}, {size: 400, unit: 'fr'}, {size: 200, unit: 'fr'}]
 * parseGridTemplate('100px auto 200px', 800) // [{size: 100, unit: 'px'}, {size: 500, unit: 'auto'}, {size: 200, unit: 'px'}]
 */
export function parseGridTemplate(
  template: string | undefined,
  containerSize: number
): GridTrack[] {
  if (!template) return [];

  const parts = template.trim().split(/\s+/);
  const tracks: GridTrack[] = [];

  // 첫 번째 패스: fr이 아닌 트랙 크기 계산
  let frCount = 0;
  let fixedSize = 0;

  for (const part of parts) {
    if (part.endsWith('fr')) {
      frCount += parseFloat(part) || 1;
      tracks.push({ size: 0, unit: 'fr', originalValue: part });
    } else if (part.endsWith('px')) {
      const size = parseFloat(part);
      fixedSize += size;
      tracks.push({ size, unit: 'px', originalValue: part });
    } else if (part.endsWith('%')) {
      const percentage = parseFloat(part);
      const size = (percentage / 100) * containerSize;
      fixedSize += size;
      tracks.push({ size, unit: '%', originalValue: part });
    } else if (part === 'auto') {
      // auto는 남은 공간을 1fr처럼 처리
      frCount += 1;
      tracks.push({ size: 0, unit: 'auto', originalValue: part });
    } else if (part.startsWith('minmax(')) {
      // minmax(min, max) 처리 - 간단하게 최대값 사용
      const match = part.match(/minmax\(([^,]+),\s*([^)]+)\)/);
      if (match) {
        const maxValue = match[2].trim();
        if (maxValue.endsWith('fr')) {
          frCount += parseFloat(maxValue) || 1;
          tracks.push({ size: 0, unit: 'fr', originalValue: part });
        } else if (maxValue.endsWith('px')) {
          const size = parseFloat(maxValue);
          fixedSize += size;
          tracks.push({ size, unit: 'px', originalValue: part });
        }
      }
    } else if (part.startsWith('repeat(')) {
      // repeat(count, track) 처리
      const match = part.match(/repeat\((\d+),\s*([^)]+)\)/);
      if (match) {
        const count = parseInt(match[1], 10);
        const trackValue = match[2].trim();
        for (let i = 0; i < count; i++) {
          if (trackValue.endsWith('fr')) {
            frCount += parseFloat(trackValue) || 1;
            tracks.push({ size: 0, unit: 'fr', originalValue: trackValue });
          } else if (trackValue.endsWith('px')) {
            const size = parseFloat(trackValue);
            fixedSize += size;
            tracks.push({ size, unit: 'px', originalValue: trackValue });
          }
        }
      }
    }
  }

  // 두 번째 패스: fr 크기 계산
  const remainingSpace = Math.max(0, containerSize - fixedSize);
  const frSize = frCount > 0 ? remainingSpace / frCount : 0;

  for (const track of tracks) {
    if (track.unit === 'fr') {
      const frValue = parseFloat(track.originalValue) || 1;
      track.size = frSize * frValue;
    } else if (track.unit === 'auto') {
      track.size = frSize;
    }
  }

  return tracks;
}

/**
 * Gap 값을 숫자로 파싱
 */
export function parseGap(value: number | string | undefined): number {
  if (value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (value.endsWith('px')) return parseFloat(value);
  return parseFloat(value) || 0;
}

/**
 * grid-area 문자열을 파싱
 *
 * @example
 * parseGridArea('header') // { name: 'header' }
 * parseGridArea('1 / 2 / 3 / 4') // { rowStart: 1, colStart: 2, rowEnd: 3, colEnd: 4 }
 */
export function parseGridArea(area: string | undefined): {
  name?: string;
  rowStart?: number;
  colStart?: number;
  rowEnd?: number;
  colEnd?: number;
} {
  if (!area) return {};

  // 슬래시로 구분된 숫자인 경우
  if (area.includes('/')) {
    const parts = area.split('/').map((p) => p.trim());
    return {
      rowStart: parseInt(parts[0], 10) || 1,
      colStart: parseInt(parts[1], 10) || 1,
      rowEnd: parseInt(parts[2], 10) || undefined,
      colEnd: parseInt(parts[3], 10) || undefined,
    };
  }

  // 명명된 영역
  return { name: area };
}

/**
 * Grid 템플릿 영역을 파싱하여 영역 맵 생성
 *
 * @example
 * parseGridTemplateAreas('"header header" "sidebar main" "footer footer"')
 * // { header: { rowStart: 1, rowEnd: 2, colStart: 1, colEnd: 3 }, ... }
 */
export function parseGridTemplateAreas(
  template: string | undefined
): Map<string, { rowStart: number; rowEnd: number; colStart: number; colEnd: number }> {
  const areas = new Map<string, { rowStart: number; rowEnd: number; colStart: number; colEnd: number }>();

  if (!template) return areas;

  // 각 행 파싱
  const rows = template.match(/"[^"]+"/g);
  if (!rows) return areas;

  rows.forEach((row, rowIndex) => {
    const cells = row.replace(/"/g, '').trim().split(/\s+/);
    cells.forEach((cellName, colIndex) => {
      if (cellName === '.') return; // 빈 셀 무시

      const existing = areas.get(cellName);
      if (existing) {
        // 기존 영역 확장
        existing.rowEnd = Math.max(existing.rowEnd, rowIndex + 2);
        existing.colEnd = Math.max(existing.colEnd, colIndex + 2);
      } else {
        // 새 영역 생성
        areas.set(cellName, {
          rowStart: rowIndex + 1,
          rowEnd: rowIndex + 2,
          colStart: colIndex + 1,
          colEnd: colIndex + 2,
        });
      }
    });
  });

  return areas;
}

/**
 * 자식 요소의 그리드 셀 위치/크기 계산
 */
export function calculateGridCellBounds(
  childStyle: CSSStyle | GridStyle | undefined,
  columnTracks: GridTrack[],
  rowTracks: GridTrack[],
  columnGap: number,
  rowGap: number,
  templateAreas: Map<string, { rowStart: number; rowEnd: number; colStart: number; colEnd: number }>,
  childIndex: number
): GridCellBounds {
  const gridStyle = childStyle as GridStyle | undefined;

  let colStart = 1;
  let colEnd = 2;
  let rowStart = 1;
  let rowEnd = 2;

  // grid-area로 위치 결정
  if (gridStyle?.gridArea) {
    const area = parseGridArea(gridStyle.gridArea);
    if (area.name) {
      const namedArea = templateAreas.get(area.name);
      if (namedArea) {
        colStart = namedArea.colStart;
        colEnd = namedArea.colEnd;
        rowStart = namedArea.rowStart;
        rowEnd = namedArea.rowEnd;
      }
    } else {
      if (area.rowStart) rowStart = area.rowStart;
      if (area.colStart) colStart = area.colStart;
      if (area.rowEnd) rowEnd = area.rowEnd;
      if (area.colEnd) colEnd = area.colEnd;
    }
  } else {
    // grid-column, grid-row로 위치 결정
    if (gridStyle?.gridColumn) {
      const parts = gridStyle.gridColumn.split('/').map((p) => parseInt(p.trim(), 10));
      colStart = parts[0] || 1;
      colEnd = parts[1] || colStart + 1;
    }
    if (gridStyle?.gridRow) {
      const parts = gridStyle.gridRow.split('/').map((p) => parseInt(p.trim(), 10));
      rowStart = parts[0] || 1;
      rowEnd = parts[1] || rowStart + 1;
    }

    // 위치 지정 없으면 자동 배치
    if (!gridStyle?.gridColumn && !gridStyle?.gridRow && !gridStyle?.gridArea) {
      const colCount = Math.max(columnTracks.length, 1);
      colStart = (childIndex % colCount) + 1;
      colEnd = colStart + 1;
      rowStart = Math.floor(childIndex / colCount) + 1;
      rowEnd = rowStart + 1;
    }
  }

  // 위치 계산
  let x = 0;
  for (let i = 0; i < colStart - 1 && i < columnTracks.length; i++) {
    x += columnTracks[i].size + columnGap;
  }

  let y = 0;
  for (let i = 0; i < rowStart - 1 && i < rowTracks.length; i++) {
    y += rowTracks[i].size + rowGap;
  }

  // 크기 계산
  let width = 0;
  for (let i = colStart - 1; i < colEnd - 1 && i < columnTracks.length; i++) {
    width += columnTracks[i].size;
    if (i < colEnd - 2) width += columnGap;
  }

  let height = 0;
  for (let i = rowStart - 1; i < rowEnd - 1 && i < rowTracks.length; i++) {
    height += rowTracks[i].size;
    if (i < rowEnd - 2) height += rowGap;
  }

  // 기본 크기
  if (width === 0) width = columnTracks[0]?.size || 100;
  if (height === 0) height = rowTracks[0]?.size || 100;

  return {
    x,
    y,
    width,
    height,
    column: colStart,
    row: rowStart,
    columnSpan: colEnd - colStart,
    rowSpan: rowEnd - rowStart,
  };
}

// ============================================
// Hook
// ============================================

/**
 * Grid 레이아웃 계산 훅
 */
export function useGridLayout(
  element: Element,
  containerWidth: number,
  containerHeight: number
) {
  const style = element.props?.style as CSSStyle | GridStyle | undefined;

  return useMemo(() => {
    const gridStyle = style as GridStyle | undefined;

    // 트랙 파싱
    const columnTracks = parseGridTemplate(gridStyle?.gridTemplateColumns, containerWidth);
    const rowTracks = parseGridTemplate(gridStyle?.gridTemplateRows, containerHeight);

    // Gap 파싱
    const gap = parseGap(gridStyle?.gap);
    const columnGap = parseGap(gridStyle?.columnGap) || gap;
    const rowGap = parseGap(gridStyle?.rowGap) || gap;

    // 템플릿 영역 파싱
    const templateAreas = parseGridTemplateAreas(gridStyle?.gridTemplateAreas);

    return {
      columnTracks,
      rowTracks,
      columnGap,
      rowGap,
      templateAreas,
    };
  }, [style, containerWidth, containerHeight]);
}

// ============================================
// Component
// ============================================

/**
 * GridLayout 컨테이너
 *
 * CSS Grid 속성을 파싱하여 자식 요소의 위치를 계산합니다.
 *
 * @example
 * <GridLayout element={gridContainerElement} containerWidth={800} containerHeight={600}>
 *   <ElementSprite element={childElement} />
 * </GridLayout>
 */
export const GridLayout = memo(function GridLayout({
  element,
  children,
}: GridLayoutProps) {
  const style = element.props?.style as CSSStyle | undefined;

  // 위치 계산
  const position = useMemo(() => {
    const left = typeof style?.left === 'number' ? style.left :
      typeof style?.left === 'string' ? parseFloat(style.left) : 0;
    const top = typeof style?.top === 'number' ? style.top :
      typeof style?.top === 'string' ? parseFloat(style.top) : 0;
    return { x: left, y: top };
  }, [style?.left, style?.top]);

  // Grid 레이아웃 계산
  // Note: grid layout 계산은 현재 children에 전달하지 않음 (children이 직접 계산)

  return (
    <pixiContainer
      x={position.x}
      y={position.y}
    >
      {children}
    </pixiContainer>
  );
});

export default GridLayout;
