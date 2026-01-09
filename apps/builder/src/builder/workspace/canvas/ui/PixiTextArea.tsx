/**
 * PixiTextArea - WebGL TextArea Component
 *
 * Phase 7: Form & Utility Components
 * Pattern: Pattern A (JSX + Graphics.draw) - Multi-line text input
 *
 * CSS 동기화:
 * - getTextAreaSizePreset(): fontSize, minHeight, padding, borderRadius
 * - getTextAreaColorPreset(): backgroundColor, borderColor, textColor
 */

import { useCallback, useMemo } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import {
  getTextAreaSizePreset,
  getVariantColors,
} from '../utils/cssVariableReader';
import { useThemeColors } from '../hooks/useThemeColors';

export interface PixiTextAreaProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

/**
 * PixiTextArea - Multi-line text input with label and description
 */
export function PixiTextArea({
  element,
  isSelected = false,
  onClick,
}: PixiTextAreaProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const label = (props.label as string) || '';
  const placeholder = (props.placeholder as string) || '';
  const value = (props.value as string) || '';
  const description = (props.description as string) || '';
  const isDisabled = (props.isDisabled as boolean) || false;
  const isInvalid = (props.isInvalid as boolean) || false;
  const errorMessage = (props.errorMessage as string) || '';
  const rows = (props.rows as number) || 3;

  // 🚀 테마 색상 동적 로드
  const themeColors = useThemeColors();

  // Get presets from CSS
  const sizePreset = useMemo(() => getTextAreaSizePreset(size), [size]);

  // 🚀 variant에 따른 테마 색상
  const variantColors = useMemo(
    () => getVariantColors(variant, themeColors),
    [variant, themeColors]
  );

  // 색상 프리셋 값들 (테마 색상 적용)
  const colorPreset = useMemo(() => ({
    backgroundColor: 0xffffff,
    borderColor: 0xd1d5db,
    focusBorderColor: variantColors.bg,
    textColor: variantColors.text,
    placeholderColor: 0x9ca3af,
    labelColor: variantColors.text,
    descriptionColor: 0x6b7280,
    disabledBackgroundColor: 0xf3f4f6,
    disabledTextColor: 0x9ca3af,
    errorBorderColor: 0xef4444,
    errorTextColor: 0xef4444,
  }), [variantColors]);

  // Calculate dimensions
  const fieldWidth = (props.width as number) || 280;
  const fieldHeight = Math.max(sizePreset.minHeight, rows * sizePreset.fontSize * sizePreset.lineHeight + sizePreset.padding * 2);
  const labelHeight = label ? sizePreset.labelFontSize + sizePreset.gap : 0;

  // Draw textarea field
  const drawField = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Background
      const bgColor = isDisabled ? colorPreset.disabledBackgroundColor : colorPreset.backgroundColor;
      g.roundRect(0, 0, fieldWidth, fieldHeight, sizePreset.borderRadius);
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
        g.roundRect(-2, -2, fieldWidth + 4, fieldHeight + 4, sizePreset.borderRadius + 2);
        g.stroke({ color: colorPreset.focusBorderColor, width: 2 });
      }
    },
    [fieldWidth, fieldHeight, sizePreset, colorPreset, isSelected, isDisabled, isInvalid]
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
      wordWrap: true,
      wordWrapWidth: fieldWidth - sizePreset.paddingX * 2,
      lineHeight: sizePreset.fontSize * sizePreset.lineHeight,
    }),
    [sizePreset, colorPreset, value, isDisabled, fieldWidth]
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

  // 🚀 Phase 12: 루트 레이아웃
  const rootLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: sizePreset.gap,
  }), [sizePreset.gap]);

  // 🚀 Phase 12: 필드 레이아웃
  const fieldLayout = useMemo(() => ({
    display: 'flex' as const,
    width: fieldWidth,
    height: fieldHeight,
    paddingLeft: sizePreset.paddingX,
    paddingRight: sizePreset.paddingX,
    paddingTop: sizePreset.padding,
    paddingBottom: sizePreset.padding,
    position: 'relative' as const,
  }), [fieldWidth, fieldHeight, sizePreset.paddingX, sizePreset.padding]);

  return (
    <pixiContainer
      layout={rootLayout}
      eventMode="static"
      cursor="pointer"
      onPointerTap={() => onClick?.(element.id)}
    >
      {/* Label */}
      {label && (
        <pixiText
          text={label}
          style={labelStyle}
          layout={{ isLeaf: true }}
        />
      )}

      {/* TextArea field */}
      <pixiContainer layout={fieldLayout}>
        <pixiGraphics
          draw={drawField}
          layout={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        />
        <pixiText
          text={displayText}
          style={inputStyle}
          layout={{ isLeaf: true }}
        />
      </pixiContainer>

      {/* Description / Error message */}
      {descriptionText && (
        <pixiText
          text={descriptionText}
          style={descriptionStyle}
          layout={{ isLeaf: true }}
        />
      )}
    </pixiContainer>
  );
}
