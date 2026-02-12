/**
 * PixiToast - WebGL Toast Notification Component
 *
 * Phase 8: Notification & Color Utility Components
 * Pattern: Pattern A (JSX + Graphics.draw) - Toast with icon and message
 *
 * CSS 동기화:
 * - getToastSizePreset(): fontSize, padding, borderRadius, iconSize
 * - getToastColorPreset(): backgroundColor, borderColor, accentColor
 */

import { useCallback, useMemo } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import {
  getToastSizePreset,
  getToastColorPreset,
  getVariantColors,
} from '../utils/cssVariableReader';
import { useThemeColors } from '../hooks/useThemeColors';

export interface PixiToastProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

/**
 * PixiToast - Notification toast message
 */
export function PixiToast({
  element,
  isSelected = false,
  onClick,
}: PixiToastProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const toastType = (props.type as string) || 'info'; // info, success, warning, error
  const size = (props.size as string) || 'md';
  const message = (props.message as string) || (props.children as string) || 'Toast notification message';

  // Get presets from CSS
  const sizePreset = useMemo(() => getToastSizePreset(size), [size]);
  const colorPreset = useMemo(() => getToastColorPreset(toastType), [toastType]);

  // 🚀 테마 색상 동적 로드
  const themeColors = useThemeColors();

  // 🚀 variant에 따른 테마 색상 (selection용)
  const variantColors = useMemo(
    () => getVariantColors('default', themeColors),
    [themeColors]
  );

  // Calculate dimensions
  const toastWidth = (props.width as number) || Math.min(sizePreset.maxWidth, 300);
  const toastHeight = sizePreset.padding * 2 + Math.max(sizePreset.iconSize, sizePreset.fontSize * 1.4);

  // Draw toast container
  const drawContainer = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Background with shadow effect
      g.roundRect(2, 2, toastWidth, toastHeight, sizePreset.borderRadius);
      g.fill({ color: colorPreset.shadowColor, alpha: 0.1 });

      // Main background
      g.roundRect(0, 0, toastWidth, toastHeight, sizePreset.borderRadius);
      g.fill({ color: colorPreset.backgroundColor });

      // Border
      g.roundRect(0, 0, toastWidth, toastHeight, sizePreset.borderRadius);
      g.stroke({ color: colorPreset.borderColor, width: 1 });

      // Left accent bar
      g.roundRect(0, 0, 3, toastHeight, sizePreset.borderRadius);
      g.fill({ color: colorPreset.accentColor });

      // Selection indicator
      if (isSelected) {
        g.roundRect(-2, -2, toastWidth + 4, toastHeight + 4, sizePreset.borderRadius + 2);
        g.stroke({ color: variantColors.bg, width: 2 });
      }
    },
    [toastWidth, toastHeight, sizePreset, colorPreset, isSelected, variantColors.bg]
  );

  // Draw icon based on type
  const drawIcon = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      const iconSize = sizePreset.iconSize;
      const centerX = iconSize / 2;
      const centerY = iconSize / 2;
      const radius = iconSize * 0.4;

      switch (toastType) {
        case 'success':
          // Checkmark circle
          g.circle(centerX, centerY, radius);
          g.fill({ color: colorPreset.iconColor });
          // Checkmark
          g.moveTo(centerX - radius * 0.4, centerY);
          g.lineTo(centerX - radius * 0.1, centerY + radius * 0.3);
          g.lineTo(centerX + radius * 0.4, centerY - radius * 0.3);
          g.stroke({ color: 0xffffff, width: 2 });
          break;

        case 'warning':
          // Triangle
          g.moveTo(centerX, centerY - radius);
          g.lineTo(centerX + radius, centerY + radius * 0.7);
          g.lineTo(centerX - radius, centerY + radius * 0.7);
          g.closePath();
          g.fill({ color: colorPreset.iconColor });
          // Exclamation
          g.rect(centerX - 1, centerY - radius * 0.3, 2, radius * 0.5);
          g.fill({ color: 0xffffff });
          g.circle(centerX, centerY + radius * 0.3, 1.5);
          g.fill({ color: 0xffffff });
          break;

        case 'error':
          // X circle
          g.circle(centerX, centerY, radius);
          g.fill({ color: colorPreset.iconColor });
          // X mark
          g.moveTo(centerX - radius * 0.35, centerY - radius * 0.35);
          g.lineTo(centerX + radius * 0.35, centerY + radius * 0.35);
          g.moveTo(centerX + radius * 0.35, centerY - radius * 0.35);
          g.lineTo(centerX - radius * 0.35, centerY + radius * 0.35);
          g.stroke({ color: 0xffffff, width: 2 });
          break;

        case 'info':
        default:
          // Info circle
          g.circle(centerX, centerY, radius);
          g.fill({ color: colorPreset.iconColor });
          // i mark
          g.circle(centerX, centerY - radius * 0.35, 1.5);
          g.fill({ color: 0xffffff });
          g.rect(centerX - 1.5, centerY - radius * 0.1, 3, radius * 0.6);
          g.fill({ color: 0xffffff });
          break;
      }
    },
    [sizePreset, colorPreset, toastType]
  );

  // Draw dismiss button
  const drawDismissButton = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      const btnSize = sizePreset.dismissButtonSize;
      const centerX = btnSize / 2;
      const centerY = btnSize / 2;

      // Button background (subtle)
      g.roundRect(0, 0, btnSize, btnSize, 4);
      g.fill({ color: colorPreset.dismissButtonColor, alpha: 0.1 });

      // X mark
      const offset = btnSize * 0.25;
      g.moveTo(centerX - offset, centerY - offset);
      g.lineTo(centerX + offset, centerY + offset);
      g.moveTo(centerX + offset, centerY - offset);
      g.lineTo(centerX - offset, centerY + offset);
      g.stroke({ color: colorPreset.dismissButtonColor, width: 1.5 });
    },
    [sizePreset, colorPreset]
  );

  // Text style
  const textStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.fontSize,
      fill: colorPreset.textColor,
      fontFamily: 'Inter, system-ui, sans-serif',
      wordWrap: true,
      wordWrapWidth: toastWidth - sizePreset.paddingX * 2 - sizePreset.iconSize - sizePreset.dismissButtonSize - sizePreset.gap * 2 - 10,
    }),
    [sizePreset, colorPreset, toastWidth]
  );

  // 🚀 Phase 12: 루트 레이아웃
  const rootLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    width: toastWidth,
    height: toastHeight,
    paddingLeft: sizePreset.paddingX + 4,
    paddingRight: sizePreset.paddingX,
    gap: sizePreset.gap,
    position: 'relative' as const,
  }), [toastWidth, toastHeight, sizePreset.paddingX, sizePreset.gap]);

  // 🚀 Phase 12: Dismiss 버튼 레이아웃
  const dismissLayout = useMemo(() => ({
    position: 'absolute' as const,
    right: sizePreset.paddingX,
    top: (toastHeight - sizePreset.dismissButtonSize) / 2,
  }), [sizePreset.paddingX, toastHeight, sizePreset.dismissButtonSize]);

  return (
    <pixiContainer
      layout={rootLayout}
      eventMode="static"
      cursor="pointer"
      onPointerTap={() => onClick?.(element.id)}
    >
      {/* Toast container - position: absolute */}
      <pixiGraphics
        draw={drawContainer}
        layout={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />

      {/* Icon */}
      <pixiGraphics draw={drawIcon} />

      {/* Message */}
      <pixiText
        text={message}
        style={textStyle}
        layout={{ isLeaf: true, flexGrow: 1 }}
      />

      {/* Dismiss button - position: absolute */}
      <pixiGraphics draw={drawDismissButton} layout={dismissLayout} />
    </pixiContainer>
  );
}
