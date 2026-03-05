/**
 * Nav Component Spec
 *
 * HTML5 nav 기반 네비게이션 컨테이너 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';

/**
 * Nav Props
 */
export interface NavProps {
  variant?: 'default' | 'accent';
  size?: 'S' | 'M' | 'L';
  'aria-label'?: string;
  children?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * Nav Component Spec
 */
export const NavSpec: ComponentSpec<NavProps> = {
  name: 'Nav',
  description: 'HTML5 nav 기반 네비게이션 컨테이너',
  element: 'nav',

  defaultVariant: 'default',
  defaultSize: 'M',

  variants: {
    default: {
      background: '{color.base}' as TokenRef,
      backgroundHover: '{color.base}' as TokenRef,
      backgroundPressed: '{color.base}' as TokenRef,
      text: '{color.neutral}' as TokenRef,
    },
    accent: {
      background: '{color.accent-subtle}' as TokenRef,
      backgroundHover: '{color.accent-subtle}' as TokenRef,
      backgroundPressed: '{color.accent-subtle}' as TokenRef,
      text: '{color.neutral}' as TokenRef,
    },
  },

  sizes: {
    S: {
      height: 48,
      paddingX: 12,
      paddingY: 8,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 8,
    },
    M: {
      height: 56,
      paddingX: 16,
      paddingY: 12,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 12,
    },
    L: {
      height: 64,
      paddingX: 20,
      paddingY: 16,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      gap: 16,
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
      outline: '2px solid var(--highlight-background)',
      outlineOffset: '2px',
    },
  },

  render: {
    shapes: (props, variant, size) => {
      const shapes: Shape[] = [];

      const bgColor = props.style?.backgroundColor ?? variant.background;

      const styleBr = props.style?.borderRadius;
      const borderRadius = styleBr != null
        ? (typeof styleBr === 'number' ? styleBr : parseFloat(String(styleBr)) || 0)
        : size.borderRadius as unknown as number;

      // 배경
      shapes.push({
        id: 'bg',
        type: 'roundRect' as const,
        x: 0,
        y: 0,
        width: 'auto',
        height: 'auto',
        radius: borderRadius,
        fill: bgColor,
      });

      return shapes;
    },

    react: (props) => ({
      'aria-label': props['aria-label'] || 'Navigation',
      role: 'navigation',
    }),

    pixi: () => ({
      eventMode: 'static' as const,
      cursor: 'default',
    }),
  },
};
