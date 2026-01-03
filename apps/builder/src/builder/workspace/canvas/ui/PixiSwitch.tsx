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
import type { CSSStyle } from '../sprites/styleConverter';
import { parseCSSSize } from '../sprites/styleConverter';
import {
  getSwitchSizePreset,
  getLabelStylePreset,
  getVariantColors,
} from '../utils/cssVariableReader';
import { useThemeColors } from '../hooks/useThemeColors';

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
  const style = props.style as CSSStyle | undefined;
  const variant = (props.variant as string) || 'default';
  const size = (props.size as string) || 'md';
  const label = (props.label as string) || (props.children as string) || '';
  const isChecked = (props.isSelected as boolean) || (props.checked as boolean) || false;
  const isDisabled = (props.isDisabled as boolean) || false;

  // 위치 계산
  const posX = parseCSSSize(style?.left, undefined, 0);
  const posY = parseCSSSize(style?.top, undefined, 0);

  // Get presets from CSS
  const sizePreset = useMemo(() => getSwitchSizePreset(size), [size]);

  // 🚀 테마 색상 동적 로드
  const themeColors = useThemeColors();

  // 🚀 variant에 따른 테마 색상
  const variantColors = useMemo(
    () => getVariantColors(variant, themeColors),
    [variant, themeColors]
  );

  // 색상 프리셋 값들 (테마 색상 적용)
  const colorPreset = useMemo(() => ({
    trackColor: 0xd1d5db,
    trackSelectedColor: variantColors.bg,
    thumbColor: 0xffffff,
    thumbBorderColor: 0x00000020,
    disabledTrackColor: 0xe5e7eb,
    disabledThumbColor: 0x9ca3af,
    focusRingColor: variantColors.bg,
  }), [variantColors]);
  // 🚀 Phase 19: .react-aria-Label 클래스에서 스타일 읽기
  const labelPreset = useMemo(() => getLabelStylePreset(size), [size]);

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
  // 🚀 Phase 19: .react-aria-Label 클래스에서 스타일 읽기
  const labelStyle = useMemo<Partial<TextStyle>>(
    () => ({
      fontSize: labelPreset.fontSize,
      fill: isDisabled ? colorPreset.disabledThumbColor : labelPreset.color,
      fontFamily: labelPreset.fontFamily,
    }),
    [labelPreset, colorPreset, isDisabled]
  );

  // 🚀 Phase 19: 전체 크기 계산 (hitArea용)
  const totalWidth = label
    ? sizePreset.trackWidth + sizePreset.gap + label.length * labelPreset.fontSize * 0.6
    : sizePreset.trackWidth;
  const totalHeight = sizePreset.trackHeight;

  // 🚀 Phase 19: 투명 히트 영역
  const drawHitArea = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.rect(0, 0, totalWidth, totalHeight);
      g.fill({ color: 0xffffff, alpha: 0 });
    },
    [totalWidth, totalHeight]
  );

  // 클릭 핸들러
  const handleClick = useCallback(() => {
    if (!isDisabled) {
      onClick?.(element.id);
    }
  }, [element.id, onClick, isDisabled]);

  return (
    <pixiContainer x={posX} y={posY}>
      {/* Track */}
      <pixiGraphics draw={drawTrack} />

      {/* Thumb */}
      <pixiGraphics draw={drawThumb} x={thumbX} y={thumbY} />

      {/* Label */}
      {label && (
        <pixiText
          text={label}
          style={labelStyle}
          x={sizePreset.trackWidth + sizePreset.gap}
          y={(sizePreset.trackHeight - labelPreset.fontSize) / 2}
        />
      )}

      {/* 🚀 Phase 19: 투명 히트 영역 (클릭 감지용) - 마지막에 렌더링하여 최상단 배치 */}
      <pixiGraphics
        draw={drawHitArea}
        eventMode="static"
        cursor={isDisabled ? 'not-allowed' : 'pointer'}
        onPointerDown={handleClick}
      />
    </pixiContainer>
  );
}
