/**
 * GridList Component Spec
 *
 * Material Design 3 기반 그리드 리스트 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';

/**
 * GridList Props
 */
export interface GridListProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  selectionMode?: 'none' | 'single' | 'multiple';
  columns?: number;
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
    shapes: (props, _variant, size, _state = 'default') => {
      const columns = props.columns || 3;

      const shapes: Shape[] = [
        // 그리드 컨테이너
        {
          type: 'container' as const,
          x: 0,
          y: 0,
          width: 'auto',
          height: 'auto',
          children: [],
          layout: {
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: size.gap,
            padding: size.paddingY,
          },
        },
      ];

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
