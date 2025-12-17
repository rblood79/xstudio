/**
 * Pixi ToggleButton
 *
 * 🚀 Phase 1: ToggleButton WebGL 컴포넌트
 *
 * @pixi/ui의 FancyButton을 사용하여 토글 버튼 렌더링
 * - selected/unselected 상태에 따른 색상 변경
 * - variant (default, primary, secondary, surface) 지원
 * - size (sm, md, lg) 지원
 *
 * @since 2025-12-16 Phase 1 WebGL Migration
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Container as PixiContainer,
  Graphics as PixiGraphicsClass,
  Text as PixiText,
  TextStyle,
  CanvasTextMetrics,
} from "pixi.js";
import { FancyButton } from "@pixi/ui";
import type { Element } from "../../../../types/core/store.types";
import type { CSSStyle } from "../sprites/styleConverter";
import { cssColorToHex, parseCSSSize } from "../sprites/styleConverter";
import { getSizePreset, getVariantColors, type SizePreset } from "../utils/cssVariableReader";
import { useThemeColors } from "../hooks/useThemeColors";
import { drawBox } from "../utils";

// ============================================
// Constants
// ============================================

const MIN_BUTTON_WIDTH = 32;
const MIN_BUTTON_HEIGHT = 24;

// ============================================
// Types
// ============================================

/** Modifier keys for multi-select */
interface ClickModifiers {
  metaKey: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
}

/** Variant colors from theme */
interface VariantColors {
  bg: number;
  bgHover: number;
  bgPressed: number;
  text: number;
  border?: number;
  bgAlpha?: number;
}

interface ToggleButtonElementProps {
  children?: string;
  text?: string;
  label?: string;
  variant?: "default" | "primary" | "secondary" | "tertiary" | "error" | "surface";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  isSelected?: boolean;
  isDisabled?: boolean;
  className?: string;
  style?: CSSStyle;
}

export interface PixiToggleButtonProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string, modifiers?: ClickModifiers) => void;
  onToggle?: (elementId: string, isSelected: boolean) => void;
}

// ============================================
// Style Conversion
// ============================================

// Size preset fallback
const DEFAULT_SIZE_PRESET: SizePreset = { fontSize: 14, paddingX: 12, paddingY: 8, borderRadius: 6 };

interface ToggleButtonLayoutResult {
  left: number;
  top: number;
  width: number;
  height: number;
  // Unselected colors
  backgroundColor: number;
  hoverColor: number;
  pressedColor: number;
  textColor: number;
  borderColor: number;
  // Selected colors (from variant)
  selectedBackgroundColor: number;
  selectedHoverColor: number;
  selectedPressedColor: number;
  selectedTextColor: number;
  selectedBorderColor: number;
  // Common
  borderRadius: number;
  fontSize: number;
  fontFamily: string;
  // State
  isToggleSelected: boolean;
  isDisabled: boolean;
}

/**
 * CSS 스타일과 variant/size에서 토글 버튼 레이아웃 정보 추출
 *
 * 우선순위:
 * 1. inline style (props.style) - 최우선
 * 2. variant/size props - 차선
 * 3. 기본값 - 최후
 *
 * @param unselectedColors - 테마에서 동적으로 가져온 unselected 상태 색상
 * @param selectedColors - 테마에서 동적으로 가져온 selected 상태 색상 (variant별)
 */
function getToggleButtonLayout(
  style: CSSStyle | undefined,
  buttonProps: ToggleButtonElementProps,
  buttonText: string,
  unselectedColors: VariantColors,
  selectedColors: VariantColors
): ToggleButtonLayoutResult {
  const size = buttonProps.size || "sm";
  const isToggleSelected = Boolean(buttonProps.isSelected);
  const isDisabled = Boolean(buttonProps.isDisabled);

  // 🚀 CSS에서 사이즈 프리셋 읽기 (Button과 동일한 패턴)
  const sizePreset = getSizePreset(size) || DEFAULT_SIZE_PRESET;

  // 폰트 설정 (inline style > size preset)
  const fontSize = parseCSSSize(style?.fontSize, undefined, sizePreset.fontSize);
  const fontFamily = style?.fontFamily || "Pretendard, sans-serif";

  // 패딩 (inline style > size preset)
  const paddingTop = parseCSSSize(style?.paddingTop, undefined, sizePreset.paddingY);
  const paddingRight = parseCSSSize(style?.paddingRight, undefined, sizePreset.paddingX);
  const paddingBottom = parseCSSSize(style?.paddingBottom, undefined, sizePreset.paddingY);
  const paddingLeft = parseCSSSize(style?.paddingLeft, undefined, sizePreset.paddingX);

  // 테두리 반경 (inline style > size preset)
  const borderRadius = parseCSSSize(style?.borderRadius, undefined, sizePreset.borderRadius);

  // 테두리 너비
  const borderWidth = parseCSSSize(style?.borderWidth, undefined, 1);

  // 색상 (inline style > theme)
  const hasInlineBg = style?.backgroundColor !== undefined;
  const hasInlineColor = style?.color !== undefined;

  // Unselected 색상
  const backgroundColor = hasInlineBg
    ? cssColorToHex(style?.backgroundColor, unselectedColors.bg)
    : unselectedColors.bg;
  const textColor = hasInlineColor
    ? cssColorToHex(style?.color, unselectedColors.text)
    : unselectedColors.text;
  const borderColor = unselectedColors.border ?? 0xd1d5db;

  // Hover/Pressed 색상 (unselected 상태)
  let hoverColor: number;
  let pressedColor: number;

  if (hasInlineBg) {
    hoverColor = Math.min(backgroundColor + 0x151515, 0xffffff);
    pressedColor = Math.max(backgroundColor - 0x151515, 0x000000);
  } else {
    hoverColor = unselectedColors.bgHover;
    pressedColor = unselectedColors.bgPressed;
  }

  // Selected 색상 (variant에서)
  const selectedBackgroundColor = selectedColors.bg;
  const selectedTextColor = selectedColors.text;
  const selectedBorderColor = selectedColors.border ?? selectedColors.bg;

  // Selected hover/pressed (selected 상태에서의 hover)
  const selectedHoverColor = selectedColors.bgHover;
  const selectedPressedColor = selectedColors.bgPressed;

  // 텍스트 크기 측정 (먼저 측정해야 최소 크기 계산 가능)
  const textStyle = new TextStyle({ fontSize, fontFamily });
  const metrics = CanvasTextMetrics.measureText(buttonText, textStyle);
  const textWidth = metrics.width;
  const textHeight = metrics.height;

  // 최소 필요 크기 계산 (padding + text)
  // Note: border-box 모델에서 border는 총 크기 안에 포함되므로 별도로 더하지 않음
  const minRequiredWidth = paddingLeft + textWidth + paddingRight;
  const minRequiredHeight = paddingTop + textHeight + paddingBottom;

  // 크기 계산
  // 🚀 Fix: 명시적 크기가 최소 필요 크기보다 작으면 auto로 처리
  const explicitWidth = parseCSSSize(style?.width, undefined, 0);
  const explicitHeight = parseCSSSize(style?.height, undefined, 0);

  const isWidthAuto = !style?.width || style?.width === "auto" || explicitWidth < minRequiredWidth;
  const isHeightAuto = !style?.height || style?.height === "auto" || explicitHeight < minRequiredHeight;

  let width: number;
  let height: number;

  if (isWidthAuto) {
    width = minRequiredWidth;
    width = Math.max(width, MIN_BUTTON_WIDTH);
  } else {
    width = explicitWidth;
  }

  if (isHeightAuto) {
    height = minRequiredHeight;
    height = Math.max(height, MIN_BUTTON_HEIGHT);
  } else {
    height = explicitHeight;
  }

  return {
    left: parseCSSSize(style?.left, undefined, 0),
    top: parseCSSSize(style?.top, undefined, 0),
    width,
    height,
    backgroundColor,
    hoverColor,
    pressedColor,
    textColor,
    borderColor,
    selectedBackgroundColor,
    selectedHoverColor,
    selectedPressedColor,
    selectedTextColor,
    selectedBorderColor,
    borderRadius,
    fontSize,
    fontFamily,
    isToggleSelected,
    isDisabled,
  };
}

/**
 * 토글 버튼 배경 Graphics 생성
 */
function createToggleButtonGraphics(
  width: number,
  height: number,
  backgroundColor: number,
  borderColor: number,
  borderRadius: number
): PixiGraphicsClass {
  const graphics = new PixiGraphicsClass();

  drawBox(graphics, {
    width,
    height,
    backgroundColor,
    backgroundAlpha: 1,
    borderRadius,
    border: {
      width: 1,
      color: borderColor,
      alpha: 1,
      style: "solid",
      radius: borderRadius,
    },
  });

  return graphics;
}

/**
 * 비활성화 오버레이 생성
 */
function createDisabledOverlay(
  width: number,
  height: number,
  borderRadius: number
): PixiGraphicsClass {
  const graphics = new PixiGraphicsClass();
  drawBox(graphics, {
    width,
    height,
    backgroundColor: 0xffffff,
    backgroundAlpha: 0.5,
    borderRadius,
  });
  return graphics;
}

// ============================================
// Component
// ============================================

/**
 * PixiToggleButton
 *
 * WebGL 기반 토글 버튼 컴포넌트
 * isSelected 상태에 따라 다른 색상 렌더링
 *
 * 🚀 Button과 동일한 패턴 적용:
 * - useThemeColors()로 CSS 변수에서 동적 색상 읽기
 * - getVariantColors()로 variant별 색상 적용
 *
 * @example
 * <PixiToggleButton
 *   element={toggleButtonElement}
 *   onClick={handleClick}
 *   onToggle={handleToggle}
 * />
 */
export const PixiToggleButton = memo(function PixiToggleButton({
  element,
  onClick,
  onToggle,
}: PixiToggleButtonProps) {
  useExtend(PIXI_COMPONENTS);
  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as ToggleButtonElementProps | undefined;

  // 테마 색상 (동적으로 CSS 변수에서 읽어옴)
  const themeColors = useThemeColors();

  // Unselected 상태 색상 (항상 default - surface-container-high)
  const unselectedColors = useMemo(() => {
    return getVariantColors("default", themeColors) as VariantColors;
  }, [themeColors]);

  // Selected 상태 색상 (variant에 맞게)
  const selectedColors = useMemo(() => {
    const variant = props?.variant || "primary"; // ToggleButton의 기본은 primary
    return getVariantColors(variant, themeColors) as VariantColors;
  }, [props?.variant, themeColors]);

  // 버튼 텍스트
  const buttonText = useMemo(() => {
    return String(props?.children || props?.text || props?.label || "Toggle");
  }, [props?.children, props?.text, props?.label]);

  // 레이아웃 스타일
  const layout = useMemo(() => {
    return getToggleButtonLayout(style, props || {}, buttonText, unselectedColors, selectedColors);
  }, [style, props, buttonText, unselectedColors, selectedColors]);

  // Container ref
  const containerRef = useRef<PixiContainer | null>(null);
  const buttonRef = useRef<FancyButton | null>(null);
  const disabledOverlayRef = useRef<PixiGraphicsClass | null>(null);

  // FancyButton 생성 및 업데이트
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 기존 요소들 제거
    if (buttonRef.current) {
      container.removeChild(buttonRef.current);
      buttonRef.current.destroy();
      buttonRef.current = null;
    }
    if (disabledOverlayRef.current) {
      container.removeChild(disabledOverlayRef.current);
      disabledOverlayRef.current.destroy();
      disabledOverlayRef.current = null;
    }

    // 현재 상태에 따른 색상 선택
    const bgColor = layout.isToggleSelected
      ? layout.selectedBackgroundColor
      : layout.backgroundColor;
    const hoverBgColor = layout.isToggleSelected
      ? layout.selectedHoverColor
      : layout.hoverColor;
    const pressedBgColor = layout.isToggleSelected
      ? layout.selectedPressedColor
      : layout.pressedColor;
    const borderCol = layout.isToggleSelected
      ? layout.selectedBorderColor
      : layout.borderColor;
    const textCol = layout.isToggleSelected
      ? layout.selectedTextColor
      : layout.textColor;

    // 배경 Graphics 생성
    const defaultView = createToggleButtonGraphics(
      layout.width,
      layout.height,
      bgColor,
      borderCol,
      layout.borderRadius
    );

    const hoverView = createToggleButtonGraphics(
      layout.width,
      layout.height,
      hoverBgColor,
      borderCol,
      layout.borderRadius
    );

    const pressedView = createToggleButtonGraphics(
      layout.width,
      layout.height,
      pressedBgColor,
      borderCol,
      layout.borderRadius
    );

    // TextStyle 및 Text 객체 생성
    const textStyle = new TextStyle({
      fill: textCol,
      fontSize: layout.fontSize,
      fontFamily: layout.fontFamily,
      align: "center",
    });

    const textView = new PixiText({
      text: buttonText,
      style: textStyle,
    });

    // FancyButton 생성
    // Note: FancyButton은 text를 중앙에 배치하며, padding은 Graphics 크기에 이미 반영됨
    const button = new FancyButton({
      defaultView,
      hoverView,
      pressedView,
      text: textView,
      anchor: 0.5,
      padding: 0, // 명시적으로 0 설정 (Graphics에 padding이 포함됨)
    });

    // 버튼 위치 조정
    button.x = layout.width / 2;
    button.y = layout.height / 2;

    // FancyButton의 이벤트 모드를 none으로 설정
    button.eventMode = "none";

    // Container에 추가
    container.addChild(button);
    buttonRef.current = button;

    // 비활성화 오버레이 추가
    if (layout.isDisabled) {
      const disabledOverlay = createDisabledOverlay(
        layout.width,
        layout.height,
        layout.borderRadius
      );
      container.addChild(disabledOverlay);
      disabledOverlayRef.current = disabledOverlay;
    }

    // Cleanup
    return () => {
      if (buttonRef.current && container.children.includes(buttonRef.current)) {
        container.removeChild(buttonRef.current);
        buttonRef.current.destroy();
        buttonRef.current = null;
      }
      if (
        disabledOverlayRef.current &&
        container.children.includes(disabledOverlayRef.current)
      ) {
        container.removeChild(disabledOverlayRef.current);
        disabledOverlayRef.current.destroy();
        disabledOverlayRef.current = null;
      }
    };
  }, [
    layout.width,
    layout.height,
    layout.backgroundColor,
    layout.hoverColor,
    layout.pressedColor,
    layout.textColor,
    layout.borderColor,
    layout.selectedBackgroundColor,
    layout.selectedHoverColor,
    layout.selectedPressedColor,
    layout.selectedTextColor,
    layout.selectedBorderColor,
    layout.borderRadius,
    layout.fontSize,
    layout.fontFamily,
    layout.isToggleSelected,
    layout.isDisabled,
    buttonText,
  ]);

  // 투명 히트 영역
  const drawHitArea = useCallback(
    (g: PixiGraphicsClass) => {
      g.clear();
      g.rect(0, 0, layout.width, layout.height);
      g.fill({ color: 0xffffff, alpha: 0 });
    },
    [layout.width, layout.height]
  );

  // 클릭 핸들러
  const handleClick = useCallback(
    (e: unknown) => {
      if (layout.isDisabled) return;

      const pixiEvent = e as {
        metaKey?: boolean;
        shiftKey?: boolean;
        ctrlKey?: boolean;
        nativeEvent?: MouseEvent | PointerEvent;
      };

      const metaKey =
        pixiEvent?.metaKey ?? pixiEvent?.nativeEvent?.metaKey ?? false;
      const shiftKey =
        pixiEvent?.shiftKey ?? pixiEvent?.nativeEvent?.shiftKey ?? false;
      const ctrlKey =
        pixiEvent?.ctrlKey ?? pixiEvent?.nativeEvent?.ctrlKey ?? false;

      onClick?.(element.id, { metaKey, shiftKey, ctrlKey });
      onToggle?.(element.id, !layout.isToggleSelected);
    },
    [element.id, onClick, onToggle, layout.isDisabled, layout.isToggleSelected]
  );

  // 커서 스타일
  const cursorStyle = layout.isDisabled ? "not-allowed" : "pointer";

  return (
    <pixiContainer
      x={layout.left}
      y={layout.top}
      ref={(c: PixiContainer | null) => {
        containerRef.current = c;
      }}
    >
      {/* 투명 히트 영역 */}
      <pixiGraphics
        draw={drawHitArea}
        eventMode="static"
        cursor={cursorStyle}
        onPointerDown={handleClick}
      />
    </pixiContainer>
  );
});

export default PixiToggleButton;
