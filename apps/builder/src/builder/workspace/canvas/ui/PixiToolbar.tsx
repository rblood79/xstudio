/**
 * PixiToolbar - WebGL Toolbar Component
 *
 * Phase 7: Form & Utility Components
 * Pattern: Pattern A (JSX + Graphics.draw) - Horizontal/Vertical toolbar container
 *
 * CSS 동기화:
 * - getToolbarSizePreset(): height, padding, gap, borderRadius
 * - getToolbarColorPreset(): backgroundColor, borderColor, separatorColor
 */

import { useCallback, useMemo } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Graphics as PixiGraphics } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import {
  getToolbarSizePreset,
  getToolbarColorPreset,
  getVariantColors,
} from '../utils/cssVariableReader';
import { useThemeColors } from '../hooks/useThemeColors';

export interface PixiToolbarProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

/**
 * PixiToolbar - Toolbar container with action buttons
 */
export function PixiToolbar({
  element,
  isSelected = false,
  onClick,
}: PixiToolbarProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const orientation = (props.orientation as string) || 'horizontal';

  // Get presets from CSS
  const sizePreset = useMemo(() => getToolbarSizePreset(size), [size]);
  const colorPreset = useMemo(() => getToolbarColorPreset(variant), [variant]);

  // 🚀 테마 색상 동적 로드
  const themeColors = useThemeColors();

  // 🚀 variant에 따른 테마 색상
  const variantColors = useMemo(
    () => getVariantColors(variant, themeColors),
    [variant, themeColors]
  );

  // Calculate dimensions based on orientation
  const isHorizontal = orientation === 'horizontal';
  const toolbarWidth = isHorizontal
    ? (props.width as number) || 200
    : sizePreset.height;
  const toolbarHeight = isHorizontal
    ? sizePreset.height
    : (props.height as number) || 200;

  // Draw toolbar container
  const drawContainer = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Background
      g.roundRect(0, 0, toolbarWidth, toolbarHeight, sizePreset.borderRadius);
      g.fill({ color: colorPreset.backgroundColor });
      g.stroke({ color: colorPreset.borderColor, width: 1 });

      // Selection indicator
      if (isSelected) {
        g.roundRect(-2, -2, toolbarWidth + 4, toolbarHeight + 4, sizePreset.borderRadius + 2);
        g.stroke({ color: variantColors.bg, width: 2 });
      }
    },
    [toolbarWidth, toolbarHeight, sizePreset, colorPreset, isSelected, variantColors.bg]
  );

  // Draw toolbar items placeholder
  const drawItems = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      const buttonSize = sizePreset.height - sizePreset.padding * 2;
      const itemCount = 4;

      for (let i = 0; i < itemCount; i++) {
        if (isHorizontal) {
          const x = sizePreset.padding + i * (buttonSize + sizePreset.gap);

          // Draw separator before item (except first)
          if (i === 2) {
            g.rect(
              x - sizePreset.gap / 2 - sizePreset.separatorWidth / 2,
              (toolbarHeight - sizePreset.separatorHeight) / 2,
              sizePreset.separatorWidth,
              sizePreset.separatorHeight
            );
            g.fill({ color: colorPreset.separatorColor });
          }

          // Draw button placeholder
          g.roundRect(x, sizePreset.padding, buttonSize, buttonSize, 4);
          g.fill({ color: colorPreset.hoverBackgroundColor });

          // Draw icon placeholder
          const iconSize = buttonSize * 0.5;
          const iconX = x + (buttonSize - iconSize) / 2;
          const iconY = sizePreset.padding + (buttonSize - iconSize) / 2;
          g.roundRect(iconX, iconY, iconSize, iconSize, 2);
          g.fill({ color: colorPreset.iconColor, alpha: 0.3 });
        } else {
          const y = sizePreset.padding + i * (buttonSize + sizePreset.gap);

          // Draw separator before item (except first)
          if (i === 2) {
            g.rect(
              (toolbarWidth - sizePreset.separatorHeight) / 2,
              y - sizePreset.gap / 2 - sizePreset.separatorWidth / 2,
              sizePreset.separatorHeight,
              sizePreset.separatorWidth
            );
            g.fill({ color: colorPreset.separatorColor });
          }

          // Draw button placeholder
          g.roundRect(sizePreset.padding, y, buttonSize, buttonSize, 4);
          g.fill({ color: colorPreset.hoverBackgroundColor });

          // Draw icon placeholder
          const iconSize = buttonSize * 0.5;
          const iconX = sizePreset.padding + (buttonSize - iconSize) / 2;
          const iconY = y + (buttonSize - iconSize) / 2;
          g.roundRect(iconX, iconY, iconSize, iconSize, 2);
          g.fill({ color: colorPreset.iconColor, alpha: 0.3 });
        }
      }
    },
    [sizePreset, colorPreset, toolbarWidth, toolbarHeight, isHorizontal]
  );

  // 🚀 Phase 8: 주 컨테이너 layout (iframe CSS와 동기화)
  // CSS: .react-aria-Toolbar { display: flex; flex-wrap: wrap; gap: 5px; width: fit-content; }
  const toolbarLayout = useMemo(() => ({
    display: 'flex',
    flexDirection: isHorizontal ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: sizePreset.gap,
    // 콘텐츠 크기에 맞춤 (부모 flex에서 늘어나지 않도록)
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'flex-start',
  }), [isHorizontal, sizePreset.gap]);

  return (
    <pixiContainer
      layout={toolbarLayout}
      eventMode="static"
      cursor="pointer"
      onPointerTap={() => onClick?.(element.id)}
    >
      {/* Toolbar container */}
      <pixiGraphics draw={drawContainer} />

      {/* Toolbar items */}
      <pixiGraphics draw={drawItems} />
    </pixiContainer>
  );
}
