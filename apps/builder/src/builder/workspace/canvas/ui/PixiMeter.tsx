/**
 * Pixi Meter
 *
 * 🚀 Phase 1: Meter WebGL 컴포넌트 (Pattern A)
 *
 * JSX + Graphics.draw() 패턴을 사용한 미터 컴포넌트
 * - variant (default, primary, secondary, tertiary, error, surface) 지원
 * - size (sm, md, lg) 지원
 * - label과 value 표시 지원
 * - formatOptions으로 값 포맷팅 지원
 *
 * @since 2025-12-16 Phase 1 WebGL Migration
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useMemo } from "react";
import {
  Graphics as PixiGraphics,
  TextStyle,
} from "pixi.js";
import type { Element } from "../../../../types/core/store.types";
import type { CSSStyle } from "../sprites/styleConverter";
import { toLayoutSize } from "../layout/styleToLayout";
import { drawBox } from "../utils";
import { cssColorToHex } from "../sprites/styleConverter";

// 🚀 Component Spec
import {
  MeterSpec,
  METER_FILL_COLORS,
  METER_DIMENSIONS,
  getVariantColors as getSpecVariantColors,
  getSizePreset as getSpecSizePreset,
} from '@xstudio/specs';

// ============================================
// Types
// ============================================

export interface PixiMeterProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
}

interface MeterElementProps {
  value?: number;
  minValue?: number;
  maxValue?: number;
  label?: string;
  showValue?: boolean;
  valueFormat?: "number" | "percent" | "custom";
  formatOptions?: {
    style?: string;
    unit?: string;
    locale?: string;
  };
  variant?: "default" | "primary" | "secondary" | "tertiary" | "error" | "surface";
  size?: "sm" | "md" | "lg";
  style?: CSSStyle;
}

// ============================================
// Helper Functions
// ============================================

/**
 * 값을 포맷팅
 */
function formatMeterValue(
  value: number,
  minValue: number,
  maxValue: number,
  format: string,
  formatOptions?: MeterElementProps["formatOptions"]
): string {
  const percent = ((value - minValue) / (maxValue - minValue)) * 100;

  switch (format) {
    case "percent":
      return `${Math.round(percent)}%`;
    case "custom":
      if (formatOptions?.style === "unit" && formatOptions?.unit) {
        return `${value} ${formatOptions.unit}`;
      }
      return String(value);
    default:
      return String(value);
  }
}

// ============================================
// Component
// ============================================

export const PixiMeter = memo(function PixiMeter({
  element,
  onClick,
}: PixiMeterProps) {
  useExtend(PIXI_COMPONENTS);
  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as MeterElementProps | undefined;

  // 값 설정
  const value = useMemo(() => {
    const v = Number(props?.value ?? 50);
    return Math.max(props?.minValue ?? 0, Math.min(props?.maxValue ?? 100, v));
  }, [props?.value, props?.minValue, props?.maxValue]);

  const minValue = useMemo(() => Number(props?.minValue ?? 0), [props?.minValue]);
  const maxValue = useMemo(() => Number(props?.maxValue ?? 100), [props?.maxValue]);

  // 퍼센트 계산
  const percent = useMemo(() => {
    return ((value - minValue) / (maxValue - minValue)) * 100;
  }, [value, minValue, maxValue]);

  // variant와 size
  const variant = useMemo(() => String(props?.variant || "default"), [props?.variant]);
  const size = useMemo(() => String(props?.size || "md"), [props?.size]);

  // 🚀 Spec Migration
  const sizePreset = useMemo(() => {
    const sizeSpec = MeterSpec.sizes[size] || MeterSpec.sizes[MeterSpec.defaultSize];
    return getSpecSizePreset(sizeSpec, 'light');
  }, [size]);

  // 🚀 Spec Migration: variant에 따른 테마 색상
  const variantColors = useMemo(() => {
    const variantSpec = MeterSpec.variants[variant] || MeterSpec.variants[MeterSpec.defaultVariant];
    return getSpecVariantColors(variantSpec, 'light');
  }, [variant]);

  // 트랙 색상 (gray-200)과 라벨/값 색상
  const trackColor = 0xe5e7eb;
  const labelColor = cssColorToHex(undefined, variantColors.text);
  const valueColor = cssColorToHex(undefined, variantColors.text);

  // 라벨과 값 표시 여부
  const label = useMemo(() => String(props?.label || ""), [props?.label]);
  const showValue = props?.showValue !== false;
  const valueFormat = useMemo(() => String(props?.valueFormat || "percent"), [props?.valueFormat]);

  // 포맷된 값
  const formattedValue = useMemo(() => {
    return formatMeterValue(value, minValue, maxValue, valueFormat, props?.formatOptions);
  }, [value, minValue, maxValue, valueFormat, props?.formatOptions]);

  // 크기 계산
  // 🚀 Phase 8: parseCSSSize 제거 - CSS 프리셋 값 사용
  const meterWidthValue = typeof style?.width === 'number' ? style.width : sizePreset.width;
  const barHeight = sizePreset.barHeight;
  const fillWidth = (meterWidthValue * percent) / 100;

  // layout prop용
  const meterLayoutWidth = toLayoutSize(style?.width, sizePreset.width);
  const meterWidth = meterWidthValue;

  // 전체 높이 계산 (라벨/값 + 갭 + 바)
  const hasLabelRow = label || showValue;

  // 트랙(배경) 그리기
  const drawTrack = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      drawBox(g, {
        width: meterWidth,
        height: barHeight,
        backgroundColor: trackColor,
        backgroundAlpha: 1,
        borderRadius: sizePreset.borderRadius,
      });
    },
    [meterWidth, barHeight, trackColor, sizePreset.borderRadius]
  );

  // 채우기 그리기 - 🚀 테마 색상 사용
  const drawFill = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      if (fillWidth > 0) {
        drawBox(g, {
          width: fillWidth,
          height: barHeight,
          backgroundColor: variantColors.bg,
          backgroundAlpha: 1,
          borderRadius: sizePreset.borderRadius,
        });
      }
    },
    [fillWidth, barHeight, variantColors.bg, sizePreset.borderRadius]
  );

  // 클릭 핸들러
  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  // 라벨 텍스트 스타일 - 🚀 테마 색상 사용
  const labelTextStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily: "Pretendard, sans-serif",
        fontSize: sizePreset.fontSize,
        fill: labelColor,
      }),
    [sizePreset.fontSize, labelColor]
  );

  // 값 텍스트 스타일 - 🚀 테마 색상 사용
  const valueTextStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily: "Pretendard, sans-serif",
        fontSize: sizePreset.fontSize,
        fill: valueColor,
      }),
    [sizePreset.fontSize, valueColor]
  );

  // 🚀 Phase 12: 루트 레이아웃
  const rootLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    width: meterLayoutWidth,
    gap: sizePreset.gap,
  }), [meterLayoutWidth, sizePreset.gap]);

  // 🚀 Phase 12: 라벨 행 레이아웃
  const labelRowLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  }), []);

  // 🚀 Phase 12: 바 컨테이너 레이아웃
  const barContainerLayout = useMemo(() => ({
    width: '100%' as const,
    height: barHeight,
    position: 'relative' as const,
  }), [barHeight]);

  return (
    <pixiContainer
      layout={rootLayout}
      eventMode="static"
      cursor="default"
      onPointerDown={handleClick}
    >
      {/* 라벨과 값 행 */}
      {hasLabelRow && (
        <pixiContainer layout={labelRowLayout}>
          {/* 라벨 (왼쪽) */}
          {label && (
            <pixiText
              text={label}
              style={labelTextStyle}
              layout={{ isLeaf: true }}
              eventMode="none"
            />
          )}

          {/* 값 (오른쪽) */}
          {showValue && (
            <pixiText
              text={formattedValue}
              style={valueTextStyle}
              layout={{ isLeaf: true }}
              eventMode="none"
            />
          )}
        </pixiContainer>
      )}

      {/* 바 컨테이너 */}
      <pixiContainer layout={barContainerLayout}>
        {/* 트랙 (배경) - position: absolute */}
        <pixiGraphics
          draw={drawTrack}
          layout={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          eventMode="none"
        />

        {/* 채우기 - position: absolute */}
        <pixiGraphics
          draw={drawFill}
          layout={{ position: 'absolute', top: 0, left: 0 }}
          eventMode="none"
        />
      </pixiContainer>
    </pixiContainer>
  );
});

export default PixiMeter;
