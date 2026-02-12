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

// 🚀 Spec Migration
import { resolveTokenColor, getLabelStylePreset } from '../hooks/useSpecRenderer';
import {
  SwitchSpec,
  SWITCH_SELECTED_TRACK_COLORS,
  SWITCH_DIMENSIONS,
  getVariantColors as getSpecVariantColors,
  getSizePreset as getSpecSizePreset,
} from '@xstudio/specs';

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

  // Get presets from CSS / Spec
  const sizePreset = useMemo(() => {
    const dims = SWITCH_DIMENSIONS[size] ?? SWITCH_DIMENSIONS.md;
    const sizeSpec = SwitchSpec.sizes[size] || SwitchSpec.sizes[SwitchSpec.defaultSize];
    const specPreset = getSpecSizePreset(sizeSpec, 'light');
    return {
      ...dims,
      borderRadius: dims.trackHeight / 2,
      gap: specPreset.gap ?? 10,
      fontSize: specPreset.fontSize,
    };
  }, [size]);

  // 🚀 variant에 따른 테마 색상
  const variantColors = useMemo(() => {
    const variantSpec = SwitchSpec.variants[variant] || SwitchSpec.variants[SwitchSpec.defaultVariant];
    return getSpecVariantColors(variantSpec, 'light');
  }, [variant]);

  // 색상 프리셋 값들 (테마 색상 적용)
  const colorPreset = useMemo(() => {
    const selectedTrackColor = resolveTokenColor(
      SWITCH_SELECTED_TRACK_COLORS[variant] ?? SWITCH_SELECTED_TRACK_COLORS.default,
      'light',
    );
    return {
      trackColor: variantColors.bg,
      trackSelectedColor: selectedTrackColor,
      thumbColor: 0xffffff,
      thumbBorderColor: 0x00000020,
      disabledTrackColor: 0xe5e7eb,
      disabledThumbColor: 0x9ca3af,
      focusRingColor: selectedTrackColor,
    };
  }, [variant, variantColors]);
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

  // 🚀 Phase 12: 루트 컨테이너 레이아웃
  const rootLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: sizePreset.gap,
    position: 'relative' as const,
  }), [sizePreset.gap]);

  // 🚀 Phase 12: 트랙 컨테이너 레이아웃 (thumb 배치용)
  const trackLayout = useMemo(() => ({
    width: sizePreset.trackWidth,
    height: sizePreset.trackHeight,
    position: 'relative' as const,
  }), [sizePreset.trackWidth, sizePreset.trackHeight]);

  // 🚀 Phase 12: Thumb 레이아웃 (position: absolute)
  const thumbLayout = useMemo(() => ({
    position: 'absolute' as const,
    left: thumbX,
    top: thumbY,
  }), [thumbX, thumbY]);

  return (
    <pixiContainer layout={rootLayout}>
      {/* Track + Thumb 컨테이너 */}
      <pixiContainer layout={trackLayout}>
        {/* Track - position: absolute */}
        <pixiGraphics
          draw={drawTrack}
          layout={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        />

        {/* Thumb - position: absolute */}
        <pixiGraphics draw={drawThumb} layout={thumbLayout} />
      </pixiContainer>

      {/* Label */}
      {label && (
        <pixiText
          text={label}
          style={labelStyle}
          layout={{ isLeaf: true }}
        />
      )}

      {/* 🚀 Phase 19: 투명 히트 영역 (클릭 감지용) - position: absolute */}
      <pixiGraphics
        draw={drawHitArea}
        layout={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        eventMode="static"
        cursor={isDisabled ? 'not-allowed' : 'pointer'}
        onPointerDown={handleClick}
      />
    </pixiContainer>
  );
}
