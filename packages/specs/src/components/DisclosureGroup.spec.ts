/**
 * DisclosureGroup Component Spec
 *
 * Material Design 3 기반 디스클로저 그룹 (아코디언 그룹) 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { resolveStateColors } from '../utils/stateEffect';

/**
 * DisclosureGroup Props
 */
export interface DisclosureGroupProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  allowsMultipleExpanded?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * DisclosureGroup Component Spec
 */
export const DisclosureGroupSpec: ComponentSpec<DisclosureGroupProps> = {
  name: 'DisclosureGroup',
  description: 'Material Design 3 기반 디스클로저 그룹 컴포넌트',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    primary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.primary}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 0,
    },
    md: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 0,
    },
    lg: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      gap: 0,
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
    shapes: (_props, variant, size, state = 'default') => {
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
          fill: resolveStateColors(variant, state).background,
        },
        // 테두리
        {
          type: 'border' as const,
          target: 'bg',
          borderWidth: 1,
          color: variant.border || ('{color.outline-variant}' as TokenRef),
          radius: borderRadius as unknown as number,
        },
        // 디스클로저 아이템 컨테이너 (divider로 구분됨)
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
          },
        },
      ];

      return shapes;
    },

    react: () => ({
      role: 'group',
    }),

    pixi: () => ({
      eventMode: 'static' as const,
    }),
  },
};
