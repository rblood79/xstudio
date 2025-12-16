/**
 * PixiGridList.tsx
 *
 * WebGL GridList component with CSS synchronization
 * Pattern C: Reads GridListItem children from store
 *
 * @package xstudio
 */

import { useCallback, useMemo, useState } from 'react';
import { Container, Graphics, Text } from '@pixi/react';
import { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import { getGridListSizePreset, getGridListColorPreset } from '../utils/cssVariableReader';
import type { Element } from '@/types/core';
import { useStore } from '@/builder/stores';

export interface PixiGridListProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

interface GridListItemData {
  id: string;
  text: string;
  isSelected?: boolean;
}

export function PixiGridList({
  element,
  isSelected = false,
  onClick,
  onChange,
}: PixiGridListProps) {
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';

  // Get CSS presets
  const sizePreset = useMemo(() => getGridListSizePreset(size), [size]);
  const colorPreset = useMemo(() => getGridListColorPreset(variant), [variant]);

  // Get children from store (GridListItem)
  const allElements = useStore((state) => state.elements);
  const childItems = useMemo(() => {
    return allElements
      .filter((el) => el.parent_id === element.id && el.tag === 'GridListItem')
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
      .map((el) => ({
        id: el.id,
        text: (el.props?.children as string) || (el.props?.textValue as string) || 'Item',
        isSelected: el.props?.isSelected as boolean || false,
      }));
  }, [allElements, element.id]);

  // Hover state for items
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  // Calculate dimensions
  const listWidth = 200;
  const listHeight = Math.min(
    300,
    sizePreset.listPadding * 2 +
      childItems.length * (sizePreset.itemMinHeight + sizePreset.listGap) -
      sizePreset.listGap
  );

  // Text style
  const textStyle = useMemo(
    () =>
      new TextStyle({
        fontSize: sizePreset.fontSize,
        fill: colorPreset.textColor,
        fontFamily: 'Inter, system-ui, sans-serif',
      }),
    [sizePreset.fontSize, colorPreset.textColor]
  );

  // Selected text style
  const selectedTextStyle = useMemo(
    () =>
      new TextStyle({
        fontSize: sizePreset.fontSize,
        fill: colorPreset.itemSelectedTextColor,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: '500',
      }),
    [sizePreset.fontSize, colorPreset.itemSelectedTextColor]
  );

  // Draw list container
  const drawContainer = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.roundRect(0, 0, listWidth, listHeight, sizePreset.borderRadius);
      g.fill(colorPreset.backgroundColor);
      g.stroke({ width: 1, color: colorPreset.borderColor });

      // Selection indicator
      if (isSelected) {
        g.roundRect(-2, -2, listWidth + 4, listHeight + 4, sizePreset.borderRadius + 2);
        g.stroke({ width: 2, color: colorPreset.focusColor });
      }
    },
    [listWidth, listHeight, sizePreset.borderRadius, colorPreset, isSelected]
  );

  // Draw item background
  const drawItemBg = useCallback(
    (
      g: PixiGraphics,
      itemWidth: number,
      itemHeight: number,
      isHovered: boolean,
      isItemSelected: boolean
    ) => {
      g.clear();

      let bgColor = colorPreset.backgroundColor;
      if (isItemSelected) {
        bgColor = colorPreset.itemSelectedBgColor;
      } else if (isHovered) {
        bgColor = colorPreset.itemHoverBgColor;
      }

      g.roundRect(0, 0, itemWidth, itemHeight, 4);
      g.fill(bgColor);
    },
    [colorPreset]
  );

  // Handle item click
  const handleItemClick = useCallback(
    (itemId: string) => {
      if (onChange) {
        onChange(element.id, { selectedItemId: itemId });
      }
    },
    [element.id, onChange]
  );

  // Handle container click
  const handleContainerClick = useCallback(() => {
    if (onClick) {
      onClick(element.id);
    }
  }, [element.id, onClick]);

  const itemWidth = listWidth - sizePreset.listPadding * 2;

  return (
    <Container
      eventMode="static"
      cursor="pointer"
      pointerdown={handleContainerClick}
    >
      {/* List Container */}
      <Graphics draw={drawContainer} />

      {/* List Items */}
      {childItems.map((item, index) => {
        const itemY =
          sizePreset.listPadding +
          index * (sizePreset.itemMinHeight + sizePreset.listGap);
        const isHovered = hoveredItemId === item.id;
        const isItemSelected = item.isSelected;

        return (
          <Container
            key={item.id}
            x={sizePreset.listPadding}
            y={itemY}
            eventMode="static"
            cursor="pointer"
            pointerover={() => setHoveredItemId(item.id)}
            pointerout={() => setHoveredItemId(null)}
            pointerdown={(e) => {
              e.stopPropagation();
              handleItemClick(item.id);
            }}
          >
            <Graphics
              draw={(g) =>
                drawItemBg(g, itemWidth, sizePreset.itemMinHeight, isHovered, isItemSelected)
              }
            />
            <Text
              text={item.text}
              style={isItemSelected ? selectedTextStyle : textStyle}
              x={sizePreset.itemPaddingX}
              y={(sizePreset.itemMinHeight - sizePreset.fontSize) / 2}
            />
          </Container>
        );
      })}

      {/* Empty state */}
      {childItems.length === 0 && (
        <Text
          text="No items"
          style={
            new TextStyle({
              fontSize: sizePreset.fontSize,
              fill: 0x9ca3af,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontStyle: 'italic',
            })
          }
          x={listWidth / 2}
          y={listHeight / 2}
          anchor={0.5}
        />
      )}
    </Container>
  );
}

export default PixiGridList;
