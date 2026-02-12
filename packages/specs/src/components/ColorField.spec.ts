/**
 * ColorField Component Spec
 *
 * Material Design 3 기반 색상 입력 필드 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * ColorField Props
 */
export interface ColorFieldProps {
  variant?: 'default' | 'primary' | 'error';
  size?: 'sm' | 'md' | 'lg';
  value?: string;
  label?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * ColorField Component Spec
 */
export const ColorFieldSpec: ComponentSpec<ColorFieldProps> = {
  name: 'ColorField',
  description: 'Material Design 3 기반 색상 입력 필드 (color swatch + hex input)',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline}' as TokenRef,
      borderHover: '{color.outline-variant}' as TokenRef,
    },
    primary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.primary}' as TokenRef,
      borderHover: '{color.primary-hover}' as TokenRef,
    },
    error: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.error}' as TokenRef,
      borderHover: '{color.error-hover}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 32,
      paddingX: 8,
      paddingY: 4,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      iconSize: 20,
      gap: 6,
    },
    md: {
      height: 40,
      paddingX: 10,
      paddingY: 6,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      iconSize: 26,
      gap: 8,
    },
    lg: {
      height: 48,
      paddingX: 12,
      paddingY: 8,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      iconSize: 32,
      gap: 10,
    },
  },

  states: {
    hover: {},
    pressed: {},
    disabled: {
      opacity: 0.38,
      cursor: 'not-allowed',
      pointerEvents: 'none',
    },
    focusVisible: {
      outline: '2px solid var(--primary)',
      outlineOffset: '2px',
    },
  },

  render: {
    shapes: (props, variant, size, state = 'default') => {
      const width = (props.style?.width as number) || 160;
      const height = size.height;
      const borderRadius = size.borderRadius;
      const swatchSize = (size.iconSize ?? 26);

      const borderColor = state === 'hover' && variant.borderHover
        ? variant.borderHover
        : variant.border;

      const shapes: Shape[] = [
        // 배경
        {
          id: 'bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width,
          height,
          radius: borderRadius as unknown as number,
          fill: variant.background,
        },
        // 테두리
        {
          type: 'border' as const,
          target: 'bg',
          borderWidth: 1,
          color: borderColor ?? '{color.outline}' as TokenRef,
          radius: borderRadius as unknown as number,
        },
      ];

      // Color swatch (왼쪽)
      const swatchX = size.paddingX;
      const swatchY = (height - swatchSize) / 2;
      shapes.push({
        id: 'swatch',
        type: 'roundRect' as const,
        x: swatchX,
        y: swatchY,
        width: swatchSize,
        height: swatchSize,
        radius: 4,
        fill: props.value || '#3B82F6',
      });

      // Swatch 테두리
      shapes.push({
        type: 'border' as const,
        target: 'swatch',
        borderWidth: 1,
        color: '{color.outline-variant}' as TokenRef,
        radius: 4,
      });

      // Hex 텍스트
      const hexValue = props.value || '#3B82F6';
      shapes.push({
        type: 'text' as const,
        x: swatchX + swatchSize + (size.gap ?? 8),
        y: 0,
        text: hexValue.toUpperCase(),
        fontSize: size.fontSize as unknown as number,
        fontFamily: fontFamily.mono,
        fontWeight: 400,
        fill: variant.text,
        align: 'left' as const,
        baseline: 'middle' as const,
      });

      return shapes;
    },

    react: (props) => ({
      'aria-invalid': props.isInvalid || undefined,
      'data-disabled': props.isDisabled || undefined,
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ('none' as const) : ('static' as const),
      cursor: props.isDisabled ? 'not-allowed' : 'pointer',
    }),
  },
};
