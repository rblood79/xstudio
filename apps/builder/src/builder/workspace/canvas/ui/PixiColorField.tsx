/**
 * PixiColorField - WebGL Color Field Component
 *
 * Phase 8: Notification & Color Utility Components
 * Pattern: Pattern A (JSX + Graphics.draw) - Color input field with hex value
 *
 * CSS 동기화:
 * - getColorFieldSizePreset(): fontSize, height, padding, borderRadius
 * - getColorFieldColorPreset(): backgroundColor, borderColor, textColor
 */

import { useCallback, useMemo } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import {
  ColorFieldSpec,
  getVariantColors as getSpecVariantColors,
  getSizePreset as getSpecSizePreset,
} from '@xstudio/specs';

export interface PixiColorFieldProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

/**
 * PixiColorField - Color input field with swatch and hex value
 */
export function PixiColorField({
  element,
  isSelected = false,
  onClick,
}: PixiColorFieldProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const label = (props.label as string) || '';
  const value = (props.value as string) || '#3b82f6';
  const isDisabled = (props.isDisabled as boolean) || false;
  const isInvalid = (props.isInvalid as boolean) || false;

  const sizePreset = useMemo(() => {
    const sizeSpec = ColorFieldSpec.sizes[size] || ColorFieldSpec.sizes[ColorFieldSpec.defaultSize];
    return getSpecSizePreset(sizeSpec, 'light');
  }, [size]);

  const variantColors = useMemo(() => {
    const variantSpec = ColorFieldSpec.variants[variant] || ColorFieldSpec.variants[ColorFieldSpec.defaultVariant];
    return getSpecVariantColors(variantSpec, 'light');
  }, [variant]);

  // 색상 프리셋 값들 (테마 색상 적용)
  const colorPreset = useMemo(() => ({
    backgroundColor: 0xffffff,
    borderColor: 0xd1d5db,
    focusBorderColor: variantColors.bg,
    errorBorderColor: 0xef4444,
    textColor: variantColors.text,
    labelColor: variantColors.text,
    disabledBackgroundColor: 0xf3f4f6,
  }), [variantColors]);

  // Parse color value
  const colorValue = useMemo(() => {
    const hex = value.replace('#', '');
    return parseInt(hex, 16) || 0x3b82f6;
  }, [value]);

  // Calculate dimensions
  const swatchSize = sizePreset.height - sizePreset.padding * 2;
  const fieldWidth = sizePreset.maxWidth;

  // Draw input field
  const drawField = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Background
      const bgColor = isDisabled ? colorPreset.disabledBackgroundColor : colorPreset.backgroundColor;
      g.roundRect(0, 0, fieldWidth, sizePreset.height, sizePreset.borderRadius);
      g.fill({ color: bgColor });

      // Border
      const borderColor = isInvalid
        ? colorPreset.errorBorderColor
        : isSelected
          ? colorPreset.focusBorderColor
          : colorPreset.borderColor;
      g.stroke({ color: borderColor, width: 1 });

      // Selection indicator
      if (isSelected) {
        g.roundRect(-2, -2, fieldWidth + 4, sizePreset.height + 4, sizePreset.borderRadius + 2);
        g.stroke({ color: colorPreset.focusBorderColor, width: 2 });
      }
    },
    [fieldWidth, sizePreset, colorPreset, isSelected, isDisabled, isInvalid]
  );

  // Draw color swatch
  const drawSwatch = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Swatch background (checkerboard for transparency indication)
      g.roundRect(0, 0, swatchSize, swatchSize, 4);
      g.fill({ color: 0xe5e7eb });

      // Actual color
      g.roundRect(0, 0, swatchSize, swatchSize, 4);
      g.fill({ color: colorValue });

      // Border
      g.stroke({ color: 0xcad3dc, width: 0.5 });
    },
    [swatchSize, colorValue]
  );

  // Text styles
  const labelStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.labelFontSize,
      fill: colorPreset.labelColor,
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: '500',
    }),
    [sizePreset, colorPreset]
  );

  const valueStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.fontSize,
      fill: isDisabled ? colorPreset.disabledBackgroundColor : colorPreset.textColor,
      fontFamily: 'monospace',
    }),
    [sizePreset, colorPreset, isDisabled]
  );

  return (
    <pixiContainer
      eventMode="static"
      cursor="default"
      onPointerTap={() => !isDisabled && onClick?.(element.id)}
    >
      {/* Label */}
      {label && (
        <pixiText
          text={label}
          style={labelStyle}
        />
      )}

      {/* Field container */}
      <pixiContainer>
        <pixiGraphics
          draw={drawField}
          x={0}
          y={0}
        />

        {/* Color swatch */}
        <pixiGraphics draw={drawSwatch} />

        {/* Hex value */}
        <pixiText
          text={value.toUpperCase()}
          style={valueStyle}
        />
      </pixiContainer>
    </pixiContainer>
  );
}
