/**
 * Separator Component Spec
 *
 * React Aria 기반 구분선 컴포넌트
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
  description: 'React Aria 기반 구분선 컴포넌트',
  element: 'hr',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.base}' as TokenRef,
      backgroundHover: '{color.base}' as TokenRef,
      backgroundPressed: '{color.base}' as TokenRef,
      backgroundAlpha: 0,
      text: '{color.border}' as TokenRef,
      border: '{color.border}' as TokenRef,
    },
    solid: {
      background: '{color.base}' as TokenRef,
      backgroundHover: '{color.base}' as TokenRef,
      backgroundPressed: '{color.base}' as TokenRef,
      backgroundAlpha: 0,
      text: '{color.border}' as TokenRef,
      border: '{color.border}' as TokenRef,
    },
    dashed: {
      background: '{color.base}' as TokenRef,
      backgroundHover: '{color.base}' as TokenRef,
      backgroundPressed: '{color.base}' as TokenRef,
      backgroundAlpha: 0,
      text: '{color.border}' as TokenRef,
      border: '{color.border}' as TokenRef,
    },
    dotted: {
      background: '{color.base}' as TokenRef,
      backgroundHover: '{color.base}' as TokenRef,
      backgroundPressed: '{color.base}' as TokenRef,
      backgroundAlpha: 0,
      text: '{color.border}' as TokenRef,
      border: '{color.border}' as TokenRef,
    },
    primary: {
      background: '{color.base}' as TokenRef,
      backgroundHover: '{color.base}' as TokenRef,
      backgroundPressed: '{color.base}' as TokenRef,
      backgroundAlpha: 0,
      text: '{color.accent}' as TokenRef,
      border: '{color.accent}' as TokenRef,
    },
    secondary: {
      background: '{color.base}' as TokenRef,
      backgroundHover: '{color.base}' as TokenRef,
      backgroundPressed: '{color.base}' as TokenRef,
      backgroundAlpha: 0,
      text: '{color.neutral-subtle}' as TokenRef,
      border: '{color.neutral-subtle}' as TokenRef,
    },
    surface: {
      background: '{color.base}' as TokenRef,
      backgroundHover: '{color.base}' as TokenRef,
      backgroundPressed: '{color.base}' as TokenRef,
      backgroundAlpha: 0,
      text: '{color.border-hover}' as TokenRef,
      border: '{color.border-hover}' as TokenRef,
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
