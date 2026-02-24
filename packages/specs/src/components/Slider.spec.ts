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
import { resolveStateColors } from '../utils/stateEffect';
import { resolveToken } from '../renderers/utils/tokenResolver';

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
    shapes: (props, variant, size, state = 'default') => {
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

      // 사용자 스타일 우선
      const bgColor = props.style?.backgroundColor ?? resolveStateColors(variant, state).background;
      const textColor = props.style?.color ?? variant.text;
      const fontSize = props.style?.fontSize ?? size.fontSize;
      const fwRaw = props.style?.fontWeight;
      const fw = fwRaw != null
        ? (typeof fwRaw === 'number' ? fwRaw : parseInt(String(fwRaw), 10) || 500)
        : 500;
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;

      const shapes: Shape[] = [];
      const hasLabelChild = !!(props as Record<string, unknown>)._hasChildren;

      // 라벨 + 값 행 (자식 Element가 있으면 자식 TextSprite가 렌더링하므로 스킵)
      if (!hasLabelChild && (props.label || props.showValue)) {
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
        if (props.showValue) {
          shapes.push({
            type: 'text' as const,
            x: 0,
            y: 0,
            text: String(value),
            fontSize: fontSize as unknown as number,
            fontFamily: ff,
            fill: textColor,
            align: 'right' as const,
            baseline: 'top' as const,
            maxWidth: width,
          });
        }
      }

      // fontSize가 TokenRef 문자열일 수 있으므로 resolveToken으로 숫자 변환
      const resolvedFontSize = typeof size.fontSize === 'number'
        ? size.fontSize
        : (typeof size.fontSize === 'string' && size.fontSize.startsWith('{')
            ? resolveToken(size.fontSize as TokenRef)
            : 14);
      const numericFontSize = typeof resolvedFontSize === 'number' ? resolvedFontSize : 14;
      const offsetY = (props.label || props.showValue)
        ? numericFontSize + gap
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
        fill: bgColor,
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
