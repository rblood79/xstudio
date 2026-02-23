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

      // Thumb 위치 (원주 위, 0° = 12시 방향 기준)
      const thumbAngle = (hue * Math.PI) / 180;
      const thumbRadius = (outerRadius + innerRadius) / 2;
      const thumbX = outerRadius + Math.cos(thumbAngle - Math.PI / 2) * thumbRadius;
      const thumbY = outerRadius + Math.sin(thumbAngle - Math.PI / 2) * thumbRadius;

      // Hue conic gradient stops (0°-360° 전체 색상환)
      // specShapeConverter의 conic 처리: -90° 보정 → 0°=12시 방향
      const hueStops: Array<{ offset: number; color: string }> = [
        { offset: 0,      color: '#FF0000' }, // 0°   빨강
        { offset: 1/12,   color: '#FF8000' }, // 30°  주황
        { offset: 2/12,   color: '#FFFF00' }, // 60°  노랑
        { offset: 3/12,   color: '#80FF00' }, // 90°  연두
        { offset: 4/12,   color: '#00FF00' }, // 120° 초록
        { offset: 5/12,   color: '#00FF80' }, // 150° 청록
        { offset: 6/12,   color: '#00FFFF' }, // 180° 시안
        { offset: 7/12,   color: '#0080FF' }, // 210° 하늘
        { offset: 8/12,   color: '#0000FF' }, // 240° 파랑
        { offset: 9/12,   color: '#8000FF' }, // 270° 보라
        { offset: 10/12,  color: '#FF00FF' }, // 300° 자홍
        { offset: 11/12,  color: '#FF0080' }, // 330° 핑크
        { offset: 1,      color: '#FF0000' }, // 360° 빨강 (닫힘)
      ];

      const diameter = outerRadius * 2;

      const shapes: Shape[] = [
        // Hue gradient ring - conic gradient + borderRadius로 원형 클리핑
        {
          id: 'wheel',
          type: 'gradient' as const,
          x: 0,
          y: 0,
          width: diameter,
          height: diameter,
          radius: outerRadius,
          gradient: {
            type: 'conic',
            angle: 0, // specShapeConverter에서 -90° 보정 처리
            stops: hueStops,
          },
        },
        // 내부 원 (흰색/배경색으로 도넛 중앙 채우기)
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
