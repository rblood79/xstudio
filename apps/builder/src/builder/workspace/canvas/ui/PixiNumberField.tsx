/**
 * Pixi NumberField
 *
 * 🚀 Phase 3: NumberField WebGL 컴포넌트 (Pattern A)
 *
 * 숫자 입력 필드 with +/- 버튼
 * - variant (default, primary, secondary, tertiary, error, filled) 지원
 * - size (sm, md, lg) 지원
 * - decrement/increment 버튼
 *
 * @since 2025-12-16 Phase 3 WebGL Migration
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useMemo, useState } from "react";
import { Graphics as PixiGraphics, TextStyle } from "pixi.js";
import type { Element } from "../../../../types/core/store.types";
import type { CSSStyle } from "../sprites/styleConverter";

// 🚀 Spec Migration
import { resolveTokenColor } from '../hooks/useSpecRenderer';
import {
  NumberFieldSpec,
  getVariantColors as getSpecVariantColors,
  getSizePreset as getSpecSizePreset,
} from '@xstudio/specs';
import type { TokenRef } from '@xstudio/specs';

// ============================================
// Types
// ============================================

export interface PixiNumberFieldProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
}

interface NumberFieldElementProps {
  variant?: "default" | "primary" | "secondary" | "tertiary" | "error" | "filled";
  size?: "sm" | "md" | "lg";
  value?: number;
  label?: string;
  placeholder?: string;
  isDisabled?: boolean;
  style?: CSSStyle;
}

// ============================================
// Component
// ============================================

export const PixiNumberField = memo(function PixiNumberField({
  element,
  onClick,
}: PixiNumberFieldProps) {
  useExtend(PIXI_COMPONENTS);
  const props = element.props as NumberFieldElementProps | undefined;

  // variant, size
  const variant = useMemo(() => String(props?.variant || "default"), [props?.variant]);
  const size = useMemo(() => String(props?.size || "md"), [props?.size]);
  const label = useMemo(() => String(props?.label || ""), [props?.label]);
  const value = useMemo(() => Number(props?.value ?? 0), [props?.value]);
  const isDisabled = Boolean(props?.isDisabled);

  // 🚀 CSS / Spec에서 프리셋 읽기
  const sizePreset = useMemo(() => {
    const sizeSpec = NumberFieldSpec.sizes[size] || NumberFieldSpec.sizes[NumberFieldSpec.defaultSize];
    const specPreset = getSpecSizePreset(sizeSpec, 'light');
    // NumberField has extra fields not in spec, provide fallback
    return {
      ...specPreset,
      paddingY: specPreset.paddingY,
      paddingX: specPreset.paddingX,
      buttonWidth: 36,
      inputWidth: specPreset.height * 2.5,
      labelFontSize: specPreset.fontSize - 2,
    };
  }, [size]);

  const colorPreset = useMemo(() => {
    const variantSpec = NumberFieldSpec.variants[variant] || NumberFieldSpec.variants[NumberFieldSpec.defaultVariant];
    const vc = getSpecVariantColors(variantSpec, 'light');
    return {
      backgroundColor: vc.bg,
      textColor: vc.text,
      borderColor: vc.border ?? 0x79747e,
      labelColor: vc.text,
      buttonBgColor: resolveTokenColor('{color.surface-container}' as TokenRef, 'light'),
      buttonHoverBgColor: resolveTokenColor('{color.surface-container-high}' as TokenRef, 'light'),
    };
  }, [variant]);

  // hover 상태 관리
  const [hoveredButton, setHoveredButton] = useState<"decrement" | "increment" | null>(null);

  // 전체 너비/높이 계산
  const inputHeight = sizePreset.paddingY * 2 + sizePreset.fontSize;

  // 버튼 그리기 (decrement)
  const drawDecrementButton = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      const isHovered = hoveredButton === "decrement";
      const bgColor = isDisabled
        ? 0x00000011
        : isHovered
        ? colorPreset.buttonHoverBgColor
        : colorPreset.buttonBgColor;

      // 왼쪽 둥근 모서리
      g.roundRect(0, 0, sizePreset.buttonWidth, inputHeight, sizePreset.borderRadius);
      g.fill({ color: bgColor });
      g.setStrokeStyle({ width: 1, color: colorPreset.borderColor });
      g.stroke();
    },
    [hoveredButton, isDisabled, colorPreset, sizePreset, inputHeight]
  );

  // 버튼 그리기 (increment)
  const drawIncrementButton = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      const isHovered = hoveredButton === "increment";
      const bgColor = isDisabled
        ? 0x00000011
        : isHovered
        ? colorPreset.buttonHoverBgColor
        : colorPreset.buttonBgColor;

      // 오른쪽 둥근 모서리
      g.roundRect(0, 0, sizePreset.buttonWidth, inputHeight, sizePreset.borderRadius);
      g.fill({ color: bgColor });
      g.setStrokeStyle({ width: 1, color: colorPreset.borderColor });
      g.stroke();
    },
    [hoveredButton, isDisabled, colorPreset, sizePreset, inputHeight]
  );

  // Input 영역 그리기
  const drawInput = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.rect(0, 0, sizePreset.inputWidth, inputHeight);
      g.fill({ color: colorPreset.backgroundColor });
      g.setStrokeStyle({ width: 1, color: colorPreset.borderColor });
      g.stroke();
    },
    [colorPreset, sizePreset, inputHeight]
  );

  // 텍스트 스타일
  const buttonTextStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily: "Pretendard, sans-serif",
        fontSize: sizePreset.fontSize,
        fill: isDisabled ? 0x9ca3af : colorPreset.textColor,
        fontWeight: "500",
      }),
    [sizePreset.fontSize, isDisabled, colorPreset.textColor]
  );

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
        fill: isDisabled ? 0x9ca3af : colorPreset.textColor,
        fontWeight: "400",
      }),
    [sizePreset.fontSize, isDisabled, colorPreset.textColor]
  );

  // 클릭 핸들러
  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [onClick, element.id]);

  return (
    <pixiContainer>
      {/* 라벨 */}
      {label && (
        <pixiText text={label} style={labelTextStyle} />
      )}

      {/* NumberField 그룹 */}
      <pixiContainer>
        {/* Decrement 버튼 */}
        <pixiContainer>
          <pixiGraphics
            draw={drawDecrementButton}
            eventMode="static"
            cursor="default"
            onPointerEnter={() => !isDisabled && setHoveredButton("decrement")}
            onPointerLeave={() => setHoveredButton(null)}
            onPointerDown={handleClick}
          />
          <pixiText
            text="−"
            style={buttonTextStyle}
          />
        </pixiContainer>

        {/* Input 영역 */}
        <pixiContainer>
          <pixiGraphics
            draw={drawInput}
            eventMode="static"
            cursor="default"
            onPointerDown={handleClick}
          />
          <pixiText
            text={String(value)}
            style={valueTextStyle}
          />
        </pixiContainer>

        {/* Increment 버튼 */}
        <pixiContainer>
          <pixiGraphics
            draw={drawIncrementButton}
            eventMode="static"
            cursor="default"
            onPointerEnter={() => !isDisabled && setHoveredButton("increment")}
            onPointerLeave={() => setHoveredButton(null)}
            onPointerDown={handleClick}
          />
          <pixiText
            text="+"
            style={buttonTextStyle}
          />
        </pixiContainer>
      </pixiContainer>
    </pixiContainer>
  );
});

export default PixiNumberField;
