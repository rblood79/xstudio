/**
 * PixiForm - WebGL Form Container Component
 *
 * Phase 7: Form & Utility Components
 * Pattern: Pattern A (JSX + Graphics.draw) - Form container with children slots
 *
 * CSS 동기화:
 * - getFormSizePreset(): padding, gap, borderRadius
 * - getFormColorPreset(): backgroundColor, borderColor
 */

import { useCallback, useMemo } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { Graphics as PixiGraphics, TextStyle } from 'pixi.js';
import type { Element } from '@/types/core/store.types';
import {
  getFormSizePreset,
  getFormColorPreset,
} from '../utils/cssVariableReader';

export interface PixiFormProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

/**
 * PixiForm - Form container with visual representation
 */
export function PixiForm({
  element,
  isSelected = false,
  onClick,
}: PixiFormProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props || {};
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const showBorder = (props.showBorder as boolean) ?? true;

  // Get presets from CSS
  const sizePreset = useMemo(() => getFormSizePreset(size), [size]);
  const colorPreset = useMemo(() => getFormColorPreset(variant), [variant]);

  // Calculate dimensions
  const formWidth = (props.width as number) || 320;
  const formHeight = (props.height as number) || 200;

  // Draw form container
  const drawContainer = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // Background
      g.roundRect(0, 0, formWidth, formHeight, sizePreset.borderRadius);
      g.fill({ color: colorPreset.backgroundColor });

      // Border
      if (showBorder) {
        g.stroke({ color: colorPreset.borderColor, width: 1 });
      }

      // Selection indicator
      if (isSelected) {
        g.roundRect(-2, -2, formWidth + 4, formHeight + 4, sizePreset.borderRadius + 2);
        g.stroke({ color: 0x3b82f6, width: 2 });
      }
    },
    [formWidth, formHeight, sizePreset, colorPreset, showBorder, isSelected]
  );

  // Draw form icon (simple form representation)
  const drawFormIcon = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      const iconX = formWidth / 2;
      const iconY = formHeight / 2;
      const lineWidth = 60;
      const lineHeight = 8;
      const lineGap = 16;

      // Draw placeholder lines (representing form fields)
      for (let i = 0; i < 3; i++) {
        const y = iconY - lineGap + i * lineGap;
        g.roundRect(iconX - lineWidth / 2, y - lineHeight / 2, lineWidth, lineHeight, 4);
        g.fill({ color: colorPreset.separatorColor });
      }
    },
    [formWidth, formHeight, colorPreset]
  );

  // Label style
  const labelStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: sizePreset.labelFontSize,
      fill: colorPreset.labelColor,
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: '500',
    }),
    [sizePreset, colorPreset]
  );

  return (
    <pixiContainer
      eventMode="static"
      cursor="pointer"
      onpointertap={() => onClick?.(element.id)}
    >
      {/* Form container */}
      <pixiGraphics draw={drawContainer} />

      {/* Form field placeholders */}
      <pixiGraphics draw={drawFormIcon} />

      {/* Form label indicator */}
      <Text
        text="Form"
        style={labelStyle}
        x={sizePreset.padding}
        y={sizePreset.padding}
        alpha={0.5}
      />
    </pixiContainer>
  );
}
