/**
 * NumberField Component Spec
 *
 * Material Design 3 기반 숫자 입력 컴포넌트 (stepper 버튼 포함)
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * NumberField Props
 */
export interface NumberFieldProps {
  variant?: 'default' | 'primary' | 'error';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  value?: number;
  minValue?: number;
  maxValue?: number;
  step?: number;
  description?: string;
  errorMessage?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isRequired?: boolean;
  children?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * NumberField Component Spec
 */
export const NumberFieldSpec: ComponentSpec<NumberFieldProps> = {
  name: 'NumberField',
  description: 'Material Design 3 기반 숫자 입력 컴포넌트',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline}' as TokenRef,
      borderHover: '{color.primary}' as TokenRef,
    },
    primary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline}' as TokenRef,
      borderHover: '{color.primary}' as TokenRef,
    },
    error: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.error-container}' as TokenRef,
      backgroundPressed: '{color.error-container}' as TokenRef,
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
      iconSize: 12,
      gap: 4,
    },
    md: {
      height: 40,
      paddingX: 14,
      paddingY: 8,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      iconSize: 16,
      gap: 6,
    },
    lg: {
      height: 48,
      paddingX: 16,
      paddingY: 12,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      iconSize: 20,
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
      const width = (props.style?.width as number) || 160;
      const height = size.height;
      const stepperWidth = height;

      const styleBr = props.style?.borderRadius;
      const borderRadius = styleBr != null
        ? (typeof styleBr === 'number' ? styleBr : parseFloat(String(styleBr)) || 0)
        : size.borderRadius as unknown as number;

      const bgColor = props.style?.backgroundColor
                    ?? (state === 'hover' ? variant.backgroundHover
                    : state === 'pressed' ? variant.backgroundPressed
                    : variant.background);

      const borderColor = props.style?.borderColor
                        ?? ((state === 'hover' && variant.borderHover)
                            ? variant.borderHover
                            : variant.border);

      const styleBw = props.style?.borderWidth;
      const defaultBw = props.isInvalid ? 2 : 1;
      const borderWidth = styleBw != null
        ? (typeof styleBw === 'number' ? styleBw : parseFloat(String(styleBw)) || 0)
        : defaultBw;

      const fontSize = props.style?.fontSize ?? size.fontSize as unknown as number;

      const fwRaw = props.style?.fontWeight;
      const fontWeight = fwRaw != null
        ? (typeof fwRaw === 'number' ? fwRaw : parseInt(String(fwRaw), 10) || 500)
        : 500;

      const ff = (props.style?.fontFamily as string) || fontFamily.sans;

      const textAlign = (props.style?.textAlign as 'left' | 'center' | 'right') || 'left';

      const textColor = props.style?.color
                      ?? variant.text;

      const shapes: Shape[] = [];
      const hasChildren = !!(props as Record<string, unknown>)._hasLabelChild
                       || !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // 라벨
      if (props.label) {
        shapes.push({
          type: 'text' as const,
          x: 0,
          y: 0,
          text: props.label,
          fontSize: (fontSize as number) - 2,
          fontFamily: ff,
          fontWeight,
          fill: textColor,
          align: textAlign,
          baseline: 'top' as const,
        });
      }

      // 입력 필드 배경
      shapes.push({
        id: 'bg',
        type: 'roundRect' as const,
        x: 0,
        y: props.label ? 20 : 0,
        width,
        height,
        radius: borderRadius,
        fill: bgColor,
      });

      // 테두리
      if (borderColor) {
        shapes.push({
          type: 'border' as const,
          target: 'bg',
          borderWidth,
          color: props.isInvalid ? ('{color.error}' as TokenRef) : borderColor,
          radius: borderRadius,
        });
      }

      // 감소 버튼 (-)
      shapes.push({
        id: 'decrement',
        type: 'roundRect' as const,
        x: 0,
        y: props.label ? 20 : 0,
        width: stepperWidth,
        height,
        radius: [borderRadius, 0, 0, borderRadius],
        fill: '{color.surface-container}' as TokenRef,
      });

      // 감소 아이콘 (-)
      shapes.push({
        type: 'text' as const,
        x: 0,
        y: (props.label ? 20 : 0) + height / 2,
        text: '\u2212',
        fontSize: fontSize as number,
        fontFamily: ff,
        fontWeight,
        fill: textColor,
        align: 'center' as const,
        baseline: 'middle' as const,
        maxWidth: stepperWidth,
      });

      // 증가 버튼 (+)
      shapes.push({
        id: 'increment',
        type: 'roundRect' as const,
        x: width - stepperWidth,
        y: props.label ? 20 : 0,
        width: stepperWidth,
        height,
        radius: [0, borderRadius, borderRadius, 0],
        fill: '{color.surface-container}' as TokenRef,
      });

      // 증가 아이콘 (+)
      shapes.push({
        type: 'text' as const,
        x: width - stepperWidth,
        y: (props.label ? 20 : 0) + height / 2,
        text: '+',
        fontSize: fontSize as number,
        fontFamily: ff,
        fontWeight,
        fill: textColor,
        align: 'center' as const,
        baseline: 'middle' as const,
        maxWidth: stepperWidth,
      });

      // 숫자 값
      shapes.push({
        type: 'text' as const,
        x: stepperWidth,
        y: (props.label ? 20 : 0) + height / 2,
        text: String(props.value ?? 0),
        fontSize: fontSize as number,
        fontFamily: ff,
        fill: textColor,
        align: 'center' as const,
        baseline: 'middle' as const,
        maxWidth: width - stepperWidth * 2,
      });

      // 에러 메시지
      const descText = props.isInvalid && props.errorMessage ? props.errorMessage : props.description;
      if (descText) {
        shapes.push({
          type: 'text' as const,
          x: 0,
          y: (props.label ? 20 : 0) + height + 4,
          text: descText,
          fontSize: (fontSize as number) - 2,
          fontFamily: ff,
          fill: props.isInvalid ? ('{color.error}' as TokenRef) : ('{color.on-surface-variant}' as TokenRef),
          align: textAlign,
          baseline: 'top' as const,
        });
      }

      return shapes;
    },

    react: (props) => ({
      'data-invalid': props.isInvalid || undefined,
      'data-disabled': props.isDisabled || undefined,
      'data-required': props.isRequired || undefined,
    }),

    pixi: (props) => ({
      eventMode: 'static' as const,
      cursor: props.isDisabled ? 'not-allowed' : 'default',
    }),
  },
};
