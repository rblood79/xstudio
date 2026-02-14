/**
 * PixiTimeField - WebGL Time Field Component
 *
 * Phase 6: Date/Color Components
 * Pattern: Pattern A (JSX + Graphics.draw) - Time input with segments
 *
 * CSS 동기화:
 * - getTimeFieldSizePreset(): fontSize, height, padding, gap
 * - getTimeFieldColorPreset(): backgroundColor, borderColor, textColor
 */

import { useCallback, useMemo } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import {
  TimeFieldSpec,
  getVariantColors as getSpecVariantColors,
  getSizePreset as getSpecSizePreset,
} from '@xstudio/specs';

export interface PixiTimeFieldProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

/**
 * PixiTimeField - Time input with hour/minute/second segments
 */
export function PixiTimeField({
  element,
  isSelected = false,
  onClick,
}: PixiTimeFieldProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const value = (props.value as string) || '12:00';
  const hourCycle = (props.hourCycle as number) || 12;
  const showSeconds = (props.showSeconds as boolean) ?? false;

  const sizePreset = useMemo(() => {
    const sizeSpec = TimeFieldSpec.sizes[size] || TimeFieldSpec.sizes[TimeFieldSpec.defaultSize];
    return getSpecSizePreset(sizeSpec, 'light');
  }, [size]);

  const variantColors = useMemo(() => {
    const variantSpec = TimeFieldSpec.variants[variant] || TimeFieldSpec.variants[TimeFieldSpec.defaultVariant];
    return getSpecVariantColors(variantSpec, 'light');
  }, [variant]);

  // 색상 프리셋 값들 (테마 색상 적용)
  const colorPreset = useMemo(() => ({
    backgroundColor: 0xffffff,
    borderColor: 0xd1d5db,
    focusBorderColor: variantColors.bg,
    textColor: variantColors.text,
    placeholderColor: 0x9ca3af,
  }), [variantColors]);

  // Parse time value
  const timeParts = useMemo(() => {
    const [time, period] = value.split(' ');
    const parts = time.split(':');
    return {
      hour: parts[0] || '12',
      minute: parts[1] || '00',
      second: parts[2] || '00',
      period: period || (hourCycle === 12 ? 'PM' : ''),
    };
  }, [value, hourCycle]);

  // Calculate width based on segments
  const segmentWidth = sizePreset.fontSize * 1.5;
  const separatorWidth = sizePreset.fontSize * 0.5;
  const containerWidth = useMemo(() => {
    let width = sizePreset.padding * 2;
    width += segmentWidth * 2; // hour
    width += separatorWidth; // :
    width += segmentWidth * 2; // minute
    if (showSeconds) {
      width += separatorWidth; // :
      width += segmentWidth * 2; // second
    }
    if (hourCycle === 12) {
      width += sizePreset.gap;
      width += segmentWidth * 1.5; // AM/PM
    }
    return width;
  }, [sizePreset, segmentWidth, separatorWidth, showSeconds, hourCycle]);

  // Draw container
  const drawContainer = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Background
      g.roundRect(0, 0, containerWidth, sizePreset.height, sizePreset.borderRadius);
      g.fill({ color: colorPreset.backgroundColor });
      g.stroke({
        color: isSelected ? colorPreset.focusBorderColor : colorPreset.borderColor,
        width: 1,
      });

      // Selection indicator
      if (isSelected) {
        g.roundRect(-2, -2, containerWidth + 4, sizePreset.height + 4, sizePreset.borderRadius + 2);
        g.stroke({ color: colorPreset.focusBorderColor, width: 2 });
      }
    },
    [containerWidth, sizePreset, colorPreset, isSelected]
  );

  // Text style
  const textStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.fontSize,
      fill: colorPreset.textColor,
      fontFamily: 'monospace',
    }),
    [sizePreset, colorPreset]
  );

  const separatorStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.fontSize,
      fill: colorPreset.placeholderColor,
      fontFamily: 'monospace',
    }),
    [sizePreset, colorPreset]
  );

  // Calculate segment positions
  let currentX = sizePreset.padding;
  const centerY = sizePreset.height / 2 - sizePreset.fontSize / 2;

  const segments: Array<{ text: string; x: number; isSeparator: boolean }> = [];

  // Hour
  segments.push({ text: timeParts.hour.padStart(2, '0'), x: currentX, isSeparator: false });
  currentX += segmentWidth * 1.2;

  // Separator
  segments.push({ text: ':', x: currentX, isSeparator: true });
  currentX += separatorWidth;

  // Minute
  segments.push({ text: timeParts.minute.padStart(2, '0'), x: currentX, isSeparator: false });
  currentX += segmentWidth * 1.2;

  if (showSeconds) {
    // Separator
    segments.push({ text: ':', x: currentX, isSeparator: true });
    currentX += separatorWidth;

    // Second
    segments.push({ text: timeParts.second.padStart(2, '0'), x: currentX, isSeparator: false });
    currentX += segmentWidth * 1.2;
  }

  if (hourCycle === 12) {
    currentX += sizePreset.gap;
    segments.push({ text: timeParts.period, x: currentX, isSeparator: false });
  }

  return (
    <pixiContainer
      eventMode="static"
      cursor="default"
      onPointerTap={() => onClick?.(element.id)}
    >
      {/* Container background */}
      <pixiGraphics draw={drawContainer} />

      {/* Time segments */}
      {segments.map((segment, index) => (
        <pixiText
          key={index}
          text={segment.text}
          style={segment.isSeparator ? separatorStyle : textStyle}
          x={segment.x}
          y={centerY}
        />
      ))}
    </pixiContainer>
  );
}
