/**
 * PixiDisclosureGroup - WebGL Disclosure Group Component (Accordion)
 *
 * Phase 5: Overlay & Special Components
 * Pattern: Pattern C (Group + Children from Store)
 *
 * CSS 동기화:
 * - getDisclosureSizePreset(): fontSize, padding, gap
 * - getDisclosureColorPreset(): backgroundColor, borderColor
 */

import { useCallback, useMemo, useState } from 'react';
import { Container, Graphics, Text } from '@pixi/react';
import type { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import { useStore } from '@/builder/stores';
import {
  getDisclosureSizePreset,
  getDisclosureColorPreset,
} from '../utils/cssVariableReader';

export interface PixiDisclosureGroupProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

interface DisclosureItemState {
  id: string;
  title: string;
  content: string;
  isExpanded: boolean;
}

/**
 * PixiDisclosureGroup - Accordion-style disclosure group
 */
export function PixiDisclosureGroup({
  element,
  isSelected = false,
  onClick,
  onChange,
}: PixiDisclosureGroupProps) {
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const allowMultiple = (props.allowsMultipleExpanded as boolean) || false;

  // Get children from store
  const elements = useStore((state) => state.elements);
  const childItems = useMemo(() => {
    return elements
      .filter((el) => el.parent_id === element.id)
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
      .map((child) => ({
        id: child.id,
        title: (child.props?.title as string) || (child.props?.label as string) || 'Item',
        content: (child.props?.content as string) || (child.props?.children as string) || 'Content',
        defaultExpanded: (child.props?.defaultExpanded as boolean) || false,
      }));
  }, [elements, element.id]);

  // Track expanded states
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    childItems.forEach((item) => {
      if (item.defaultExpanded) initial.add(item.id);
    });
    return initial;
  });

  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Get presets from CSS
  const sizePreset = useMemo(() => getDisclosureSizePreset(size), [size]);
  const colorPreset = useMemo(() => getDisclosureColorPreset(variant), [variant]);

  // Calculate dimensions
  const containerWidth = (props.width as number) || 280;
  const itemSpacing = sizePreset.gap;
  const triggerHeight = sizePreset.fontSize + sizePreset.padding * 2 + sizePreset.gap;
  const panelHeight = sizePreset.fontSize * 2 + sizePreset.padding * 2;

  // Calculate total height
  const totalHeight = useMemo(() => {
    let height = sizePreset.padding * 2; // Container padding
    childItems.forEach((item, index) => {
      height += triggerHeight;
      if (expandedIds.has(item.id)) {
        height += panelHeight + sizePreset.gap;
      }
      if (index < childItems.length - 1) {
        height += itemSpacing;
      }
    });
    return Math.max(height, 50);
  }, [childItems, expandedIds, triggerHeight, panelHeight, sizePreset, itemSpacing]);

  // Handle item click
  const handleItemClick = useCallback(
    (itemId: string) => {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(itemId)) {
          next.delete(itemId);
        } else {
          if (!allowMultiple) {
            next.clear();
          }
          next.add(itemId);
        }
        return next;
      });
      onClick?.(element.id);
      onChange?.(element.id, { expandedId: itemId });
    },
    [element.id, allowMultiple, onClick, onChange]
  );

  // Draw container background
  const drawContainer = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Background
      g.roundRect(0, 0, containerWidth, totalHeight, sizePreset.borderRadius);
      g.fill({ color: colorPreset.backgroundColor });
      g.stroke({ color: colorPreset.borderColor, width: 1 });

      // Selection indicator
      if (isSelected) {
        g.roundRect(-2, -2, containerWidth + 4, totalHeight + 4, sizePreset.borderRadius + 2);
        g.stroke({ color: colorPreset.focusColor, width: 2 });
      }
    },
    [containerWidth, totalHeight, sizePreset, colorPreset, isSelected]
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

  // Empty state
  if (childItems.length === 0) {
    const emptyStyle: Partial<TextStyle> = {
      fontSize: sizePreset.fontSize,
      fill: 0x9ca3af,
      fontFamily: 'Inter, system-ui, sans-serif',
    };

    return (
      <Container
        eventMode="static"
        cursor="pointer"
        onpointertap={() => onClick?.(element.id)}
      >
        <Graphics draw={drawContainer} />
        <Text
          text="No items"
          style={emptyStyle}
          x={containerWidth / 2}
          y={totalHeight / 2}
          anchor={0.5}
        />
      </Container>
    );
  }

  // Render items
  let currentY = sizePreset.padding;

  return (
    <Container>
      {/* Container background */}
      <Graphics draw={drawContainer} />

      {/* Disclosure items */}
      {childItems.map((item, index) => {
        const itemY = currentY;
        const isItemExpanded = expandedIds.has(item.id);
        const isItemHovered = hoveredId === item.id;

        // Update Y position for next item
        currentY += triggerHeight;
        if (isItemExpanded) {
          currentY += panelHeight + sizePreset.gap;
        }
        if (index < childItems.length - 1) {
          currentY += itemSpacing;
        }

        // Draw item trigger
        const drawItemTrigger = (g: PixiGraphics) => {
          g.clear();

          // Hover background
          if (isItemHovered) {
            g.roundRect(
              sizePreset.padding,
              0,
              containerWidth - sizePreset.padding * 2,
              triggerHeight,
              sizePreset.borderRadius - 2
            );
            g.fill({ color: colorPreset.triggerHoverBgColor });
          }

          // Expanded background
          if (isItemExpanded) {
            g.roundRect(
              sizePreset.padding,
              0,
              containerWidth - sizePreset.padding * 2,
              triggerHeight + panelHeight + sizePreset.gap,
              sizePreset.borderRadius - 2
            );
            g.fill({ color: colorPreset.expandedBgColor });
          }

          // Chevron icon
          const chevronX = sizePreset.padding * 2;
          const chevronY = triggerHeight / 2;
          const chevronSize = sizePreset.chevronSize / 2;

          g.moveTo(chevronX, chevronY - chevronSize);
          if (isItemExpanded) {
            g.lineTo(chevronX + chevronSize, chevronY + chevronSize / 2);
            g.lineTo(chevronX - chevronSize, chevronY + chevronSize / 2);
          } else {
            g.lineTo(chevronX + chevronSize, chevronY);
            g.lineTo(chevronX, chevronY + chevronSize);
          }
          g.closePath();
          g.fill({ color: colorPreset.textColor });

          // Separator line (except last item)
          if (index < childItems.length - 1 && !isItemExpanded) {
            g.moveTo(sizePreset.padding, triggerHeight + itemSpacing / 2);
            g.lineTo(containerWidth - sizePreset.padding, triggerHeight + itemSpacing / 2);
            g.stroke({ color: colorPreset.borderColor, width: 1, alpha: 0.3 });
          }
        };

        return (
          <Container
            key={item.id}
            y={itemY}
            eventMode="static"
            cursor="pointer"
            onpointerenter={() => setHoveredId(item.id)}
            onpointerleave={() => setHoveredId(null)}
            onpointertap={() => handleItemClick(item.id)}
          >
            {/* Item trigger */}
            <Graphics draw={drawItemTrigger} />

            {/* Title */}
            <Text
              text={item.title}
              style={titleStyle}
              x={sizePreset.padding * 2 + sizePreset.chevronSize + sizePreset.gap}
              y={triggerHeight / 2 - sizePreset.fontSize / 2}
            />

            {/* Panel content (when expanded) */}
            {isItemExpanded && (
              <Text
                text={item.content}
                style={contentStyle}
                x={sizePreset.panelIndent}
                y={triggerHeight + sizePreset.gap}
              />
            )}
          </Container>
        );
      })}
    </Container>
  );
}
