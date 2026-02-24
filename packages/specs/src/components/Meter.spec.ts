/**
 * Meter Component Spec
 *
 * Material Design 3 기반 미터 컴포넌트 (트랙 + 채우기)
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * Meter Props
 */
export interface MeterProps {
  variant?: 'default' | 'primary' | 'secondary' | 'error';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  value?: number;
  minValue?: number;
  maxValue?: number;
  showValue?: boolean;
  valueFormat?: 'number' | 'percent';
  isDisabled?: boolean;
  children?: string;
  style?: Record<string, string | number | undefined>;
}

/** variant별 채우기 색상 */
export const METER_FILL_COLORS: Record<string, TokenRef> = {
  default: '{color.primary}' as TokenRef,
  primary: '{color.primary}' as TokenRef,
  secondary: '{color.secondary}' as TokenRef,
  error: '{color.error}' as TokenRef,
};

/** 사이즈별 바 치수 */
export const METER_DIMENSIONS: Record<string, { barHeight: number; width: number }> = {
  sm: { barHeight: 6, width: 200 },
  md: { barHeight: 8, width: 240 },
  lg: { barHeight: 12, width: 320 },
};

/**
 * Meter Component Spec
 */
export const MeterSpec: ComponentSpec<MeterProps> = {
  name: 'Meter',
  description: 'Material Design 3 기반 미터 컴포넌트',
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
    error: {
      background: '{color.surface-container-high}' as TokenRef,
      backgroundHover: '{color.surface-container-highest}' as TokenRef,
      backgroundPressed: '{color.surface-container-highest}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 6,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-xs}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      gap: 6,
    },
    md: {
      height: 8,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      gap: 8,
    },
    lg: {
      height: 12,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 10,
    },
  },

  states: {
    hover: {},
    pressed: {},
    disabled: {
      opacity: 0.38,
      pointerEvents: 'none',
    },
    focusVisible: {},
  },

  render: {
    shapes: (props, variant, size, _state = 'default') => {
      const variantName = props.variant ?? 'default';
      const sizeName = props.size ?? 'md';
      const meterDims = METER_DIMENSIONS[sizeName] ?? METER_DIMENSIONS.md;
      const fillColor = METER_FILL_COLORS[variantName] ?? METER_FILL_COLORS.default;
      const width = (props.style?.width as number) || meterDims.width;
      const barHeight = meterDims.barHeight;
      const gap = size.gap ?? 8;

      // 사용자 스타일 우선
      const styleBr = props.style?.borderRadius;
      const barRadius = styleBr != null
        ? (typeof styleBr === 'number' ? styleBr : parseFloat(String(styleBr)) || 0)
        : size.borderRadius;

      const bgColor = props.style?.backgroundColor ?? variant.background;
      const textColor = props.style?.color ?? variant.text;
      const fontSize = props.style?.fontSize ?? size.fontSize;
      const fwRaw = props.style?.fontWeight;
      const fw = fwRaw != null
        ? (typeof fwRaw === 'number' ? fwRaw : parseInt(String(fwRaw), 10) || 500)
        : 500;
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;

      const min = props.minValue ?? 0;
      const max = props.maxValue ?? 100;
      const value = Math.max(min, Math.min(max, props.value ?? 50));
      const percent = ((value - min) / (max - min)) * 100;
      const fillWidth = (width * percent) / 100;

      const shapes: Shape[] = [];

      // Child Composition: 자식 Element가 있으면 label/value text를 스킵하고 track+fill만 반환
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;

      // 라벨 + 값 행
      const hasLabelRow = !hasChildren && (props.label || props.showValue !== false);
      if (hasLabelRow) {
        if (props.label) {
          shapes.push({
            type: 'text' as const,
            x: 0,
            y: 0,
            text: props.label,
            fontSize: fontSize as unknown as number,
            fontFamily: ff,
            fontWeight: fw,
            fill: textColor,
            align: 'left' as const,
            baseline: 'top' as const,
          });
        }
        if (props.showValue !== false) {
          const formattedValue = props.valueFormat === 'number'
            ? String(value)
            : `${Math.round(percent)}%`;
          shapes.push({
            type: 'text' as const,
            x: width,
            y: 0,
            text: formattedValue,
            fontSize: fontSize as unknown as number,
            fontFamily: ff,
            fill: textColor,
            align: 'right' as const,
            baseline: 'top' as const,
          });
        }
      }

      const offsetY = hasLabelRow ? (size.fontSize as unknown as number) + gap : 0;

      // 트랙 배경
      shapes.push({
        id: 'track',
        type: 'roundRect' as const,
        x: 0,
        y: offsetY,
        width,
        height: barHeight,
        radius: barRadius as unknown as number,
        fill: bgColor,
      });

      // 채우기
      if (fillWidth > 0) {
        shapes.push({
          id: 'fill',
          type: 'roundRect' as const,
          x: 0,
          y: offsetY,
          width: fillWidth,
          height: barHeight,
          radius: barRadius as unknown as number,
          fill: fillColor,
        });
      }

      return shapes;
    },

    react: (props) => ({
      role: 'meter',
      'aria-valuemin': props.minValue ?? 0,
      'aria-valuemax': props.maxValue ?? 100,
      'aria-valuenow': props.value ?? 50,
    }),

    pixi: (props) => ({
      eventMode: 'static' as const,
      cursor: props.isDisabled ? 'not-allowed' : 'default',
    }),
  },
};
