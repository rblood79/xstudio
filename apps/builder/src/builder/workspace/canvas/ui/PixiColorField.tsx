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
  getColorFieldSizePreset,
  getColorFieldColorPreset,
} from '../utils/cssVariableReader';

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

  // Get presets from CSS
  const sizePreset = useMemo(() => getColorFieldSizePreset(size), [size]);
  const colorPreset = useMemo(() => getColorFieldColorPreset(variant), [variant]);

  // Parse color value
  const colorValue = useMemo(() => {
    const hex = value.replace('#', '');
    return parseInt(hex, 16) || 0x3b82f6;
  }, [value]);

  // Calculate dimensions
  const swatchSize = sizePreset.height - sizePreset.padding * 2;
  const fieldWidth = sizePreset.maxWidth;
  const labelHeight = label ? sizePreset.labelFontSize + sizePreset.gap : 0;

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

  // Positions
  const swatchX = sizePreset.padding;
  const swatchY = (sizePreset.height - swatchSize) / 2;
  const textX = swatchX + swatchSize + sizePreset.gap;
  const textY = (sizePreset.height - sizePreset.fontSize) / 2;

  return (
    <pixiContainer
      eventMode="static"
      cursor={isDisabled ? 'not-allowed' : 'pointer'}
      onPointerTap={() => !isDisabled && onClick?.(element.id)}
    >
      {/* Label */}
      {label && (
        <pixiText
          text={label}
          style={labelStyle}
          x={0}
          y={0}
        />
      )}

      {/* Field container */}
      <pixiContainer y={labelHeight}>
        <pixiGraphics draw={drawField} />

        {/* Color swatch */}
        <pixiGraphics draw={drawSwatch} x={swatchX} y={swatchY} />

        {/* Hex value */}
        <pixiText
          text={value.toUpperCase()}
          style={valueStyle}
          x={textX}
          y={textY}
        />
      </pixiContainer>
    </pixiContainer>
  );
}
