/**
 * Checkbox Component Spec
 *
 * Material Design 3 기반 체크박스 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * Checkbox Props
 */
export interface CheckboxProps {
  variant?: 'default' | 'primary' | 'secondary' | 'error';
  size?: 'sm' | 'md' | 'lg';
  children?: string;
  label?: string;
  text?: string;
  isSelected?: boolean;
  isIndeterminate?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  style?: Record<string, string | number | undefined>;
}

/** variant별 체크 시 색상 */
export const CHECKBOX_CHECKED_COLORS: Record<string, { bg: TokenRef; border: TokenRef }> = {
  default: {
    bg: '{color.primary}' as TokenRef,
    border: '{color.primary}' as TokenRef,
  },
  primary: {
    bg: '{color.primary}' as TokenRef,
    border: '{color.primary}' as TokenRef,
  },
  secondary: {
    bg: '{color.secondary}' as TokenRef,
    border: '{color.secondary}' as TokenRef,
  },
  error: {
    bg: '{color.error}' as TokenRef,
    border: '{color.error}' as TokenRef,
  },
};

/** 사이즈별 박스 크기 */
export const CHECKBOX_BOX_SIZES: Record<string, number> = {
  sm: 16,
  md: 20,
  lg: 24,
};

/**
 * Checkbox Component Spec
 */
export const CheckboxSpec: ComponentSpec<CheckboxProps> = {
  name: 'Checkbox',
  description: 'Material Design 3 기반 체크박스 컴포넌트',
  element: 'label',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container-high}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline}' as TokenRef,
    },
    primary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container-high}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline}' as TokenRef,
    },
    secondary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container-high}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline}' as TokenRef,
    },
    error: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.error-container}' as TokenRef,
      backgroundPressed: '{color.error-container}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.error}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 20,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      gap: 6,
    },
    md: {
      height: 24,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      gap: 8,
    },
    lg: {
      height: 28,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
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
    shapes: (props, variant, size, _state = 'default') => {
      const variantName = props.variant ?? 'default';
      const sizeName = props.size ?? 'md';
      const boxSize = CHECKBOX_BOX_SIZES[sizeName] ?? 20;
      const borderRadius = size.borderRadius;
      const gap = size.gap ?? 8;

      const isChecked = props.isSelected;
      const checkedColors = CHECKBOX_CHECKED_COLORS[variantName] ?? CHECKBOX_CHECKED_COLORS.default;

      const shapes: Shape[] = [];

      // 체크박스 박스 배경
      shapes.push({
        id: 'box',
        type: 'roundRect' as const,
        x: 0,
        y: 0,
        width: boxSize,
        height: boxSize,
        radius: borderRadius as unknown as number,
        fill: isChecked ? checkedColors.bg : variant.background,
      });

      // 체크박스 박스 테두리
      shapes.push({
        type: 'border' as const,
        target: 'box',
        borderWidth: 2,
        color: isChecked ? checkedColors.border : variant.border!,
        radius: borderRadius as unknown as number,
      });

      // 체크마크 (체크된 경우)
      if (isChecked && !props.isIndeterminate) {
        const pad = boxSize * 0.2;
        shapes.push({
          type: 'line' as const,
          x1: pad,
          y1: boxSize * 0.5,
          x2: boxSize * 0.4,
          y2: boxSize - pad,
          stroke: '{color.on-primary}' as TokenRef,
          strokeWidth: 2.5,
        });
        shapes.push({
          type: 'line' as const,
          x1: boxSize * 0.4,
          y1: boxSize - pad,
          x2: boxSize - pad,
          y2: pad,
          stroke: '{color.on-primary}' as TokenRef,
          strokeWidth: 2.5,
        });
      }

      // 중간 상태 (indeterminate)
      if (props.isIndeterminate) {
        const pad = boxSize * 0.25;
        shapes.push({
          type: 'line' as const,
          x1: pad,
          y1: boxSize / 2,
          x2: boxSize - pad,
          y2: boxSize / 2,
          stroke: '{color.on-primary}' as TokenRef,
          strokeWidth: 2.5,
        });
      }

      // 라벨 텍스트
      const labelText = props.children || props.label || props.text;
      if (labelText) {
        shapes.push({
          type: 'text' as const,
          x: boxSize + gap,
          y: boxSize / 2,
          text: labelText,
          fontSize: size.fontSize as unknown as number,
          fontFamily: fontFamily.sans,
          fill: variant.text,
          align: 'left' as const,
          baseline: 'middle' as const,
        });
      }

      return shapes;
    },

    react: (props) => ({
      'data-selected': props.isSelected || undefined,
      'data-indeterminate': props.isIndeterminate || undefined,
      'aria-checked': props.isIndeterminate ? 'mixed' : props.isSelected || undefined,
    }),

    pixi: (props) => ({
      eventMode: 'static' as const,
      cursor: props.isDisabled ? 'not-allowed' : 'pointer',
    }),
  },
};
