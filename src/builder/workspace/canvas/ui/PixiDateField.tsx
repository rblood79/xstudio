/**
 * PixiDateField - WebGL Date Field Component
 *
 * Phase 6: Date/Color Components
 * Pattern: Pattern A (JSX + Graphics.draw) - Date input with segments
 *
 * CSS 동기화:
 * - getDateFieldSizePreset(): fontSize, height, padding, gap
 * - getDateFieldColorPreset(): backgroundColor, borderColor, textColor
 */

import { useCallback, useMemo } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import {
  getDateFieldSizePreset,
  getDateFieldColorPreset,
} from '../utils/cssVariableReader';

export interface PixiDateFieldProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

/**
 * PixiDateField - Date input with year/month/day segments
 */
export function PixiDateField({
  element,
  isSelected = false,
  onClick,
}: PixiDateFieldProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const value = (props.value as string) || '2024-01-15';

  // Get presets from CSS
  const sizePreset = useMemo(() => getDateFieldSizePreset(size), [size]);
  const colorPreset = useMemo(() => getDateFieldColorPreset(variant), [variant]);

  // Parse date value
  const dateParts = useMemo(() => {
    const parts = value.split('-');
    return {
      year: parts[0] || '2024',
      month: parts[1] || '01',
      day: parts[2] || '15',
    };
  }, [value]);

  // Calculate width based on segments
  const segmentWidth = sizePreset.fontSize * 1.2;
  const separatorWidth = sizePreset.fontSize * 0.6;
  const containerWidth = useMemo(() => {
    let width = sizePreset.padding * 2;
    width += segmentWidth * 3; // year (4 digits but compact)
    width += separatorWidth; // /
    width += segmentWidth * 1.5; // month
    width += separatorWidth; // /
    width += segmentWidth * 1.5; // day
    return width;
  }, [sizePreset, segmentWidth, separatorWidth]);

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

  // Year
  segments.push({ text: dateParts.year, x: currentX, isSeparator: false });
  currentX += segmentWidth * 2.5;

  // Separator
  segments.push({ text: '/', x: currentX, isSeparator: true });
  currentX += separatorWidth;

  // Month
  segments.push({ text: dateParts.month.padStart(2, '0'), x: currentX, isSeparator: false });
  currentX += segmentWidth * 1.3;

  // Separator
  segments.push({ text: '/', x: currentX, isSeparator: true });
  currentX += separatorWidth;

  // Day
  segments.push({ text: dateParts.day.padStart(2, '0'), x: currentX, isSeparator: false });

  return (
    <pixiContainer
      eventMode="static"
      cursor="text"
      onpointertap={() => onClick?.(element.id)}
    >
      {/* Container background */}
      <pixiGraphics draw={drawContainer} />

      {/* Date segments */}
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
