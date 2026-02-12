/**
 * ComboBox Component Spec
 *
 * Material Design 3 기반 콤보박스 컴포넌트 (입력 + 드롭다운)
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * ComboBox Props
 */
export interface ComboBoxProps {
  variant?: 'default' | 'primary' | 'error';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  placeholder?: string;
  inputValue?: string;
  selectedText?: string;
  description?: string;
  errorMessage?: string;
  isOpen?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isRequired?: boolean;
  children?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * ComboBox Component Spec
 */
export const ComboBoxSpec: ComponentSpec<ComboBoxProps> = {
  name: 'ComboBox',
  description: 'Material Design 3 기반 콤보박스 컴포넌트 (입력 + 드롭다운)',
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
      iconSize: 14,
      gap: 4,
    },
    md: {
      height: 40,
      paddingX: 14,
      paddingY: 8,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      iconSize: 18,
      gap: 6,
    },
    lg: {
      height: 48,
      paddingX: 16,
      paddingY: 12,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      iconSize: 22,
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
      const width = (props.style?.width as number) || 200;
      const height = size.height;
      const borderRadius = size.borderRadius;
      const chevronSize = size.iconSize ?? 18;

      const bgColor = state === 'hover' ? variant.backgroundHover
                    : state === 'pressed' ? variant.backgroundPressed
                    : variant.background;

      const borderColor = (state === 'hover' && variant.borderHover)
                        ? variant.borderHover
                        : variant.border;

      const shapes: Shape[] = [];

      // 라벨
      if (props.label) {
        shapes.push({
          type: 'text' as const,
          x: 0,
          y: 0,
          text: props.label,
          fontSize: (size.fontSize as unknown as number) - 2,
          fontFamily: fontFamily.sans,
          fontWeight: 500,
          fill: variant.text,
          align: 'left' as const,
          baseline: 'top' as const,
        });
      }

      // 입력 영역 배경
      shapes.push({
        id: 'input',
        type: 'roundRect' as const,
        x: 0,
        y: props.label ? 20 : 0,
        width,
        height,
        radius: borderRadius as unknown as number,
        fill: bgColor,
      });

      // 테두리
      if (borderColor) {
        shapes.push({
          type: 'border' as const,
          target: 'input',
          borderWidth: props.isInvalid ? 2 : 1,
          color: props.isInvalid ? ('{color.error}' as TokenRef) : borderColor,
          radius: borderRadius as unknown as number,
        });
      }

      // 입력 텍스트
      const displayText = props.inputValue || props.placeholder || '';
      if (displayText) {
        shapes.push({
          type: 'text' as const,
          x: size.paddingX,
          y: (props.label ? 20 : 0) + height / 2,
          text: displayText,
          fontSize: size.fontSize as unknown as number,
          fontFamily: fontFamily.sans,
          fill: props.inputValue
            ? variant.text
            : ('{color.on-surface-variant}' as TokenRef),
          align: 'left' as const,
          baseline: 'middle' as const,
        });
      }

      // 쉐브론 아이콘
      const chevX = width - size.paddingX - chevronSize / 2;
      const chevY = (props.label ? 20 : 0) + height / 2;
      const chevHalf = chevronSize / 4;
      shapes.push({
        type: 'line' as const,
        x1: chevX - chevHalf,
        y1: chevY - chevHalf / 2,
        x2: chevX,
        y2: chevY + chevHalf / 2,
        stroke: '{color.on-surface-variant}' as TokenRef,
        strokeWidth: 2,
      });
      shapes.push({
        type: 'line' as const,
        x1: chevX,
        y1: chevY + chevHalf / 2,
        x2: chevX + chevHalf,
        y2: chevY - chevHalf / 2,
        stroke: '{color.on-surface-variant}' as TokenRef,
        strokeWidth: 2,
      });

      // 드롭다운 패널 (열린 상태)
      if (props.isOpen) {
        shapes.push({
          type: 'shadow' as const,
          target: 'dropdown',
          offsetX: 0,
          offsetY: 4,
          blur: 8,
          color: 'rgba(0, 0, 0, 0.1)',
          alpha: 0.1,
        });
        shapes.push({
          id: 'dropdown',
          type: 'roundRect' as const,
          x: 0,
          y: (props.label ? 20 : 0) + height + 4,
          width,
          height: 'auto',
          radius: borderRadius as unknown as number,
          fill: '{color.surface-container}' as TokenRef,
        });
        shapes.push({
          type: 'border' as const,
          target: 'dropdown',
          borderWidth: 1,
          color: '{color.outline-variant}' as TokenRef,
          radius: borderRadius as unknown as number,
        });
      }

      // 설명 / 에러 메시지
      const descText = props.isInvalid && props.errorMessage ? props.errorMessage : props.description;
      if (descText) {
        shapes.push({
          type: 'text' as const,
          x: 0,
          y: (props.label ? 20 : 0) + height + 4,
          text: descText,
          fontSize: (size.fontSize as unknown as number) - 2,
          fontFamily: fontFamily.sans,
          fill: props.isInvalid ? ('{color.error}' as TokenRef) : ('{color.on-surface-variant}' as TokenRef),
          align: 'left' as const,
          baseline: 'top' as const,
        });
      }

      return shapes;
    },

    react: (props) => ({
      'data-open': props.isOpen || undefined,
      'data-invalid': props.isInvalid || undefined,
      'data-disabled': props.isDisabled || undefined,
      'data-required': props.isRequired || undefined,
      role: 'combobox',
      'aria-expanded': props.isOpen || undefined,
    }),

    pixi: (props) => ({
      eventMode: 'static' as const,
      cursor: props.isDisabled ? 'not-allowed' : 'text',
    }),
  },
};
