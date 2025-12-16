/**
 * PixiTree.tsx
 *
 * WebGL Tree component with CSS synchronization
 * Pattern C + Recursive: Reads TreeItem children with hierarchy
 *
 * @package xstudio
 */

import { useCallback, useMemo, useState } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import { getTreeSizePreset, getTreeColorPreset } from '../utils/cssVariableReader';
import type { Element } from '@/types/core';
import { useStore } from '@/builder/stores';

export interface PixiTreeProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

interface TreeItemData {
  id: string;
  text: string;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isSelected?: boolean;
  parentId: string | null;
}

export function PixiTree({
  element,
  isSelected = false,
  onClick,
  onChange,
}: PixiTreeProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';

  // Get CSS presets
  const sizePreset = useMemo(() => getTreeSizePreset(size), [size]);
  const colorPreset = useMemo(() => getTreeColorPreset(variant), [variant]);

  // Expanded state (local)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Hover state
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

  // Get all TreeItem elements
  const allElements = useStore((state) => state.elements);

  // Build flat list with depth information
  const treeItems = useMemo(() => {
    const result: TreeItemData[] = [];

    // Find direct TreeItem children
    const getChildren = (parentId: string, depth: number) => {
      const children = allElements
        .filter((el) => el.parent_id === parentId && el.tag === 'TreeItem')
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      children.forEach((child) => {
        const childTreeItems = allElements.filter(
          (el) => el.parent_id === child.id && el.tag === 'TreeItem'
        );
        const hasChildren = childTreeItems.length > 0;
        const isExpanded = expandedIds.has(child.id);

        result.push({
          id: child.id,
          text:
            (child.props?.children as string) ||
            (child.props?.textValue as string) ||
            'Item',
          depth,
          hasChildren,
          isExpanded,
          isSelected: child.props?.isSelected as boolean || false,
          parentId,
        });

        // Recursively add children if expanded
        if (hasChildren && isExpanded) {
          getChildren(child.id, depth + 1);
        }
      });
    };

    getChildren(element.id, 0);
    return result;
  }, [allElements, element.id, expandedIds]);

  // Calculate dimensions
  const treeWidth = 250;
  const treeHeight = Math.max(
    80,
    sizePreset.treePadding * 2 +
      treeItems.length * (sizePreset.itemMinHeight + sizePreset.treeGap) -
      (treeItems.length > 0 ? sizePreset.treeGap : 0)
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

  // Draw container
  const drawContainer = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.roundRect(0, 0, treeWidth, treeHeight, sizePreset.borderRadius);
      g.fill(colorPreset.backgroundColor);
      g.stroke({ width: 1, color: colorPreset.borderColor });

      // Selection indicator
      if (isSelected) {
        g.roundRect(-2, -2, treeWidth + 4, treeHeight + 4, sizePreset.borderRadius + 2);
        g.stroke({ width: 2, color: colorPreset.focusColor });
      }
    },
    [treeWidth, treeHeight, sizePreset.borderRadius, colorPreset, isSelected]
  );

  // Draw item background
  const drawItemBg = useCallback(
    (
      g: PixiGraphics,
      width: number,
      height: number,
      isHovered: boolean,
      isItemSelected: boolean
    ) => {
      g.clear();

      let bgColor = 0xffffff00; // transparent
      if (isItemSelected) {
        bgColor = colorPreset.itemSelectedBgColor;
      } else if (isHovered) {
        bgColor = colorPreset.itemHoverBgColor;
      }

      if (bgColor !== 0xffffff00) {
        g.roundRect(0, 0, width, height, 4);
        g.fill(bgColor);
      }
    },
    [colorPreset]
  );

  // Draw chevron
  const drawChevron = useCallback(
    (g: PixiGraphics, isExpanded: boolean, hasChildren: boolean) => {
      g.clear();

      if (!hasChildren) return;

      const size = sizePreset.chevronSize;
      const centerX = size / 2;
      const centerY = size / 2;

      g.setTransform(centerX, centerY);

      if (isExpanded) {
        g.rotation = Math.PI / 2;
      }

      // Draw chevron arrow >
      g.moveTo(-3, -5);
      g.lineTo(3, 0);
      g.lineTo(-3, 5);
      g.stroke({ width: 2, color: colorPreset.chevronColor });

      g.setTransform(0, 0);
    },
    [sizePreset.chevronSize, colorPreset.chevronColor]
  );

  // Toggle expand/collapse
  const toggleExpand = useCallback((itemId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

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

  const itemWidth = treeWidth - sizePreset.treePadding * 2;

  return (
    <pixiContainer
      eventMode="static"
      cursor="pointer"
      pointerdown={handleContainerClick}
    >
      {/* Container */}
      <pixiGraphics draw={drawContainer} />

      {/* Tree Items */}
      {treeItems.map((item, index) => {
        const itemY =
          sizePreset.treePadding +
          index * (sizePreset.itemMinHeight + sizePreset.treeGap);
        const indent = item.depth * sizePreset.indentSize;
        const isHovered = hoveredItemId === item.id;

        return (
          <pixiContainer
            key={item.id}
            x={sizePreset.treePadding}
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
            {/* Item background */}
            <pixiGraphics
              draw={(g) =>
                drawItemBg(g, itemWidth, sizePreset.itemMinHeight, isHovered, item.isSelected || false)
              }
            />

            {/* Chevron (for expandable items) */}
            {item.hasChildren && (
              <pixiContainer
                x={indent}
                y={(sizePreset.itemMinHeight - sizePreset.chevronSize) / 2}
                eventMode="static"
                cursor="pointer"
                pointerdown={(e) => {
                  e.stopPropagation();
                  toggleExpand(item.id);
                }}
              >
                <pixiGraphics
                  draw={(g) => drawChevron(g, item.isExpanded, item.hasChildren)}
                />
              </pixiContainer>
            )}

            {/* Item text */}
            <Text
              text={item.text}
              style={item.isSelected ? selectedTextStyle : textStyle}
              x={indent + sizePreset.chevronSize + 4}
              y={(sizePreset.itemMinHeight - sizePreset.fontSize) / 2}
            />
          </pixiContainer>
        );
      })}

      {/* Empty state */}
      {treeItems.length === 0 && (
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
          x={treeWidth / 2}
          y={treeHeight / 2}
          anchor={0.5}
        />
      )}
    </pixiContainer>
  );
}

export default PixiTree;
