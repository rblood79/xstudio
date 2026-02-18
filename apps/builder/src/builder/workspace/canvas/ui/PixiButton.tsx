/**
 * Pixi Button
 *
 * 투명 히트 영역(pixiGraphics) 기반 Button
 * - Skia가 시각적 렌더링을 담당, PixiJS는 이벤트 히트 영역만 제공
 * - getButtonLayout()으로 크기 계산 (Skia 렌더링에 필요)
 *
 * @since 2025-12-11 Phase 11 B2.4
 * @updated 2025-12-14 P8: useEffect 명령형 FancyButton 생성
 * @updated 2025-12-15 P9: variant, size, isDisabled, isLoading 지원 추가
 * @updated 2026-01-27 Component Spec 마이그레이션 (Feature Flag)
 * @updated 2026-02-18 @pixi/ui FancyButton 의존성 제거 (Skia 렌더링 전환)
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useRef, useMemo } from "react";
import {
  Container as PixiContainer,
  Graphics as PixiGraphicsClass,
  Text as PixiText,
  TextStyle,
} from "pixi.js";
import type { Element } from "../../../../types/core/store.types";
import type { CSSStyle } from "../sprites/styleConverter";
import { cssColorToHex, parseCSSSize } from "../sprites/styleConverter";
import type {
  ButtonVariant,
  ComponentSize,
} from "../../../../types/builder/componentVariants.types";
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
  // fit-content, min-content, max-content는 intrinsic sizing → auto와 동일 (텍스트 기반 자동 크기)
  const hasExplicitWidth = style?.width !== undefined && style?.width !== "" && style?.width !== "auto"
    && style?.width !== "fit-content" && style?.width !== "min-content" && style?.width !== "max-content";
  const hasExplicitHeight = style?.height !== undefined && style?.height !== "" && style?.height !== "auto"
    && style?.height !== "fit-content" && style?.height !== "min-content" && style?.height !== "max-content";
  const isWidthAuto = !hasExplicitWidth;
  const isHeightAuto = !hasExplicitHeight;

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


// ============================================
// Component
// ============================================

/**
 * PixiButton
 *
 * 투명 히트 영역 기반 Button (Skia 렌더링)
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
  // Note: cursorStyle 변수는 사용하지 않음 (Pencil 동작과 일치하도록 항상 default)

  // 🚀 Phase 5: x/y 제거 - 위치는 ElementSprite에서 처리
  return (
    <pixiContainer
      ref={(c: PixiContainer | null) => {
        containerRef.current = c;
      }}
    >
      {/* 투명 히트 영역 (modifier 키 감지용) - Skia가 시각적 렌더링 담당 */}
      <pixiGraphics
        draw={drawHitArea}
        eventMode="static"
        cursor="default"
        onPointerDown={handleClick}
      />
    </pixiContainer>
  );
});

export default PixiButton;
