/**
 * ColorSwatch Component Spec
 *
 * Material Design 3 기반 색상 프리뷰 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';

/**
 * ColorSwatch Props
 */
export interface ColorSwatchProps {
  variant?: 'default' | 'selected';
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  isDisabled?: boolean;
  isSelected?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * ColorSwatch Component Spec
 */
export const ColorSwatchSpec: ComponentSpec<ColorSwatchProps> = {
  name: 'ColorSwatch',
  description: 'Material Design 3 기반 색상 프리뷰 스와치',
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
    selected: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container-high}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.primary}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 20,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-xs}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      gap: 0,
    },
    md: {
      height: 28,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 0,
    },
    lg: {
      height: 36,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 0,
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
    shapes: (props, variant, size, _state = 'default') => {
      const swatchSize = size.height;

      // 사용자 스타일 우선, 없으면 spec 기본값
      const styleBr = props.style?.borderRadius;
      const borderRadius = styleBr != null
        ? (typeof styleBr === 'number' ? styleBr : parseFloat(String(styleBr)) || 0)
        : size.borderRadius;

      const borderColor = props.style?.borderColor
        ?? (props.isSelected
            ? '{color.primary}' as TokenRef
            : variant.border ?? ('{color.outline-variant}' as TokenRef));
      const styleBw = props.style?.borderWidth;
      const defaultBw = props.isSelected ? 2 : 1;
      const borderWidth = styleBw != null
        ? (typeof styleBw === 'number' ? styleBw : parseFloat(String(styleBw)) || 0)
        : defaultBw;

      const shapes: Shape[] = [
        // 체크 패턴 배경 (투명도 표시용)
        {
          id: 'checker',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width: swatchSize,
          height: swatchSize,
          radius: borderRadius as unknown as number,
          fill: '{color.surface-container}' as TokenRef,
        },
        // 색상 채우기
        {
          id: 'color',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width: swatchSize,
          height: swatchSize,
          radius: borderRadius as unknown as number,
          fill: props.color || '#3B82F6',
        },
        // 테두리
        {
          type: 'border' as const,
          target: 'color',
          borderWidth,
          color: borderColor,
          radius: borderRadius as unknown as number,
        },
      ];

      return shapes;
    },

    react: (props) => ({
      role: 'option',
      'aria-selected': props.isSelected || undefined,
      'data-color': props.color,
      'data-disabled': props.isDisabled || undefined,
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ('none' as const) : ('static' as const),
      cursor: props.isDisabled ? 'not-allowed' : 'pointer',
    }),
  },
};
