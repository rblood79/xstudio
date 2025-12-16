/**
 * PixiDisclosure - WebGL Disclosure Component
 *
 * Phase 5: Overlay & Special Components
 * Pattern: Pattern A (JSX + Graphics.draw) with expand/collapse state
 *
 * CSS 동기화:
 * - getDisclosureSizePreset(): fontSize, padding, gap, chevronSize
 * - getDisclosureColorPreset(): backgroundColor, borderColor, textColor
 */

import { useCallback, useMemo, useState } from 'react';
import { Container, Graphics, Text } from '@pixi/react';
import type { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import {
  getDisclosureSizePreset,
  getDisclosureColorPreset,
} from '../utils/cssVariableReader';

export interface PixiDisclosureProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

/**
 * PixiDisclosure - Expandable disclosure panel with trigger button
 */
export function PixiDisclosure({
  element,
  isSelected = false,
  onClick,
  onChange,
}: PixiDisclosureProps) {
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const title = (props.title as string) || (props.label as string) || 'Disclosure';
  const content = (props.content as string) || (props.children as string) || 'Panel content';
  const defaultExpanded = (props.defaultExpanded as boolean) || (props.isExpanded as boolean) || false;

  // Internal expanded state
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isHovered, setIsHovered] = useState(false);

  // Get presets from CSS
  const sizePreset = useMemo(() => getDisclosureSizePreset(size), [size]);
  const colorPreset = useMemo(() => getDisclosureColorPreset(variant), [variant]);

  // Calculate dimensions
  const containerWidth = (props.width as number) || 280;
  const triggerHeight = sizePreset.fontSize + sizePreset.padding * 2 + sizePreset.gap;
  const panelHeight = isExpanded ? sizePreset.fontSize * 2 + sizePreset.padding * 2 : 0;
  const totalHeight = triggerHeight + (isExpanded ? panelHeight + sizePreset.gap : 0);

  // Draw container background with border
  const drawContainer = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Background
      g.roundRect(0, 0, containerWidth, totalHeight, sizePreset.borderRadius);
      g.fill({ color: isExpanded ? colorPreset.expandedBgColor : colorPreset.backgroundColor });
      g.stroke({ color: colorPreset.borderColor, width: 1 });

      // Selection indicator
      if (isSelected) {
        g.roundRect(-2, -2, containerWidth + 4, totalHeight + 4, sizePreset.borderRadius + 2);
        g.stroke({ color: colorPreset.focusColor, width: 2 });
      }
    },
    [containerWidth, totalHeight, sizePreset, colorPreset, isSelected, isExpanded]
  );

  // Draw trigger button
  const drawTrigger = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Trigger background (hover state)
      if (isHovered) {
        g.roundRect(
          sizePreset.padding,
          sizePreset.padding,
          containerWidth - sizePreset.padding * 2,
          triggerHeight - sizePreset.padding,
          sizePreset.borderRadius - 2
        );
        g.fill({ color: colorPreset.triggerHoverBgColor });
      }

      // Draw chevron icon
      const chevronX = sizePreset.padding * 2;
      const chevronY = triggerHeight / 2;
      const chevronSize = sizePreset.chevronSize / 2;

      g.moveTo(chevronX, chevronY - chevronSize);
      if (isExpanded) {
        // Pointing down when expanded
        g.lineTo(chevronX + chevronSize, chevronY + chevronSize / 2);
        g.lineTo(chevronX - chevronSize, chevronY + chevronSize / 2);
      } else {
        // Pointing right when collapsed
        g.lineTo(chevronX + chevronSize, chevronY);
        g.lineTo(chevronX, chevronY + chevronSize);
      }
      g.closePath();
      g.fill({ color: colorPreset.textColor });
    },
    [containerWidth, triggerHeight, sizePreset, colorPreset, isHovered, isExpanded]
  );

  // Draw panel content area
  const drawPanel = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      if (!isExpanded) return;

      // Panel separator line
      g.moveTo(sizePreset.panelIndent, 0);
      g.lineTo(containerWidth - sizePreset.padding, 0);
      g.stroke({ color: colorPreset.borderColor, width: 1, alpha: 0.3 });
    },
    [containerWidth, sizePreset, colorPreset, isExpanded]
  );

  // Text styles
  const titleStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.fontSize,
      fontWeight: '500',
      fill: colorPreset.textColor,
      fontFamily: 'Inter, system-ui, sans-serif',
    }),
    [sizePreset, colorPreset]
  );

  const contentStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.fontSize * 0.9,
      fill: colorPreset.panelTextColor,
      fontFamily: 'Inter, system-ui, sans-serif',
      wordWrap: true,
      wordWrapWidth: containerWidth - sizePreset.panelIndent - sizePreset.padding * 2,
    }),
    [sizePreset, colorPreset, containerWidth]
  );

  // Handle click
  const handleClick = useCallback(() => {
    setIsExpanded(!isExpanded);
    onClick?.(element.id);
    onChange?.(element.id, !isExpanded);
  }, [element.id, isExpanded, onClick, onChange]);

  return (
    <Container
      eventMode="static"
      cursor="pointer"
      onpointerenter={() => setIsHovered(true)}
      onpointerleave={() => setIsHovered(false)}
      onpointertap={handleClick}
    >
      {/* Container background */}
      <Graphics draw={drawContainer} />

      {/* Trigger button */}
      <Graphics draw={drawTrigger} />

      {/* Title text */}
      <Text
        text={title}
        style={titleStyle}
        x={sizePreset.padding * 2 + sizePreset.chevronSize + sizePreset.gap}
        y={triggerHeight / 2 - sizePreset.fontSize / 2}
      />

      {/* Panel content (only when expanded) */}
      {isExpanded && (
        <Container y={triggerHeight + sizePreset.gap}>
          <Graphics draw={drawPanel} />
          <Text
            text={content}
            style={contentStyle}
            x={sizePreset.panelIndent}
            y={sizePreset.padding}
          />
        </Container>
      )}
    </Container>
  );
}
