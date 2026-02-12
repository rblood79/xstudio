/**
 * PixiColorArea - WebGL Color Area Component
 *
 * Phase 6: Date/Color Components
 * Pattern: Pattern A (JSX + Graphics.draw) - 2D color selection area
 *
 * CSS 동기화:
 * - getColorAreaSizePreset(): width, height, thumbSize
 * - getColorAreaColorPreset(): borderColor, thumbBorderColor
 */

import { useCallback, useMemo } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Graphics as PixiGraphics } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import {
  ColorAreaSpec,
  getVariantColors as getSpecVariantColors,
  getSizePreset as getSpecSizePreset,
} from '@xstudio/specs';

export interface PixiColorAreaProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

/**
 * PixiColorArea - 2D color selection with saturation/brightness axes
 */
export function PixiColorArea({
  element,
  isSelected = false,
  onClick,
}: PixiColorAreaProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const hue = (props.hue as number) ?? 0;
  const xValue = (props.xValue as number) ?? 0.7;
  const yValue = (props.yValue as number) ?? 0.3;

  const sizePreset = useMemo(() => {
    const sizeSpec = ColorAreaSpec.sizes[size] || ColorAreaSpec.sizes[ColorAreaSpec.defaultSize];
    return getSpecSizePreset(sizeSpec, 'light');
  }, [size]);

  const variantColors = useMemo(() => {
    const variantSpec = ColorAreaSpec.variants[variant] || ColorAreaSpec.variants[ColorAreaSpec.defaultVariant];
    return getSpecVariantColors(variantSpec, 'light');
  }, [variant]);

  // 색상 프리셋 값들 (테마 색상 적용)
  const colorPreset = useMemo(() => ({
    borderColor: 0xd1d5db,
    focusRingColor: variantColors.bg,
    thumbBorderColor: 0xffffff,
    thumbInnerBorderColor: 0xcad3dc,
  }), [variantColors]);

  // Calculate thumb position
  const thumbX = xValue * sizePreset.width;
  const thumbY = (1 - yValue) * sizePreset.height; // Invert Y (brightness decreases downward)

  // Draw color area with gradient
  const drawArea = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Draw gradient grid (approximation of saturation/brightness)
      const gridSize = 8;
      const cellWidth = sizePreset.width / gridSize;
      const cellHeight = sizePreset.height / gridSize;

      for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
          const saturation = x / (gridSize - 1);
          const brightness = 1 - y / (gridSize - 1);
          const color = hsbToHex(hue, saturation, brightness);

          g.rect(x * cellWidth, y * cellHeight, cellWidth + 1, cellHeight + 1);
          g.fill({ color });
        }
      }

      // Border
      g.roundRect(0, 0, sizePreset.width, sizePreset.height, sizePreset.borderRadius);
      g.stroke({ color: colorPreset.borderColor, width: 1 });

      // Selection indicator
      if (isSelected) {
        g.roundRect(-2, -2, sizePreset.width + 4, sizePreset.height + 4, sizePreset.borderRadius + 2);
        g.stroke({ color: colorPreset.focusRingColor, width: 2 });
      }
    },
    [sizePreset, colorPreset, hue, isSelected]
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

      // Thumb center (current color)
      const thumbColor = hsbToHex(hue, xValue, yValue);
      g.circle(0, 0, sizePreset.thumbSize / 2 - sizePreset.thumbBorderWidth - 1);
      g.fill({ color: thumbColor });
    },
    [sizePreset, colorPreset, hue, xValue, yValue]
  );

  return (
    <pixiContainer
      eventMode="static"
      cursor="crosshair"
      onPointerTap={() => onClick?.(element.id)}
    >
      {/* Color gradient area */}
      <pixiGraphics draw={drawArea} />

      {/* Thumb */}
      <pixiGraphics draw={drawThumb} x={thumbX} y={thumbY} />
    </pixiContainer>
  );
}

/**
 * Convert HSB to hex color
 */
function hsbToHex(h: number, s: number, b: number): number {
  // HSB to RGB conversion
  const c = b * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = b - c;

  let r = 0, g = 0, blue = 0;
  const hue = h % 360;

  if (hue < 60) { r = c; g = x; blue = 0; }
  else if (hue < 120) { r = x; g = c; blue = 0; }
  else if (hue < 180) { r = 0; g = c; blue = x; }
  else if (hue < 240) { r = 0; g = x; blue = c; }
  else if (hue < 300) { r = x; g = 0; blue = c; }
  else { r = c; g = 0; blue = x; }

  const rInt = Math.floor((r + m) * 255);
  const gInt = Math.floor((g + m) * 255);
  const bInt = Math.floor((blue + m) * 255);

  return (rInt << 16) | (gInt << 8) | bInt;
}
