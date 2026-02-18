/**
 * PixiDialog - WebGL Dialog Component
 *
 * Phase 5: Overlay & Special Components
 * Pattern: Pattern A (JSX + Graphics.draw) - Builder preview representation
 *
 * NOTE: In builder mode, dialogs are shown as static elements for editing.
 * Actual modal behavior works in iframe Preview.
 *
 * CSS 동기화:
 * - getDialogSizePreset(): fontSize, titleFontSize, padding, borderRadius, minWidth
 * - getDialogColorPreset(): backgroundColor, borderColor, titleColor, textColor
 */

import { useCallback, useMemo, useState } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '@/types/core/store.types';

// 🚀 Spec Migration
import {
  DialogSpec,
  getVariantColors as getSpecVariantColors,
  getSizePreset as getSpecSizePreset,
} from '@xstudio/specs';

export interface PixiDialogProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

/**
 * PixiDialog - Static dialog preview for builder
 */
export function PixiDialog({
  element,
  isSelected = false,
  onClick,
}: PixiDialogProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const title = (props.title as string) || 'Dialog Title';
  const content = (props.content as string) || (props.children as string) || 'Dialog content goes here.';
  const showBackdrop = (props.showBackdrop as boolean) !== false;

  const [isHovered, setIsHovered] = useState(false);

  // Get presets from CSS (Spec Migration)
  const sizePreset = useMemo(() => {
    const sizeSpec = DialogSpec.sizes[size] || DialogSpec.sizes[DialogSpec.defaultSize];
    return getSpecSizePreset(sizeSpec, 'light');
  }, [size]);

  const colorPreset = useMemo(() => {
    const variantSpec = DialogSpec.variants[variant] || DialogSpec.variants[DialogSpec.defaultVariant];
    const specColors = getSpecVariantColors(variantSpec, 'light');
    return {
      backgroundColor: specColors.bg,
      borderColor: specColors.border ?? specColors.bg,
      titleColor: specColors.text,
      textColor: specColors.text,
      backdropColor: 0x00000033,
    };
  }, [variant]);

  // 🚀 variant에 따른 테마 색상 (Spec Migration)
  const variantColors = useMemo(() => {
    const variantSpec = DialogSpec.variants[variant] || DialogSpec.variants[DialogSpec.defaultVariant];
    return getSpecVariantColors(variantSpec, 'light');
  }, [variant]);

  // Calculate dimensions
  const containerWidth = (props.width as number) || sizePreset.minWidth;
  const titleHeight = sizePreset.titleFontSize + sizePreset.padding;
  const contentLines = Math.ceil((content.length * sizePreset.fontSize * 0.5) / (containerWidth - sizePreset.padding * 2));
  const contentHeight = Math.max(contentLines, 2) * sizePreset.fontSize * 1.5;
  const buttonAreaHeight = 40 + sizePreset.padding;
  const containerHeight = sizePreset.padding * 2 + titleHeight + contentHeight + buttonAreaHeight;

  // Backdrop dimensions (for visual representation)
  const backdropPadding = 20;

  // Draw backdrop
  const drawBackdrop = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      if (showBackdrop) {
        const totalWidth = containerWidth + backdropPadding * 2;
        const totalHeight = containerHeight + backdropPadding * 2;
        g.rect(0, 0, totalWidth, totalHeight);
        g.fill({ color: colorPreset.backdropColor });
      }
    },
    [containerWidth, containerHeight, colorPreset, showBackdrop, backdropPadding]
  );

  // Draw dialog
  const drawDialog = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Shadow effect
      g.roundRect(4, 4, containerWidth, containerHeight, sizePreset.borderRadius);
      g.fill({ color: 0x00000033 });

      // Main dialog body
      g.roundRect(0, 0, containerWidth, containerHeight, sizePreset.borderRadius);
      g.fill({ color: colorPreset.backgroundColor });

      // Border (if variant has border)
      if (colorPreset.borderColor !== 0x00000000) {
        g.roundRect(0, 0, containerWidth, containerHeight, sizePreset.borderRadius);
        g.stroke({ color: colorPreset.borderColor, width: 1 });
      }

      // Title separator line
      g.moveTo(sizePreset.padding, titleHeight + sizePreset.padding);
      g.lineTo(containerWidth - sizePreset.padding, titleHeight + sizePreset.padding);
      g.stroke({ color: 0xcad3dc, width: 1 });

      // Button area separator
      const buttonY = containerHeight - buttonAreaHeight;
      g.moveTo(sizePreset.padding, buttonY);
      g.lineTo(containerWidth - sizePreset.padding, buttonY);
      g.stroke({ color: 0xcad3dc, width: 1 });

      // Cancel button (outline)
      const btnWidth = 80;
      const btnHeight = 32;
      const btnY = buttonY + (buttonAreaHeight - btnHeight) / 2;
      const cancelBtnX = containerWidth - sizePreset.padding - btnWidth * 2 - 8;
      g.roundRect(cancelBtnX, btnY, btnWidth, btnHeight, 6);
      g.stroke({ color: 0x9ca3af, width: 1 });

      // Confirm button (filled)
      const confirmBtnX = containerWidth - sizePreset.padding - btnWidth;
      g.roundRect(confirmBtnX, btnY, btnWidth, btnHeight, 6);
      g.fill({ color: variantColors.bg });

      // Selection indicator
      if (isSelected) {
        g.roundRect(-2, -2, containerWidth + 4, containerHeight + 4, sizePreset.borderRadius + 2);
        g.stroke({ color: variantColors.bg, width: 2 });
      }

      // Hover effect
      if (isHovered && !isSelected) {
        g.roundRect(-1, -1, containerWidth + 2, containerHeight + 2, sizePreset.borderRadius + 1);
        g.stroke({ color: 0x9ca3af, width: 1 });
      }
    },
    [containerWidth, containerHeight, titleHeight, buttonAreaHeight, sizePreset, colorPreset, isSelected, isHovered, variantColors.bg]
  );

  // Title style
  const titleStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.titleFontSize,
      fontWeight: '500',
      fill: colorPreset.titleColor,
      fontFamily: 'Inter, system-ui, sans-serif',
    }),
    [sizePreset, colorPreset]
  );

  // Content style
  const contentStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.fontSize,
      fill: colorPreset.textColor,
      fontFamily: 'Inter, system-ui, sans-serif',
      wordWrap: true,
      wordWrapWidth: containerWidth - sizePreset.padding * 2,
      lineHeight: sizePreset.fontSize * 1.5,
    }),
    [sizePreset, colorPreset, containerWidth]
  );

  // Button text styles
  const cancelBtnStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: 14,
      fill: 0x6b7280,
      fontFamily: 'Inter, system-ui, sans-serif',
    }),
    []
  );

  const confirmBtnStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: 14,
      fill: 0xffffff,
      fontFamily: 'Inter, system-ui, sans-serif',
    }),
    []
  );

  return (
    <pixiContainer
      eventMode="static"
      cursor="default"
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onPointerTap={() => onClick?.(element.id)}
    >
      {/* Backdrop (optional visual representation) */}
      {showBackdrop && (
        <pixiGraphics draw={drawBackdrop} />
      )}

      {/* Dialog container */}
      <pixiContainer
        x={showBackdrop ? backdropPadding : 0}
        y={showBackdrop ? backdropPadding : 0}
      >
        {/* Dialog background */}
        <pixiGraphics draw={drawDialog} />

        {/* Title area */}
        <pixiContainer>
          <pixiText
            text={title}
            style={titleStyle}
          />
        </pixiContainer>

        {/* Content area */}
        <pixiContainer>
          <pixiText
            text={content}
            style={contentStyle}
          />
        </pixiContainer>

        {/* Button area */}
        <pixiContainer>
          {/* Cancel button */}
          <pixiContainer>
            <pixiText
              text="Cancel"
              style={cancelBtnStyle}
            />
          </pixiContainer>

          {/* Confirm button */}
          <pixiContainer>
            <pixiText
              text="Confirm"
              style={confirmBtnStyle}
            />
          </pixiContainer>
        </pixiContainer>
      </pixiContainer>
    </pixiContainer>
  );
}
