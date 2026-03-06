/**
 * ColorArea Component Spec
 *
 * React Aria 기반 2D 색상 영역 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';

/**
 * ColorArea Props
 */
export interface ColorAreaProps {
  variant?: 'default' | 'accent';
  size?: 'S' | 'M' | 'L';
  hue?: number;
  xValue?: number;
  yValue?: number;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * ColorArea Component Spec
 */
export const ColorAreaSpec: ComponentSpec<ColorAreaProps> = {
  name: 'ColorArea',
  description: 'React Aria 기반 2D 색상 선택 영역 (saturation/brightness)',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'M',

  variants: {
    default: {
      background: '{color.base}' as TokenRef,
      backgroundHover: '{color.base}' as TokenRef,
      backgroundPressed: '{color.base}' as TokenRef,
      text: '{color.neutral}' as TokenRef,
      border: '{color.border}' as TokenRef,
    },
    accent: {
      background: '{color.base}' as TokenRef,
      backgroundHover: '{color.base}' as TokenRef,
      backgroundPressed: '{color.base}' as TokenRef,
      text: '{color.neutral}' as TokenRef,
      border: '{color.accent}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 120,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-xs}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      iconSize: 14,
      gap: 0,
    },
    md: {
      height: 180,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      iconSize: 18,
      gap: 0,
    },
    lg: {
      height: 240,
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
      outline: '2px solid var(--highlight-background)',
      outlineOffset: '2px',
    },
  },

  render: {
    shapes: (props, _variant, size, _state = 'default') => {
      const areaSize = size.height; // 정사각형
      const borderRadius = size.borderRadius;
      const thumbSize = size.iconSize ?? 18;

      const xValue = props.xValue ?? 0.7;
      const yValue = props.yValue ?? 0.3;

      const shapes: Shape[] = [
        // Color area gradient (saturation x brightness)
        {
          id: 'area',
          type: 'gradient' as const,
          x: 0,
          y: 0,
          width: areaSize,
          height: areaSize,
          radius: borderRadius as unknown as number,
          gradient: {
            type: 'linear',
            angle: 90,
            stops: [
              { offset: 0, color: '#FFFFFF' },
              { offset: 1, color: '#000000' },
            ],
          },
        },
        // Area 테두리
        {
          type: 'border' as const,
          target: 'area',
          borderWidth: 1,
          color: '{color.border}' as TokenRef,
          radius: borderRadius as unknown as number,
        },
        // Thumb (원형)
        {
          type: 'circle' as const,
          x: xValue * areaSize,
          y: (1 - yValue) * areaSize,
          radius: thumbSize / 2,
          fill: '{color.base}' as TokenRef,
        },
        // Thumb 테두리
        {
          type: 'border' as const,
          x: xValue * areaSize - thumbSize / 2,
          y: (1 - yValue) * areaSize - thumbSize / 2,
          width: thumbSize,
          height: thumbSize,
          borderWidth: 2,
          color: '{color.border}' as TokenRef,
          radius: thumbSize / 2,
        },
      ];

      return shapes;
    },

    react: (props) => ({
      role: 'slider',
      'aria-label': 'Color area',
      'data-disabled': props.isDisabled || undefined,
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ('none' as const) : ('static' as const),
      cursor: props.isDisabled ? 'not-allowed' : 'crosshair',
    }),
  },
};
