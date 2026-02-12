/**
 * Tree Component Spec
 *
 * Material Design 3 기반 트리 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';

/**
 * Tree Props
 */
export interface TreeProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  selectionMode?: 'none' | 'single' | 'multiple';
  style?: Record<string, string | number | undefined>;
}

/**
 * Tree Component Spec
 */
export const TreeSpec: ComponentSpec<TreeProps> = {
  name: 'Tree',
  description: 'Material Design 3 기반 트리 컴포넌트',
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
      height: 28,
      paddingX: 8,
      paddingY: 4,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      iconSize: 14,
      gap: 2,
    },
    md: {
      height: 36,
      paddingX: 12,
      paddingY: 6,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      iconSize: 16,
      gap: 4,
    },
    lg: {
      height: 44,
      paddingX: 16,
      paddingY: 8,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      iconSize: 20,
      gap: 6,
    },
  },

  states: {
    hover: {},
    pressed: {},
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
    shapes: (_props, variant, size, _state = 'default') => {
      const borderRadius = size.borderRadius;

      const shapes: Shape[] = [
        // 배경
        {
          id: 'bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width: 'auto',
          height: 'auto',
          radius: borderRadius as unknown as number,
          fill: variant.background,
        },
        // 테두리
        {
          type: 'border' as const,
          target: 'bg',
          borderWidth: 1,
          color: variant.border || ('{color.outline-variant}' as TokenRef),
          radius: borderRadius as unknown as number,
        },
        // 콘텐츠 컨테이너 (TreeItem 목록)
        {
          type: 'container' as const,
          x: 0,
          y: 0,
          width: 'auto',
          height: 'auto',
          children: [],
          layout: {
            display: 'flex',
            flexDirection: 'column',
            gap: size.gap,
            padding: size.paddingY,
          },
        },
      ];

      return shapes;
    },

    react: () => ({
      role: 'tree',
    }),

    pixi: () => ({
      eventMode: 'static' as const,
      cursor: 'default',
    }),
  },
};
