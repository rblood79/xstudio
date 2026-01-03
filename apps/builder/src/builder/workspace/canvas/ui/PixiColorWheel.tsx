/**
 * PixiColorWheel - WebGL Color Wheel Component
 *
 * Phase 6: Date/Color Components
 * Pattern: Pattern A (JSX + Graphics.draw) - Circular hue selector
 *
 * CSS 동기화:
 * - getColorWheelSizePreset(): outerRadius, innerRadius, thumbSize
 * - getColorWheelColorPreset(): thumbBorderColor, focusRingColor
 */

import { useCallback, useMemo } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Graphics as PixiGraphics } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import {
  getColorWheelSizePreset,
  getVariantColors,
} from '../utils/cssVariableReader';
import { useThemeColors } from '../hooks/useThemeColors';

export interface PixiColorWheelProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

/**
 * PixiColorWheel - Circular hue selection wheel
 */
export function PixiColorWheel({
  element,
  isSelected = false,
  onClick,
}: PixiColorWheelProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const hue = (props.hue as number) ?? 0;

  // 🚀 테마 색상 동적 로드
  const themeColors = useThemeColors();

  // Get presets from CSS
  const sizePreset = useMemo(() => getColorWheelSizePreset(size), [size]);

  // 🚀 variant에 따른 테마 색상
  const variantColors = useMemo(
    () => getVariantColors(variant, themeColors),
    [variant, themeColors]
  );

  // 색상 프리셋 값들 (테마 색상 적용)
  const colorPreset = useMemo(() => ({
    focusRingColor: variantColors.bg,
    thumbBorderColor: 0xffffff,
    thumbInnerBorderColor: 0xcad3dc,
  }), [variantColors]);

  // Calculate thumb position on wheel
  const thumbAngle = (hue * Math.PI) / 180;
  const thumbRadius = (sizePreset.outerRadius + sizePreset.innerRadius) / 2;
  const thumbX = sizePreset.outerRadius + Math.cos(thumbAngle - Math.PI / 2) * thumbRadius;
  const thumbY = sizePreset.outerRadius + Math.sin(thumbAngle - Math.PI / 2) * thumbRadius;

  // Draw color wheel
  const drawWheel = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      const centerX = sizePreset.outerRadius;
      const centerY = sizePreset.outerRadius;

      // Draw wheel segments
      const segments = 60;
      const segmentAngle = (Math.PI * 2) / segments;

      for (let i = 0; i < segments; i++) {
        const startAngle = i * segmentAngle - Math.PI / 2;
        const endAngle = startAngle + segmentAngle + 0.01; // Slight overlap to avoid gaps

        // Calculate color for this segment
        const hueValue = (i / segments) * 360;
        const color = hslToHex(hueValue / 360, 1, 0.5);

        // Draw arc segment
        g.moveTo(
          centerX + Math.cos(startAngle) * sizePreset.innerRadius,
          centerY + Math.sin(startAngle) * sizePreset.innerRadius
        );
        g.lineTo(
          centerX + Math.cos(startAngle) * sizePreset.outerRadius,
          centerY + Math.sin(startAngle) * sizePreset.outerRadius
        );
        g.arc(centerX, centerY, sizePreset.outerRadius, startAngle, endAngle);
        g.lineTo(
          centerX + Math.cos(endAngle) * sizePreset.innerRadius,
          centerY + Math.sin(endAngle) * sizePreset.innerRadius
        );
        g.arc(centerX, centerY, sizePreset.innerRadius, endAngle, startAngle, true);
        g.closePath();
        g.fill({ color });
      }

      // Selection indicator
      if (isSelected) {
        g.circle(centerX, centerY, sizePreset.outerRadius + 4);
        g.stroke({ color: colorPreset.focusRingColor, width: 2 });
      }
    },
    [sizePreset, colorPreset, isSelected]
  );

  // Draw thumb
  const drawThumb = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Thumb outer circle (white border)
      g.circle(0, 0, sizePreset.thumbSize / 2);
      g.fill({ color: colorPreset.thumbBorderColor });

      // Thumb inner border
      g.circle(0, 0, sizePreset.thumbSize / 2 - sizePreset.thumbBorderWidth);
      g.stroke({ color: colorPreset.thumbInnerBorderColor, width: 1 });

      // Thumb center (current hue color)
      const thumbColor = hslToHex(hue / 360, 1, 0.5);
      g.circle(0, 0, sizePreset.thumbSize / 2 - sizePreset.thumbBorderWidth - 1);
      g.fill({ color: thumbColor });
    },
    [sizePreset, colorPreset, hue]
  );

  return (
    <pixiContainer
      eventMode="static"
      cursor="pointer"
      onPointerTap={() => onClick?.(element.id)}
    >
      {/* Color wheel */}
      <pixiGraphics draw={drawWheel} />

      {/* Thumb */}
      <pixiGraphics draw={drawThumb} x={thumbX} y={thumbY} />
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
