/**
 * PixiColorSwatchPicker - WebGL Color Swatch Picker Component
 *
 * Phase 8: Notification & Color Utility Components
 * Pattern: Pattern A (JSX + Graphics.draw) - Multiple color swatches with selection
 *
 * CSS 동기화:
 * - getColorSwatchPickerSizePreset(): swatchSize, gap, borderRadius
 * - getColorSwatchPickerColorPreset(): selectionOuterColor, focusRingColor
 */

import { useCallback, useMemo } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Graphics as PixiGraphics } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import {
  getColorSwatchPickerSizePreset,
  getVariantColors,
} from '../utils/cssVariableReader';
import { useThemeColors } from '../hooks/useThemeColors';

export interface PixiColorSwatchPickerProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

// Default color palette
const DEFAULT_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
];

/**
 * PixiColorSwatchPicker - Color swatch picker grid
 */
export function PixiColorSwatchPicker({
  element,
  isSelected = false,
  onClick,
}: PixiColorSwatchPickerProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const colors = (props.colors as string[]) || DEFAULT_COLORS;
  const selectedColor = (props.value as string) || (props.selectedColor as string) || '';
  const layout = (props.layout as string) || 'grid'; // grid or stack
  const columnsPerRow = (props.columns as number) || 5;

  // Get presets from CSS
  const sizePreset = useMemo(() => getColorSwatchPickerSizePreset(size), [size]);

  // 🚀 테마 색상 동적 로드
  const themeColors = useThemeColors();

  // 🚀 variant에 따른 테마 색상
  const variantColors = useMemo(
    () => getVariantColors(variant, themeColors),
    [variant, themeColors]
  );

  // 색상 프리셋 값들 (테마 색상 적용)
  const colorPreset = useMemo(() => ({
    selectionOuterColor: 0x000000,
    selectionInnerColor: 0xffffff,
    focusRingColor: variantColors.bg,
  }), [variantColors]);

  // Calculate dimensions
  const isStack = layout === 'stack';
  const cols = isStack ? 1 : Math.min(columnsPerRow, colors.length);
  const rows = Math.ceil(colors.length / cols);
  const containerWidth = cols * sizePreset.swatchSize + (cols - 1) * sizePreset.gap;
  const containerHeight = rows * sizePreset.swatchSize + (rows - 1) * sizePreset.gap;

  // Parse color to number
  const parseColor = useCallback((color: string) => {
    const hex = color.replace('#', '');
    return parseInt(hex, 16) || 0x3b82f6;
  }, []);

  // Draw selection indicator
  const drawSelection = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (isSelected) {
        g.roundRect(-4, -4, containerWidth + 8, containerHeight + 8, sizePreset.borderRadius + 2);
        g.stroke({ color: colorPreset.focusRingColor, width: 2 });
      }
    },
    [containerWidth, containerHeight, sizePreset, colorPreset, isSelected]
  );

  // Draw single swatch
  const drawSwatch = useCallback(
    (g: PixiGraphics, color: number, isSwatchSelected: boolean) => {
      g.clear();

      // Swatch
      g.roundRect(0, 0, sizePreset.swatchSize, sizePreset.swatchSize, sizePreset.borderRadius);
      g.fill({ color });

      // Selection indicator (double border)
      if (isSwatchSelected) {
        // Outer border (black)
        g.roundRect(0, 0, sizePreset.swatchSize, sizePreset.swatchSize, sizePreset.borderRadius);
        g.stroke({ color: colorPreset.selectionOuterColor, width: sizePreset.selectionBorderWidth });

        // Inner border (white)
        const offset = sizePreset.selectionBorderWidth + 2;
        g.roundRect(
          offset,
          offset,
          sizePreset.swatchSize - offset * 2,
          sizePreset.swatchSize - offset * 2,
          Math.max(0, sizePreset.borderRadius - offset)
        );
        g.stroke({ color: colorPreset.selectionInnerColor, width: sizePreset.selectionBorderWidth });
      }
    },
    [sizePreset, colorPreset]
  );

  return (
    <pixiContainer
      eventMode="static"
      cursor="pointer"
      onPointerTap={() => onClick?.(element.id)}
    >
      {/* Selection indicator */}
      <pixiGraphics draw={drawSelection} />

      {/* Color swatches */}
      {colors.map((color, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = col * (sizePreset.swatchSize + sizePreset.gap);
        const y = row * (sizePreset.swatchSize + sizePreset.gap);
        const colorNum = parseColor(color);
        const isSwatchSelected = color.toLowerCase() === selectedColor.toLowerCase();

        return (
          <pixiGraphics
            key={`swatch-${index}`}
            draw={(g) => drawSwatch(g, colorNum, isSwatchSelected)}
            x={x}
            y={y}
          />
        );
      })}
    </pixiContainer>
  );
}
