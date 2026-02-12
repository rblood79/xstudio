/**
 * ToggleButton Component Spec
 *
 * Material Design 3 기반 토글 버튼 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * ToggleButton Props
 */
export interface ToggleButtonProps {
  variant?: 'default' | 'primary' | 'secondary' | 'surface';
  size?: 'sm' | 'md' | 'lg';
  children?: string;
  text?: string;
  label?: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/** isSelected 시 variant별 반전 색상 */
export const TOGGLE_SELECTED_COLORS: Record<string, { bg: TokenRef; text: TokenRef; border: TokenRef }> = {
  default: {
    bg: '{color.secondary}' as TokenRef,
    text: '{color.on-secondary}' as TokenRef,
    border: '{color.secondary}' as TokenRef,
  },
  primary: {
    bg: '{color.primary}' as TokenRef,
    text: '{color.on-primary}' as TokenRef,
    border: '{color.primary}' as TokenRef,
  },
  secondary: {
    bg: '{color.secondary}' as TokenRef,
    text: '{color.on-secondary}' as TokenRef,
    border: '{color.secondary}' as TokenRef,
  },
  surface: {
    bg: '{color.primary}' as TokenRef,
    text: '{color.on-primary}' as TokenRef,
    border: '{color.primary}' as TokenRef,
  },
};

/**
 * ToggleButton Component Spec
 */
export const ToggleButtonSpec: ComponentSpec<ToggleButtonProps> = {
  name: 'ToggleButton',
  description: 'Material Design 3 기반 토글 버튼 컴포넌트',
  element: 'button',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface-container-high}' as TokenRef,
      backgroundHover: '{color.surface-container-highest}' as TokenRef,
      backgroundPressed: '{color.surface-container-highest}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    primary: {
      background: '{color.surface-container}' as TokenRef,
      backgroundHover: '{color.surface-container-high}' as TokenRef,
      backgroundPressed: '{color.surface-container-highest}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    secondary: {
      background: '{color.surface-container}' as TokenRef,
      backgroundHover: '{color.surface-container-high}' as TokenRef,
      backgroundPressed: '{color.surface-container-highest}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    surface: {
      background: '{color.surface-container-highest}' as TokenRef,
      backgroundHover: '{color.surface-container-highest}' as TokenRef,
      backgroundPressed: '{color.surface-container-highest}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 32,
      paddingX: 12,
      paddingY: 4,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      gap: 6,
    },
    md: {
      height: 40,
      paddingX: 20,
      paddingY: 8,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 8,
    },
    lg: {
      height: 48,
      paddingX: 28,
      paddingY: 12,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      gap: 10,
    },
  },

  states: {
    hover: {},
    pressed: {
      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
    },
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
      const variantName = props.variant ?? 'default';

      // isSelected 시 색상 반전
      let bgColor: TokenRef;
      let textColor: TokenRef;
      let borderColor: TokenRef | undefined;

      if (props.isSelected) {
        const selected = TOGGLE_SELECTED_COLORS[variantName] ?? TOGGLE_SELECTED_COLORS.default;
        bgColor = selected.bg;
        textColor = selected.text;
        borderColor = selected.border;
      } else {
        bgColor = state === 'hover' ? variant.backgroundHover
                : state === 'pressed' ? variant.backgroundPressed
                : variant.background;
        textColor = variant.text;
        borderColor = variant.border;
      }

      const shapes: Shape[] = [
        // 배경
        {
          id: 'bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width: (props.style?.width as number) || 'auto',
          height: size.height,
          radius: size.borderRadius as unknown as number,
          fill: bgColor,
        },
      ];

      // 테두리
      if (borderColor) {
        shapes.push({
          type: 'border' as const,
          target: 'bg',
          borderWidth: 1,
          color: borderColor,
          radius: size.borderRadius as unknown as number,
        });
      }

      // 텍스트
      const text = props.children || props.text || props.label;
      if (text) {
        shapes.push({
          type: 'text' as const,
          x: 0,
          y: 0,
          text,
          fontSize: size.fontSize as unknown as number,
          fontFamily: fontFamily.sans,
          fontWeight: 500,
          fill: textColor,
          align: 'center' as const,
          baseline: 'middle' as const,
        });
      }

      return shapes;
    },

    react: (props) => ({
      'data-selected': props.isSelected || undefined,
      'aria-pressed': props.isSelected || undefined,
    }),

    pixi: (props) => ({
      eventMode: 'static' as const,
      cursor: props.isDisabled ? 'not-allowed' : 'pointer',
    }),
  },
};
