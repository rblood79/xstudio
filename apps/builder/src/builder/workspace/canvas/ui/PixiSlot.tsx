/**
 * PixiSlot - WebGL Slot Container Component
 *
 * Phase 8: Notification & Color Utility Components
 * Pattern: Pattern A (JSX + Graphics.draw) - Layout slot placeholder
 *
 * CSS 동기화:
 * - getSlotSizePreset(): minHeight, padding, borderWidth, iconSize
 * - getSlotColorPreset(): backgroundColor, borderColor, iconColor
 */

import { useCallback, useMemo } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '@/types/core/store.types';

// 🚀 Spec Migration
import {
  SlotSpec,
  getVariantColors as getSpecVariantColors,
  getSizePreset as getSpecSizePreset,
} from '@xstudio/specs';

export interface PixiSlotProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

/**
 * PixiSlot - Layout slot placeholder for content insertion
 */
export function PixiSlot({
  element,
  isSelected = false,
  onClick,
}: PixiSlotProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const name = (props.name as string) || 'Content';
  const description = (props.description as string) || 'Drop content here';
  const isRequired = (props.isRequired as boolean) || (props.required as boolean) || false;
  const isEmpty = (props.isEmpty as boolean) ?? true;

  // Get presets from CSS (Spec Migration)
  const sizePreset = useMemo(() => {
    const sizeSpec = SlotSpec.sizes[size] || SlotSpec.sizes[SlotSpec.defaultSize];
    return getSpecSizePreset(sizeSpec, 'light');
  }, [size]);

  // 🚀 variant에 따른 테마 색상 (Spec Migration)
  const variantColors = useMemo(() => {
    const variantSpec = SlotSpec.variants[variant] || SlotSpec.variants[SlotSpec.defaultVariant];
    return getSpecVariantColors(variantSpec, 'light');
  }, [variant]);

  // 색상 프리셋 값들 (테마 색상 적용)
  const colorPreset = useMemo(() => ({
    backgroundColor: 0xf9fafb,
    borderColor: 0xd1d5db,
    emptyBorderColor: 0x9ca3af,
    textColor: variantColors.text,
    iconColor: variantColors.bg,
    iconBackgroundColor: 0xf3f4f6,
    selectedBorderColor: variantColors.bg,
    requiredBorderColor: 0xef4444,
    requiredBadgeBackgroundColor: 0xfef2f2,
    requiredBadgeTextColor: 0xef4444,
  }), [variantColors]);

  // Calculate dimensions
  const slotWidth = (props.width as number) || 280;
  const slotHeight = (props.height as number) || sizePreset.minHeight;

  // Draw slot container with dashed border
  const drawContainer = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Background with diagonal pattern (when empty)
      if (isEmpty) {
        const bgColor = isRequired ? colorPreset.requiredBorderColor : colorPreset.backgroundColor;
        g.roundRect(0, 0, slotWidth, slotHeight, sizePreset.borderRadius);
        g.fill({ color: bgColor, alpha: 0.05 });

        // Diagonal stripes pattern
        const stripeSpacing = 8;
        for (let i = -slotHeight; i < slotWidth + slotHeight; i += stripeSpacing) {
          g.moveTo(i, 0);
          g.lineTo(i + slotHeight, slotHeight);
        }
        g.stroke({ color: colorPreset.borderColor, width: 0.5, alpha: 0.2 });
      }

      // Dashed border
      const borderColor = isEmpty
        ? isRequired
          ? colorPreset.requiredBorderColor
          : colorPreset.emptyBorderColor
        : colorPreset.borderColor;

      drawDashedRect(g, 0, 0, slotWidth, slotHeight, sizePreset.borderRadius, borderColor, sizePreset.borderWidth);

      // Selection indicator
      if (isSelected) {
        g.roundRect(-2, -2, slotWidth + 4, slotHeight + 4, sizePreset.borderRadius + 2);
        g.stroke({ color: colorPreset.selectedBorderColor, width: 2 });
      }
    },
    [slotWidth, slotHeight, sizePreset, colorPreset, isEmpty, isRequired, isSelected]
  );

  // Draw slot icon
  const drawIcon = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      const iconSize = sizePreset.iconSize;
      const centerX = iconSize / 2;
      const centerY = iconSize / 2;
      const radius = iconSize * 0.4;

      // Circle background
      g.circle(centerX, centerY, radius);
      g.fill({ color: colorPreset.iconBackgroundColor });

      // Plus sign
      const plusSize = radius * 0.5;
      g.rect(centerX - plusSize, centerY - 1, plusSize * 2, 2);
      g.rect(centerX - 1, centerY - plusSize, 2, plusSize * 2);
      g.fill({ color: colorPreset.iconColor });
    },
    [sizePreset, colorPreset]
  );

  // Draw required badge
  const drawRequiredBadge = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (!isRequired) return;

      const badgeWidth = 60;
      const badgeHeight = 18;

      g.roundRect(0, 0, badgeWidth, badgeHeight, 4);
      g.fill({ color: colorPreset.requiredBadgeBackgroundColor });
    },
    [colorPreset, isRequired]
  );

  // Text styles
  const nameStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.labelFontSize,
      fill: colorPreset.textColor,
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: '600',
    }),
    [sizePreset, colorPreset]
  );

  const descriptionStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.descriptionFontSize,
      fill: colorPreset.textColor,
      fontFamily: 'Inter, system-ui, sans-serif',
      alpha: 0.7,
    }),
    [sizePreset, colorPreset]
  );

  const requiredStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.descriptionFontSize,
      fill: colorPreset.requiredBadgeTextColor,
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: '500',
    }),
    [sizePreset, colorPreset]
  );

  return (
    <pixiContainer
      eventMode="static"
      cursor="default"
      onPointerTap={() => onClick?.(element.id)}
    >
      {/* Slot container */}
      <pixiGraphics draw={drawContainer} />

      {/* Empty state content */}
      {isEmpty && (
        <pixiContainer>
          {/* Icon */}
          <pixiGraphics draw={drawIcon} />

          {/* Name with optional required badge */}
          <pixiContainer>
            <pixiText
              text={name}
              style={nameStyle}
            />
            {isRequired && (
              <pixiContainer>
                <pixiGraphics draw={drawRequiredBadge} />
                <pixiText
                  text="Required"
                  style={requiredStyle}
                />
              </pixiContainer>
            )}
          </pixiContainer>

          {/* Description */}
          <pixiText
            text={description}
            style={descriptionStyle}
          />
        </pixiContainer>
      )}
    </pixiContainer>
  );
}

/**
 * Helper function to draw dashed rounded rectangle
 */
function drawDashedRect(
  g: PixiGraphics,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: number,
  lineWidth: number
) {
  const dashLength = 6;
  const gapLength = 4;

  // Top edge
  let posX = x + radius;
  while (posX < x + width - radius) {
    const endX = Math.min(posX + dashLength, x + width - radius);
    g.moveTo(posX, y);
    g.lineTo(endX, y);
    posX += dashLength + gapLength;
  }

  // Right edge
  let posY = y + radius;
  while (posY < y + height - radius) {
    const endY = Math.min(posY + dashLength, y + height - radius);
    g.moveTo(x + width, posY);
    g.lineTo(x + width, endY);
    posY += dashLength + gapLength;
  }

  // Bottom edge
  posX = x + width - radius;
  while (posX > x + radius) {
    const endX = Math.max(posX - dashLength, x + radius);
    g.moveTo(posX, y + height);
    g.lineTo(endX, y + height);
    posX -= dashLength + gapLength;
  }

  // Left edge
  posY = y + height - radius;
  while (posY > y + radius) {
    const endY = Math.max(posY - dashLength, y + radius);
    g.moveTo(x, posY);
    g.lineTo(x, endY);
    posY -= dashLength + gapLength;
  }

  // Corner arcs
  g.arc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5);
  g.arc(x + width - radius, y + radius, radius, Math.PI * 1.5, 0);
  g.arc(x + width - radius, y + height - radius, radius, 0, Math.PI * 0.5);
  g.arc(x + radius, y + height - radius, radius, Math.PI * 0.5, Math.PI);

  g.stroke({ color, width: lineWidth });
}
