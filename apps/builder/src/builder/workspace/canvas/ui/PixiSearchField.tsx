/**
 * Pixi SearchField
 *
 * 🚀 Phase 3: SearchField WebGL 컴포넌트 (Pattern A)
 *
 * 검색 입력 필드 with clear 버튼
 * - variant (default, primary, secondary, tertiary, error, filled) 지원
 * - size (sm, md, lg) 지원
 * - clear 버튼 (값이 있을 때만 표시)
 *
 * @since 2025-12-16 Phase 3 WebGL Migration
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useMemo, useState } from "react";
import { Graphics as PixiGraphics, TextStyle } from "pixi.js";
import type { Element } from "../../../../types/core/store.types";
import type { CSSStyle } from "../sprites/styleConverter";
import { parseCSSSize } from "../sprites/styleConverter";
import {
  getSearchFieldSizePreset,
  getSearchFieldColorPreset,
} from "../utils/cssVariableReader";

// ============================================
// Types
// ============================================

export interface PixiSearchFieldProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
}

interface SearchFieldElementProps {
  variant?: "default" | "primary" | "secondary" | "tertiary" | "error" | "filled";
  size?: "sm" | "md" | "lg";
  value?: string;
  label?: string;
  placeholder?: string;
  isDisabled?: boolean;
  style?: CSSStyle;
}

// ============================================
// Component
// ============================================

export const PixiSearchField = memo(function PixiSearchField({
  element,
  onClick,
}: PixiSearchFieldProps) {
  useExtend(PIXI_COMPONENTS);
  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as SearchFieldElementProps | undefined;

  // variant, size
  const variant = useMemo(() => String(props?.variant || "default"), [props?.variant]);
  const size = useMemo(() => String(props?.size || "md"), [props?.size]);
  const label = useMemo(() => String(props?.label || ""), [props?.label]);
  const value = useMemo(() => String(props?.value || ""), [props?.value]);
  const placeholder = useMemo(() => String(props?.placeholder || "Search..."), [props?.placeholder]);
  const isDisabled = Boolean(props?.isDisabled);
  const hasValue = value.length > 0;

  // 🚀 CSS에서 프리셋 읽기
  const sizePreset = useMemo(() => getSearchFieldSizePreset(size), [size]);
  const colorPreset = useMemo(() => getSearchFieldColorPreset(variant), [variant]);

  // hover 상태 관리
  const [isClearHovered, setIsClearHovered] = useState(false);

  // 위치
  const posX = parseCSSSize(style?.left, undefined, 0);
  const posY = parseCSSSize(style?.top, undefined, 0);

  // 전체 너비/높이 계산
  const inputHeight = sizePreset.paddingY * 2 + sizePreset.fontSize;
  const labelHeight = label ? sizePreset.labelFontSize + 4 : 0;

  // Input 영역 그리기
  const drawInput = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.roundRect(0, 0, sizePreset.inputWidth, inputHeight, sizePreset.borderRadius);
      g.fill({ color: colorPreset.backgroundColor });
      g.setStrokeStyle({ width: 1, color: colorPreset.borderColor });
      g.stroke();
    },
    [colorPreset, sizePreset, inputHeight]
  );

  // Clear 버튼 그리기
  const drawClearButton = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (!hasValue) return;

      const btnSize = sizePreset.clearButtonSize;
      const bgColor = isClearHovered
        ? colorPreset.clearButtonHoverBgColor
        : colorPreset.clearButtonBgColor;

      // 원형 배경
      g.circle(btnSize / 2, btnSize / 2, btnSize / 2);
      g.fill({ color: bgColor });

      // X 표시
      const crossPadding = btnSize * 0.3;
      g.setStrokeStyle({ width: 2, color: colorPreset.textColor });
      g.moveTo(crossPadding, crossPadding);
      g.lineTo(btnSize - crossPadding, btnSize - crossPadding);
      g.moveTo(btnSize - crossPadding, crossPadding);
      g.lineTo(crossPadding, btnSize - crossPadding);
      g.stroke();
    },
    [hasValue, isClearHovered, colorPreset, sizePreset.clearButtonSize]
  );

  // 텍스트 스타일
  const labelTextStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily: "Pretendard, sans-serif",
        fontSize: sizePreset.labelFontSize,
        fill: colorPreset.labelColor,
        fontWeight: "500",
      }),
    [sizePreset.labelFontSize, colorPreset.labelColor]
  );

  const valueTextStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily: "Pretendard, sans-serif",
        fontSize: sizePreset.fontSize,
        fill: isDisabled ? 0x9ca3af : hasValue ? colorPreset.textColor : colorPreset.placeholderColor,
        fontWeight: "400",
      }),
    [sizePreset.fontSize, isDisabled, hasValue, colorPreset.textColor, colorPreset.placeholderColor]
  );

  // 클릭 핸들러
  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [onClick, element.id]);

  // Clear 버튼 위치
  const clearButtonX = sizePreset.inputWidth - sizePreset.clearButtonSize - sizePreset.paddingX;
  const clearButtonY = (inputHeight - sizePreset.clearButtonSize) / 2;

  return (
    <pixiContainer x={posX} y={posY}>
      {/* 라벨 */}
      {label && (
        <pixiText text={label} style={labelTextStyle} x={0} y={0} />
      )}

      {/* SearchField 그룹 */}
      <pixiContainer y={labelHeight}>
        {/* Input 영역 */}
        <pixiGraphics
          draw={drawInput}
          eventMode="static"
          cursor="text"
          onPointerDown={handleClick}
        />

        {/* 검색 아이콘 (간단한 돋보기) */}
        <pixiText
          text="🔍"
          style={
            new TextStyle({
              fontFamily: "Pretendard, sans-serif",
              fontSize: sizePreset.fontSize - 2,
              fill: colorPreset.placeholderColor,
            })
          }
          x={sizePreset.paddingX}
          y={inputHeight / 2}
          anchor={{ x: 0, y: 0.5 }}
        />

        {/* 값 또는 placeholder */}
        <pixiText
          text={hasValue ? value : placeholder}
          style={valueTextStyle}
          x={sizePreset.paddingX + sizePreset.fontSize + 4}
          y={inputHeight / 2}
          anchor={{ x: 0, y: 0.5 }}
        />

        {/* Clear 버튼 */}
        {hasValue && (
          <pixiGraphics
            draw={drawClearButton}
            x={clearButtonX}
            y={clearButtonY}
            eventMode="static"
            cursor="pointer"
            onPointerEnter={() => setIsClearHovered(true)}
            onPointerLeave={() => setIsClearHovered(false)}
            onPointerDown={handleClick}
          />
        )}
      </pixiContainer>
    </pixiContainer>
  );
});

export default PixiSearchField;
