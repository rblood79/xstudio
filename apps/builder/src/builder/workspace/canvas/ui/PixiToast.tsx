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

// 🚀 Spec Migration
import { ToastSpec, getVariantColors as getSpecVariantColors, getSizePreset as getSpecSizePreset } from '@xstudio/specs';

const TOAST_COLOR_PRESETS: Record<string, { backgroundColor: number; borderColor: number; textColor: number; accentColor: number; iconColor: number; dismissButtonColor: number; shadowColor: number }> = {
  info: { backgroundColor: 0xffffff, borderColor: 0x3b82f6, textColor: 0x374151, accentColor: 0x3b82f6, iconColor: 0x3b82f6, dismissButtonColor: 0x6b7280, shadowColor: 0x000000 },
  success: { backgroundColor: 0xffffff, borderColor: 0x22c55e, textColor: 0x374151, accentColor: 0x22c55e, iconColor: 0x22c55e, dismissButtonColor: 0x6b7280, shadowColor: 0x000000 },
  warning: { backgroundColor: 0xffffff, borderColor: 0xeab308, textColor: 0x374151, accentColor: 0xeab308, iconColor: 0xeab308, dismissButtonColor: 0x6b7280, shadowColor: 0x000000 },
  error: { backgroundColor: 0xffffff, borderColor: 0xef4444, textColor: 0x374151, accentColor: 0xef4444, iconColor: 0xef4444, dismissButtonColor: 0x6b7280, shadowColor: 0x000000 },
};

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
  const sizePreset = useMemo(() => {
    const sizeSpec = ToastSpec.sizes[size] || ToastSpec.sizes[ToastSpec.defaultSize];
    return getSpecSizePreset(sizeSpec, 'light');
  }, [size]);
  const colorPreset = useMemo(() => TOAST_COLOR_PRESETS[toastType] ?? TOAST_COLOR_PRESETS.info, [toastType]);

  // 🚀 variant에 따른 테마 색상 (selection용)
  const variantColors = useMemo(() => {
    const variantSpec = ToastSpec.variants['default'] || ToastSpec.variants[ToastSpec.defaultVariant];
    return getSpecVariantColors(variantSpec, 'light');
  }, []);

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

      const iconSize = sizePreset.iconSize ?? 20;
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
      wordWrapWidth: toastWidth - sizePreset.paddingX * 2 - (sizePreset.iconSize ?? 20) - (sizePreset.dismissButtonSize ?? 16) - (sizePreset.gap ?? 8) * 2 - 10,
    }),
    [sizePreset, colorPreset, toastWidth]
  );

  return (
    <pixiContainer
      eventMode="static"
      cursor="default"
      onPointerTap={() => onClick?.(element.id)}
    >
      {/* Toast container */}
      <pixiGraphics draw={drawContainer} />

      {/* Icon */}
      <pixiGraphics draw={drawIcon} />

      {/* Message */}
      <pixiText
        text={message}
        style={textStyle}
      />

      {/* Dismiss button */}
      <pixiGraphics draw={drawDismissButton} />
    </pixiContainer>
  );
}
