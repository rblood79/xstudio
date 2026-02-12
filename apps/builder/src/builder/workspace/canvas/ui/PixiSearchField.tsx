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

  // 전체 너비/높이 계산
  const inputHeight = sizePreset.paddingY * 2 + sizePreset.fontSize;

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

  // 🚀 Phase 12: 루트 레이아웃
  const rootLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: 4,
  }), []);

  // 🚀 Phase 12: Input 레이아웃
  const inputLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    width: sizePreset.inputWidth,
    height: inputHeight,
    paddingLeft: sizePreset.paddingX,
    paddingRight: sizePreset.paddingX,
    gap: 4,
    position: 'relative' as const,
  }), [sizePreset.inputWidth, inputHeight, sizePreset.paddingX]);

  // 🚀 Phase 12: 검색 아이콘 스타일
  const iconTextStyle = useMemo(() => new TextStyle({
    fontFamily: "Pretendard, sans-serif",
    fontSize: sizePreset.fontSize - 2,
    fill: colorPreset.placeholderColor,
  }), [sizePreset.fontSize, colorPreset.placeholderColor]);

  // 🚀 Phase 12: Clear 버튼 레이아웃
  const clearButtonLayout = useMemo(() => ({
    position: 'absolute' as const,
    right: sizePreset.paddingX,
    top: (inputHeight - sizePreset.clearButtonSize) / 2,
  }), [sizePreset.paddingX, inputHeight, sizePreset.clearButtonSize]);

  return (
    <pixiContainer layout={rootLayout}>
      {/* 라벨 */}
      {label && (
        <pixiText text={label} style={labelTextStyle} layout={{ isLeaf: true }} />
      )}

      {/* SearchField 그룹 */}
      <pixiContainer layout={inputLayout}>
        {/* Input 배경 - position: absolute */}
        <pixiGraphics
          draw={drawInput}
          layout={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          eventMode="static"
          cursor="text"
          onPointerDown={handleClick}
        />

        {/* 검색 아이콘 */}
        <pixiText
          text="🔍"
          style={iconTextStyle}
          layout={{ isLeaf: true }}
        />

        {/* 값 또는 placeholder */}
        <pixiText
          text={hasValue ? value : placeholder}
          style={valueTextStyle}
          layout={{ isLeaf: true, flexGrow: 1 }}
        />

        {/* Clear 버튼 */}
        {hasValue && (
          <pixiGraphics
            draw={drawClearButton}
            layout={clearButtonLayout}
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
