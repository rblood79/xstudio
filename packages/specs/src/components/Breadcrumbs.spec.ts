/**
 * Breadcrumbs Component Spec
 *
 * Material Design 3 기반 브레드크럼 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';

/**
 * Breadcrumbs Props
 */
export interface BreadcrumbsProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  separator?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * Breadcrumbs Component Spec
 */
export const BreadcrumbsSpec: ComponentSpec<BreadcrumbsProps> = {
  name: 'Breadcrumbs',
  description: 'Material Design 3 기반 브레드크럼 네비게이션 컴포넌트',
  element: 'nav',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface-variant}' as TokenRef,
      textHover: '{color.primary}' as TokenRef,
    },
    primary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface-variant}' as TokenRef,
      textHover: '{color.primary}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 24,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 4,
    },
    md: {
      height: 32,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 8,
    },
    lg: {
      height: 40,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 10,
    },
  },

  states: {
    hover: {},
    focusVisible: {
      outline: '2px solid var(--primary)',
      outlineOffset: '2px',
    },
  },

  render: {
    shapes: (_props, _variant, size, _state = 'default') => {
      const shapes: Shape[] = [
        // 브레드크럼 컨테이너
        {
          type: 'container' as const,
          x: 0,
          y: 0,
          width: 'auto',
          height: 'auto',
          children: [],
          layout: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: size.gap,
          },
        },
      ];

      return shapes;
    },

    react: () => ({
      'aria-label': 'Breadcrumb',
    }),

    pixi: () => ({
      eventMode: 'static' as const,
    }),
  },
};
