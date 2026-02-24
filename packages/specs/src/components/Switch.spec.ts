/**
 * Switch Component Spec
 *
 * Material Design 3 기반 스위치(토글) 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * Switch Props
 */
export interface SwitchProps {
  variant?: 'default' | 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  children?: string;
  label?: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/** variant별 선택 시 트랙 색상 */
export const SWITCH_SELECTED_TRACK_COLORS: Record<string, TokenRef> = {
  default: '{color.primary}' as TokenRef,
  primary: '{color.primary}' as TokenRef,
  secondary: '{color.secondary}' as TokenRef,
};

/** 사이즈별 트랙/썸 치수 */
export const SWITCH_DIMENSIONS: Record<string, { trackWidth: number; trackHeight: number; thumbSize: number; thumbOffset: number }> = {
  sm: { trackWidth: 36, trackHeight: 20, thumbSize: 14, thumbOffset: 3 },
  md: { trackWidth: 44, trackHeight: 24, thumbSize: 18, thumbOffset: 3 },
  lg: { trackWidth: 52, trackHeight: 28, thumbSize: 22, thumbOffset: 3 },
};

/**
 * Switch Component Spec
 */
export const SwitchSpec: ComponentSpec<SwitchProps> = {
  name: 'Switch',
  description: 'Material Design 3 기반 스위치(토글) 컴포넌트',
  element: 'label',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface-container-high}' as TokenRef,
      backgroundHover: '{color.surface-container-highest}' as TokenRef,
      backgroundPressed: '{color.surface-container-highest}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline}' as TokenRef,
    },
    primary: {
      background: '{color.surface-container-high}' as TokenRef,
      backgroundHover: '{color.surface-container-highest}' as TokenRef,
      backgroundPressed: '{color.surface-container-highest}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline}' as TokenRef,
    },
    secondary: {
      background: '{color.surface-container-high}' as TokenRef,
      backgroundHover: '{color.surface-container-highest}' as TokenRef,
      backgroundPressed: '{color.surface-container-highest}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 20,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.full}' as TokenRef,
      gap: 8,
    },
    md: {
      height: 24,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.full}' as TokenRef,
      gap: 10,
    },
    lg: {
      height: 28,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-lg}' as TokenRef,
      borderRadius: '{radius.full}' as TokenRef,
      gap: 12,
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
      const switchSize = SWITCH_DIMENSIONS[sizeName] ?? SWITCH_DIMENSIONS.md;
      const gap = size.gap ?? 10;

      const isChecked = props.isSelected;
      const defaultTrackColor = isChecked
        ? (SWITCH_SELECTED_TRACK_COLORS[variantName] ?? SWITCH_SELECTED_TRACK_COLORS.default)
        : variant.background;

      const thumbX = isChecked
        ? switchSize.trackWidth - switchSize.thumbSize - switchSize.thumbOffset
        : switchSize.thumbOffset;
      const trackRadius = switchSize.trackHeight / 2;

      // 사용자 스타일 우선
      const bgColor = props.style?.backgroundColor ?? defaultTrackColor;

      const styleBw = props.style?.borderWidth;
      const borderWidth = styleBw != null
        ? (typeof styleBw === 'number' ? styleBw : parseFloat(String(styleBw)) || 0)
        : 2;

      const borderColor = props.style?.borderColor ?? variant.border!;

      const shapes: Shape[] = [];

      // 트랙 배경
      shapes.push({
        id: 'track',
        type: 'roundRect' as const,
        x: 0,
        y: 0,
        width: switchSize.trackWidth,
        height: switchSize.trackHeight,
        radius: trackRadius,
        fill: bgColor,
      });

      // 트랙 테두리 (비선택 시)
      if (!isChecked) {
        shapes.push({
          type: 'border' as const,
          target: 'track',
          borderWidth,
          color: borderColor,
          radius: trackRadius,
        });
      }

      // 썸 (동그란 노브)
      shapes.push({
        id: 'thumb',
        type: 'circle' as const,
        x: thumbX + switchSize.thumbSize / 2,
        y: switchSize.trackHeight / 2,
        radius: switchSize.thumbSize / 2,
        fill: isChecked
          ? ('{color.on-primary}' as TokenRef)
          : ('{color.on-surface-variant}' as TokenRef),
      });

      // 라벨 텍스트 — Label child가 있으면 스킵 (TextSprite가 렌더링)
      const hasLabelChild = !!(props as Record<string, unknown>)._hasLabelChild;
      const labelText = props.children || props.label;
      if (!hasLabelChild && labelText) {
        const textColor = props.style?.color ?? variant.text;
        const fontSize = props.style?.fontSize ?? size.fontSize;
        const ff = (props.style?.fontFamily as string) || fontFamily.sans;
        const textAlign = (props.style?.textAlign as 'left' | 'center' | 'right') || 'left';

        shapes.push({
          type: 'text' as const,
          x: switchSize.trackWidth + gap,
          y: switchSize.trackHeight / 2,
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
      role: 'switch',
    }),

    pixi: (props) => ({
      eventMode: 'static' as const,
      cursor: props.isDisabled ? 'not-allowed' : 'pointer',
    }),
  },
};
