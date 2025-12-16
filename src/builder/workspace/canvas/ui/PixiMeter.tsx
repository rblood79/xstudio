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
import { parseCSSSize } from "../sprites/styleConverter";
import {
  getMeterSizePreset,
  getMeterColorPreset,
} from "../utils/cssVariableReader";
import { drawBox } from "../utils";

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
  const variant = useMemo(() => String(props?.variant || "primary"), [props?.variant]);
  const size = useMemo(() => String(props?.size || "md"), [props?.size]);

  // 🚀 CSS에서 프리셋 읽기
  const sizePreset = useMemo(() => getMeterSizePreset(size), [size]);
  const colorPreset = useMemo(() => getMeterColorPreset(variant), [variant]);

  // 라벨과 값 표시 여부
  const label = useMemo(() => String(props?.label || ""), [props?.label]);
  const showValue = props?.showValue !== false;
  const valueFormat = useMemo(() => String(props?.valueFormat || "percent"), [props?.valueFormat]);

  // 포맷된 값
  const formattedValue = useMemo(() => {
    return formatMeterValue(value, minValue, maxValue, valueFormat, props?.formatOptions);
  }, [value, minValue, maxValue, valueFormat, props?.formatOptions]);

  // 크기 계산
  const meterWidth = parseCSSSize(style?.width, undefined, sizePreset.width);
  const barHeight = sizePreset.barHeight;
  const fillWidth = (meterWidth * percent) / 100;

  // 전체 높이 계산 (라벨/값 + 갭 + 바)
  const hasLabelRow = label || showValue;
  const labelRowHeight = hasLabelRow ? sizePreset.fontSize + sizePreset.gap : 0;
  const totalHeight = labelRowHeight + barHeight;

  // 위치
  const posX = parseCSSSize(style?.left, undefined, 0);
  const posY = parseCSSSize(style?.top, undefined, 0);

  // 트랙(배경) 그리기
  const drawTrack = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      drawBox(g, {
        width: meterWidth,
        height: barHeight,
        backgroundColor: colorPreset.trackColor,
        backgroundAlpha: 1,
        borderRadius: sizePreset.borderRadius,
      });
    },
    [meterWidth, barHeight, colorPreset.trackColor, sizePreset.borderRadius]
  );

  // 채우기 그리기
  const drawFill = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      if (fillWidth > 0) {
        drawBox(g, {
          width: fillWidth,
          height: barHeight,
          backgroundColor: colorPreset.fillColor,
          backgroundAlpha: 1,
          borderRadius: sizePreset.borderRadius,
        });
      }
    },
    [fillWidth, barHeight, colorPreset.fillColor, sizePreset.borderRadius]
  );

  // 클릭 핸들러
  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  // 라벨 텍스트 스타일
  const labelTextStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily: "Pretendard, sans-serif",
        fontSize: sizePreset.fontSize,
        fill: colorPreset.labelColor,
      }),
    [sizePreset.fontSize, colorPreset.labelColor]
  );

  // 값 텍스트 스타일
  const valueTextStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily: "Pretendard, sans-serif",
        fontSize: sizePreset.fontSize,
        fill: colorPreset.valueColor,
      }),
    [sizePreset.fontSize, colorPreset.valueColor]
  );

  return (
    <pixiContainer
      x={posX}
      y={posY}
      eventMode="static"
      cursor="pointer"
      onPointerDown={handleClick}
    >
      {/* 라벨과 값 행 */}
      {hasLabelRow && (
        <pixiContainer x={0} y={0}>
          {/* 라벨 (왼쪽) */}
          {label && (
            <pixiText
              text={label}
              style={labelTextStyle}
              x={0}
              y={0}
              eventMode="none"
            />
          )}

          {/* 값 (오른쪽) */}
          {showValue && (
            <pixiText
              text={formattedValue}
              style={valueTextStyle}
              x={meterWidth - formattedValue.length * (sizePreset.fontSize * 0.6)}
              y={0}
              eventMode="none"
            />
          )}
        </pixiContainer>
      )}

      {/* 바 컨테이너 */}
      <pixiContainer x={0} y={labelRowHeight}>
        {/* 트랙 (배경) */}
        <pixiGraphics draw={drawTrack} eventMode="none" />

        {/* 채우기 */}
        <pixiGraphics draw={drawFill} eventMode="none" />
      </pixiContainer>
    </pixiContainer>
  );
});

export default PixiMeter;
