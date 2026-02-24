/**
 * ProgressBar Component Spec
 *
 * Material Design 3 기반 프로그레스바 컴포넌트 (트랙 + 채우기)
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';
import { resolveToken } from '../renderers/utils/tokenResolver';

/**
 * ProgressBar Props
 */
export interface ProgressBarProps {
  variant?: 'default' | 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  value?: number;
  showValue?: boolean;
  isIndeterminate?: boolean;
  isDisabled?: boolean;
  children?: string;
  style?: Record<string, string | number | undefined>;
}

/** variant별 채우기 색상 */
export const PROGRESSBAR_FILL_COLORS: Record<string, TokenRef> = {
  default: '{color.primary}' as TokenRef,
  primary: '{color.primary}' as TokenRef,
  secondary: '{color.secondary}' as TokenRef,
};

/** 사이즈별 바 치수 */
export const PROGRESSBAR_DIMENSIONS: Record<string, { barHeight: number; width: number }> = {
  sm: { barHeight: 4, width: 200 },
  md: { barHeight: 6, width: 240 },
  lg: { barHeight: 8, width: 320 },
};

/**
 * ProgressBar Component Spec
 */
export const ProgressBarSpec: ComponentSpec<ProgressBarProps> = {
  name: 'ProgressBar',
  description: 'Material Design 3 기반 프로그레스바 컴포넌트',
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
      borderRadius: '{radius.sm}' as TokenRef,
      gap: 6,
    },
    md: {
      height: 6,
      paddingX: 0,
      paddingY: 0,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.sm}' as TokenRef,
      gap: 8,
    },
    lg: {
      height: 8,
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
      const barDims = PROGRESSBAR_DIMENSIONS[sizeName] ?? PROGRESSBAR_DIMENSIONS.md;
      const fillColor = PROGRESSBAR_FILL_COLORS[variantName] ?? PROGRESSBAR_FILL_COLORS.default;
      const width = (props.style?.width as number) || barDims.width;
      const barHeight = barDims.barHeight;
      const gap = size.gap ?? 8;

      // 사용자 스타일 우선
      const styleBr = props.style?.borderRadius;
      const barRadius = styleBr != null
        ? (typeof styleBr === 'number' ? styleBr : parseFloat(String(styleBr)) || 0)
        : size.borderRadius;

      const bgColor = props.style?.backgroundColor ?? variant.background;
      const textColor = props.style?.color ?? variant.text;
      const rawFontSize = props.style?.fontSize ?? size.fontSize;
      const resolvedFs = typeof rawFontSize === 'number'
        ? rawFontSize
        : (typeof rawFontSize === 'string' && rawFontSize.startsWith('{')
            ? resolveToken(rawFontSize as TokenRef)
            : rawFontSize);
      const fontSize = typeof resolvedFs === 'number' ? resolvedFs : 16;
      const fwRaw = props.style?.fontWeight;
      const fw = fwRaw != null
        ? (typeof fwRaw === 'number' ? fwRaw : parseInt(String(fwRaw), 10) || 500)
        : 500;
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;

      const value = Math.max(0, Math.min(100, props.value ?? 0));
      const fillWidth = (width * value) / 100;

      const shapes: Shape[] = [];

      // Child Composition: 자식 Element가 있으면 label/value text를 스킵하고 track+fill만 반환
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;

      // 라벨 + 값 행
      const hasLabelRow = !hasChildren && (props.label || props.showValue);
      if (hasLabelRow) {
        if (props.label) {
          shapes.push({
            type: 'text' as const,
            x: 0,
            y: 0,
            text: props.label,
            fontSize,
            fontFamily: ff,
            fontWeight: fw,
            fill: textColor,
            align: 'left' as const,
            baseline: 'top' as const,
          });
        }
        if (props.showValue) {
          shapes.push({
            type: 'text' as const,
            x: width,
            y: 0,
            text: `${Math.round(value)}%`,
            fontSize,
            fontFamily: ff,
            fill: textColor,
            align: 'right' as const,
            baseline: 'top' as const,
          });
        }
      }

      const offsetY = hasLabelRow ? fontSize + gap : 0;

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

      // 채우기 (determinate 모드)
      if (!props.isIndeterminate && fillWidth > 0) {
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

      // Indeterminate 애니메이션 표현 (정적 50% 위치)
      if (props.isIndeterminate) {
        shapes.push({
          id: 'indeterminate-fill',
          type: 'roundRect' as const,
          x: width * 0.2,
          y: offsetY,
          width: width * 0.3,
          height: barHeight,
          radius: barRadius as unknown as number,
          fill: fillColor,
        });
      }

      return shapes;
    },

    react: (props) => ({
      role: 'progressbar',
      'aria-valuemin': 0,
      'aria-valuemax': 100,
      'aria-valuenow': props.isIndeterminate ? undefined : (props.value ?? 0),
      'data-indeterminate': props.isIndeterminate || undefined,
    }),

    pixi: (props) => ({
      eventMode: 'static' as const,
      cursor: props.isDisabled ? 'not-allowed' : 'default',
    }),
  },
};
