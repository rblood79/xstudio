/**
 * Slider Component Spec
 *
 * Material Design 3 기반 슬라이더 컴포넌트 (트랙 + 썸 + 채우기)
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * Slider Props
 */
export interface SliderProps {
  variant?: 'default' | 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  value?: number;
  minValue?: number;
  maxValue?: number;
  step?: number;
  showValue?: boolean;
  isDisabled?: boolean;
  children?: string;
  style?: Record<string, string | number | undefined>;
}

/** variant별 채우기/핸들 색상 */
export const SLIDER_FILL_COLORS: Record<string, { fill: TokenRef; handle: TokenRef }> = {
  default: {
    fill: '{color.primary}' as TokenRef,
    handle: '{color.primary}' as TokenRef,
  },
  primary: {
    fill: '{color.primary}' as TokenRef,
    handle: '{color.primary}' as TokenRef,
  },
  secondary: {
    fill: '{color.secondary}' as TokenRef,
    handle: '{color.secondary}' as TokenRef,
  },
};

/** 사이즈별 트랙/핸들 치수 */
export const SLIDER_DIMENSIONS: Record<string, { trackHeight: number; thumbSize: number }> = {
  sm: { trackHeight: 4, thumbSize: 14 },
  md: { trackHeight: 6, thumbSize: 18 },
  lg: { trackHeight: 8, thumbSize: 22 },
};

/**
 * Slider Component Spec
 */
export const SliderSpec: ComponentSpec<SliderProps> = {
  name: 'Slider',
  description: 'Material Design 3 기반 슬라이더 컴포넌트',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface-container-high}' as TokenRef,
      backgroundHover: '{color.surface-container-highest}' as TokenRef,
      backgroundPressed: '{color.surface-container-highest}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
    },
    primary: {
      background: '{color.surface-container-high}' as TokenRef,
      backgroundHover: '{color.surface-container-highest}' as TokenRef,
      backgroundPressed: '{color.surface-container-highest}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
    },
    secondary: {
      background: '{color.surface-container-high}' as TokenRef,
      backgroundHover: '{color.surface-container-highest}' as TokenRef,
      backgroundPressed: '{color.surface-container-highest}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 20,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-xs}' as TokenRef,
      borderRadius: '{radius.full}' as TokenRef,
      gap: 8,
    },
    md: {
      height: 24,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.full}' as TokenRef,
      gap: 10,
    },
    lg: {
      height: 28,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-md}' as TokenRef,
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
      const sliderDims = SLIDER_DIMENSIONS[sizeName] ?? SLIDER_DIMENSIONS.md;
      const fillColors = SLIDER_FILL_COLORS[variantName] ?? SLIDER_FILL_COLORS.default;
      const width = (props.style?.width as number) || 200;
      const gap = size.gap ?? 10;

      const min = props.minValue ?? 0;
      const max = props.maxValue ?? 100;
      const value = props.value ?? 50;
      const percent = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
      const fillWidth = (width * percent) / 100;
      const thumbX = fillWidth;
      const trackY = sliderDims.thumbSize / 2 - sliderDims.trackHeight / 2;
      const trackRadius = sliderDims.trackHeight / 2;

      const shapes: Shape[] = [];

      // 라벨 + 값 행
      if (props.label || props.showValue) {
        if (props.label) {
          shapes.push({
            type: 'text' as const,
            x: 0,
            y: 0,
            text: props.label,
            fontSize: size.fontSize as unknown as number,
            fontFamily: fontFamily.sans,
            fontWeight: 500,
            fill: variant.text,
            align: 'left' as const,
            baseline: 'top' as const,
          });
        }
        if (props.showValue) {
          shapes.push({
            type: 'text' as const,
            x: width,
            y: 0,
            text: String(value),
            fontSize: size.fontSize as unknown as number,
            fontFamily: fontFamily.sans,
            fill: variant.text,
            align: 'right' as const,
            baseline: 'top' as const,
          });
        }
      }

      const offsetY = (props.label || props.showValue)
        ? (size.fontSize as unknown as number) + gap
        : 0;

      // 트랙 배경
      shapes.push({
        id: 'track',
        type: 'roundRect' as const,
        x: 0,
        y: offsetY + trackY,
        width,
        height: sliderDims.trackHeight,
        radius: trackRadius,
        fill: variant.background,
      });

      // 채우기
      if (fillWidth > 0) {
        shapes.push({
          id: 'fill',
          type: 'roundRect' as const,
          x: 0,
          y: offsetY + trackY,
          width: fillWidth,
          height: sliderDims.trackHeight,
          radius: trackRadius,
          fill: fillColors.fill,
        });
      }

      // 썸 (핸들)
      shapes.push({
        id: 'thumb',
        type: 'circle' as const,
        x: thumbX,
        y: offsetY + sliderDims.thumbSize / 2,
        radius: sliderDims.thumbSize / 2,
        fill: fillColors.handle,
      });

      // 썸 테두리 (흰 외곽)
      shapes.push({
        type: 'border' as const,
        target: 'thumb',
        borderWidth: 2,
        color: '{color.surface}' as TokenRef,
        radius: sliderDims.thumbSize / 2,
      });

      return shapes;
    },

    react: (props) => ({
      'data-disabled': props.isDisabled || undefined,
      role: 'slider',
      'aria-valuemin': props.minValue ?? 0,
      'aria-valuemax': props.maxValue ?? 100,
      'aria-valuenow': props.value ?? 50,
    }),

    pixi: (props) => ({
      eventMode: 'static' as const,
      cursor: props.isDisabled ? 'not-allowed' : 'pointer',
    }),
  },
};
