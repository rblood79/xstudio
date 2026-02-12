/**
 * DateField Component Spec
 *
 * Material Design 3 기반 날짜 입력 필드 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * DateField Props
 */
export interface DateFieldProps {
  variant?: 'default' | 'primary' | 'error';
  size?: 'sm' | 'md' | 'lg';
  value?: string;
  placeholder?: string;
  label?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * DateField Component Spec
 */
export const DateFieldSpec: ComponentSpec<DateFieldProps> = {
  name: 'DateField',
  description: 'Material Design 3 기반 날짜 입력 필드 (year/month/day 세그먼트)',
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
      paddingX: 10,
      paddingY: 4,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      gap: 4,
    },
    md: {
      height: 40,
      paddingX: 14,
      paddingY: 8,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 6,
    },
    lg: {
      height: 48,
      paddingX: 18,
      paddingY: 12,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      gap: 8,
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
      const width = (props.style?.width as number) || 180;
      const height = size.height;

      const styleBr = props.style?.borderRadius;
      const borderRadius = styleBr != null
        ? (typeof styleBr === 'number' ? styleBr : parseFloat(String(styleBr)) || 0)
        : size.borderRadius as unknown as number;

      const bgColor = props.style?.backgroundColor
                    ?? variant.background;

      const borderColor = props.style?.borderColor
                        ?? ((state === 'hover' && variant.borderHover)
                            ? variant.borderHover
                            : variant.border);

      const styleBw = props.style?.borderWidth;
      const borderWidth = styleBw != null
        ? (typeof styleBw === 'number' ? styleBw : parseFloat(String(styleBw)) || 0)
        : 1;

      const fontSize = props.style?.fontSize ?? size.fontSize as unknown as number;

      const fwRaw = props.style?.fontWeight;
      const fontWeight = fwRaw != null
        ? (typeof fwRaw === 'number' ? fwRaw : parseInt(String(fwRaw), 10) || 400)
        : 400;

      const ff = (props.style?.fontFamily as string) || fontFamily.mono;

      const textAlign = (props.style?.textAlign as 'left' | 'center' | 'right') || 'left';

      const textColor = props.style?.color
                      ?? variant.text;

      const stylePx = props.style?.paddingLeft ?? props.style?.paddingRight ?? props.style?.padding;
      const paddingX = stylePx != null
        ? (typeof stylePx === 'number' ? stylePx : parseFloat(String(stylePx)) || 0)
        : size.paddingX;

      const shapes: Shape[] = [
        // 배경
        {
          id: 'bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width,
          height,
          radius: borderRadius,
          fill: bgColor,
        },
        // 테두리
        {
          type: 'border' as const,
          target: 'bg',
          borderWidth,
          color: borderColor ?? '{color.outline}' as TokenRef,
          radius: borderRadius,
        },
      ];

      // 날짜 세그먼트 텍스트 (YYYY / MM / DD)
      const value = props.value || '2024-01-15';
      const parts = value.split('-');
      const displayText = `${parts[0] || 'YYYY'} / ${parts[1] || 'MM'} / ${parts[2] || 'DD'}`;

      shapes.push({
        type: 'text' as const,
        x: paddingX,
        y: 0,
        text: displayText,
        fontSize: fontSize as number,
        fontFamily: ff,
        fontWeight,
        fill: textColor,
        align: textAlign,
        baseline: 'middle' as const,
      });

      return shapes;
    },

    react: (props) => ({
      'aria-invalid': props.isInvalid || undefined,
      'data-disabled': props.isDisabled || undefined,
      role: 'group',
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ('none' as const) : ('static' as const),
      cursor: props.isDisabled ? 'not-allowed' : 'text',
    }),
  },
};
