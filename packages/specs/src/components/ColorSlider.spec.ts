/**
 * ColorSlider Component Spec
 *
 * Material Design 3 기반 색상 슬라이더 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';

/**
 * ColorSlider Props
 */
export interface ColorSliderProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  channel?: 'hue' | 'saturation' | 'lightness' | 'brightness' | 'alpha';
  value?: number;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * ColorSlider Component Spec
 */
export const ColorSliderSpec: ComponentSpec<ColorSliderProps> = {
  name: 'ColorSlider',
  description: 'Material Design 3 기반 색상 슬라이더 (gradient track + thumb)',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    primary: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.primary}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 16,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-xs}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      iconSize: 14,
      gap: 0,
    },
    md: {
      height: 20,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      iconSize: 18,
      gap: 0,
    },
    lg: {
      height: 24,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      iconSize: 22,
      gap: 0,
    },
  },

  states: {
    hover: {},
    pressed: {},
    disabled: {
      opacity: 0.38,
      pointerEvents: 'none',
    },
    focusVisible: {
      outline: '2px solid var(--primary)',
      outlineOffset: '2px',
    },
  },

  render: {
    shapes: (props, _variant, size, _state = 'default') => {
      const width = (props.style?.width as number) || 200;
      const trackHeight = size.height;
      const thumbSize = size.iconSize ?? 18;
      const borderRadius = size.borderRadius;

      const value = props.value ?? 0.5;
      const channel = props.channel ?? 'hue';

      // Gradient stops 결정
      let gradientStops: Array<{ offset: number; color: string }>;
      if (channel === 'hue') {
        gradientStops = [
          { offset: 0, color: '#FF0000' },
          { offset: 0.17, color: '#FFFF00' },
          { offset: 0.33, color: '#00FF00' },
          { offset: 0.5, color: '#00FFFF' },
          { offset: 0.67, color: '#0000FF' },
          { offset: 0.83, color: '#FF00FF' },
          { offset: 1, color: '#FF0000' },
        ];
      } else if (channel === 'saturation') {
        gradientStops = [
          { offset: 0, color: '#808080' },
          { offset: 1, color: '#FF0000' },
        ];
      } else if (channel === 'alpha') {
        gradientStops = [
          { offset: 0, color: 'rgba(0,0,0,0)' },
          { offset: 1, color: '#000000' },
        ];
      } else {
        // lightness / brightness
        gradientStops = [
          { offset: 0, color: '#000000' },
          { offset: 1, color: '#FFFFFF' },
        ];
      }

      const shapes: Shape[] = [
        // Gradient track
        {
          id: 'track',
          type: 'gradient' as const,
          x: 0,
          y: 0,
          width,
          height: trackHeight,
          radius: borderRadius as unknown as number,
          gradient: {
            type: 'linear',
            angle: 0,
            stops: gradientStops.map(s => ({ offset: s.offset, color: s.color })),
          },
        },
        // Track 테두리
        {
          type: 'border' as const,
          target: 'track',
          borderWidth: 1,
          color: '{color.outline-variant}' as TokenRef,
          radius: borderRadius as unknown as number,
        },
        // Thumb (원형)
        {
          type: 'circle' as const,
          x: thumbSize / 2 + value * (width - thumbSize),
          y: trackHeight / 2,
          radius: thumbSize / 2,
          fill: '{color.surface}' as TokenRef,
        },
        // Thumb 테두리
        {
          type: 'border' as const,
          x: value * (width - thumbSize),
          y: (trackHeight - thumbSize) / 2,
          width: thumbSize,
          height: thumbSize,
          borderWidth: 2,
          color: '{color.outline-variant}' as TokenRef,
          radius: thumbSize / 2,
        },
      ];

      return shapes;
    },

    react: (props) => ({
      role: 'slider',
      'aria-valuemin': 0,
      'aria-valuemax': 1,
      'aria-valuenow': props.value ?? 0.5,
      'data-channel': props.channel || 'hue',
      'data-disabled': props.isDisabled || undefined,
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ('none' as const) : ('static' as const),
      cursor: props.isDisabled ? 'not-allowed' : 'pointer',
    }),
  },
};
