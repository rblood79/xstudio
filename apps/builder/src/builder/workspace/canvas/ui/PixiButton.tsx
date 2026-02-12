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
 * @updated 2026-01-27 Component Spec 마이그레이션 (Feature Flag)
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Container as PixiContainer,
  Graphics as PixiGraphicsClass,
  Text as PixiText,
  TextStyle,
} from "pixi.js";
import { FancyButton } from "@pixi/ui";
import type { Element } from "../../../../types/core/store.types";
import type { CSSStyle } from "../sprites/styleConverter";
import { cssColorToHex, parseCSSSize } from "../sprites/styleConverter";
import type {
  ButtonVariant,
  ComponentSize,
} from "../../../../types/builder/componentVariants.types";
import { drawBox } from "../utils";
import { useCanvasSyncStore } from "../canvasSync";
import { parsePadding, parseBorderWidth } from "../sprites/paddingUtils";
import { measureTextWidth as measureTextWidthCanvas } from "../layout/engines/utils";
import { useStore } from "../../../stores";
import {
  ButtonSpec,
  fontFamily as specFontFamily,
  getVariantColors as getSpecVariantColors,
  getSizePreset as getSpecSizePreset,
} from '@xstudio/specs';

// ============================================
// Constants (CSS 브라우저 기본값 기반)
// ============================================

/**
 * 최소 버튼 크기 (너무 작아지는 것 방지)
 */
const MIN_BUTTON_WIDTH = 32;

// ============================================
// Variant Color Types
// ============================================

interface VariantColors {
  bg: number;
  bgHover: number;
  bgPressed: number;
  text: number;
  border?: number;
  borderHover?: number;
  bgAlpha?: number;
}

// Note: VARIANT_COLORS는 더 이상 하드코딩하지 않음
// useThemeColors() + getVariantColors()로 동적으로 가져옴

// ============================================
// Size Presets - 동적 CSS 변수 읽기
// ============================================
// Note: SIZE_PRESETS는 더 이상 하드코딩하지 않음
// getSizePreset()으로 Spec에서 동적으로 읽어옴

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
  borderHoverColor: number | null;
  borderRadius: number;
  borderWidth: number;
  fontSize: number;
  fontFamily: string;
  // State
  isDisabled: boolean;
  isLoading: boolean;
}

function measureTextSize(text: string, style: TextStyle): { width: number; height: number } {
  const textView = new PixiText({ text, style });
  const bounds = textView.getLocalBounds();
  textView.destroy({ children: true });
  return { width: bounds.width, height: bounds.height };
}

/** Size 프리셋 인터페이스 (Spec/Legacy 공통) */
interface SizePresetResolved {
  fontSize: number;
  paddingX: number;
  paddingY: number;
  borderRadius: number;
  height?: number;
  iconSize?: number;
  gap?: number;
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
 * @param sizePreset - Spec 또는 Legacy에서 resolve된 사이즈 프리셋
 */
function getButtonLayout(
  style: CSSStyle | undefined,
  buttonProps: ButtonElementProps,
  buttonText: string,
  variantColors: VariantColors,
  sizePreset: SizePresetResolved,
  viewport?: { width: number; height: number },
  parentContentArea?: { width: number; height: number }
): ButtonLayoutResult {
  const isDisabled = Boolean(buttonProps.isDisabled);
  const isLoading = Boolean(buttonProps.isLoading);

  // 폰트 설정 (inline style > size preset)
  // parseCSSSize로 CSS 문자열 값("14px", "1rem", "2vh" 등)도 올바르게 파싱
  const fontSize = style?.fontSize !== undefined
    ? parseCSSSize(style.fontSize, undefined, sizePreset.fontSize, viewport)
    : sizePreset.fontSize;
  const fontFamily = style?.fontFamily || specFontFamily.sans;

  // 패딩 (shorthand + 개별 속성 모두 지원)
  // parsePadding: shorthand "8px" → 4방향, 개별 paddingTop 등으로 오버라이드
  const hasPaddingStyle = style?.padding !== undefined ||
    style?.paddingTop !== undefined || style?.paddingRight !== undefined ||
    style?.paddingBottom !== undefined || style?.paddingLeft !== undefined;
  const parsedPadding = hasPaddingStyle
    ? parsePadding(style)
    : null;
  const paddingTop = parsedPadding?.top ?? sizePreset.paddingY;
  const paddingRight = parsedPadding?.right ?? sizePreset.paddingX;
  const paddingBottom = parsedPadding?.bottom ?? sizePreset.paddingY;
  const paddingLeft = parsedPadding?.left ?? sizePreset.paddingX;

  // 테두리 너비 (shorthand + 개별 속성 모두 지원)
  // padding과 동일한 패턴: inline style이 없으면 spec 기본값 사용
  // CSS base rule: .react-aria-Button { border: 1px solid var(--outline-variant); }
  // → 모든 variant에 1px border 적용 (primary 등은 배경과 동일 색상 → 투명)
  const hasBorderWidthStyle = style?.borderWidth !== undefined ||
    style?.borderTopWidth !== undefined || style?.borderRightWidth !== undefined ||
    style?.borderBottomWidth !== undefined || style?.borderLeftWidth !== undefined;
  const parsedBorder = hasBorderWidthStyle ? parseBorderWidth(style) : null;
  const specDefaultBorderWidth = 1; // CSS base: border: 1px solid (all variants)
  const borderWidthTop = parsedBorder?.top ?? specDefaultBorderWidth;
  const borderWidthRight = parsedBorder?.right ?? specDefaultBorderWidth;
  const borderWidthBottom = parsedBorder?.bottom ?? specDefaultBorderWidth;
  const borderWidthLeft = parsedBorder?.left ?? specDefaultBorderWidth;

  // 테두리 반경 (inline style > size preset)
  const borderRadius = style?.borderRadius !== undefined
    ? parseCSSSize(style.borderRadius, undefined, sizePreset.borderRadius, viewport)
    : sizePreset.borderRadius;

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

  // Border 색상 (inline style > variant)
  const hasInlineBorderColor = style?.borderColor !== undefined;
  const borderColor = hasInlineBorderColor
    ? cssColorToHex(style?.borderColor, variantColors.border ?? 0x000000)
    : (variantColors.border ?? null);

  // Border hover 색상 (CSS: variant별 hover 시 border-color 변경)
  const borderHoverColor = hasInlineBorderColor
    ? borderColor // inline 지정 시 hover에서도 동일
    : (variantColors.borderHover ?? borderColor);

  // 텍스트 크기 측정 (먼저 측정해야 최소 크기 계산 가능)
  // 🚀 너비: Canvas 2D measureText 사용 (BlockEngine calculateContentWidth와 동일)
  //    → display: block 부모 내 inline-block 버튼 간격 불일치 해소
  // 🚀 높이: PixiJS getLocalBounds 사용 (수직 메트릭 정확도 필요)
  const textWidth = measureTextWidthCanvas(buttonText, fontSize, fontFamily);
  const textStyle = new TextStyle({ fontSize, fontFamily });
  const textHeight = measureTextSize(buttonText, textStyle).height;

  // 최소 필요 크기 계산 (border + padding + text)
  // border-box 모델: width = border + padding + content
  const minRequiredWidth = borderWidthLeft + paddingLeft + textWidth + paddingRight + borderWidthRight;
  const minRequiredHeight = borderWidthTop + paddingTop + textHeight + paddingBottom + borderWidthBottom;

  // 크기 계산
  // parseCSSSize로 CSS 문자열 값("200px", "50%", "100vw" 등)도 올바르게 파싱
  // %, vw, vh는 부모의 content area 기준으로 계산 (CSS box model)
  // parentContentArea: 부모의 width - padding - border (Yoga border-box 모델)
  // vw/vh도 parentContentArea 기준 (빌더에서 viewport ≈ body, 부모 내 수용 보장)
  const pctRefWidth = parentContentArea?.width ?? viewport?.width;
  const pctRefHeight = parentContentArea?.height ?? viewport?.height;
  const resolveViewport = parentContentArea ?? viewport;
  const explicitWidth = parseCSSSize(style?.width, pctRefWidth, 0, resolveViewport);
  const explicitHeight = parseCSSSize(style?.height, pctRefHeight, 0, resolveViewport);

  // 명시적 크기가 있으면 (%, vh, vw 포함) auto 비활성화
  const hasExplicitWidth = style?.width !== undefined && style?.width !== "" && style?.width !== "auto";
  const hasExplicitHeight = style?.height !== undefined && style?.height !== "" && style?.height !== "auto";
  const isWidthAuto = !hasExplicitWidth || explicitWidth < minRequiredWidth;
  const isHeightAuto = !hasExplicitHeight || explicitHeight < minRequiredHeight;

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
  } else {
    height = explicitHeight;
  }

  // border-box 모델의 대표 borderWidth (4방향 중 최대값 사용)
  const borderWidth = Math.max(borderWidthTop, borderWidthRight, borderWidthBottom, borderWidthLeft);

  return {
    left: parseCSSSize(style?.left, pctRefWidth, 0, resolveViewport),
    top: parseCSSSize(style?.top, pctRefHeight, 0, resolveViewport),
    width,
    height,
    backgroundColor,
    backgroundAlpha,
    hoverColor,
    pressedColor,
    textColor,
    borderColor,
    borderHoverColor,
    borderRadius,
    borderWidth,
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

  // 페이지/뷰포트 크기 (%, vh, vw 단위 계산용)
  const canvasSize = useCanvasSyncStore((s) => s.canvasSize);

  // 부모 요소 조회 (% 단위 해석 시 부모 content area 기준 필요)
  const parentElement = useStore((state) => {
    if (!element.parent_id) return null;
    return state.elementsMap.get(element.parent_id) ?? null;
  });

  // 부모의 content area 계산 (부모 너비 - padding - border)
  // CSS box model: 자식의 % 크기는 부모의 content area 기준
  const parentContentArea = useMemo(() => {
    const vw = canvasSize.width;
    const vh = canvasSize.height;

    if (!parentElement) {
      return { width: vw, height: vh };
    }

    const parentStyle = parentElement.props?.style as CSSStyle | undefined;
    const isBody = parentElement.tag.toLowerCase() === 'body';

    // 부모의 외곽 크기 (body는 페이지 크기, 그 외는 CSS 값)
    const pw = isBody ? vw : parseCSSSize(parentStyle?.width, vw, vw, canvasSize);
    const ph = isBody ? vh : parseCSSSize(parentStyle?.height, vh, vh, canvasSize);

    // padding + border 차감 (Yoga border-box 모델)
    const pp = parsePadding(parentStyle);
    const pb = parseBorderWidth(parentStyle);

    return {
      width: Math.max(0, pw - pp.left - pp.right - pb.left - pb.right),
      height: Math.max(0, ph - pp.top - pp.bottom - pb.top - pb.bottom),
    };
  }, [parentElement, canvasSize]);

  // variant에 맞는 색상 가져오기 (Spec 기반)
  const variantColors = useMemo(() => {
    const variant = props?.variant || "default";
    const variantSpec = ButtonSpec.variants[variant] || ButtonSpec.variants[ButtonSpec.defaultVariant];
    // TODO: 테마 감지 로직 추가 (현재는 'light' 고정)
    return getSpecVariantColors(variantSpec, 'light');
  }, [props?.variant]);

  // size에 맞는 프리셋 가져오기 (Spec 기반)
  const sizePreset = useMemo(() => {
    const size = props?.size || "sm";
    const sizeSpec = ButtonSpec.sizes[size] || ButtonSpec.sizes[ButtonSpec.defaultSize];
    // TODO: 테마 감지 로직 추가 (현재는 'light' 고정)
    return getSpecSizePreset(sizeSpec, 'light');
  }, [props?.size]);

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
      variantColors,
      sizePreset,
      canvasSize,
      parentContentArea
    );
  }, [style, props, buttonText, variantColors, sizePreset, canvasSize, parentContentArea]);

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
    const defaultGraphicsOptions = {
      alpha: layout.backgroundAlpha,
      borderColor: layout.borderColor,
      borderWidth: layout.borderWidth,
    };

    // Hover/Pressed는 borderHoverColor 사용 (CSS variant별 hover border-color)
    const hoverGraphicsOptions = {
      alpha: layout.backgroundAlpha,
      borderColor: layout.borderHoverColor,
      borderWidth: layout.borderWidth,
    };

    // 배경 Graphics 생성
    const defaultView = createButtonGraphics(
      layout.width,
      layout.height,
      layout.backgroundColor,
      layout.borderRadius,
      defaultGraphicsOptions
    );

    const hoverView = createButtonGraphics(
      layout.width,
      layout.height,
      layout.hoverColor,
      layout.borderRadius,
      hoverGraphicsOptions
    );

    const pressedView = createButtonGraphics(
      layout.width,
      layout.height,
      layout.pressedColor,
      layout.borderRadius,
      hoverGraphicsOptions // pressed도 hover와 같은 border color (CSS 동작)
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
      // ⚠️ try-catch: CanvasTextSystem이 이미 정리된 경우 에러 방지
      if (buttonRef.current) {
        try {
          if (container.children.includes(buttonRef.current)) {
            container.removeChild(buttonRef.current);
          }
          if (!buttonRef.current.destroyed) {
            buttonRef.current.destroy({ children: true });
          }
        } catch {
          // CanvasTextSystem race condition - 무시 (시스템이 이미 정리됨)
        }
        buttonRef.current = null;
      }

      // disabledOverlay와 loadingIndicator는 container의 직접 children이므로 별도 정리
      if (disabledOverlayRef.current) {
        try {
          if (container.children.includes(disabledOverlayRef.current)) {
            container.removeChild(disabledOverlayRef.current);
          }
          if (!disabledOverlayRef.current.destroyed) {
            disabledOverlayRef.current.destroy(true);
          }
        } catch {
          // ignore
        }
        disabledOverlayRef.current = null;
      }
      if (loadingIndicatorRef.current) {
        try {
          if (container.children.includes(loadingIndicatorRef.current)) {
            container.removeChild(loadingIndicatorRef.current);
          }
          if (!loadingIndicatorRef.current.destroyed) {
            loadingIndicatorRef.current.destroy(true);
          }
        } catch {
          // ignore
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

  // 🚀 Phase 9: @pixi/layout에 크기 전달 - children 레이아웃 계산에 필요
  const buttonLayout = useMemo(() => ({
    width: layout.width,
    height: layout.height,
  }), [layout.width, layout.height]);

  // 🚀 Phase 5: x/y 제거 - 위치는 ElementSprite에서 layout prop으로 처리
  return (
    <pixiContainer
      ref={(c: PixiContainer | null) => {
        containerRef.current = c;
      }}
      layout={buttonLayout}
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
