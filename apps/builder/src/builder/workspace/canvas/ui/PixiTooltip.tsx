/**
 * PixiTooltip - WebGL Tooltip Component
 *
 * Phase 5: Overlay & Special Components
 * Pattern: Pattern A (JSX + Graphics.draw) - Builder preview representation
 *
 * NOTE: In builder mode, tooltips are shown as static elements for editing.
 * Actual hover behavior works in iframe Preview.
 *
 * CSS 동기화:
 * - getTooltipSizePreset(): fontSize, paddingX, paddingY, maxWidth
 * - getTooltipColorPreset(): backgroundColor, textColor, arrowColor
 */

import { useCallback, useMemo } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import {
  getTooltipSizePreset,
  getTooltipColorPreset,
} from '../utils/cssVariableReader';

export interface PixiTooltipProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

/**
 * PixiTooltip - Static tooltip preview for builder
 */
export function PixiTooltip({
  element,
  isSelected = false,
  onClick,
}: PixiTooltipProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const placement = (props.placement as string) || 'top';
  const content = (props.content as string) || (props.children as string) || 'Tooltip';

  // Get presets from CSS
  const sizePreset = useMemo(() => getTooltipSizePreset(size), [size]);
  const colorPreset = useMemo(() => getTooltipColorPreset(variant), [variant]);

  // Calculate dimensions based on content
  const textWidth = Math.min(content.length * sizePreset.fontSize * 0.6, sizePreset.maxWidth - sizePreset.paddingX * 2);
  const containerWidth = textWidth + sizePreset.paddingX * 2;
  const containerHeight = sizePreset.fontSize + sizePreset.paddingY * 2;
  const arrowSize = 6;

  // Draw tooltip background with arrow
  const drawTooltip = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Main tooltip body
      g.roundRect(0, 0, containerWidth, containerHeight, sizePreset.borderRadius);
      g.fill({ color: colorPreset.backgroundColor });

      // Draw arrow based on placement
      const arrowX = containerWidth / 2;
      switch (placement) {
        case 'top':
          // Arrow pointing down (tooltip above trigger)
          g.moveTo(arrowX - arrowSize, containerHeight);
          g.lineTo(arrowX, containerHeight + arrowSize);
          g.lineTo(arrowX + arrowSize, containerHeight);
          g.closePath();
          g.fill({ color: colorPreset.arrowColor });
          break;
        case 'bottom':
          // Arrow pointing up (tooltip below trigger)
          g.moveTo(arrowX - arrowSize, 0);
          g.lineTo(arrowX, -arrowSize);
          g.lineTo(arrowX + arrowSize, 0);
          g.closePath();
          g.fill({ color: colorPreset.arrowColor });
          break;
        case 'left':
          // Arrow pointing right (tooltip left of trigger)
          g.moveTo(containerWidth, containerHeight / 2 - arrowSize);
          g.lineTo(containerWidth + arrowSize, containerHeight / 2);
          g.lineTo(containerWidth, containerHeight / 2 + arrowSize);
          g.closePath();
          g.fill({ color: colorPreset.arrowColor });
          break;
        case 'right':
          // Arrow pointing left (tooltip right of trigger)
          g.moveTo(0, containerHeight / 2 - arrowSize);
          g.lineTo(-arrowSize, containerHeight / 2);
          g.lineTo(0, containerHeight / 2 + arrowSize);
          g.closePath();
          g.fill({ color: colorPreset.arrowColor });
          break;
      }

      // Selection indicator
      if (isSelected) {
        g.roundRect(-2, -2, containerWidth + 4, containerHeight + 4, sizePreset.borderRadius + 2);
        g.stroke({ color: 0x3b82f6, width: 2 });
      }
    },
    [containerWidth, containerHeight, sizePreset, colorPreset, placement, isSelected, arrowSize]
  );

  // Text style
  const textStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.fontSize,
      fill: colorPreset.textColor,
      fontFamily: 'Inter, system-ui, sans-serif',
      wordWrap: true,
      wordWrapWidth: sizePreset.maxWidth - sizePreset.paddingX * 2,
    }),
    [sizePreset, colorPreset]
  );

  return (
    <pixiContainer
      eventMode="static"
      cursor="pointer"
      onPointerTap={() => onClick?.(element.id)}
    >
      {/* Tooltip background with arrow */}
      <pixiGraphics draw={drawTooltip} />

      {/* Tooltip text */}
      <pixiText
        text={content}
        style={textStyle}
        x={sizePreset.paddingX}
        y={sizePreset.paddingY}
      />
    </pixiContainer>
  );
}
