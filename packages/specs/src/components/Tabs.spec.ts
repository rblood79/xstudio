/**
 * Tabs Component Spec
 *
 * Material Design 3 기반 탭 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';

/**
 * Tabs Props
 */
export interface TabsProps {
  variant?: 'default' | 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  selectedKey?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * Tabs Component Spec
 */
export const TabsSpec: ComponentSpec<TabsProps> = {
  name: 'Tabs',
  description: 'Material Design 3 기반 탭 컴포넌트',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container-high}' as TokenRef,
      text: '{color.on-surface-variant}' as TokenRef,
      textHover: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    primary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.primary-container}' as TokenRef,
      backgroundPressed: '{color.primary-container}' as TokenRef,
      text: '{color.on-surface-variant}' as TokenRef,
      textHover: '{color.primary}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    secondary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.secondary-container}' as TokenRef,
      backgroundPressed: '{color.secondary-container}' as TokenRef,
      text: '{color.on-surface-variant}' as TokenRef,
      textHover: '{color.secondary}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 36,
      paddingX: 12,
      paddingY: 6,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 0,
    },
    md: {
      height: 44,
      paddingX: 16,
      paddingY: 10,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 0,
    },
    lg: {
      height: 52,
      paddingX: 20,
      paddingY: 14,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
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
      outlineOffset: '-2px',
    },
  },

  render: {
    shapes: (props, variant, size, _state = 'default') => {
      const isVertical = props.orientation === 'vertical';

      const shapes: Shape[] = [
        // 탭 리스트 컨테이너
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
          },
        },
        // 탭 리스트 하단/우측 구분선
        {
          type: 'line' as const,
          x1: 0,
          y1: isVertical ? 0 : size.height,
          x2: isVertical ? 0 : 'auto' as unknown as number,
          y2: isVertical ? 'auto' as unknown as number : size.height,
          stroke: variant.border || ('{color.outline-variant}' as TokenRef),
          strokeWidth: 1,
        },
        // 탭 패널 컨테이너
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
            padding: size.paddingY,
          },
        },
      ];

      return shapes;
    },

    react: (props) => ({
      'data-orientation': props.orientation || 'horizontal',
    }),

    pixi: () => ({
      eventMode: 'static' as const,
    }),
  },
};
