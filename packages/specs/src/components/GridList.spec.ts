/**
 * GridList Component Spec
 *
 * Material Design 3 기반 그리드 리스트 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';
import { resolveToken } from '../renderers/utils/tokenResolver';

/**
 * GridList Item
 */
export interface GridListItem {
  id: string;
  label: string;
  description?: string;
}

/**
 * GridList Props
 */
export interface GridListProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  selectionMode?: 'none' | 'single' | 'multiple';
  columns?: number;
  items?: GridListItem[];
  style?: Record<string, string | number | undefined>;
}

/**
 * GridList Component Spec
 */
export const GridListSpec: ComponentSpec<GridListProps> = {
  name: 'GridList',
  description: 'Material Design 3 기반 그리드 리스트 컴포넌트',
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
    primary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.primary-container}' as TokenRef,
      backgroundPressed: '{color.primary-container}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 8,
      paddingY: 8,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 8,
    },
    md: {
      height: 0,
      paddingX: 12,
      paddingY: 12,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 12,
    },
    lg: {
      height: 0,
      paddingX: 16,
      paddingY: 16,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      gap: 16,
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
      // 샘플 데이터 fallback — props가 없을 때 캔버스에 기본 그리드를 표시
      const DEFAULT_ITEMS: GridListItem[] = [
        { id: 'i1', label: 'Item 1', description: 'Description' },
        { id: 'i2', label: 'Item 2', description: 'Description' },
        { id: 'i3', label: 'Item 3', description: 'Description' },
        { id: 'i4', label: 'Item 4', description: 'Description' },
      ];

      const numCols   = props.columns ?? 2;
      const items     = (props.items && props.items.length > 0) ? props.items : DEFAULT_ITEMS;
      const gap       = size.gap as unknown as number ?? 12;
      const paddingX  = size.paddingX as unknown as number ?? 12;
      const paddingY  = size.paddingY as unknown as number ?? 12;
      const rawFontSize = size.fontSize;
      const resolvedFs = typeof rawFontSize === 'number'
        ? rawFontSize
        : (typeof rawFontSize === 'string' && rawFontSize.startsWith('{')
            ? resolveToken(rawFontSize as TokenRef)
            : rawFontSize);
      const fontSize  = typeof resolvedFs === 'number' ? resolvedFs : 14;
      const ff        = (props.style?.fontFamily as string) || fontFamily.sans;
      const textColor = props.style?.color ?? variant.text;
      const bgColor   = props.style?.backgroundColor ?? variant.background;
      const borderColor = variant.border;

      // 컨테이너 전체 너비 (style.width 우선, 없으면 기본값)
      const totalWidth  = (props.style?.width as number) || 280;
      // 셀 너비 계산: 패딩 + 각 셀 사이 gap을 제외한 나머지를 균등 배분
      const cellWidth   = (totalWidth - paddingX * 2 - gap * (numCols - 1)) / numCols;
      const cellHeight  = fontSize > 16 ? 80 : fontSize > 12 ? 70 : 60;

      const numRows     = Math.ceil(items.length / numCols);
      const totalHeight = paddingY * 2 + cellHeight * numRows + gap * (numRows - 1);

      const shapes: Shape[] = [];

      // 컨테이너 배경
      shapes.push({
        id: 'bg',
        type: 'roundRect' as const,
        x: 0,
        y: 0,
        width: totalWidth,
        height: totalHeight,
        radius: 8,
        fill: bgColor,
      });

      // 테두리
      if (borderColor) {
        shapes.push({
          type: 'border' as const,
          target: 'bg',
          borderWidth: 1,
          color: borderColor,
          radius: 8,
        });
      }

      // Child Composition: 자식 Element가 있으면 spec shapes에서 아이템 렌더링 스킵
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // 그리드 아이템
      items.forEach((item, idx) => {
        const col = idx % numCols;
        const row = Math.floor(idx / numCols);
        const cellX = paddingX + col * (cellWidth + gap);
        const cellY = paddingY + row * (cellHeight + gap);

        // 아이템 카드 배경
        shapes.push({
          type: 'roundRect' as const,
          x: cellX,
          y: cellY,
          width: cellWidth,
          height: cellHeight,
          radius: 6,
          fill: '{color.surface-container}' as TokenRef,
        });

        // 아이템 레이블
        shapes.push({
          type: 'text' as const,
          x: cellX + 10,
          y: cellY + cellHeight / 2 - (item.description ? fontSize * 0.6 : 0),
          text: item.label,
          fontSize,
          fontFamily: ff,
          fontWeight: 500,
          fill: textColor,
          baseline: 'middle' as const,
          align: 'left' as const,
        });

        // 아이템 설명 (있을 경우)
        if (item.description) {
          shapes.push({
            type: 'text' as const,
            x: cellX + 10,
            y: cellY + cellHeight / 2 + fontSize * 0.8,
            text: item.description,
            fontSize: Math.max(fontSize - 2, 10),
            fontFamily: ff,
            fontWeight: 400,
            fill: '{color.on-surface-variant}' as TokenRef,
            baseline: 'middle' as const,
            align: 'left' as const,
          });
        }
      });

      return shapes;
    },

    react: (props) => ({
      role: 'grid',
      'aria-multiselectable': props.selectionMode === 'multiple' || undefined,
    }),

    pixi: () => ({
      eventMode: 'static' as const,
    }),
  },
};
