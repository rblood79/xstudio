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
import {
  getToggleButtonSizePreset,
  getToggleButtonColorPreset,
} from "../utils/cssVariableReader";
import { drawBox } from "../utils";

// ============================================
// Constants
// ============================================

const MIN_BUTTON_WIDTH = 32;
const MIN_BUTTON_HEIGHT = 24;

// ============================================
// Types
// ============================================

interface ClickModifiers {
  metaKey: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
}

interface ToggleButtonElementProps {
  children?: string;
  text?: string;
  label?: string;
  variant?: "default" | "primary" | "secondary" | "surface";
  size?: "sm" | "md" | "lg";
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
  // Selected colors
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
 */
function getToggleButtonLayout(
  style: CSSStyle | undefined,
  buttonProps: ToggleButtonElementProps,
  buttonText: string
): ToggleButtonLayoutResult {
  const variant = buttonProps.variant || "default";
  const size = buttonProps.size || "md";
  const isToggleSelected = Boolean(buttonProps.isSelected);
  const isDisabled = Boolean(buttonProps.isDisabled);

  // 🚀 CSS에서 사이즈 프리셋 읽기
  const sizePreset = getToggleButtonSizePreset(size);
  const colorPreset = getToggleButtonColorPreset(variant);

  // 폰트 설정 (inline style > size preset)
  const fontSize = parseCSSSize(style?.fontSize, undefined, sizePreset.fontSize);
  const fontFamily = style?.fontFamily || "Pretendard, sans-serif";

  // 패딩 (inline style > size preset)
  const paddingY = parseCSSSize(style?.paddingTop, undefined, sizePreset.paddingY);
  const paddingX = parseCSSSize(style?.paddingLeft, undefined, sizePreset.paddingX);

  // 테두리 반경 (inline style > size preset)
  const borderRadius = parseCSSSize(style?.borderRadius, undefined, sizePreset.borderRadius);

  // 색상 (inline style이 있으면 우선)
  const hasInlineBg = style?.backgroundColor !== undefined;
  const hasInlineColor = style?.color !== undefined;
  const hasInlineBorder = style?.borderColor !== undefined;

  // Unselected 색상
  const backgroundColor = hasInlineBg
    ? cssColorToHex(style?.backgroundColor, colorPreset.background)
    : colorPreset.background;
  const textColor = hasInlineColor
    ? cssColorToHex(style?.color, colorPreset.text)
    : colorPreset.text;
  const borderColor = hasInlineBorder
    ? cssColorToHex(style?.borderColor, colorPreset.border)
    : colorPreset.border;

  // Selected 색상 (항상 preset에서)
  const selectedBackgroundColor = colorPreset.selectedBackground;
  const selectedTextColor = colorPreset.selectedText;
  const selectedBorderColor = colorPreset.selectedBorder;

  // Hover/Pressed 색상
  const hoverColor = colorPreset.hoverBackground;
  const pressedColor = colorPreset.pressedBackground;

  // Selected hover/pressed (selected 상태에서의 hover)
  const selectedHoverColor = Math.max(selectedBackgroundColor - 0x101010, 0x000000);
  const selectedPressedColor = Math.max(selectedBackgroundColor - 0x202020, 0x000000);

  // 크기 계산
  const isWidthAuto = !style?.width || style?.width === "auto";
  const isHeightAuto = !style?.height || style?.height === "auto";

  let width: number;
  let height: number;

  // 텍스트 크기 측정
  const textStyle = new TextStyle({ fontSize, fontFamily });
  const metrics = CanvasTextMetrics.measureText(buttonText, textStyle);
  const textWidth = metrics.width;
  const textHeight = metrics.height;

  if (isWidthAuto) {
    width = paddingX * 2 + textWidth;
    width = Math.max(width, MIN_BUTTON_WIDTH);
  } else {
    width = parseCSSSize(style?.width, undefined, 120);
  }

  if (isHeightAuto) {
    height = paddingY * 2 + textHeight;
    height = Math.max(height, MIN_BUTTON_HEIGHT);
  } else {
    height = parseCSSSize(style?.height, undefined, 40);
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
  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as ToggleButtonElementProps | undefined;

  // 버튼 텍스트
  const buttonText = useMemo(() => {
    return String(props?.children || props?.text || props?.label || "Toggle");
  }, [props?.children, props?.text, props?.label]);

  // 레이아웃 스타일
  const layout = useMemo(() => {
    return getToggleButtonLayout(style, props || {}, buttonText);
  }, [style, props, buttonText]);

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
    const button = new FancyButton({
      defaultView,
      hoverView,
      pressedView,
      text: textView,
      anchor: 0.5,
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
