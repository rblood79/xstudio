/**
 * ColorPicker Component Spec
 *
 * Material Design 3 기반 색상 선택기 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from '../types';
import { fontFamily } from '../primitives/typography';

/**
 * ColorPicker Props
 */
export interface ColorPickerProps {
  variant?: 'default' | 'compact' | 'expanded';
  size?: 'sm' | 'md' | 'lg';
  value?: string;
  hue?: number;
  saturation?: number;
  brightness?: number;
  alpha?: number;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * ColorPicker Component Spec
 *
 * ColorArea + ColorSlider(hue/alpha) + ColorSwatch 구조
 */
export const ColorPickerSpec: ComponentSpec<ColorPickerProps> = {
  name: 'ColorPicker',
  description: 'Material Design 3 기반 색상 선택기 (area + sliders + swatches)',
  element: 'div',

  defaultVariant: 'default',
  defaultSize: 'md',

  overlay: {
    usePortal: true,
    type: 'popover',
    hasBackdrop: false,
    closeOnBackdropClick: true,
    closeOnEscape: true,
    trapFocus: true,
    pixiLayer: 'overlay',
  },

  variants: {
    default: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    compact: {
      background: '{color.surface-container}' as TokenRef,
      backgroundHover: '{color.surface-container}' as TokenRef,
      backgroundPressed: '{color.surface-container}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline-variant}' as TokenRef,
    },
    expanded: {
      background: '{color.surface}' as TokenRef,
      backgroundHover: '{color.surface}' as TokenRef,
      backgroundPressed: '{color.surface}' as TokenRef,
      text: '{color.on-surface}' as TokenRef,
      border: '{color.outline}' as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 10,
      paddingY: 10,
      fontSize: '{typography.text-xs}' as TokenRef,
      borderRadius: '{radius.md}' as TokenRef,
      gap: 8,
    },
    md: {
      height: 0,
      paddingX: 14,
      paddingY: 14,
      fontSize: '{typography.text-sm}' as TokenRef,
      borderRadius: '{radius.lg}' as TokenRef,
      gap: 10,
    },
    lg: {
      height: 0,
      paddingX: 18,
      paddingY: 18,
      fontSize: '{typography.text-md}' as TokenRef,
      borderRadius: '{radius.xl}' as TokenRef,
      gap: 12,
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
    shapes: (props, variant, size, _state = 'default') => {
      const borderRadius = size.borderRadius;
      const areaSize = props.variant === 'compact' ? 120 : 180;
      const sliderHeight = 14;

      const containerWidth = areaSize + size.paddingX * 2;

      const shapes: Shape[] = [
        // 섀도우
        {
          type: 'shadow' as const,
          target: 'bg',
          offsetX: 0,
          offsetY: 4,
          blur: 12,
          spread: 0,
          color: 'rgba(0, 0, 0, 0.15)',
          alpha: 0.15,
        },
        // 배경
        {
          id: 'bg',
          type: 'roundRect' as const,
          x: 0,
          y: 0,
          width: containerWidth,
          height: 'auto',
          radius: borderRadius as unknown as number,
          fill: variant.background,
        },
        // 테두리
        {
          type: 'border' as const,
          target: 'bg',
          borderWidth: 1,
          color: variant.border ?? '{color.outline-variant}' as TokenRef,
          radius: borderRadius as unknown as number,
        },
      ];

      // Color area (2D gradient)
      shapes.push({
        type: 'gradient' as const,
        x: size.paddingX,
        y: size.paddingY,
        width: areaSize,
        height: areaSize,
        radius: 4,
        gradient: {
          type: 'linear',
          angle: 90,
          stops: [
            { offset: 0, color: '{color.surface}' as TokenRef },
            { offset: 1, color: '{color.primary}' as TokenRef },
          ],
        },
      });

      // Area thumb
      const thumbX = (props.saturation ?? 0.8) * areaSize + size.paddingX;
      const thumbY = (1 - (props.brightness ?? 0.7)) * areaSize + size.paddingY;
      shapes.push({
        type: 'circle' as const,
        x: thumbX,
        y: thumbY,
        radius: 7,
        fill: '{color.surface}' as TokenRef,
      });

      // Hue slider
      const sliderY = size.paddingY + areaSize + (size.gap ?? 10);
      shapes.push({
        type: 'gradient' as const,
        x: size.paddingX,
        y: sliderY,
        width: areaSize,
        height: sliderHeight,
        radius: 4,
        gradient: {
          type: 'linear',
          angle: 0,
          stops: [
            { offset: 0, color: '#FF0000' },
            { offset: 0.17, color: '#FFFF00' },
            { offset: 0.33, color: '#00FF00' },
            { offset: 0.5, color: '#00FFFF' },
            { offset: 0.67, color: '#0000FF' },
            { offset: 0.83, color: '#FF00FF' },
            { offset: 1, color: '#FF0000' },
          ],
        },
      });

      // Alpha slider
      const alphaSliderY = sliderY + sliderHeight + (size.gap ?? 10);
      shapes.push({
        type: 'gradient' as const,
        x: size.paddingX,
        y: alphaSliderY,
        width: areaSize,
        height: sliderHeight,
        radius: 4,
        gradient: {
          type: 'linear',
          angle: 0,
          stops: [
            { offset: 0, color: 'rgba(0, 0, 0, 0)' },
            { offset: 1, color: '{color.primary}' as TokenRef },
          ],
        },
      });

      // Hex value text
      const hexValue = props.value || '#3B82F6';
      shapes.push({
        type: 'text' as const,
        x: size.paddingX,
        y: alphaSliderY + sliderHeight + (size.gap ?? 10),
        text: hexValue.toUpperCase(),
        fontSize: size.fontSize as unknown as number,
        fontFamily: fontFamily.mono,
        fontWeight: 400,
        fill: variant.text,
        align: 'left' as const,
        baseline: 'top' as const,
      });

      return shapes;
    },

    react: (props) => ({
      'data-disabled': props.isDisabled || undefined,
      'aria-label': 'Color picker',
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ('none' as const) : ('static' as const),
      cursor: 'pointer',
    }),
  },
};
