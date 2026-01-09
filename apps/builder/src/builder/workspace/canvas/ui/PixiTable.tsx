/**
 * PixiTable.tsx
 *
 * WebGL Table component with CSS synchronization
 * Pattern C: Reads Column and Row/Cell children from store
 *
 * @package xstudio
 */

import { useCallback, useMemo, useRef } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import { getTableSizePreset, getTableColorPreset } from '../utils/cssVariableReader';
import type { Element } from '@/types/core/store.types';
import { useStore } from '@/builder/stores';

export interface PixiTableProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

interface ColumnData {
  id: string;
  label: string;
  width: number;
}

interface RowData {
  id: string;
  cells: { id: string; value: string }[];
  isSelected?: boolean;
}

export function PixiTable({
  element,
  isSelected = false,
  onClick,
  onChange,
}: PixiTableProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';

  // Get CSS presets
  const sizePreset = useMemo(() => getTableSizePreset(size), [size]);
  const colorPreset = useMemo(() => getTableColorPreset(variant), [variant]);

  // 🚀 Performance: useRef로 hover 상태 관리 (리렌더링 없음)
  const rowGraphicsRefs = useRef<Map<string, PixiGraphics>>(new Map());

  // Get children from store
  const allElements = useStore((state) => state.elements);

  // Get columns (from TableHeader/Column or ColumnGroup/Column)
  const columns = useMemo(() => {
    const result: ColumnData[] = [];

    // Find TableHeader or ColumnGroup
    const headerElement = allElements.find(
      (el) =>
        el.parent_id === element.id &&
        (el.tag === 'TableHeader' || el.tag === 'ColumnGroup')
    );

    if (headerElement) {
      // Get Column children
      const columnElements = allElements
        .filter((el) => el.parent_id === headerElement.id && el.tag === 'Column')
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      columnElements.forEach((col) => {
        result.push({
          id: col.id,
          label: (col.props?.children as string) || (col.props?.label as string) || 'Column',
          width: (col.props?.width as number) || 100,
        });
      });
    }

    // If no columns found, create default columns
    if (result.length === 0) {
      result.push({ id: 'col1', label: 'Column 1', width: 100 });
      result.push({ id: 'col2', label: 'Column 2', width: 100 });
    }

    return result;
  }, [allElements, element.id]);

  // Get rows (from TableBody/Row or directly Row children)
  const rows = useMemo(() => {
    const result: RowData[] = [];

    // Find TableBody
    const bodyElement = allElements.find(
      (el) => el.parent_id === element.id && el.tag === 'TableBody'
    );

    const rowParentId = bodyElement?.id || element.id;

    // Get Row children
    const rowElements = allElements
      .filter((el) => el.parent_id === rowParentId && el.tag === 'Row')
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

    rowElements.forEach((row) => {
      // Get Cell children
      const cellElements = allElements
        .filter((el) => el.parent_id === row.id && el.tag === 'Cell')
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      const cells = cellElements.map((cell) => ({
        id: cell.id,
        value: (cell.props?.children as string) || (cell.props?.value as string) || '',
      }));

      // Ensure we have cells for all columns
      while (cells.length < columns.length) {
        cells.push({ id: `empty-${cells.length}`, value: '' });
      }

      result.push({
        id: row.id,
        cells,
        isSelected: row.props?.isSelected as boolean || false,
      });
    });

    return result;
  }, [allElements, element.id, columns.length]);

  // Calculate dimensions
  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
  const headerHeight = sizePreset.rowMinHeight;
  const totalHeight =
    headerHeight +
    rows.length * sizePreset.rowMinHeight +
    (rows.length > 0 ? 0 : 40); // Min height for empty state

  // Header text style
  const headerTextStyle = useMemo(
    () =>
      new TextStyle({
        fontSize: sizePreset.headerFontSize,
        fill: colorPreset.headerTextColor,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: '500',
      }),
    [sizePreset.headerFontSize, colorPreset.headerTextColor]
  );

  // Cell text style
  const cellTextStyle = useMemo(
    () =>
      new TextStyle({
        fontSize: sizePreset.fontSize,
        fill: colorPreset.textColor,
        fontFamily: 'Inter, system-ui, sans-serif',
      }),
    [sizePreset.fontSize, colorPreset.textColor]
  );

  // Selected cell text style
  const selectedCellTextStyle = useMemo(
    () =>
      new TextStyle({
        fontSize: sizePreset.fontSize,
        fill: colorPreset.rowSelectedTextColor,
        fontFamily: 'Inter, system-ui, sans-serif',
      }),
    [sizePreset.fontSize, colorPreset.rowSelectedTextColor]
  );

  // Draw container
  const drawContainer = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.roundRect(0, 0, totalWidth, totalHeight, sizePreset.borderRadius);
      g.fill(colorPreset.backgroundColor);
      g.stroke({ width: 1, color: colorPreset.borderColor });

      // Selection indicator
      if (isSelected) {
        g.roundRect(-2, -2, totalWidth + 4, totalHeight + 4, sizePreset.borderRadius + 2);
        g.stroke({ width: 2, color: colorPreset.focusColor });
      }
    },
    [totalWidth, totalHeight, sizePreset.borderRadius, colorPreset, isSelected]
  );

  // Draw header background
  const drawHeaderBg = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.roundRect(0, 0, totalWidth, headerHeight, sizePreset.borderRadius);
      g.fill(colorPreset.headerBgColor);

      // Bottom border
      g.moveTo(0, headerHeight);
      g.lineTo(totalWidth, headerHeight);
      g.stroke({ width: 1, color: colorPreset.borderColor });
    },
    [totalWidth, headerHeight, sizePreset.borderRadius, colorPreset]
  );

  // Draw column separator
  const drawColumnSeparator = useCallback(
    (g: PixiGraphics, height: number) => {
      g.clear();
      g.moveTo(0, 0);
      g.lineTo(0, height);
      g.stroke({ width: 1, color: colorPreset.borderColor, alpha: 0.5 });
    },
    [colorPreset.borderColor]
  );

  // Draw row background
  const drawRowBg = useCallback(
    (g: PixiGraphics, width: number, height: number, isHovered: boolean, isRowSelected: boolean) => {
      g.clear();

      let bgColor = 0xffffff00; // transparent
      if (isRowSelected) {
        bgColor = colorPreset.rowSelectedBgColor;
      } else if (isHovered) {
        bgColor = colorPreset.rowHoverBgColor;
      }

      if (bgColor !== 0xffffff00) {
        g.rect(0, 0, width, height);
        g.fill(bgColor);
      }

      // Bottom border
      g.moveTo(0, height);
      g.lineTo(width, height);
      g.stroke({ width: 1, color: colorPreset.borderColor, alpha: 0.3 });
    },
    [colorPreset]
  );

  // Handle row click
  const handleRowClick = useCallback(
    (rowId: string) => {
      if (onChange) {
        onChange(element.id, { selectedRowId: rowId });
      }
    },
    [element.id, onChange]
  );

  // Handle container click
  const handleContainerClick = useCallback(() => {
    if (onClick) {
      onClick(element.id);
    }
  }, [element.id, onClick]);

  // 🚀 Phase 12: 테이블 루트 레이아웃
  const tableLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    width: totalWidth,
    height: totalHeight,
    position: 'relative' as const,
  }), [totalWidth, totalHeight]);

  // 🚀 Phase 12: 헤더 행 레이아웃
  const headerRowLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'row' as const,
    width: totalWidth,
    height: headerHeight,
    position: 'relative' as const,
  }), [totalWidth, headerHeight]);

  // 🚀 Phase 12: 데이터 행 레이아웃
  const dataRowLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'row' as const,
    width: totalWidth,
    height: sizePreset.rowMinHeight,
    position: 'relative' as const,
  }), [totalWidth, sizePreset.rowMinHeight]);

  // 🚀 Phase 12: Empty state 레이아웃
  const emptyStateLayout = useMemo(() => ({
    display: 'flex' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    width: totalWidth,
    height: 40,
  }), [totalWidth]);

  return (
    <pixiContainer
      layout={tableLayout}
      eventMode="static"
      cursor="pointer"
      onPointerDown={handleContainerClick}
    >
      {/* Container */}
      <pixiGraphics
        draw={drawContainer}
        layout={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />

      {/* Header */}
      <pixiContainer layout={headerRowLayout}>
        <pixiGraphics
          draw={drawHeaderBg}
          layout={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        />

        {/* Header cells */}
        {columns.map((col, colIndex) => (
          <pixiContainer
            key={col.id}
            layout={{
              display: 'flex',
              alignItems: 'center',
              width: col.width,
              height: headerHeight,
              paddingLeft: sizePreset.cellPaddingX,
              position: 'relative',
            }}
          >
            {/* Column separator */}
            {colIndex > 0 && (
              <pixiGraphics
                draw={(g) => drawColumnSeparator(g, headerHeight)}
                layout={{ position: 'absolute', top: 0, left: 0 }}
              />
            )}

            {/* Header text */}
            <pixiText
              text={col.label}
              style={headerTextStyle}
              layout={{ isLeaf: true }}
            />
          </pixiContainer>
        ))}
      </pixiContainer>

      {/* Rows */}
      {rows.map((row) => (
        <pixiContainer
          key={row.id}
          layout={dataRowLayout}
          eventMode="static"
          cursor="pointer"
          onPointerOver={() => {
            // 🚀 Performance: 직접 그래픽스 업데이트 (리렌더링 없음)
            const g = rowGraphicsRefs.current.get(row.id);
            if (g) drawRowBg(g, totalWidth, sizePreset.rowMinHeight, true, row.isSelected || false);
          }}
          onPointerOut={() => {
            // 🚀 Performance: 직접 그래픽스 업데이트 (리렌더링 없음)
            const g = rowGraphicsRefs.current.get(row.id);
            if (g) drawRowBg(g, totalWidth, sizePreset.rowMinHeight, false, row.isSelected || false);
          }}
          onPointerDown={(e: { stopPropagation: () => void }) => {
            e.stopPropagation();
            handleRowClick(row.id);
          }}
        >
          {/* Row background */}
          <pixiGraphics
            ref={(g) => {
              if (g) rowGraphicsRefs.current.set(row.id, g);
            }}
            draw={(g) =>
              drawRowBg(g, totalWidth, sizePreset.rowMinHeight, false, row.isSelected || false)
            }
            layout={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          />

          {/* Cells */}
          {columns.map((col, colIndex) => {
            const cellValue = row.cells[colIndex]?.value || '';

            return (
              <pixiContainer
                key={`${row.id}-${col.id}`}
                layout={{
                  display: 'flex',
                  alignItems: 'center',
                  width: col.width,
                  height: sizePreset.rowMinHeight,
                  paddingLeft: sizePreset.cellPaddingX,
                  position: 'relative',
                }}
              >
                {/* Column separator */}
                {colIndex > 0 && (
                  <pixiGraphics
                    draw={(g) => drawColumnSeparator(g, sizePreset.rowMinHeight)}
                    layout={{ position: 'absolute', top: 0, left: 0 }}
                  />
                )}

                {/* Cell text */}
                <pixiText
                  text={cellValue}
                  style={row.isSelected ? selectedCellTextStyle : cellTextStyle}
                  layout={{ isLeaf: true }}
                />
              </pixiContainer>
            );
          })}
        </pixiContainer>
      ))}

      {/* Empty state */}
      {rows.length === 0 && (
        <pixiContainer layout={emptyStateLayout}>
          <pixiText
            text="No data"
            style={
              new TextStyle({
                fontSize: sizePreset.fontSize,
                fill: 0x9ca3af,
                fontFamily: 'Inter, system-ui, sans-serif',
                fontStyle: 'italic',
              })
            }
            layout={{ isLeaf: true }}
          />
        </pixiContainer>
      )}
    </pixiContainer>
  );
}

export default PixiTable;
