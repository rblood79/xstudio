/**
 * Separator Component Spec
 *
 * Material Design 3 기반 구분선 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';

/**
 * Separator Props
 */
export interface SeparatorProps {
  variant?: 'default' | 'solid' | 'dashed' | 'dotted' | 'primary' | 'secondary' | 'surface';
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Separator Component Spec
 *
 * size.height = 선 두께 (px)
 * size.paddingY = 전후 margin (px)
 * variant.border = 선 색상
 * backgroundAlpha: 0 (배경 없음)
 */
export const SeparatorSpec: ComponentSpec<SeparatorProps> = {
  name: 'Separator',
  description: 'Material Design 3 기반 구분선 컴포넌트',
  element: 'hr',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      backgroundAlpha: 0,
      text: '{color.outline-variant}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    solid: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      backgroundAlpha: 0,
      text: '{color.outline-variant}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    dashed: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      backgroundAlpha: 0,
      text: '{color.outline-variant}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    dotted: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      backgroundAlpha: 0,
      text: '{color.outline-variant}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    primary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      backgroundAlpha: 0,
      text: '{color.primary}' as TokenRef,
      border: '{color.primary}' as TokenRef,
    },
    secondary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      backgroundAlpha: 0,
      text: '{color.secondary}' as TokenRef,
      border: '{color.secondary}' as TokenRef,
    },
    surface: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      backgroundAlpha: 0,
      text: '{color.outline}' as TokenRef,
      border: '{color.outline}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 1,
      paddingX: 0,
      paddingY: 4,
      fontSize: '{typography.text-xs}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
    },
    md: {
      height: 1,
      paddingX: 0,
      paddingY: 8,
      fontSize: '{typography.text-xs}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
    },
    lg: {
      height: 2,
      paddingX: 0,
      paddingY: 16,
      fontSize: '{typography.text-xs}' as TokenRef,
      borderRadius: '{radius.none}' as TokenRef,
    },
  },

  states: {},

  render: {
    shapes: (props, variant, size, _state = 'default') => {
      const isVertical = props.orientation === 'vertical';
      const strokeColor = variant.border ?? variant.text;
      const strokeWidth = size.height;

      // dashed/dotted 스타일 결정
      const variantName = props.variant ?? 'default';
      const strokeDasharray = variantName === 'dashed' ? [4, 4]
                            : variantName === 'dotted' ? [2, 2]
                            : undefined;

      const shapes: Shape[] = [];

      if (isVertical) {
        shapes.push({
          type: 'line' as const,
          x1: 0,
          y1: 0,
          x2: 0,
          y2: 0, // auto: 렌더러에서 부모 높이로 확장
          stroke: strokeColor,
          strokeWidth,
          ...(strokeDasharray && { strokeDasharray }),
        });
      } else {
        shapes.push({
          type: 'line' as const,
          x1: 0,
          y1: 0,
          x2: 0, // auto: 렌더러에서 부모 너비로 확장
          y2: 0,
          stroke: strokeColor,
          strokeWidth,
          ...(strokeDasharray && { strokeDasharray }),
        });
      }

      return shapes;
    },

    react: (props) => ({
      'aria-orientation': props.orientation || 'horizontal',
    }),

    pixi: () => ({
      eventMode: 'none' as const,
    }),
  },
};
