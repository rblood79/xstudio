/**
 * Group Component Spec
 *
 * Material Design 3 기반 그룹 컨테이너 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';

/**
 * Group Props
 */
export interface GroupProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  label?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * Group Component Spec
 */
export const GroupSpec: ComponentSpec<GroupProps> = {
  name: 'Group',
  description: 'Material Design 3 기반 그룹 컨테이너 컴포넌트',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
    },
    primary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.primary}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 6,
    },
    md: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 8,
    },
    lg: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
      gap: 12,
    },
  },

  states: {
    disabled: {
      opacity: 0.38,
      pointerEvents: 'none',
    },
  },

  render: {
    shapes: (props, _variant, size, _state = 'default') => {
      const isVertical = props.orientation !== 'horizontal';

      const shapes: Shape[] = [
        // 그룹 컨테이너
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
            gap: size.gap,
          },
        },
      ];

      return shapes;
    },

    react: (props) => ({
      role: 'group',
      'aria-label': props.label,
      'aria-orientation': props.orientation,
    }),

    pixi: () => ({
      eventMode: 'passive' as const,
    }),
  },
};
