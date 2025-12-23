/**
 * PixiPopover - WebGL Popover Component
 *
 * Phase 5: Overlay & Special Components
 * Pattern: Pattern A (JSX + Graphics.draw) - Builder preview representation
 *
 * NOTE: In builder mode, popovers are shown as static elements for editing.
 * Actual click/hover behavior works in iframe Preview.
 *
 * CSS 동기화:
 * - getPopoverSizePreset(): fontSize, maxWidth, borderRadius, padding
 * - getPopoverColorPreset(): backgroundColor, borderColor, textColor
 */

import { useCallback, useMemo, useState } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import {
  getPopoverSizePreset,
  getPopoverColorPreset,
} from '../utils/cssVariableReader';

export interface PixiPopoverProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

/**
 * PixiPopover - Static popover preview for builder
 */
export function PixiPopover({
  element,
  isSelected = false,
  onClick,
}: PixiPopoverProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const placement = (props.placement as string) || 'bottom';
  const title = (props.title as string) || '';
  const content = (props.content as string) || (props.children as string) || 'Popover content';

  const [isHovered, setIsHovered] = useState(false);

  // Get presets from CSS
  const sizePreset = useMemo(() => getPopoverSizePreset(size), [size]);
  const colorPreset = useMemo(() => getPopoverColorPreset(variant), [variant]);

  // Calculate dimensions
  const containerWidth = (props.width as number) || sizePreset.maxWidth;
  const titleHeight = title ? sizePreset.fontSize * 1.5 : 0;
  const contentLines = Math.ceil((content.length * sizePreset.fontSize * 0.5) / (containerWidth - sizePreset.padding * 2));
  const contentHeight = Math.max(contentLines, 1) * sizePreset.fontSize * 1.4;
  const containerHeight = sizePreset.padding * 2 + titleHeight + contentHeight;
  const arrowSize = 8;

  // Draw popover background with arrow
  const drawPopover = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Shadow effect (simple approximation)
      g.roundRect(2, 2, containerWidth, containerHeight, sizePreset.borderRadius);
      g.fill({ color: colorPreset.shadowColor });

      // Main popover body
      g.roundRect(0, 0, containerWidth, containerHeight, sizePreset.borderRadius);
      g.fill({ color: colorPreset.backgroundColor });

      // Border (if not filled variant)
      if (colorPreset.borderColor !== 0x00000000) {
        g.roundRect(0, 0, containerWidth, containerHeight, sizePreset.borderRadius);
        g.stroke({ color: colorPreset.borderColor, width: 1 });
      }

      // Draw arrow based on placement
      const arrowX = containerWidth / 2;
      switch (placement) {
        case 'top':
          // Arrow pointing down
          g.moveTo(arrowX - arrowSize, containerHeight);
          g.lineTo(arrowX, containerHeight + arrowSize);
          g.lineTo(arrowX + arrowSize, containerHeight);
          g.closePath();
          g.fill({ color: colorPreset.arrowFillColor });
          if (colorPreset.arrowStrokeColor !== 0x00000000) {
            g.moveTo(arrowX - arrowSize, containerHeight);
            g.lineTo(arrowX, containerHeight + arrowSize);
            g.lineTo(arrowX + arrowSize, containerHeight);
            g.stroke({ color: colorPreset.arrowStrokeColor, width: 1 });
          }
          break;
        case 'bottom':
          // Arrow pointing up
          g.moveTo(arrowX - arrowSize, 0);
          g.lineTo(arrowX, -arrowSize);
          g.lineTo(arrowX + arrowSize, 0);
          g.closePath();
          g.fill({ color: colorPreset.arrowFillColor });
          if (colorPreset.arrowStrokeColor !== 0x00000000) {
            g.moveTo(arrowX - arrowSize, 0);
            g.lineTo(arrowX, -arrowSize);
            g.lineTo(arrowX + arrowSize, 0);
            g.stroke({ color: colorPreset.arrowStrokeColor, width: 1 });
          }
          break;
        case 'left':
          // Arrow pointing right
          g.moveTo(containerWidth, containerHeight / 2 - arrowSize);
          g.lineTo(containerWidth + arrowSize, containerHeight / 2);
          g.lineTo(containerWidth, containerHeight / 2 + arrowSize);
          g.closePath();
          g.fill({ color: colorPreset.arrowFillColor });
          break;
        case 'right':
          // Arrow pointing left
          g.moveTo(0, containerHeight / 2 - arrowSize);
          g.lineTo(-arrowSize, containerHeight / 2);
          g.lineTo(0, containerHeight / 2 + arrowSize);
          g.closePath();
          g.fill({ color: colorPreset.arrowFillColor });
          break;
      }

      // Selection indicator
      if (isSelected) {
        g.roundRect(-2, -2, containerWidth + 4, containerHeight + 4, sizePreset.borderRadius + 2);
        g.stroke({ color: 0x3b82f6, width: 2 });
      }

      // Hover effect
      if (isHovered && !isSelected) {
        g.roundRect(-1, -1, containerWidth + 2, containerHeight + 2, sizePreset.borderRadius + 1);
        g.stroke({ color: 0x9ca3af, width: 1 });
      }
    },
    [containerWidth, containerHeight, sizePreset, colorPreset, placement, isSelected, isHovered]
  );

  // Title style
  const titleStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.fontSize,
      fontWeight: 'bold',
      fill: colorPreset.textColor,
      fontFamily: 'Inter, system-ui, sans-serif',
    }),
    [sizePreset, colorPreset]
  );

  // Content style
  const contentStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.fontSize * 0.9,
      fill: colorPreset.textColor,
      fontFamily: 'Inter, system-ui, sans-serif',
      wordWrap: true,
      wordWrapWidth: containerWidth - sizePreset.padding * 2,
    }),
    [sizePreset, colorPreset, containerWidth]
  );

  return (
    <pixiContainer
      eventMode="static"
      cursor="pointer"
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onPointerTap={() => onClick?.(element.id)}
    >
      {/* Popover background with arrow */}
      <pixiGraphics draw={drawPopover} />

      {/* Title (optional) */}
      {title && (
        <pixiText
          text={title}
          style={titleStyle}
          x={sizePreset.padding}
          y={sizePreset.padding}
        />
      )}

      {/* Content */}
      <pixiText
        text={content}
        style={contentStyle}
        x={sizePreset.padding}
        y={sizePreset.padding + titleHeight}
      />
    </pixiContainer>
  );
}
