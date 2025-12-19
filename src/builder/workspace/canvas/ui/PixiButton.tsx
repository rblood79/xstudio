/**
 * Pixi Button
 *
 * 🚀 Phase 11 B2.4: @pixi/ui FancyButton 기반 Button
 *
 * @pixi/ui의 FancyButton을 명령형으로 생성하여 Container에 추가
 * - JSX 방식은 @pixi/react v8에서 제한적이므로 useEffect로 직접 생성
 *
 * @see https://pixijs.io/ui/storybook/?path=/story/fancybutton--simple
 * @see https://github.com/pixijs/ui/blob/main/src/FancyButton.ts
 *
 * @since 2025-12-11 Phase 11 B2.4
 * @updated 2025-12-14 P8: useEffect 명령형 FancyButton 생성
 * @updated 2025-12-15 P9: variant, size, isDisabled, isLoading 지원 추가
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
import type {
  ButtonVariant,
  ComponentSize,
} from "../../../../types/builder/componentVariants.types";
import { useThemeColors } from "../hooks/useThemeColors";
import { getVariantColors, getSizePreset, type SizePreset } from "../utils/cssVariableReader";
import { drawBox } from "../utils";

// ============================================
// Constants (CSS 브라우저 기본값 기반)
// ============================================

/**
 * 최소 버튼 크기 (너무 작아지는 것 방지)
 */
const MIN_BUTTON_WIDTH = 32;
const MIN_BUTTON_HEIGHT = 24;

// ============================================
// Variant Color Types
// ============================================

interface VariantColors {
  bg: number;
  bgHover: number;
  bgPressed: number;
  text: number;
  border?: number;
  bgAlpha?: number;
}

// Note: VARIANT_COLORS는 더 이상 하드코딩하지 않음
// useThemeColors() + getVariantColors()로 동적으로 가져옴

// ============================================
// Size Presets - 동적 CSS 변수 읽기
// ============================================
// Note: SIZE_PRESETS는 더 이상 하드코딩하지 않음
// getSizePreset()으로 CSS 변수에서 동적으로 읽어옴
// → CSS 스타일시트 값 변경 시 WebGL 컴포넌트에도 자동 반영

const DEFAULT_SIZE_PRESET: SizePreset = { fontSize: 14, paddingX: 12, paddingY: 4, borderRadius: 4 };

// ============================================
// Types
// ============================================

/** Modifier keys for multi-select */
interface ClickModifiers {
  metaKey: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
}

/** Button props from element.props */
interface ButtonElementProps {
  children?: string;
  text?: string;
  label?: string;
  variant?: ButtonVariant;
  size?: ComponentSize;
  type?: "button" | "submit" | "reset";
  isDisabled?: boolean;
  isLoading?: boolean;
  className?: string;
  style?: CSSStyle;
}

export interface PixiButtonProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string, modifiers?: ClickModifiers) => void;
}

// ============================================
// Style Conversion
// ============================================

interface ButtonLayoutResult {
  left: number;
  top: number;
  width: number;
  height: number;
  // Colors (from variant or inline style)
  backgroundColor: number;
  backgroundAlpha: number;
  hoverColor: number;
  pressedColor: number;
  textColor: number;
  borderColor: number | null;
  borderRadius: number;
  fontSize: number;
  fontFamily: string;
  // State
  isDisabled: boolean;
  isLoading: boolean;
}

/**
 * CSS 스타일과 variant/size에서 버튼 레이아웃 정보 추출
 *
 * 우선순위:
 * 1. inline style (props.style) - 최우선
 * 2. variant/size props - 차선
 * 3. 기본값 - 최후
 *
 * @param variantColors - 테마에서 동적으로 가져온 색상
 */
function getButtonLayout(
  style: CSSStyle | undefined,
  buttonProps: ButtonElementProps,
  buttonText: string,
  variantColors: VariantColors
): ButtonLayoutResult {
  // variant와 size 추출
  const size = buttonProps.size || "sm";
  const isDisabled = Boolean(buttonProps.isDisabled);
  const isLoading = Boolean(buttonProps.isLoading);

  // size 프리셋 가져오기 (CSS 변수에서 동적으로 읽어옴)
  const sizePreset = getSizePreset(size) || DEFAULT_SIZE_PRESET;

  // 폰트 설정 (inline style > size preset)
  const fontSize = parseCSSSize(
    style?.fontSize,
    undefined,
    sizePreset.fontSize
  );
  const fontFamily = style?.fontFamily || "Pretendard, sans-serif";

  // 패딩 (inline style > size preset)
  const paddingTop = parseCSSSize(
    style?.paddingTop,
    undefined,
    sizePreset.paddingY
  );
  const paddingRight = parseCSSSize(
    style?.paddingRight,
    undefined,
    sizePreset.paddingX
  );
  const paddingBottom = parseCSSSize(
    style?.paddingBottom,
    undefined,
    sizePreset.paddingY
  );
  const paddingLeft = parseCSSSize(
    style?.paddingLeft,
    undefined,
    sizePreset.paddingX
  );

  // 테두리 반경 (inline style > size preset)
  const borderRadius = parseCSSSize(
    style?.borderRadius,
    undefined,
    sizePreset.borderRadius
  );

  // 색상 (inline style > variant)
  const hasInlineBg = style?.backgroundColor !== undefined;
  const hasInlineColor = style?.color !== undefined;

  const backgroundColor = hasInlineBg
    ? cssColorToHex(style?.backgroundColor, variantColors.bg)
    : variantColors.bg;

  const backgroundAlpha =
    variantColors.bgAlpha !== undefined ? variantColors.bgAlpha : 1;

  const textColor = hasInlineColor
    ? cssColorToHex(style?.color, variantColors.text)
    : variantColors.text;

  // Hover/Pressed 색상 (inline style일 경우 밝기 조절, 아니면 variant)
  let hoverColor: number;
  let pressedColor: number;

  if (hasInlineBg) {
    hoverColor = Math.min(backgroundColor + 0x151515, 0xffffff);
    pressedColor = Math.max(backgroundColor - 0x151515, 0x000000);
  } else {
    hoverColor = variantColors.bgHover;
    pressedColor = variantColors.bgPressed;
  }

  // Border 색상 (outline variant)
  const borderColor = variantColors.border ?? null;

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
    backgroundAlpha,
    hoverColor,
    pressedColor,
    textColor,
    borderColor,
    borderRadius,
    fontSize,
    fontFamily,
    isDisabled,
    isLoading,
  };
}

/**
 * 버튼 배경 Graphics 생성
 * 🚀 Border-Box v2: drawBox 유틸리티 사용
 */
function createButtonGraphics(
  width: number,
  height: number,
  backgroundColor: number,
  borderRadius: number,
  options?: {
    alpha?: number;
    borderColor?: number | null;
    borderWidth?: number;
  }
): PixiGraphicsClass {
  const graphics = new PixiGraphicsClass();
  const alpha = options?.alpha ?? 1;
  const borderColor = options?.borderColor;
  const borderWidth = options?.borderWidth ?? 1;

  // Border-Box v2: drawBox 유틸리티 사용
  drawBox(graphics, {
    width,
    height,
    backgroundColor,
    backgroundAlpha: alpha,
    borderRadius,
    border: borderColor !== null && borderColor !== undefined ? {
      width: borderWidth,
      color: borderColor,
      alpha: 1,
      style: 'solid',
      radius: borderRadius,
    } : null,
  });

  return graphics;
}

/**
 * 비활성화 오버레이 Graphics 생성
 * 🚀 Border-Box v2: drawBox 유틸리티 사용
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

/**
 * 로딩 인디케이터 (점 3개 애니메이션용 - 간단한 버전)
 */
function createLoadingIndicator(
  width: number,
  height: number
): PixiGraphicsClass {
  const graphics = new PixiGraphicsClass();
  const dotRadius = 3;
  const spacing = 8;
  const centerX = width / 2;
  const centerY = height / 2;

  // 3개의 점 그리기
  for (let i = -1; i <= 1; i++) {
    graphics.circle(centerX + i * spacing, centerY, dotRadius);
  }
  graphics.fill({ color: 0xffffff, alpha: 0.8 });

  return graphics;
}

// ============================================
// Component
// ============================================

/**
 * PixiButton
 *
 * @pixi/ui FancyButton을 명령형으로 생성
 * variant, size, isDisabled, isLoading 지원
 *
 * @example
 * <PixiButton element={buttonElement} onClick={handleClick} />
 */
export const PixiButton = memo(function PixiButton({
  element,
  //isSelected,
  onClick,
}: PixiButtonProps) {
  useExtend(PIXI_COMPONENTS);
  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as ButtonElementProps | undefined;

  // 테마 색상 (동적으로 CSS 변수에서 읽어옴)
  const themeColors = useThemeColors();

  // variant에 맞는 색상 가져오기
  const variantColors = useMemo(() => {
    const variant = props?.variant || "default";
    return getVariantColors(variant, themeColors) as VariantColors;
  }, [props?.variant, themeColors]);

  // 버튼 텍스트 (isLoading일 때는 빈 문자열)
  const buttonText = useMemo(() => {
    if (props?.isLoading) return "";
    return String(props?.children || props?.text || props?.label || "Button");
  }, [props?.children, props?.text, props?.label, props?.isLoading]);

  // 레이아웃 스타일 (buttonText 필요 - auto 크기 계산용)
  const layout = useMemo(() => {
    return getButtonLayout(
      style,
      props || {},
      buttonText || "Button",
      variantColors
    );
  }, [style, props, buttonText, variantColors]);

  // Container ref
  const containerRef = useRef<PixiContainer | null>(null);
  const buttonRef = useRef<FancyButton | null>(null);
  const disabledOverlayRef = useRef<PixiGraphicsClass | null>(null);
  const loadingIndicatorRef = useRef<PixiGraphicsClass | null>(null);

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
    if (loadingIndicatorRef.current) {
      container.removeChild(loadingIndicatorRef.current);
      loadingIndicatorRef.current.destroy();
      loadingIndicatorRef.current = null;
    }

    // Graphics 옵션 (alpha, border)
    const graphicsOptions = {
      alpha: layout.backgroundAlpha,
      borderColor: layout.borderColor,
      borderWidth: 1,
    };

    // 배경 Graphics 생성
    const defaultView = createButtonGraphics(
      layout.width,
      layout.height,
      layout.backgroundColor,
      layout.borderRadius,
      graphicsOptions
    );

    const hoverView = createButtonGraphics(
      layout.width,
      layout.height,
      layout.hoverColor,
      layout.borderRadius,
      graphicsOptions
    );

    const pressedView = createButtonGraphics(
      layout.width,
      layout.height,
      layout.pressedColor,
      layout.borderRadius,
      graphicsOptions
    );

    // TextStyle 및 Text 객체 생성
    const textStyle = new TextStyle({
      fill: layout.textColor,
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
      text: layout.isLoading ? undefined : textView,
      anchor: 0.5,
      padding: 0, // 명시적으로 0 설정 (Graphics에 padding이 포함됨)
    });

    // 버튼 위치 조정 (anchor 0.5이므로 중앙 기준)
    button.x = layout.width / 2;
    button.y = layout.height / 2;

    // FancyButton의 이벤트 모드를 none으로 설정
    button.eventMode = "none";

    // Container에 추가
    container.addChild(button);
    buttonRef.current = button;

    // 비활성화 오버레이 추가
    if (layout.isDisabled || layout.isLoading) {
      const disabledOverlay = createDisabledOverlay(
        layout.width,
        layout.height,
        layout.borderRadius
      );
      container.addChild(disabledOverlay);
      disabledOverlayRef.current = disabledOverlay;
    }

    // 로딩 인디케이터 추가
    if (layout.isLoading) {
      const loadingIndicator = createLoadingIndicator(
        layout.width,
        layout.height
      );
      container.addChild(loadingIndicator);
      loadingIndicatorRef.current = loadingIndicator;
    }

    // Cleanup - Graphics 객체 명시적 destroy (GPU 리소스 해제)
    return () => {
      // FancyButton destroy (children: true로 내부 Graphics/Text도 함께 정리)
      // Note: defaultView, hoverView, pressedView, textView는 FancyButton의 children이므로
      // destroy({ children: true })로 함께 정리됨 - 별도 destroy 불필요
      if (buttonRef.current) {
        if (container.children.includes(buttonRef.current)) {
          container.removeChild(buttonRef.current);
        }
        if (!buttonRef.current.destroyed) {
          buttonRef.current.destroy({ children: true });
        }
        buttonRef.current = null;
      }

      // disabledOverlay와 loadingIndicator는 container의 직접 children이므로 별도 정리
      if (disabledOverlayRef.current) {
        if (container.children.includes(disabledOverlayRef.current)) {
          container.removeChild(disabledOverlayRef.current);
        }
        if (!disabledOverlayRef.current.destroyed) {
          disabledOverlayRef.current.destroy(true);
        }
        disabledOverlayRef.current = null;
      }
      if (loadingIndicatorRef.current) {
        if (container.children.includes(loadingIndicatorRef.current)) {
          container.removeChild(loadingIndicatorRef.current);
        }
        if (!loadingIndicatorRef.current.destroyed) {
          loadingIndicatorRef.current.destroy(true);
        }
        loadingIndicatorRef.current = null;
      }
    };
  }, [layout, buttonText]);

  // 투명 히트 영역 (modifier 키 감지용)
  const drawHitArea = useCallback(
    (g: PixiGraphicsClass) => {
      g.clear();
      g.rect(0, 0, layout.width, layout.height);
      g.fill({ color: 0xffffff, alpha: 0 });
    },
    [layout.width, layout.height]
  );

  // 클릭 핸들러 (modifier 키 전달)
  const handleClick = useCallback(
    (e: unknown) => {
      // 비활성화 또는 로딩 중이면 클릭 무시
      if (layout.isDisabled || layout.isLoading) return;

      // PixiJS FederatedPointerEvent has modifier keys directly
      const pixiEvent = e as {
        metaKey?: boolean;
        shiftKey?: boolean;
        ctrlKey?: boolean;
        nativeEvent?: MouseEvent | PointerEvent;
      };

      // Try direct properties first (PixiJS v8), fallback to nativeEvent
      const metaKey =
        pixiEvent?.metaKey ?? pixiEvent?.nativeEvent?.metaKey ?? false;
      const shiftKey =
        pixiEvent?.shiftKey ?? pixiEvent?.nativeEvent?.shiftKey ?? false;
      const ctrlKey =
        pixiEvent?.ctrlKey ?? pixiEvent?.nativeEvent?.ctrlKey ?? false;

      onClick?.(element.id, { metaKey, shiftKey, ctrlKey });
    },
    [element.id, onClick, layout.isDisabled, layout.isLoading]
  );

  // 커서 스타일 (비활성화 시 not-allowed)
  const cursorStyle =
    layout.isDisabled || layout.isLoading ? "not-allowed" : "pointer";

  return (
    <pixiContainer
      x={layout.left}
      y={layout.top}
      ref={(c: PixiContainer | null) => {
        containerRef.current = c;
      }}
    >
      {/* FancyButton, disabled overlay, loading indicator는 useEffect에서 명령형으로 추가됨 */}

      {/* 투명 히트 영역 (modifier 키 감지용) */}
      <pixiGraphics
        draw={drawHitArea}
        eventMode="static"
        cursor={cursorStyle}
        onPointerDown={handleClick}
      />
    </pixiContainer>
  );
});

export default PixiButton;
