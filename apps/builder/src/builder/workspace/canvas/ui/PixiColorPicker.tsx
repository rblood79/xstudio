/**
 * PixiColorPicker - WebGL Color Picker Component
 *
 * Phase 6: Date/Color Components
 * Pattern: Pattern A (JSX + Graphics.draw) - ColorArea + ColorSlider + ColorSwatch
 *
 * CSS 동기화:
 * - getColorPickerSizePreset(): areaSize, sliderWidth, swatchSize
 * - getColorPickerColorPreset(): backgroundColor, borderColor
 */

import { useCallback, useMemo } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import {
  getColorPickerSizePreset,
  getVariantColors,
} from '../utils/cssVariableReader';
import { useThemeColors } from '../hooks/useThemeColors';

export interface PixiColorPickerProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

/**
 * PixiColorPicker - Full color picker with area, sliders, and swatch
 */
export function PixiColorPicker({
  element,
  isSelected = false,
  onClick,
}: PixiColorPickerProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const hue = (props.hue as number) ?? 0;
  const saturation = (props.saturation as number) ?? 0.8;
  const brightness = (props.brightness as number) ?? 0.7;
  const alpha = (props.alpha as number) ?? 1;

  // 🚀 테마 색상 동적 로드
  const themeColors = useThemeColors();

  // Get presets from CSS
  const sizePreset = useMemo(() => getColorPickerSizePreset(size), [size]);

  // 🚀 variant에 따른 테마 색상
  const variantColors = useMemo(
    () => getVariantColors(variant, themeColors),
    [variant, themeColors]
  );

  // 색상 프리셋 값들 (테마 색상 적용)
  const colorPreset = useMemo(() => ({
    backgroundColor: 0xffffff,
    borderColor: 0xd1d5db,
    focusRingColor: variantColors.bg,
    thumbBorderColor: 0xffffff,
    thumbInnerBorderColor: 0xcad3dc,
    labelColor: variantColors.text,
    sliderBorderColor: 0xcad3dc,
    checkerColor: 0xe5e7eb,
  }), [variantColors]);

  // Calculate dimensions
  const containerWidth = sizePreset.areaSize + sizePreset.padding * 2;
  const containerHeight = sizePreset.areaSize + sizePreset.gap * 2 + sizePreset.sliderHeight * 2 + sizePreset.gap + sizePreset.swatchSize + sizePreset.padding * 2;

  // Current color
  const currentColor = useMemo(() => hsbToHex(hue, saturation, brightness), [hue, saturation, brightness]);

  // Draw container
  const drawContainer = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Background
      g.roundRect(0, 0, containerWidth, containerHeight, sizePreset.borderRadius);
      g.fill({ color: colorPreset.backgroundColor });
      g.stroke({ color: colorPreset.borderColor, width: 1 });

      // Selection indicator
      if (isSelected) {
        g.roundRect(-2, -2, containerWidth + 4, containerHeight + 4, sizePreset.borderRadius + 2);
        g.stroke({ color: colorPreset.focusRingColor, width: 2 });
      }
    },
    [containerWidth, containerHeight, sizePreset, colorPreset, isSelected]
  );

  // Draw color area
  const drawColorArea = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Draw gradient grid
      const gridSize = 8;
      const cellWidth = sizePreset.areaSize / gridSize;
      const cellHeight = sizePreset.areaSize / gridSize;

      for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
          const sat = x / (gridSize - 1);
          const brt = 1 - y / (gridSize - 1);
          const color = hsbToHex(hue, sat, brt);

          g.rect(x * cellWidth, y * cellHeight, cellWidth + 1, cellHeight + 1);
          g.fill({ color });
        }
      }

      // Border
      g.roundRect(0, 0, sizePreset.areaSize, sizePreset.areaSize, 4);
      g.stroke({ color: colorPreset.sliderBorderColor, width: 1 });
    },
    [sizePreset, colorPreset, hue]
  );

  // Draw area thumb
  const drawAreaThumb = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.circle(0, 0, sizePreset.thumbSize / 2);
      g.fill({ color: colorPreset.thumbBorderColor });
      g.circle(0, 0, sizePreset.thumbSize / 2 - 2);
      g.stroke({ color: colorPreset.thumbInnerBorderColor, width: 1 });
      g.circle(0, 0, sizePreset.thumbSize / 2 - 3);
      g.fill({ color: currentColor });
    },
    [sizePreset, colorPreset, currentColor]
  );

  // Draw hue slider
  const drawHueSlider = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Rainbow gradient
      const segments = 12;
      const segmentWidth = sizePreset.sliderWidth / segments;

      for (let i = 0; i < segments; i++) {
        const color = hsbToHex(i / segments, 1, 1);
        g.rect(i * segmentWidth, 0, segmentWidth + 1, sizePreset.sliderHeight);
        g.fill({ color });
      }

      g.roundRect(0, 0, sizePreset.sliderWidth, sizePreset.sliderHeight, 4);
      g.stroke({ color: colorPreset.sliderBorderColor, width: 1 });
    },
    [sizePreset, colorPreset]
  );

  // Draw alpha slider
  const drawAlphaSlider = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Checker background
      const checkerSize = 4;
      for (let x = 0; x < sizePreset.sliderWidth; x += checkerSize * 2) {
        for (let y = 0; y < sizePreset.sliderHeight; y += checkerSize * 2) {
          g.rect(x, y, checkerSize, checkerSize);
          g.rect(x + checkerSize, y + checkerSize, checkerSize, checkerSize);
        }
      }
      g.fill({ color: colorPreset.checkerColor });

      // Color gradient overlay
      const segments = 8;
      const segmentWidth = sizePreset.sliderWidth / segments;
      for (let i = 0; i < segments; i++) {
        const alphaVal = i / (segments - 1);
        g.rect(i * segmentWidth, 0, segmentWidth + 1, sizePreset.sliderHeight);
        g.fill({ color: currentColor, alpha: alphaVal });
      }

      g.roundRect(0, 0, sizePreset.sliderWidth, sizePreset.sliderHeight, 4);
      g.stroke({ color: colorPreset.sliderBorderColor, width: 1 });
    },
    [sizePreset, colorPreset, currentColor]
  );

  // Draw slider thumb
  const drawSliderThumb = useCallback(
    (g: PixiGraphics, color: number) => {
      g.clear();
      g.circle(0, sizePreset.sliderHeight / 2, sizePreset.thumbSize / 2);
      g.fill({ color: colorPreset.thumbBorderColor });
      g.circle(0, sizePreset.sliderHeight / 2, sizePreset.thumbSize / 2 - 2);
      g.fill({ color });
    },
    [sizePreset, colorPreset]
  );

  // Draw color swatch
  const drawSwatch = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Checker background
      const checkerSize = 4;
      for (let x = 0; x < sizePreset.swatchSize; x += checkerSize * 2) {
        for (let y = 0; y < sizePreset.swatchSize; y += checkerSize * 2) {
          g.rect(x, y, checkerSize, checkerSize);
          g.rect(x + checkerSize, y + checkerSize, checkerSize, checkerSize);
        }
      }
      g.fill({ color: colorPreset.checkerColor });

      // Current color
      g.roundRect(0, 0, sizePreset.swatchSize, sizePreset.swatchSize, 4);
      g.fill({ color: currentColor, alpha });

      g.roundRect(0, 0, sizePreset.swatchSize, sizePreset.swatchSize, 4);
      g.stroke({ color: colorPreset.sliderBorderColor, width: 1 });
    },
    [sizePreset, colorPreset, currentColor, alpha]
  );

  // Text style
  const labelStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: 11,
      fill: colorPreset.labelColor,
      fontFamily: 'Inter, system-ui, sans-serif',
    }),
    [colorPreset]
  );

  // 🚀 Phase 12: 루트 레이아웃
  const rootLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    width: containerWidth,
    height: containerHeight,
    padding: sizePreset.padding,
    gap: sizePreset.gap,
    position: 'relative' as const,
  }), [containerWidth, containerHeight, sizePreset.padding, sizePreset.gap]);

  // 🚀 Phase 12: 색상 영역 레이아웃
  const colorAreaLayout = useMemo(() => ({
    width: sizePreset.areaSize,
    height: sizePreset.areaSize,
    position: 'relative' as const,
  }), [sizePreset.areaSize]);

  // 🚀 Phase 12: 슬라이더 레이아웃
  const sliderLayout = useMemo(() => ({
    width: sizePreset.sliderWidth,
    height: sizePreset.sliderHeight,
    position: 'relative' as const,
  }), [sizePreset.sliderWidth, sizePreset.sliderHeight]);

  // 🚀 Phase 12: Swatch 행 레이아웃
  const swatchRowLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: sizePreset.gap,
  }), [sizePreset.gap]);

  return (
    <pixiContainer
      layout={rootLayout}
      eventMode="static"
      cursor="pointer"
      onPointerTap={() => onClick?.(element.id)}
    >
      {/* Container */}
      <pixiGraphics
        draw={drawContainer}
        layout={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />

      {/* Color area */}
      <pixiContainer layout={colorAreaLayout}>
        <pixiGraphics draw={drawColorArea} />
        {/* Thumb - 동적 위치 (value 기반) */}
        <pixiGraphics
          draw={drawAreaThumb}
          x={saturation * sizePreset.areaSize}
          y={(1 - brightness) * sizePreset.areaSize}
        />
      </pixiContainer>

      {/* Hue slider */}
      <pixiContainer layout={sliderLayout}>
        <pixiGraphics draw={drawHueSlider} />
        {/* Thumb - 동적 위치 (hue 기반) */}
        <pixiGraphics
          draw={(g) => drawSliderThumb(g, hsbToHex(hue, 1, 1))}
          x={(hue / 360) * sizePreset.sliderWidth}
        />
      </pixiContainer>

      {/* Alpha slider */}
      <pixiContainer layout={sliderLayout}>
        <pixiGraphics draw={drawAlphaSlider} />
        {/* Thumb - 동적 위치 (alpha 기반) */}
        <pixiGraphics
          draw={(g) => drawSliderThumb(g, currentColor)}
          x={alpha * sizePreset.sliderWidth}
        />
      </pixiContainer>

      {/* Color swatch and hex value */}
      <pixiContainer layout={swatchRowLayout}>
        <pixiGraphics draw={drawSwatch} />
        <pixiText
          text={`#${currentColor.toString(16).padStart(6, '0').toUpperCase()}`}
          style={labelStyle}
          layout={{ isLeaf: true }}
        />
      </pixiContainer>
    </pixiContainer>
  );
}

/**
 * Convert HSB to hex color
 */
function hsbToHex(h: number, s: number, b: number): number {
  const hNorm = (h % 360) / 360;
  const c = b * s;
  const x = c * (1 - Math.abs(((hNorm * 6) % 2) - 1));
  const m = b - c;

  let r = 0, g = 0, blue = 0;
  const hue = hNorm * 6;

  if (hue < 1) { r = c; g = x; blue = 0; }
  else if (hue < 2) { r = x; g = c; blue = 0; }
  else if (hue < 3) { r = 0; g = c; blue = x; }
  else if (hue < 4) { r = 0; g = x; blue = c; }
  else if (hue < 5) { r = x; g = 0; blue = c; }
  else { r = c; g = 0; blue = x; }

  const rInt = Math.floor((r + m) * 255);
  const gInt = Math.floor((g + m) * 255);
  const bInt = Math.floor((blue + m) * 255);

  return (rInt << 16) | (gInt << 8) | bInt;
}
