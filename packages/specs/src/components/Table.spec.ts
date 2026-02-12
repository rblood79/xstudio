/**
 * Table Component Spec
 *
 * Material Design 3 기반 데이터 테이블 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * Table Column
 */
export interface TableColumn {
  id: string;
  label: string;
  width?: number;
  allowsSorting?: boolean;
}

/**
 * Table Row
 */
export interface TableRow {
  id: string;
  cells: Record<string, unknown>;
  isSelected?: boolean;
}

/**
 * Table Props
 */
export interface TableProps {
  variant?: 'default' | 'striped' | 'bordered';
  size?: 'sm' | 'md' | 'lg';
  columns?: TableColumn[];
  rows?: TableRow[];
  selectionMode?: 'none' | 'single' | 'multiple';
  style?: Record<string, string | number | undefined>;
}

/**
 * Table Component Spec
 */
export const TableSpec: ComponentSpec<TableProps> = {
  name: 'Table',
  description: 'Material Design 3 기반 데이터 테이블 컴포넌트',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container-high}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    striped: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container-high}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    bordered: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container-high}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 36,
      paddingX: 8,
      paddingY: 4,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      gap: 0,
    },
    md: {
      height: 44,
      paddingX: 12,
      paddingY: 8,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 0,
    },
    lg: {
      height: 52,
      paddingX: 16,
      paddingY: 12,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 0,
    },
  },

  states: {
    hover: {},
    disabled: {
      opacity: 0.38,
      pointerEvents: 'none',
    },
    focusVisible: {
      outline: '2px solid var(--primary)',
      outlineOffset: '2px',
    },
  },

  render: {
    shapes: (props, variant, size, _state = 'default') => {
      const columns = props.columns || [];
      const rows = props.rows || [];
      const totalWidth = columns.reduce((sum, col) => sum + (col.width || 100), 0) || 200;
      const borderRadius = size.borderRadius;

      const shapes: Shape[] = [];

      // 컨테이너 배경
      shapes.push({
        id: 'bg',
        type: 'roundRect' as const,
        x: 0,
        y: 0,
        width: totalWidth,
        height: 'auto',
        radius: borderRadius as unknown as number,
        fill: variant.background,
      });

      // 테두리
      if (variant.border) {
        shapes.push({
          type: 'border' as const,
          target: 'bg',
          borderWidth: props.variant === 'bordered' ? 2 : 1,
          color: variant.border,
          radius: borderRadius as unknown as number,
        });
      }

      // 헤더 행 배경
      shapes.push({
        type: 'rect' as const,
        x: 0,
        y: 0,
        width: totalWidth,
        height: size.height,
        fill: '{color.surface-container}' as TokenRef,
      });

      // 헤더 텍스트
      let xOffset = 0;
      columns.forEach((col) => {
        shapes.push({
          type: 'text' as const,
          x: xOffset + size.paddingX,
          y: size.height / 2,
          text: col.label,
          fontSize: size.fontSize as unknown as number,
          fontFamily: fontFamily.sans,
          fontWeight: 600,
          fill: variant.text,
          baseline: 'middle' as const,
          align: 'left' as const,
        });
        xOffset += col.width || 100;
      });

      // 헤더 하단 구분선
      shapes.push({
        type: 'line' as const,
        x1: 0,
        y1: size.height,
        x2: totalWidth,
        y2: size.height,
        stroke: variant.border || ('{color.outline-variant}' as TokenRef),
        strokeWidth: 1,
      });

      // 데이터 행
      let yOffset = size.height;
      rows.forEach((row, rowIndex) => {
        const isEven = rowIndex % 2 === 0;
        const rowBg = props.variant === 'striped' && !isEven
          ? '{color.surface-container}' as TokenRef
          : variant.background;

        // 행 배경
        shapes.push({
          type: 'rect' as const,
          x: 0,
          y: yOffset,
          width: totalWidth,
          height: size.height,
          fill: row.isSelected
            ? ('{color.primary-container}' as TokenRef)
            : rowBg,
        });

        // 셀 텍스트
        let cellXOffset = 0;
        columns.forEach((col) => {
          const cellValue = String(row.cells[col.id] || '');
          shapes.push({
            type: 'text' as const,
            x: cellXOffset + size.paddingX,
            y: yOffset + size.height / 2,
            text: cellValue,
            fontSize: size.fontSize as unknown as number,
            fontFamily: fontFamily.sans,
            fontWeight: 400,
            fill: row.isSelected
              ? ('{color.on-primary-container}' as TokenRef)
              : variant.text,
            baseline: 'middle' as const,
            align: 'left' as const,
          });
          cellXOffset += col.width || 100;
        });

        // 행 하단 구분선
        shapes.push({
          type: 'line' as const,
          x1: 0,
          y1: yOffset + size.height,
          x2: totalWidth,
          y2: yOffset + size.height,
          stroke: variant.border || ('{color.outline-variant}' as TokenRef),
          strokeWidth: 1,
        });

        yOffset += size.height;
      });

      return shapes;
    },

    react: (props) => ({
      role: 'table',
      'aria-rowcount': props.rows?.length,
      'aria-colcount': props.columns?.length,
    }),

    pixi: () => ({
      eventMode: 'static' as const,
      cursor: 'default',
    }),
  },
};
