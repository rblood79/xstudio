/**
 * PixiDropZone - WebGL Drop Zone Component
 *
 * Phase 7: Form & Utility Components
 * Pattern: Pattern A (JSX + Graphics.draw) - Drag & drop area with dashed border
 *
 * CSS 동기화:
 * - getDropZoneSizePreset(): minHeight, padding, borderRadius, borderWidth
 * - getDropZoneColorPreset(): backgroundColor, borderColor, textColor
 */

import { useCallback, useMemo } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import {
  getDropZoneSizePreset,
  getVariantColors,
} from '../utils/cssVariableReader';
import { useThemeColors } from '../hooks/useThemeColors';

export interface PixiDropZoneProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

/**
 * PixiDropZone - Drag and drop file area
 */
export function PixiDropZone({
  element,
  isSelected = false,
  onClick,
}: PixiDropZoneProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const label = (props.label as string) || 'Drop files here';
  const description = (props.description as string) || 'or click to browse';

  // Get presets from CSS
  const sizePreset = useMemo(() => getDropZoneSizePreset(size), [size]);

  // 🚀 테마 색상 동적 로드
  const themeColors = useThemeColors();

  // 🚀 variant에 따른 테마 색상
  const variantColors = useMemo(
    () => getVariantColors(variant, themeColors),
    [variant, themeColors]
  );

  // 색상 프리셋 값들 (테마 색상 적용)
  const colorPreset = useMemo(() => ({
    backgroundColor: 0xf9fafb,
    borderColor: 0xd1d5db,
    iconColor: variantColors.bg,
    labelColor: variantColors.text,
    textColor: 0x6b7280,
    focusRingColor: variantColors.bg,
  }), [variantColors]);

  // Calculate dimensions
  const zoneWidth = (props.width as number) || 280;
  const zoneHeight = (props.height as number) || sizePreset.minHeight;

  // Draw drop zone container
  const drawContainer = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Background
      g.roundRect(0, 0, zoneWidth, zoneHeight, sizePreset.borderRadius);
      g.fill({ color: colorPreset.backgroundColor });

      // Dashed border
      const dashLength = 8;
      const gapLength = 4;
      const borderRadius = sizePreset.borderRadius;

      // Draw dashed border manually
      drawDashedRoundRect(g, 0, 0, zoneWidth, zoneHeight, borderRadius, dashLength, gapLength, colorPreset.borderColor, sizePreset.borderWidth);

      // Selection indicator
      if (isSelected) {
        g.roundRect(-2, -2, zoneWidth + 4, zoneHeight + 4, sizePreset.borderRadius + 2);
        g.stroke({ color: colorPreset.focusRingColor, width: 2 });
      }
    },
    [zoneWidth, zoneHeight, sizePreset, colorPreset, isSelected]
  );

  // Draw upload icon
  const drawIcon = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      const iconSize = sizePreset.iconSize;
      const centerX = iconSize / 2;
      const centerY = iconSize / 2;

      // Cloud shape
      const cloudWidth = iconSize * 0.8;
      const cloudHeight = iconSize * 0.5;

      // Main cloud body
      g.circle(centerX - cloudWidth * 0.15, centerY, cloudHeight * 0.4);
      g.circle(centerX + cloudWidth * 0.15, centerY, cloudHeight * 0.35);
      g.circle(centerX, centerY - cloudHeight * 0.15, cloudHeight * 0.45);
      g.fill({ color: colorPreset.iconColor });

      // Cloud bottom
      g.roundRect(centerX - cloudWidth * 0.35, centerY, cloudWidth * 0.7, cloudHeight * 0.3, 2);
      g.fill({ color: colorPreset.iconColor });

      // Arrow up
      const arrowSize = iconSize * 0.25;
      g.moveTo(centerX, centerY + cloudHeight * 0.3);
      g.lineTo(centerX - arrowSize, centerY + cloudHeight * 0.5 + arrowSize);
      g.lineTo(centerX + arrowSize, centerY + cloudHeight * 0.5 + arrowSize);
      g.closePath();
      g.fill({ color: colorPreset.iconColor });
    },
    [sizePreset, colorPreset]
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

  const descriptionStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.fontSize,
      fill: colorPreset.textColor,
      fontFamily: 'Inter, system-ui, sans-serif',
    }),
    [sizePreset, colorPreset]
  );

  // Calculate positions
  const contentY = (zoneHeight - sizePreset.iconSize - sizePreset.gap * 2 - sizePreset.labelFontSize - sizePreset.fontSize) / 2;

  return (
    <pixiContainer
      eventMode="static"
      cursor="pointer"
      onPointerTap={() => onClick?.(element.id)}
    >
      {/* Drop zone container */}
      <pixiGraphics draw={drawContainer} />

      {/* Upload icon */}
      <pixiGraphics
        draw={drawIcon}
        x={(zoneWidth - sizePreset.iconSize) / 2}
        y={contentY}
      />

      {/* Label */}
      <pixiText
        text={label}
        style={labelStyle}
        x={zoneWidth / 2}
        y={contentY + sizePreset.iconSize + sizePreset.gap}
        anchor={{ x: 0.5, y: 0 }}
      />

      {/* Description */}
      <pixiText
        text={description}
        style={descriptionStyle}
        x={zoneWidth / 2}
        y={contentY + sizePreset.iconSize + sizePreset.gap + sizePreset.labelFontSize + sizePreset.gap / 2}
        anchor={{ x: 0.5, y: 0 }}
      />
    </pixiContainer>
  );
}

/**
 * Helper function to draw dashed rounded rectangle
 */
function drawDashedRoundRect(
  g: PixiGraphics,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  dashLength: number,
  gapLength: number,
  color: number,
  lineWidth: number
) {
  const totalDash = dashLength + gapLength;

  // Top edge
  let currentX = x + radius;
  const topY = y;
  while (currentX < x + width - radius) {
    const endX = Math.min(currentX + dashLength, x + width - radius);
    g.moveTo(currentX, topY);
    g.lineTo(endX, topY);
    currentX += totalDash;
  }

  // Right edge
  let currentY = y + radius;
  const rightX = x + width;
  while (currentY < y + height - radius) {
    const endY = Math.min(currentY + dashLength, y + height - radius);
    g.moveTo(rightX, currentY);
    g.lineTo(rightX, endY);
    currentY += totalDash;
  }

  // Bottom edge
  currentX = x + width - radius;
  const bottomY = y + height;
  while (currentX > x + radius) {
    const endX = Math.max(currentX - dashLength, x + radius);
    g.moveTo(currentX, bottomY);
    g.lineTo(endX, bottomY);
    currentX -= totalDash;
  }

  // Left edge
  currentY = y + height - radius;
  const leftX = x;
  while (currentY > y + radius) {
    const endY = Math.max(currentY - dashLength, y + radius);
    g.moveTo(leftX, currentY);
    g.lineTo(leftX, endY);
    currentY -= totalDash;
  }

  // Corners (as arcs)
  g.arc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5);
  g.arc(x + width - radius, y + radius, radius, Math.PI * 1.5, 0);
  g.arc(x + width - radius, y + height - radius, radius, 0, Math.PI * 0.5);
  g.arc(x + radius, y + height - radius, radius, Math.PI * 0.5, Math.PI);

  g.stroke({ color, width: lineWidth });
}
