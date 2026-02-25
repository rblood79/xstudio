/**
 * SliderTrack Component Spec
 *
 * Material Design 3 기반 슬라이더 트랙 컴포넌트
 * Slider compound 컴포넌트의 child 요소 (트랙 배경 + 채우기 바)
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { SLIDER_FILL_COLORS } from './Slider.spec';

/**
 * SliderTrack Props
 */
export interface SliderTrackProps {
  variant?: 'default' | 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  value?: number;
  minValue?: number;
  maxValue?: number;
  orientation?: 'horizontal' | 'vertical';
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/** 사이즈별 트랙 치수 */
export const SLIDER_TRACK_DIMENSIONS: Record<string, { trackHeight: number }> = {
  sm: { trackHeight: 4 },
  md: { trackHeight: 4 },
  lg: { trackHeight: 6 },
};

/**
 * SliderTrack Component Spec
 */
export const SliderTrackSpec: ComponentSpec<SliderTrackProps> = {
  name: 'SliderTrack',
  description: '슬라이더 트랙 배경 + 채우기 바 렌더링',
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
      height: 4,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-xs}' as TokenRef,
      borderRadius: '{radius.full}' as TokenRef,
      gap: 0,
    },
    md: {
      height: 4,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.full}' as TokenRef,
      gap: 0,
    },
    lg: {
      height: 6,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.full}' as TokenRef,
      gap: 0,
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
    focusVisible: {},
  },

  render: {
    shapes: (props, variant, _size) => {
      const sizeName = props.size ?? 'md';
      const trackDims = SLIDER_TRACK_DIMENSIONS[sizeName] ?? SLIDER_TRACK_DIMENSIONS.md;
      const variantName = props.variant ?? 'default';
      const fillColors = SLIDER_FILL_COLORS[variantName] ?? SLIDER_FILL_COLORS.default;

      const width = (props.style?.width as number) || 200;
      const trackHeight = trackDims.trackHeight;
      const trackRadius = trackHeight / 2;

      const min = props.minValue ?? 0;
      const max = props.maxValue ?? 100;
      const value = props.value ?? 50;
      const percent = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
      const fillWidth = (width * percent) / 100;

      const bgColor = props.style?.backgroundColor ?? variant.background;

      const shapes: Shape[] = [
        // 트랙 배경
        {
          id: 'track',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width,
          height: trackHeight,
          radius: trackRadius,
          fill: bgColor,
        },
      ];

      // 채우기 (값 비율만큼)
      if (fillWidth > 0) {
        shapes.push({
          id: 'fill',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width: fillWidth,
          height: trackHeight,
          radius: trackRadius,
          fill: fillColors.fill,
        });
      }

      return shapes;
    },

    react: (props) => ({
      'data-disabled': props.isDisabled || undefined,
      'data-orientation': props.orientation ?? 'horizontal',
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ('none' as const) : ('static' as const),
      cursor: props.isDisabled ? 'not-allowed' : 'pointer',
    }),
  },
};
