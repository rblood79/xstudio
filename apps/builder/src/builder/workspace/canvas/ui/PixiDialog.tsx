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
  const totalWidth = containerWidth + backdropPadding * 2;
  const totalHeight = containerHeight + backdropPadding * 2;

  // Draw backdrop
  const drawBackdrop = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      if (showBackdrop) {
        g.rect(0, 0, totalWidth, totalHeight);
        g.fill({ color: colorPreset.backdropColor });
      }
    },
    [totalWidth, totalHeight, colorPreset, showBackdrop]
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

  // Button dimensions
  const btnWidth = 80;
  const btnHeight = 32;

  // 🚀 Phase 8: 주 컨테이너 layout (iframe CSS와 동기화)
  // CSS: .react-aria-Dialog { padding: var(--spacing-lg); }
  const dialogLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    width: totalWidth,
    height: totalHeight,
    position: 'relative' as const,
    // 콘텐츠 크기에 맞춤 (부모 flex에서 늘어나지 않도록)
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'flex-start' as const,
  }), [totalWidth, totalHeight]);

  // 🚀 Phase 12: Dialog 내부 컨테이너 레이아웃
  const dialogInnerLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    position: 'absolute' as const,
    top: showBackdrop ? backdropPadding : 0,
    left: showBackdrop ? backdropPadding : 0,
    width: containerWidth,
    height: containerHeight,
  }), [showBackdrop, backdropPadding, containerWidth, containerHeight]);

  // 🚀 Phase 12: 타이틀 영역 레이아웃
  const titleAreaLayout = useMemo(() => ({
    display: 'flex' as const,
    alignItems: 'center' as const,
    paddingLeft: sizePreset.padding,
    paddingRight: sizePreset.padding,
    paddingTop: sizePreset.padding,
    height: titleHeight,
  }), [sizePreset.padding, titleHeight]);

  // 🚀 Phase 12: 콘텐츠 영역 레이아웃
  const contentAreaLayout = useMemo(() => ({
    display: 'flex' as const,
    paddingLeft: sizePreset.padding,
    paddingRight: sizePreset.padding,
    paddingTop: sizePreset.padding * 0.5,
    flexGrow: 1,
  }), [sizePreset.padding]);

  // 🚀 Phase 12: 버튼 영역 레이아웃
  const buttonAreaLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingLeft: sizePreset.padding,
    paddingRight: sizePreset.padding,
    height: buttonAreaHeight,
  }), [sizePreset.padding, buttonAreaHeight]);

  // 🚀 Phase 12: 버튼 레이아웃
  const buttonLayout = useMemo(() => ({
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    width: btnWidth,
    height: btnHeight,
  }), [btnWidth, btnHeight]);

  return (
    <pixiContainer
      layout={dialogLayout}
      eventMode="static"
      cursor="pointer"
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onPointerTap={() => onClick?.(element.id)}
    >
      {/* Backdrop (optional visual representation) - position: absolute */}
      {showBackdrop && (
        <pixiGraphics
          draw={drawBackdrop}
          layout={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        />
      )}

      {/* Dialog container - position: absolute */}
      <pixiContainer layout={dialogInnerLayout}>
        {/* Dialog background - position: absolute */}
        <pixiGraphics
          draw={drawDialog}
          layout={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        />

        {/* Title area */}
        <pixiContainer layout={titleAreaLayout}>
          <pixiText
            text={title}
            style={titleStyle}
            layout={{ isLeaf: true }}
          />
        </pixiContainer>

        {/* Content area */}
        <pixiContainer layout={contentAreaLayout}>
          <pixiText
            text={content}
            style={contentStyle}
            layout={{ isLeaf: true }}
          />
        </pixiContainer>

        {/* Button area */}
        <pixiContainer layout={buttonAreaLayout}>
          {/* Cancel button */}
          <pixiContainer layout={buttonLayout}>
            <pixiText
              text="Cancel"
              style={cancelBtnStyle}
              layout={{ isLeaf: true }}
            />
          </pixiContainer>

          {/* Confirm button */}
          <pixiContainer layout={buttonLayout}>
            <pixiText
              text="Confirm"
              style={confirmBtnStyle}
              layout={{ isLeaf: true }}
            />
          </pixiContainer>
        </pixiContainer>
      </pixiContainer>
    </pixiContainer>
  );
}
