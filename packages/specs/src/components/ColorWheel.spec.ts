/**
 * ColorWheel Component Spec
 *
 * Material Design 3 기반 색상 휠 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';

/**
 * ColorWheel Props
 */
export interface ColorWheelProps {
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  hue?: number;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * ColorWheel Component Spec
 */
export const ColorWheelSpec: ComponentSpec<ColorWheelProps> = {
  name: 'ColorWheel',
  description: 'Material Design 3 기반 원형 색상 휠 (circular hue selector + thumb)',
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
      height: 120,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-xs}' as TokenRef,
      borderRadius: '{radius.full}' as TokenRef,
      iconSize: 14,
      gap: 0,
    },
    md: {
      height: 180,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.full}' as TokenRef,
      iconSize: 18,
      gap: 0,
    },
    lg: {
      height: 240,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.full}' as TokenRef,
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
      const outerRadius = size.height / 2;
      const innerRadius = outerRadius * 0.7;
      const thumbSize = size.iconSize ?? 18;
      const hue = props.hue ?? 0;

      // Thumb 위치 (원주 위)
      const thumbAngle = (hue * Math.PI) / 180;
      const thumbRadius = (outerRadius + innerRadius) / 2;
      const thumbX = outerRadius + Math.cos(thumbAngle - Math.PI / 2) * thumbRadius;
      const thumbY = outerRadius + Math.sin(thumbAngle - Math.PI / 2) * thumbRadius;

      const shapes: Shape[] = [
        // 외곽 원 (hue gradient - 실제 렌더러에서 원형 gradient로 표현)
        {
          id: 'wheel',
          type: 'circle' as const,
          x: outerRadius,
          y: outerRadius,
          radius: outerRadius,
          fill: '{color.surface-container}' as TokenRef,
        },
        // 내부 원 (빈 공간)
        {
          type: 'circle' as const,
          x: outerRadius,
          y: outerRadius,
          radius: innerRadius,
          fill: '{color.surface}' as TokenRef,
        },
        // Thumb (원형)
        {
          type: 'circle' as const,
          x: thumbX,
          y: thumbY,
          radius: thumbSize / 2,
          fill: '{color.surface}' as TokenRef,
        },
        // Thumb 테두리
        {
          type: 'border' as const,
          x: thumbX - thumbSize / 2,
          y: thumbY - thumbSize / 2,
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
      'aria-label': 'Hue',
      'aria-valuemin': 0,
      'aria-valuemax': 360,
      'aria-valuenow': props.hue ?? 0,
      'data-disabled': props.isDisabled || undefined,
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ('none' as const) : ('static' as const),
      cursor: props.isDisabled ? 'not-allowed' : 'pointer',
    }),
  },
};
