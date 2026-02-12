/**
 * PixiTagGroup.tsx
 *
 * WebGL TagGroup component with CSS synchronization
 * Pattern C: Reads Tag children from store
 *
 * @package xstudio
 */

import { useCallback, useMemo, useRef } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import { useStore } from '@/builder/stores';

// 🚀 Component Spec
import {
  TagGroupSpec,
  getVariantColors as getSpecVariantColors,
  getSizePreset as getSpecSizePreset,
} from '@xstudio/specs';

export interface PixiTagGroupProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

export function PixiTagGroup({
  element,
  isSelected = false,
  onClick,
  onChange,
}: PixiTagGroupProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const label = (props.label as string) || '';

  // 🚀 Spec Migration
  const sizePreset = useMemo(() => {
    const sizeSpec = TagGroupSpec.sizes[size] || TagGroupSpec.sizes[TagGroupSpec.defaultSize];
    return getSpecSizePreset(sizeSpec, 'light');
  }, [size]);

  // 🚀 Spec Migration: variant에 따른 테마 색상
  const variantColors = useMemo(() => {
    const variantSpec = TagGroupSpec.variants[variant] || TagGroupSpec.variants[TagGroupSpec.defaultVariant];
    return getSpecVariantColors(variantSpec, 'light');
  }, [variant]);

  // 색상 프리셋 값들 (테마 색상 적용)
  const colorPreset = useMemo(() => ({
    backgroundColor: 0xf3f4f6,
    borderColor: 0xe5e7eb,
    textColor: variantColors.text,
    hoverBgColor: 0xe5e7eb,
    selectedBgColor: variantColors.bg,
    selectedTextColor: 0xffffff,
    removeButtonColor: 0x6b7280,
    focusRingColor: variantColors.bg,
  }), [variantColors]);

  // Get children from store (Tag)
  const allElements = useStore((state) => state.elements);
  const tagItems = useMemo(() => {
    return allElements
      .filter((el) => el.parent_id === element.id && el.tag === 'Tag')
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
      .map((el) => ({
        id: el.id,
        text: (el.props?.children as string) || (el.props?.textValue as string) || 'Tag',
        isSelected: el.props?.isSelected as boolean || false,
        isRemovable: el.props?.isRemovable as boolean || false,
      }));
  }, [allElements, element.id]);

  // 🚀 Performance: useRef로 hover 상태 관리 (리렌더링 없음)
  const tagGraphicsRefs = useRef<Map<string, PixiGraphics>>(new Map());

  // Calculate tag positions (flow layout)
  const tagPositions = useMemo(() => {
    const positions: { x: number; y: number; width: number }[] = [];
    let currentX = 0;
    let currentY = label ? sizePreset.fontSize + 8 : 0;
    const maxWidth = 300;

    tagItems.forEach((tag) => {
      // Estimate tag width
      const textWidth = tag.text.length * sizePreset.fontSize * 0.6;
      const tagWidth = textWidth + sizePreset.tagPaddingX * 2 + (tag.isRemovable ? 20 : 0);

      // Wrap to next line if needed
      if (currentX + tagWidth > maxWidth && currentX > 0) {
        currentX = 0;
        currentY += sizePreset.fontSize + sizePreset.tagPaddingY * 2 + sizePreset.tagGap;
      }

      positions.push({ x: currentX, y: currentY, width: tagWidth });
      currentX += tagWidth + sizePreset.tagGap;
    });

    return positions;
  }, [tagItems, sizePreset, label]);

  // Calculate container dimensions
  const containerHeight = useMemo(() => {
    if (tagPositions.length === 0) return 40;
    const lastPos = tagPositions[tagPositions.length - 1];
    return lastPos.y + sizePreset.fontSize + sizePreset.tagPaddingY * 2 + 4;
  }, [tagPositions, sizePreset]);

  // Text style for label
  const labelStyle = useMemo(
    () =>
      new TextStyle({
        fontSize: sizePreset.fontSize - 2,
        fill: 0x6b7280,
        fontFamily: 'Inter, system-ui, sans-serif',
      }),
    [sizePreset.fontSize]
  );


  // Draw selection indicator
  const drawSelection = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (isSelected) {
        const maxX = Math.max(...tagPositions.map((p) => p.x + p.width), 100);
        g.roundRect(-4, -4, maxX + 8, containerHeight + 8, 4);
        g.stroke({ width: 2, color: colorPreset.focusRingColor });
      }
    },
    [isSelected, tagPositions, containerHeight, colorPreset.focusRingColor]
  );

  // Draw tag
  const drawTag = useCallback(
    (g: PixiGraphics, width: number, isHovered: boolean, isTagSelected: boolean) => {
      g.clear();

      let bgColor = colorPreset.backgroundColor;
      if (isTagSelected) {
        bgColor = colorPreset.selectedBgColor;
      } else if (isHovered) {
        bgColor = colorPreset.hoverBgColor;
      }

      const height = sizePreset.fontSize + sizePreset.tagPaddingY * 2;
      g.roundRect(0, 0, width, height, sizePreset.borderRadius);
      g.fill(bgColor);
      g.stroke({ width: 1, color: colorPreset.borderColor });
    },
    [sizePreset, colorPreset]
  );

  // Draw remove button (X)
  const drawRemoveButton = useCallback(
    (g: PixiGraphics, isHovered: boolean) => {
      g.clear();
      const size = 14;

      if (isHovered) {
        g.circle(size / 2, size / 2, size / 2);
        g.fill(0x00000020);
      }

      // Draw X
      g.moveTo(4, 4);
      g.lineTo(size - 4, size - 4);
      g.moveTo(size - 4, 4);
      g.lineTo(4, size - 4);
      g.stroke({ width: 1.5, color: colorPreset.removeButtonColor });
    },
    [colorPreset.removeButtonColor]
  );

  // Handle tag click
  const handleTagClick = useCallback(
    (tagId: string) => {
      if (onChange) {
        onChange(element.id, { selectedTagId: tagId });
      }
    },
    [element.id, onChange]
  );

  // Handle remove click
  const handleRemoveClick = useCallback(
    (tagId: string, e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      if (onChange) {
        onChange(element.id, { removedTagId: tagId });
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

  return (
    <pixiContainer
      eventMode="static"
      cursor="pointer"
      onPointerDown={handleContainerClick}
    >
      {/* Selection indicator */}
      <pixiGraphics draw={drawSelection} />

      {/* Label */}
      {label && <pixiText text={label} style={labelStyle} x={0} y={0} />}

      {/* Tags */}
      {tagItems.map((tag, index) => {
        const pos = tagPositions[index];
        if (!pos) return null;

        const tagHeight = sizePreset.fontSize + sizePreset.tagPaddingY * 2;
        const tagTextColor =
          tag.isSelected || variant !== 'default' && variant !== 'surface'
            ? colorPreset.selectedTextColor
            : colorPreset.textColor;

        return (
          <pixiContainer
            key={tag.id}
            x={pos.x}
            y={pos.y}
            eventMode="static"
            cursor="pointer"
            onPointerOver={() => {
              // 🚀 Performance: 직접 그래픽스 업데이트 (리렌더링 없음)
              const g = tagGraphicsRefs.current.get(tag.id);
              if (g) drawTag(g, pos.width, true, tag.isSelected || false);
            }}
            onPointerOut={() => {
              // 🚀 Performance: 직접 그래픽스 업데이트 (리렌더링 없음)
              const g = tagGraphicsRefs.current.get(tag.id);
              if (g) drawTag(g, pos.width, false, tag.isSelected || false);
            }}
            onPointerDown={(e: { stopPropagation: () => void }) => {
              e.stopPropagation();
              handleTagClick(tag.id);
            }}
          >
            <pixiGraphics
              ref={(g) => {
                if (g) tagGraphicsRefs.current.set(tag.id, g);
              }}
              draw={(g) => drawTag(g, pos.width, false, tag.isSelected || false)}
            />
            <pixiText
              text={tag.text}
              style={
                new TextStyle({
                  fontSize: sizePreset.fontSize,
                  fill: tagTextColor,
                  fontFamily: 'Inter, system-ui, sans-serif',
                })
              }
              x={sizePreset.tagPaddingX}
              y={sizePreset.tagPaddingY}
            />

            {/* Remove button */}
            {tag.isRemovable && (
              <pixiContainer
                x={pos.width - 18}
                y={(tagHeight - 14) / 2}
                eventMode="static"
                cursor="pointer"
                onPointerDown={(e: { stopPropagation: () => void }) => handleRemoveClick(tag.id, e)}
              >
                <pixiGraphics draw={(g) => drawRemoveButton(g, false)} />
              </pixiContainer>
            )}
          </pixiContainer>
        );
      })}

      {/* Empty state */}
      {tagItems.length === 0 && (
        <pixiText
          text="No tags"
          style={
            new TextStyle({
              fontSize: sizePreset.fontSize,
              fill: 0x9ca3af,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontStyle: 'italic',
            })
          }
          x={0}
          y={label ? sizePreset.fontSize + 8 : 0}
        />
      )}
    </pixiContainer>
  );
}

export default PixiTagGroup;
