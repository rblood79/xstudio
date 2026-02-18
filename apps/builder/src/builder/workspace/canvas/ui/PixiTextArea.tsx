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

// 🚀 Spec Migration
import { resolveTokenColor } from '../hooks/useSpecRenderer';
import {
  TextAreaSpec,
  getVariantColors as getSpecVariantColors,
  getSizePreset as getSpecSizePreset,
} from '@xstudio/specs';
import type { TokenRef } from '@xstudio/specs';

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

  // Get presets from CSS / Spec
  const sizePreset = useMemo(() => {
    const sizeSpec = TextAreaSpec.sizes[size] || TextAreaSpec.sizes[TextAreaSpec.defaultSize];
    const specPreset = getSpecSizePreset(sizeSpec, 'light');
    return {
      ...specPreset,
      minHeight: specPreset.height,
      padding: specPreset.paddingY,
      paddingX: specPreset.paddingX,
      lineHeight: 1.5,
      gap: specPreset.gap ?? 6,
      labelFontSize: specPreset.fontSize - 2,
      descriptionFontSize: specPreset.fontSize - 2,
    };
  }, [size]);

  // 🚀 variant에 따른 테마 색상
  const variantColors = useMemo(() => {
    const variantSpec = TextAreaSpec.variants[variant] || TextAreaSpec.variants[TextAreaSpec.defaultVariant];
    return getSpecVariantColors(variantSpec, 'light');
  }, [variant]);

  // 색상 프리셋 값들 (테마 색상 적용)
  const colorPreset = useMemo(() => {
    return {
      backgroundColor: variantColors.bg,
      borderColor: variantColors.border ?? 0x79747e,
      focusBorderColor: resolveTokenColor('{color.primary}' as TokenRef, 'light'),
      textColor: variantColors.text,
      placeholderColor: resolveTokenColor('{color.on-surface-variant}' as TokenRef, 'light'),
      labelColor: variantColors.text,
      descriptionColor: resolveTokenColor('{color.on-surface-variant}' as TokenRef, 'light'),
      disabledBackgroundColor: resolveTokenColor('{color.surface-container}' as TokenRef, 'light'),
      disabledTextColor: resolveTokenColor('{color.on-surface-variant}' as TokenRef, 'light'),
      errorBorderColor: resolveTokenColor('{color.error}' as TokenRef, 'light'),
      errorTextColor: resolveTokenColor('{color.error}' as TokenRef, 'light'),
    };
  }, [variantColors]);

  // Calculate dimensions
  const fieldWidth = (props.width as number) || 280;
  const fieldHeight = Math.max(sizePreset.minHeight, rows * sizePreset.fontSize * sizePreset.lineHeight + sizePreset.padding * 2);

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

  return (
    <pixiContainer
      eventMode="static"
      cursor="default"
      onPointerTap={() => onClick?.(element.id)}
    >
      {/* Label */}
      {label && (
        <pixiText
          text={label}
          style={labelStyle}
        />
      )}

      {/* TextArea field */}
      <pixiContainer>
        <pixiGraphics
          draw={drawField}
          x={0}
          y={0}
        />
        <pixiText
          text={displayText}
          style={inputStyle}
        />
      </pixiContainer>

      {/* Description / Error message */}
      {descriptionText && (
        <pixiText
          text={descriptionText}
          style={descriptionStyle}
        />
      )}
    </pixiContainer>
  );
}
