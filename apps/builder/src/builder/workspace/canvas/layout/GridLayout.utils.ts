import { useMemo, type ReactNode } from 'react';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';

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
  children?: ReactNode;
}

/**
 * Element가 Grid 컨테이너인지 확인
 */
export function isGridContainer(element: Element): boolean {
  const style = element.props?.style as CSSStyle | undefined;
  const display = style?.display;
  return display === 'grid' || display === 'inline-grid';
}

/**
 * Element가 Flex 컨테이너인지 확인
 * 🚀 Phase 7: LayoutEngine.ts에서 이동
 */
export function isFlexContainer(element: Element): boolean {
  const style = element.props?.style as CSSStyle | undefined;
  return style?.display === 'flex';
}

/**
 * CSS Grid 트랙 값을 파싱
 */
export function parseGridTemplate(
  template: string | undefined,
  containerSize: number
): GridTrack[] {
  if (!template) return [];

  const parts = template.trim().split(/\s+/);
  const tracks: GridTrack[] = [];

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
      frCount += 1;
      tracks.push({ size: 0, unit: 'auto', originalValue: part });
    } else {
      frCount += 1;
      tracks.push({ size: 0, unit: 'auto', originalValue: part });
    }
  }

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
 */
export function parseGridArea(area: string | undefined): {
  name?: string;
  rowStart?: number;
  colStart?: number;
  rowEnd?: number;
  colEnd?: number;
} {
  if (!area) return {};

  if (area.includes('/')) {
    const parts = area.split('/').map((p) => p.trim());
    return {
      rowStart: parseInt(parts[0], 10) || 1,
      colStart: parseInt(parts[1], 10) || 1,
      rowEnd: parseInt(parts[2], 10) || undefined,
      colEnd: parseInt(parts[3], 10) || undefined,
    };
  }

  return { name: area };
}

/**
 * Grid 템플릿 영역을 파싱하여 영역 맵 생성
 */
export function parseGridTemplateAreas(
  template: string | undefined
): Map<string, { rowStart: number; rowEnd: number; colStart: number; colEnd: number }> {
  const areas = new Map<string, { rowStart: number; rowEnd: number; colStart: number; colEnd: number }>();
  if (!template) return areas;

  const rows = template.match(/"[^"]+"/g);
  if (!rows) return areas;

  rows.forEach((row, rowIndex) => {
    const cells = row.replace(/"/g, '').trim().split(/\s+/);
    cells.forEach((cellName, colIndex) => {
      if (cellName === '.') return;

      const existing = areas.get(cellName);
      if (existing) {
        existing.rowEnd = Math.max(existing.rowEnd, rowIndex + 2);
        existing.colEnd = Math.max(existing.colEnd, colIndex + 2);
      } else {
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
      if (area.colStart) colStart = area.colStart;
      if (area.colEnd) colEnd = area.colEnd;
      if (area.rowStart) rowStart = area.rowStart;
      if (area.rowEnd) rowEnd = area.rowEnd;
    }
  } else if (gridStyle?.gridColumn || gridStyle?.gridRow) {
    if (gridStyle.gridColumn) {
      const [start, end] = gridStyle.gridColumn.split('/').map((s) => s.trim());
      colStart = parseInt(start, 10) || 1;
      colEnd = parseInt(end, 10) || colStart + 1;
    } else {
      colStart = (childIndex % columnTracks.length) + 1;
      colEnd = colStart + 1;
    }

    if (gridStyle.gridRow) {
      const [start, end] = gridStyle.gridRow.split('/').map((s) => s.trim());
      rowStart = parseInt(start, 10) || 1;
      rowEnd = parseInt(end, 10) || rowStart + 1;
    } else {
      rowStart = Math.floor(childIndex / columnTracks.length) + 1;
      rowEnd = rowStart + 1;
    }
  } else {
    colStart = (childIndex % columnTracks.length) + 1;
    colEnd = colStart + 1;
    rowStart = Math.floor(childIndex / columnTracks.length) + 1;
    rowEnd = rowStart + 1;
  }

  let x = 0;
  for (let i = 0; i < colStart - 1; i++) {
    x += columnTracks[i]?.size || 0;
    if (i < colStart - 2) x += columnGap;
  }

  let y = 0;
  for (let i = 0; i < rowStart - 1; i++) {
    y += rowTracks[i]?.size || 0;
    if (i < rowStart - 2) y += rowGap;
  }

  let width = 0;
  for (let i = colStart - 1; i < colEnd - 1; i++) {
    width += columnTracks[i]?.size || 0;
    if (i < colEnd - 2) width += columnGap;
  }

  let height = 0;
  for (let i = rowStart - 1; i < rowEnd - 1; i++) {
    height += rowTracks[i]?.size || 0;
    if (i < rowEnd - 2) height += rowGap;
  }

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

    const columnTracks = parseGridTemplate(gridStyle?.gridTemplateColumns, containerWidth);
    const rowTracks = parseGridTemplate(gridStyle?.gridTemplateRows, containerHeight);

    const gap = parseGap(gridStyle?.gap);
    const columnGap = parseGap(gridStyle?.columnGap) || gap;
    const rowGap = parseGap(gridStyle?.rowGap) || gap;

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

