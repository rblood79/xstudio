/**
 * PixiFileTrigger - WebGL File Trigger Button Component
 *
 * Phase 7: Form & Utility Components
 * Pattern: Pattern A (JSX + Graphics.draw) - Button with file upload icon
 *
 * CSS 동기화:
 * - getFileTriggerSizePreset(): fontSize, height, padding, borderRadius
 * - getFileTriggerColorPreset(): backgroundColor, borderColor, textColor
 */

import { useCallback, useMemo } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import {
  getFileTriggerSizePreset,
  getFileTriggerColorPreset,
  getVariantColors,
} from '../utils/cssVariableReader';
import { useThemeColors } from '../hooks/useThemeColors';

export interface PixiFileTriggerProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

/**
 * PixiFileTrigger - File upload button
 */
export function PixiFileTrigger({
  element,
  isSelected = false,
  onClick,
}: PixiFileTriggerProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const label = (props.label as string) || (props.children as string) || 'Choose file';

  // Get presets from CSS
  const sizePreset = useMemo(() => getFileTriggerSizePreset(size), [size]);
  const colorPreset = useMemo(() => getFileTriggerColorPreset(variant), [variant]);

  // 🚀 테마 색상 동적 로드
  const themeColors = useThemeColors();

  // 🚀 variant에 따른 테마 색상
  const variantColors = useMemo(
    () => getVariantColors(variant, themeColors),
    [variant, themeColors]
  );

  // Calculate dimensions
  const buttonWidth = (props.width as number) || 140;

  // Draw button
  const drawButton = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Background
      g.roundRect(0, 0, buttonWidth, sizePreset.height, sizePreset.borderRadius);
      g.fill({ color: colorPreset.backgroundColor });
      g.stroke({ color: colorPreset.borderColor, width: 1 });

      // Selection indicator
      if (isSelected) {
        g.roundRect(-2, -2, buttonWidth + 4, sizePreset.height + 4, sizePreset.borderRadius + 2);
        g.stroke({ color: variantColors.bg, width: 2 });
      }
    },
    [buttonWidth, sizePreset, colorPreset, isSelected, variantColors.bg]
  );

  // Draw upload icon
  const drawIcon = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      const iconSize = sizePreset.iconSize;
      const centerX = iconSize / 2;
      const centerY = iconSize / 2;

      // Draw arrow up
      const arrowWidth = iconSize * 0.5;
      const arrowHeight = iconSize * 0.4;

      // Arrow head
      g.moveTo(centerX, centerY - arrowHeight / 2);
      g.lineTo(centerX - arrowWidth / 2, centerY);
      g.lineTo(centerX + arrowWidth / 2, centerY);
      g.closePath();
      g.fill({ color: colorPreset.iconColor });

      // Arrow stem
      g.rect(centerX - arrowWidth / 6, centerY - arrowHeight / 4, arrowWidth / 3, arrowHeight * 0.6);
      g.fill({ color: colorPreset.iconColor });

      // Base line
      g.rect(centerX - arrowWidth / 2, centerY + arrowHeight / 3, arrowWidth, 2);
      g.fill({ color: colorPreset.iconColor });
    },
    [sizePreset, colorPreset]
  );

  // Text style
  const textStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.fontSize,
      fill: colorPreset.textColor,
      fontFamily: 'Inter, system-ui, sans-serif',
    }),
    [sizePreset, colorPreset]
  );

  // Calculate positions
  const iconX = sizePreset.paddingX;
  const iconY = (sizePreset.height - sizePreset.iconSize) / 2;
  const textX = iconX + sizePreset.iconSize + sizePreset.gap;
  const textY = (sizePreset.height - sizePreset.fontSize) / 2;

  return (
    <pixiContainer
      eventMode="static"
      cursor="pointer"
      onPointerTap={() => onClick?.(element.id)}
    >
      {/* Button background */}
      <pixiGraphics draw={drawButton} />

      {/* Upload icon */}
      <pixiGraphics draw={drawIcon} x={iconX} y={iconY} />

      {/* Label */}
      <pixiText
        text={label}
        style={textStyle}
        x={textX}
        y={textY}
      />
    </pixiContainer>
  );
}
