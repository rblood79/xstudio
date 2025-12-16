/**
 * PixiGroup - WebGL Group Container Component
 *
 * Phase 8: Notification & Color Utility Components
 * Pattern: Pattern A (JSX + Graphics.draw) - Generic grouping container
 *
 * CSS 동기화:
 * - getGroupSizePreset(): padding, gap, borderRadius, labelFontSize
 * - getGroupColorPreset(): borderColor, labelTextColor
 */

import { useCallback, useMemo } from 'react';
import { Container, Graphics, Text } from '@pixi/react';
import type { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import {
  getGroupSizePreset,
  getGroupColorPreset,
} from '../utils/cssVariableReader';

export interface PixiGroupProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

/**
 * PixiGroup - Generic grouping container with dashed border
 */
export function PixiGroup({
  element,
  isSelected = false,
  onClick,
}: PixiGroupProps) {
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const label = (props.label as string) || (props['data-group-label'] as string) || '';
  const isDisabled = (props.isDisabled as boolean) || false;

  // Get presets from CSS
  const sizePreset = useMemo(() => getGroupSizePreset(size), [size]);
  const colorPreset = useMemo(() => getGroupColorPreset(variant), [variant]);

  // Calculate dimensions
  const groupWidth = (props.width as number) || 200;
  const groupHeight = (props.height as number) || 120;

  // Draw group container with dashed border
  const drawContainer = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Dashed border
      const dashLength = 6;
      const gapLength = 4;

      // Top edge
      let x = 0;
      while (x < groupWidth) {
        const endX = Math.min(x + dashLength, groupWidth);
        g.moveTo(x, 0);
        g.lineTo(endX, 0);
        x += dashLength + gapLength;
      }

      // Right edge
      let y = 0;
      while (y < groupHeight) {
        const endY = Math.min(y + dashLength, groupHeight);
        g.moveTo(groupWidth, y);
        g.lineTo(groupWidth, endY);
        y += dashLength + gapLength;
      }

      // Bottom edge
      x = groupWidth;
      while (x > 0) {
        const endX = Math.max(x - dashLength, 0);
        g.moveTo(x, groupHeight);
        g.lineTo(endX, groupHeight);
        x -= dashLength + gapLength;
      }

      // Left edge
      y = groupHeight;
      while (y > 0) {
        const endY = Math.max(y - dashLength, 0);
        g.moveTo(0, y);
        g.lineTo(0, endY);
        y -= dashLength + gapLength;
      }

      const borderColor = isSelected ? colorPreset.focusBorderColor : colorPreset.borderColor;
      g.stroke({ color: borderColor, width: 1, alpha: isDisabled ? colorPreset.disabledOpacity : 1 });

      // Selection indicator
      if (isSelected) {
        g.roundRect(-2, -2, groupWidth + 4, groupHeight + 4, sizePreset.borderRadius + 2);
        g.stroke({ color: colorPreset.focusBorderColor, width: 2 });
      }
    },
    [groupWidth, groupHeight, sizePreset, colorPreset, isSelected, isDisabled]
  );

  // Draw label badge
  const drawLabelBadge = useCallback(
    (g: PixiGraphics, labelWidth: number) => {
      g.clear();

      // Badge background
      const badgeWidth = labelWidth + sizePreset.labelPadding * 2;
      const badgeHeight = sizePreset.labelFontSize + sizePreset.labelPadding;

      g.roundRect(0, 0, badgeWidth, badgeHeight, 4);
      g.fill({ color: colorPreset.labelBackgroundColor });
      g.stroke({ color: colorPreset.borderColor, width: 0.5 });
    },
    [sizePreset, colorPreset]
  );

  // Label style
  const labelStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.labelFontSize,
      fill: colorPreset.labelTextColor,
      fontFamily: 'Inter, system-ui, sans-serif',
    }),
    [sizePreset, colorPreset]
  );

  // Estimate label width
  const estimatedLabelWidth = label.length * sizePreset.labelFontSize * 0.6;

  return (
    <Container
      eventMode="static"
      cursor="pointer"
      onpointertap={() => onClick?.(element.id)}
      alpha={isDisabled ? colorPreset.disabledOpacity : 1}
    >
      {/* Group container */}
      <Graphics draw={drawContainer} />

      {/* Label badge */}
      {label && (
        <Container x={0} y={-sizePreset.labelFontSize - sizePreset.labelPadding - 4}>
          <Graphics draw={(g) => drawLabelBadge(g, estimatedLabelWidth)} />
          <Text
            text={label}
            style={labelStyle}
            x={sizePreset.labelPadding}
            y={sizePreset.labelPadding / 2}
          />
        </Container>
      )}
    </Container>
  );
}
