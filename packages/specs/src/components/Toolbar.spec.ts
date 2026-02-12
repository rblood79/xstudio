/**
 * Toolbar Component Spec
 *
 * Material Design 3 기반 툴바 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';

/**
 * Toolbar Props
 */
export interface ToolbarProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  style?: Record<string, string | number | undefined>;
}

/**
 * Toolbar Component Spec
 */
export const ToolbarSpec: ComponentSpec<ToolbarProps> = {
  name: 'Toolbar',
  description: 'Material Design 3 기반 툴바 컴포넌트',
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
      background: '{color.primary-container}' as TokenRef,
      backgroundHover: '{color.primary-container}' as TokenRef,
      backgroundPressed: '{color.primary-container}' as TokenRef,
      text: '{color.on-primary-container}' as TokenRef,
      border: '{color.primary}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 36,
      paddingX: 8,
      paddingY: 4,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 4,
    },
    md: {
      height: 44,
      paddingX: 12,
      paddingY: 6,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 8,
    },
    lg: {
      height: 52,
      paddingX: 16,
      paddingY: 8,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      gap: 10,
    },
  },

  states: {
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
      const isVertical = props.orientation === 'vertical';
      const borderRadius = size.borderRadius;

      const shapes: Shape[] = [
        // 배경
        {
          id: 'bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width: 'auto',
          height: isVertical ? 'auto' : size.height,
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
        // 도구 아이템 컨테이너
        {
          type: 'container' as const,
          x: 0,
          y: 0,
          width: 'auto',
          height: 'auto',
          children: [],
          layout: {
            display: 'flex',
            flexDirection: isVertical ? 'column' : 'row',
            alignItems: 'center',
            gap: size.gap,
            padding: [size.paddingY, size.paddingX, size.paddingY, size.paddingX],
          },
        },
      ];

      return shapes;
    },

    react: (props) => ({
      role: 'toolbar',
      'aria-orientation': props.orientation || 'horizontal',
    }),

    pixi: () => ({
      eventMode: 'static' as const,
    }),
  },
};
