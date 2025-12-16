/**
 * PixiTextField - WebGL Text Field Component
 *
 * Phase 7: Form & Utility Components
 * Pattern: Pattern A (JSX + Graphics.draw) - Label + Input + Description
 *
 * CSS 동기화:
 * - getTextFieldSizePreset(): fontSize, height, padding, borderRadius
 * - getTextFieldColorPreset(): backgroundColor, borderColor, textColor
 */

import { useCallback, useMemo } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
import { parseCSSSize } from '../sprites/styleConverter';
import {
  getTextFieldSizePreset,
  getTextFieldColorPreset,
} from '../utils/cssVariableReader';

export interface PixiTextFieldProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

/**
 * PixiTextField - Text input field with label and description
 */
export function PixiTextField({
  element,
  isSelected = false,
  onClick,
}: PixiTextFieldProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const style = props.style as CSSStyle | undefined;
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const label = (props.label as string) || '';
  const placeholder = (props.placeholder as string) || '';
  const value = (props.value as string) || '';
  const description = (props.description as string) || '';
  const isDisabled = (props.isDisabled as boolean) || false;
  const isInvalid = (props.isInvalid as boolean) || false;
  const errorMessage = (props.errorMessage as string) || '';

  // 위치 계산
  const posX = parseCSSSize(style?.left, undefined, 0);
  const posY = parseCSSSize(style?.top, undefined, 0);

  // Get presets from CSS
  const sizePreset = useMemo(() => getTextFieldSizePreset(size), [size]);
  const colorPreset = useMemo(() => getTextFieldColorPreset(variant), [variant]);

  // Calculate dimensions
  const fieldWidth = (props.width as number) || 240;
  const labelHeight = label ? sizePreset.labelFontSize + sizePreset.gap : 0;
  const descriptionHeight = (description || (isInvalid && errorMessage))
    ? sizePreset.descriptionFontSize + sizePreset.gap
    : 0;
  const totalHeight = labelHeight + sizePreset.height + descriptionHeight;

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

  const inputStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.fontSize,
      fill: isDisabled
        ? colorPreset.disabledTextColor
        : value
          ? colorPreset.textColor
          : colorPreset.placeholderColor,
      fontFamily: 'Inter, system-ui, sans-serif',
    }),
    [sizePreset, colorPreset, value, isDisabled]
  );

  const descriptionStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.descriptionFontSize,
      fill: isInvalid ? colorPreset.errorTextColor : colorPreset.descriptionColor,
      fontFamily: 'Inter, system-ui, sans-serif',
    }),
    [sizePreset, colorPreset, isInvalid]
  );

  // Display text
  const displayText = value || placeholder;
  const descriptionText = isInvalid && errorMessage ? errorMessage : description;

  return (
    <pixiContainer
      x={posX}
      y={posY}
      eventMode="static"
      cursor="pointer"
      onPointerDown={() => onClick?.(element.id)}
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

      {/* Input field */}
      <pixiContainer y={labelHeight}>
        <pixiGraphics draw={drawField} />
        <pixiText
          text={displayText}
          style={inputStyle}
          x={sizePreset.paddingX}
          y={(sizePreset.height - sizePreset.fontSize) / 2}
        />
      </pixiContainer>

      {/* Description / Error message */}
      {descriptionText && (
        <pixiText
          text={descriptionText}
          style={descriptionStyle}
          x={0}
          y={labelHeight + sizePreset.height + sizePreset.gap}
        />
      )}
    </pixiContainer>
  );
}
