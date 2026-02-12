/**
 * PixiColorSwatch - WebGL Color Swatch Component
 *
 * Phase 6: Date/Color Components
 * Pattern: Pattern A (JSX + Graphics.draw) - Simple color display
 *
 * CSS 동기화:
 * - getColorSwatchSizePreset(): width, height, borderRadius
 * - getColorSwatchColorPreset(): borderColor, selectedBorderColor
 */

import { useCallback, useMemo } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Graphics as PixiGraphics } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import {
  ColorSwatchSpec,
  getVariantColors as getSpecVariantColors,
  getSizePreset as getSpecSizePreset,
} from '@xstudio/specs';

export interface PixiColorSwatchProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

/**
 * Parse color string to hex number
 * @param color - CSS color string (hex or rgb)
 * @param fallback - Fallback hex color value
 */
function parseColor(color: string | undefined, fallback: number): number {
  if (!color) return fallback;

  if (color.startsWith('#')) {
    return parseInt(color.slice(1), 16);
  }
  if (color.startsWith('rgb')) {
    const match = color.match(/\d+/g);
    if (match && match.length >= 3) {
      const [r, g, b] = match.map(Number);
      return (r << 16) | (g << 8) | b;
    }
  }
  return fallback;
}

/**
 * PixiColorSwatch - Simple color display swatch
 */
export function PixiColorSwatch({
  element,
  isSelected = false,
  onClick,
}: PixiColorSwatchProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const color = props.color as string | undefined;

  const sizePreset = useMemo(() => {
    const sizeSpec = ColorSwatchSpec.sizes[size] || ColorSwatchSpec.sizes[ColorSwatchSpec.defaultSize];
    return getSpecSizePreset(sizeSpec, 'light');
  }, [size]);

  const variantColors = useMemo(() => {
    const variantSpec = ColorSwatchSpec.variants[variant] || ColorSwatchSpec.variants[ColorSwatchSpec.defaultVariant];
    return getSpecVariantColors(variantSpec, 'light');
  }, [variant]);

  // 색상 프리셋 값들 (테마 색상 적용)
  const colorPreset = useMemo(() => ({
    borderColor: 0xd1d5db,
    selectedBorderColor: variantColors.bg,
    checkerColor: 0xe5e7eb,
  }), [variantColors]);

  // Parse color value (fallback to theme color)
  const fillColor = useMemo(() => parseColor(color, variantColors.bg), [color, variantColors]);

  // Draw swatch
  const drawSwatch = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Checker background for transparency
      const checkerSize = 4;
      for (let x = 0; x < sizePreset.width; x += checkerSize * 2) {
        for (let y = 0; y < sizePreset.height; y += checkerSize * 2) {
          g.rect(x, y, checkerSize, checkerSize);
          g.rect(x + checkerSize, y + checkerSize, checkerSize, checkerSize);
        }
      }
      g.fill({ color: colorPreset.checkerColor });

      // Color fill
      g.roundRect(0, 0, sizePreset.width, sizePreset.height, sizePreset.borderRadius);
      g.fill({ color: fillColor });

      // Border
      g.roundRect(0, 0, sizePreset.width, sizePreset.height, sizePreset.borderRadius);
      g.stroke({
        color: isSelected ? colorPreset.selectedBorderColor : colorPreset.borderColor,
        width: sizePreset.borderWidth,
      });

      // Selection indicator
      if (isSelected) {
        g.roundRect(-2, -2, sizePreset.width + 4, sizePreset.height + 4, sizePreset.borderRadius + 2);
        g.stroke({ color: colorPreset.selectedBorderColor, width: 2 });
      }
    },
    [sizePreset, colorPreset, fillColor, isSelected]
  );

  return (
    <pixiContainer
      eventMode="static"
      cursor="pointer"
      onPointerTap={() => onClick?.(element.id)}
    >
      <pixiGraphics draw={drawSwatch} />
    </pixiContainer>
  );
}
