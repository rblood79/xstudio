/**
 * PixiSwitch - WebGL Switch/Toggle Component
 *
 * Phase 7: Form & Utility Components
 * Pattern: Pattern A (JSX + Graphics.draw) - Track + Thumb + Label
 *
 * CSS 동기화:
 * - getSwitchSizePreset(): trackWidth, trackHeight, thumbSize
 * - getSwitchColorPreset(): trackColor, trackSelectedColor, thumbColor
 */

import { useCallback, useMemo } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import {
  getSwitchSizePreset,
  getSwitchColorPreset,
} from '../utils/cssVariableReader';

export interface PixiSwitchProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

/**
 * PixiSwitch - Toggle switch with optional label
 */
export function PixiSwitch({
  element,
  isSelected = false,
  onClick,
}: PixiSwitchProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const label = (props.label as string) || (props.children as string) || '';
  const isChecked = (props.isSelected as boolean) || (props.checked as boolean) || false;
  const isDisabled = (props.isDisabled as boolean) || false;

  // Get presets from CSS
  const sizePreset = useMemo(() => getSwitchSizePreset(size), [size]);
  const colorPreset = useMemo(() => getSwitchColorPreset(variant), [variant]);

  // Calculate thumb position
  const thumbX = isChecked
    ? sizePreset.trackWidth - sizePreset.thumbSize - sizePreset.thumbOffset
    : sizePreset.thumbOffset;
  const thumbY = (sizePreset.trackHeight - sizePreset.thumbSize) / 2;

  // Draw track
  const drawTrack = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Track background
      const trackColor = isDisabled
        ? colorPreset.disabledTrackColor
        : isChecked
          ? colorPreset.trackSelectedColor
          : colorPreset.trackColor;
      g.roundRect(0, 0, sizePreset.trackWidth, sizePreset.trackHeight, sizePreset.borderRadius);
      g.fill({ color: trackColor });

      // Selection indicator
      if (isSelected) {
        g.roundRect(-2, -2, sizePreset.trackWidth + 4, sizePreset.trackHeight + 4, sizePreset.borderRadius + 2);
        g.stroke({ color: colorPreset.focusRingColor, width: 2 });
      }
    },
    [sizePreset, colorPreset, isChecked, isDisabled, isSelected]
  );

  // Draw thumb
  const drawThumb = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Thumb circle
      const thumbColor = isDisabled ? colorPreset.disabledThumbColor : colorPreset.thumbColor;
      const thumbRadius = sizePreset.thumbSize / 2;
      g.circle(thumbRadius, thumbRadius, thumbRadius);
      g.fill({ color: thumbColor });

      // Thumb border (subtle shadow effect)
      if (!isDisabled) {
        g.circle(thumbRadius, thumbRadius, thumbRadius);
        g.stroke({ color: colorPreset.thumbBorderColor, width: 0.5 });
      }
    },
    [sizePreset, colorPreset, isDisabled]
  );

  // Label style
  const labelStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.labelFontSize,
      fill: isDisabled ? colorPreset.disabledThumbColor : colorPreset.labelColor,
      fontFamily: 'Inter, system-ui, sans-serif',
    }),
    [sizePreset, colorPreset, isDisabled]
  );

  return (
    <pixiContainer
      eventMode="static"
      cursor={isDisabled ? 'not-allowed' : 'pointer'}
      onpointertap={() => !isDisabled && onClick?.(element.id)}
    >
      {/* Track */}
      <pixiGraphics draw={drawTrack} />

      {/* Thumb */}
      <pixiGraphics draw={drawThumb} x={thumbX} y={thumbY} />

      {/* Label */}
      {label && (
        <Text
          text={label}
          style={labelStyle}
          x={sizePreset.trackWidth + sizePreset.gap}
          y={(sizePreset.trackHeight - sizePreset.labelFontSize) / 2}
        />
      )}
    </pixiContainer>
  );
}
