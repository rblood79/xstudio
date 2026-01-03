/**
 * PixiColorSlider - WebGL Color Slider Component
 *
 * Phase 6: Date/Color Components
 * Pattern: Pattern A (JSX + Graphics.draw) - Gradient track with thumb
 *
 * CSS 동기화:
 * - getColorSliderSizePreset(): trackWidth, trackHeight, thumbSize
 * - getColorSliderColorPreset(): thumbBorderColor, focusRingColor
 */

import { useCallback, useMemo } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Graphics as PixiGraphics } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import {
  getColorSliderSizePreset,
  getVariantColors,
} from '../utils/cssVariableReader';
import { useThemeColors } from '../hooks/useThemeColors';

export interface PixiColorSliderProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

/**
 * PixiColorSlider - Horizontal color slider with gradient track
 */
export function PixiColorSlider({
  element,
  isSelected = false,
  onClick,
}: PixiColorSliderProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const channel = (props.channel as string) || 'hue';
  const value = (props.value as number) ?? 0.5;

  // 🚀 테마 색상 동적 로드
  const themeColors = useThemeColors();

  // Get presets from CSS
  const sizePreset = useMemo(() => getColorSliderSizePreset(size), [size]);

  // 🚀 variant에 따른 테마 색상
  const variantColors = useMemo(
    () => getVariantColors(variant, themeColors),
    [variant, themeColors]
  );

  // 색상 프리셋 값들 (테마 색상 적용)
  const colorPreset = useMemo(() => ({
    thumbBorderColor: 0xffffff,
    thumbInnerBorderColor: 0xcad3dc,
    focusRingColor: variantColors.bg,
    trackBorderColor: 0xd1d5db,
  }), [variantColors]);

  // Calculate thumb position
  const thumbX = useMemo(() => {
    const trackInner = sizePreset.trackWidth - sizePreset.thumbSize;
    return sizePreset.thumbSize / 2 + value * trackInner;
  }, [sizePreset, value]);

  // Draw gradient track
  const drawTrack = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Track background (gradient representation)
      const trackY = (sizePreset.trackHeight - sizePreset.trackHeight * 0.8) / 2;
      const trackHeight = sizePreset.trackHeight * 0.8;

      // Draw gradient stops based on channel
      const segments = 12;
      const segmentWidth = sizePreset.trackWidth / segments;

      for (let i = 0; i < segments; i++) {
        let color: number;
        if (channel === 'hue') {
          // Rainbow gradient
          color = hslToHex(i / segments, 1, 0.5);
        } else if (channel === 'saturation') {
          // Gray to color
          color = hslToHex(0.6, i / segments, 0.5);
        } else if (channel === 'lightness' || channel === 'brightness') {
          // Black to white
          const l = i / segments;
          color = (Math.floor(l * 255) << 16) | (Math.floor(l * 255) << 8) | Math.floor(l * 255);
        } else if (channel === 'alpha') {
          // Transparency (checker + overlay) - 🚀 테마 색상 사용
          color = variantColors.bg;
        } else {
          color = hslToHex(i / segments, 1, 0.5);
        }

        g.rect(i * segmentWidth, trackY, segmentWidth + 1, trackHeight);
        g.fill({ color });
      }

      // Track border - 🚀 테마 색상 사용
      g.roundRect(0, trackY, sizePreset.trackWidth, trackHeight, sizePreset.borderRadius / 2);
      g.stroke({ color: colorPreset.trackBorderColor, width: 1 });

      // Selection indicator
      if (isSelected) {
        g.roundRect(-2, trackY - 2, sizePreset.trackWidth + 4, trackHeight + 4, sizePreset.borderRadius / 2 + 2);
        g.stroke({ color: colorPreset.focusRingColor, width: 2 });
      }
    },
    [sizePreset, colorPreset, channel, isSelected, variantColors]
  );

  // Draw thumb
  const drawThumb = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      const thumbY = sizePreset.trackHeight / 2;

      // Thumb outer border (white)
      g.circle(0, thumbY, sizePreset.thumbSize / 2);
      g.fill({ color: colorPreset.thumbBorderColor });

      // Thumb inner border
      g.circle(0, thumbY, sizePreset.thumbSize / 2 - sizePreset.thumbBorderWidth);
      g.stroke({ color: colorPreset.thumbInnerBorderColor, width: 1 });

      // Thumb center color
      const thumbColor = channel === 'hue'
        ? hslToHex(value, 1, 0.5)
        : channel === 'saturation'
          ? hslToHex(0.6, value, 0.5)
          : (Math.floor(value * 255) << 16) | (Math.floor(value * 255) << 8) | Math.floor(value * 255);

      g.circle(0, thumbY, sizePreset.thumbSize / 2 - sizePreset.thumbBorderWidth - 2);
      g.fill({ color: thumbColor });
    },
    [sizePreset, colorPreset, channel, value]
  );

  return (
    <pixiContainer
      eventMode="static"
      cursor="pointer"
      onPointerTap={() => onClick?.(element.id)}
    >
      {/* Gradient track */}
      <pixiGraphics draw={drawTrack} />

      {/* Thumb */}
      <pixiGraphics draw={drawThumb} x={thumbX} />
    </pixiContainer>
  );
}

/**
 * Convert HSL to hex color
 */
function hslToHex(h: number, s: number, l: number): number {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  const hue = h * 6;

  if (hue < 1) { r = c; g = x; b = 0; }
  else if (hue < 2) { r = x; g = c; b = 0; }
  else if (hue < 3) { r = 0; g = c; b = x; }
  else if (hue < 4) { r = 0; g = x; b = c; }
  else if (hue < 5) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const rInt = Math.floor((r + m) * 255);
  const gInt = Math.floor((g + m) * 255);
  const bInt = Math.floor((b + m) * 255);

  return (rInt << 16) | (gInt << 8) | bInt;
}
