/**
 * TagGroup Component Spec
 *
 * Material Design 3 기반 태그 그룹 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';

/**
 * TagGroup Props
 */
export interface TagGroupProps {
  variant?: 'default' | 'primary' | 'secondary' | 'error';
  size?: 'sm' | 'md' | 'lg';
  selectionMode?: 'none' | 'single' | 'multiple';
  label?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * TagGroup Component Spec
 */
export const TagGroupSpec: ComponentSpec<TagGroupProps> = {
  name: 'TagGroup',
  description: 'Material Design 3 기반 태그 그룹 컴포넌트',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface-container}' as TokenRef,
      backgroundHover: '{color.surface-container-high}' as TokenRef,
      backgroundPressed: '{color.surface-container-highest}' as TokenRef,
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
    secondary: {
      background: '{color.secondary-container}' as TokenRef,
      backgroundHover: '{color.secondary-container}' as TokenRef,
      backgroundPressed: '{color.secondary-container}' as TokenRef,
      text: '{color.on-secondary-container}' as TokenRef,
      border: '{color.secondary}' as TokenRef,
    },
    error: {
      background: '{color.error-container}' as TokenRef,
      backgroundHover: '{color.error-container}' as TokenRef,
      backgroundPressed: '{color.error-container}' as TokenRef,
      text: '{color.on-error-container}' as TokenRef,
      border: '{color.error}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 24,
      paddingX: 8,
      paddingY: 2,
      fontSize: '{typography.text-xs}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      gap: 6,
    },
    md: {
      height: 32,
      paddingX: 12,
      paddingY: 4,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 8,
    },
    lg: {
      height: 40,
      paddingX: 16,
      paddingY: 6,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 10,
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
    shapes: (_props, _variant, size, _state = 'default') => {
      const shapes: Shape[] = [
        // 태그 그룹 컨테이너 (wrapping flex row)
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
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: size.gap,
          },
        },
      ];

      return shapes;
    },

    react: (props) => ({
      role: 'group',
      'aria-label': props.label,
    }),

    pixi: () => ({
      eventMode: 'static' as const,
    }),
  },
};
