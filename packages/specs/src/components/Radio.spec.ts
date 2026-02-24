/**
 * Radio Component Spec
 *
 * Material Design 3 기반 라디오 버튼 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';
import { resolveStateColors } from '../utils/stateEffect';

/**
 * Radio Props
 */
export interface RadioProps {
  variant?: 'default' | 'primary' | 'secondary' | 'error';
  size?: 'sm' | 'md' | 'lg';
  children?: string;
  label?: string;
  text?: string;
  value?: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/** variant별 선택 시 색상 */
export const RADIO_SELECTED_COLORS: Record<string, { ring: TokenRef; dot: TokenRef }> = {
  default: {
    ring: '{color.primary}' as TokenRef,
    dot: '{color.primary}' as TokenRef,
  },
  primary: {
    ring: '{color.primary}' as TokenRef,
    dot: '{color.primary}' as TokenRef,
  },
  secondary: {
    ring: '{color.secondary}' as TokenRef,
    dot: '{color.secondary}' as TokenRef,
  },
  error: {
    ring: '{color.error}' as TokenRef,
    dot: '{color.error}' as TokenRef,
  },
};

/** 사이즈별 원 크기 */
export const RADIO_DIMENSIONS: Record<string, { outer: number; inner: number }> = {
  sm: { outer: 16, inner: 6 },
  md: { outer: 20, inner: 8 },
  lg: { outer: 24, inner: 10 },
};

/**
 * Radio Component Spec
 */
export const RadioSpec: ComponentSpec<RadioProps> = {
  name: 'Radio',
  description: 'Material Design 3 기반 라디오 버튼 컴포넌트',
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
      borderRadius: '{radius.full}' as TokenRef,
      gap: 6,
    },
    md: {
      height: 24,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.full}' as TokenRef,
      gap: 8,
    },
    lg: {
      height: 28,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.full}' as TokenRef,
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
      const variantName = props.variant ?? 'default';
      const sizeName = props.size ?? 'md';
      const radioSize = RADIO_DIMENSIONS[sizeName] ?? RADIO_DIMENSIONS.md;
      const selectedColors = RADIO_SELECTED_COLORS[variantName] ?? RADIO_SELECTED_COLORS.default;
      const gap = size.gap ?? 8;
      const outerRadius = radioSize.outer / 2;

      // 사용자 스타일 우선
      const styleBw = props.style?.borderWidth;
      const borderWidth = styleBw != null
        ? (typeof styleBw === 'number' ? styleBw : parseFloat(String(styleBw)) || 0)
        : 2;

      const borderColor = props.style?.borderColor
                        ?? (props.isSelected ? selectedColors.ring : variant.border!);

      const shapes: Shape[] = [];

      // 외곽 원 (테두리)
      shapes.push({
        id: 'ring',
        type: 'circle' as const,
        x: outerRadius,
        y: outerRadius,
        radius: outerRadius,
        fill: resolveStateColors(variant, state).background,
        fillAlpha: 0,
      });

      // 외곽 원 테두리
      shapes.push({
        type: 'border' as const,
        target: 'ring',
        borderWidth,
        color: borderColor,
        radius: outerRadius,
      });

      // 내부 원 (선택된 경우)
      if (props.isSelected) {
        shapes.push({
          type: 'circle' as const,
          x: outerRadius,
          y: outerRadius,
          radius: radioSize.inner / 2,
          fill: selectedColors.dot,
        });
      }

      // 라벨 텍스트 — Label child가 있으면 스킵 (TextSprite가 렌더링)
      const hasLabelChild = !!(props as Record<string, unknown>)._hasLabelChild;
      const labelText = props.children || props.label || props.text;
      if (!hasLabelChild && labelText) {
        const textColor = props.style?.color ?? variant.text;
        const fontSize = props.style?.fontSize ?? size.fontSize;
        const ff = (props.style?.fontFamily as string) || fontFamily.sans;
        const textAlign = (props.style?.textAlign as 'left' | 'center' | 'right') || 'left';

        shapes.push({
          type: 'text' as const,
          x: radioSize.outer + gap,
          y: outerRadius,
          text: labelText,
          fontSize: fontSize as unknown as number,
          fontFamily: ff,
          fill: textColor,
          align: textAlign,
          baseline: 'middle' as const,
        });
      }

      return shapes;
    },

    react: (props) => ({
      'data-selected': props.isSelected || undefined,
      'aria-checked': props.isSelected || undefined,
    }),

    pixi: (props) => ({
      eventMode: 'static' as const,
      cursor: props.isDisabled ? 'not-allowed' : 'pointer',
    }),
  },
};
