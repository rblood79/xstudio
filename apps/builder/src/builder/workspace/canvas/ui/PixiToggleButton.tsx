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
import { getToggleButtonSizePreset, getVariantColors, type ToggleButtonSizePreset } from "../utils/cssVariableReader";
import { useThemeColors } from "../hooks/useThemeColors";
import { drawBox } from "../utils";
import { measureTextWidth as measureTextWidthCanvas } from "../layout/engines/utils";
import { useCanvasSyncStore } from "../canvasSync";
import { parsePadding, parseBorderWidth } from "../sprites/paddingUtils";
import { useStore } from "../../../stores";
import { useShallow } from "zustand/react/shallow";

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

// Size preset fallback (sm size: Button과 동일)
const DEFAULT_SIZE_PRESET: ToggleButtonSizePreset = { fontSize: 14, paddingX: 12, paddingY: 4, borderRadius: 4 };

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
 * @param parentContentArea - 부모의 content area (% 크기 계산용)
 */
function getToggleButtonLayout(
  style: CSSStyle | undefined,
  buttonProps: ToggleButtonElementProps,
  buttonText: string,
  unselectedColors: VariantColors,
  selectedColors: VariantColors,
  parentContentArea?: { width: number; height: number }
): ToggleButtonLayoutResult {
  const size = buttonProps.size || "sm";
  const isToggleSelected = Boolean(buttonProps.isSelected);
  const isDisabled = Boolean(buttonProps.isDisabled);

  // 🚀 CSS에서 사이즈 프리셋 읽기 (ToggleButtonGroup과 동일한 패턴)
  const sizePreset = getToggleButtonSizePreset(size) || DEFAULT_SIZE_PRESET;

  // 폰트 설정 (inline style > size preset)
  // 🚀 Phase 8: parseCSSSize 제거 - CSS 프리셋 값 사용
  const fontSize = typeof style?.fontSize === 'number' ? style.fontSize : sizePreset.fontSize;
  const fontFamily = style?.fontFamily || "Pretendard, sans-serif";

  // 패딩 (inline style > size preset)
  const paddingTop = typeof style?.paddingTop === 'number' ? style.paddingTop : sizePreset.paddingY;
  const paddingRight = typeof style?.paddingRight === 'number' ? style.paddingRight : sizePreset.paddingX;
  const paddingBottom = typeof style?.paddingBottom === 'number' ? style.paddingBottom : sizePreset.paddingY;
  const paddingLeft = typeof style?.paddingLeft === 'number' ? style.paddingLeft : sizePreset.paddingX;

  // 테두리 반경 (inline style > size preset)
  const borderRadius = typeof style?.borderRadius === 'number' ? style.borderRadius : sizePreset.borderRadius;

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

  // 🚀 텍스트 너비 측정 - Canvas 2D measureText 사용 (BlockEngine과 동일)
  // PixiButton/Badge와 동일한 방식으로 display:block에서도 정확한 레이아웃 보장
  const textWidth = measureTextWidthCanvas(buttonText, fontSize, fontFamily);
  // 높이는 PixiJS TextStyle 사용 (수직 메트릭 정확도 필요)
  const textStyle = new TextStyle({ fontSize, fontFamily });
  const metrics = CanvasTextMetrics.measureText(buttonText, textStyle);
  const textHeight = metrics.height;

  // 최소 필요 크기 계산 (border + padding + text)
  // border-box 모델: width = border + padding + content
  const borderWidth = 1; // ToggleButton은 항상 1px border 사용
  const minRequiredWidth = borderWidth + paddingLeft + textWidth + paddingRight + borderWidth;
  const minRequiredHeight = borderWidth + paddingTop + textHeight + paddingBottom + borderWidth;

  // 크기 계산
  // parseCSSSize로 CSS 문자열 값("200px", "50%", "100vw" 등)도 올바르게 파싱
  // %, vw, vh는 부모의 content area 기준으로 계산 (CSS box model)
  const pctRefWidth = parentContentArea?.width ?? 0;
  const pctRefHeight = parentContentArea?.height ?? 0;
  const resolveViewport = parentContentArea ?? { width: 0, height: 0 };
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
    height = Math.max(height, MIN_BUTTON_HEIGHT);
  } else {
    height = explicitHeight;
  }

  return {
    left: parseCSSSize(style?.left, pctRefWidth, 0, resolveViewport),
    top: parseCSSSize(style?.top, pctRefHeight, 0, resolveViewport),
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
 *
 * @param borderRadius - 단일 값 또는 [tl, tr, br, bl] 배열
 */
function createToggleButtonGraphics(
  width: number,
  height: number,
  backgroundColor: number,
  borderColor: number,
  borderRadius: number | [number, number, number, number]
): PixiGraphicsClass {
  const graphics = new PixiGraphicsClass();

  // 단일 값인 경우 border.radius로 사용, 배열인 경우 borderRadius로 사용
  const uniformRadius = Array.isArray(borderRadius) ? Math.max(...borderRadius) : borderRadius;

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
      radius: uniformRadius,
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

  // Canvas 크기 (% 크기 계산용)
  const canvasSize = useCanvasSyncStore((state) => state.canvasSize);

  // 부모 요소 (% 크기 계산용)
  const parentElement = useStore((state) => {
    if (!element.parent_id) return null;
    return state.elementsMap.get(element.parent_id) ?? null;
  });

  // 🚀 부모 ToggleButtonGroup의 size 구독
  // LayoutContainer memo 비교 문제를 우회하여 부모 size 변경 시 리렌더링 보장
  const parentSize = useStore((state) => {
    if (!element.parent_id) return undefined;
    const parent = state.elementsMap.get(element.parent_id);
    if (!parent || parent.tag !== 'ToggleButtonGroup') return undefined;
    return (parent.props as Record<string, unknown>)?.size as string | undefined;
  });

  // 🚀 부모 ToggleButtonGroup의 orientation 및 그룹 내 위치 구독
  // CSS에서는 그룹 내 버튼들이 위치에 따라 다른 borderRadius를 가짐
  // useShallow로 shallow comparison 적용하여 무한 루프 방지
  const groupPositionInfo = useStore(
    useShallow((state) => {
      if (!element.parent_id) return null;
      const parent = state.elementsMap.get(element.parent_id);
      if (!parent || parent.tag !== 'ToggleButtonGroup') return null;

      const orientation = ((parent.props as Record<string, unknown>)?.orientation as string) || 'horizontal';
      // childrenMap은 Element[] 반환 - ID로 찾아야 함
      const siblings = state.childrenMap.get(parent.id) || [];
      const index = siblings.findIndex(s => s.id === element.id);
      const isFirst = index === 0;
      const isLast = index === siblings.length - 1;
      const isOnly = siblings.length === 1;

      return { orientation, isFirst, isLast, isOnly };
    })
  );

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

  // 테마 색상 (동적으로 CSS 변수에서 읽어옴)
  const themeColors = useThemeColors();

  // Unselected 상태 색상 (항상 default - surface-container-high)
  const unselectedColors = useMemo(() => {
    return getVariantColors("default", themeColors) as VariantColors;
  }, [themeColors]);

  // Selected 상태 색상 (variant에 맞게)
  const selectedColors = useMemo(() => {
    const variant = props?.variant || "default"; // CSS와 일치하도록 default 사용
    return getVariantColors(variant, themeColors) as VariantColors;
  }, [props?.variant, themeColors]);

  // 버튼 텍스트
  const buttonText = useMemo(() => {
    return String(props?.children || props?.text || props?.label || "Toggle");
  }, [props?.children, props?.text, props?.label]);

  // 🚀 size 우선순위: 부모 ToggleButtonGroup size > props.size > 기본값 'sm'
  // ToggleButtonGroup 안의 버튼은 부모의 size를 따라야 함 (CSS 동작과 일치)
  const effectiveSize = parentSize || props?.size || 'sm';

  // 🚀 effectiveProps: 부모에서 상속받은 size를 반영
  const effectiveProps = useMemo(() => ({
    ...(props || {}),
    size: effectiveSize,
  }), [props, effectiveSize]);

  // 레이아웃 스타일
  const layout = useMemo(() => {
    return getToggleButtonLayout(style, effectiveProps, buttonText, unselectedColors, selectedColors, parentContentArea);
  }, [style, effectiveProps, buttonText, unselectedColors, selectedColors, parentContentArea]);

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

    // 🚀 그룹 내 위치에 따른 borderRadius 계산
    // CSS 규칙: 그룹 내 버튼은 외곽 모서리만 radius 적용
    let effectiveBorderRadius: number | [number, number, number, number] = layout.borderRadius;

    if (groupPositionInfo) {
      const { orientation, isFirst, isLast, isOnly } = groupPositionInfo;
      const r = layout.borderRadius;

      if (isOnly) {
        // 단일 버튼: 모든 모서리에 radius
        effectiveBorderRadius = r;
      } else if (orientation === 'horizontal') {
        // 가로 배치
        if (isFirst) {
          // 첫 번째: 왼쪽만 [tl, 0, 0, bl]
          effectiveBorderRadius = [r, 0, 0, r];
        } else if (isLast) {
          // 마지막: 오른쪽만 [0, tr, br, 0]
          effectiveBorderRadius = [0, r, r, 0];
        } else {
          // 중간: 모두 0
          effectiveBorderRadius = [0, 0, 0, 0];
        }
      } else {
        // 세로 배치 (vertical)
        if (isFirst) {
          // 첫 번째: 위쪽만 [tl, tr, 0, 0]
          effectiveBorderRadius = [r, r, 0, 0];
        } else if (isLast) {
          // 마지막: 아래쪽만 [0, 0, br, bl]
          effectiveBorderRadius = [0, 0, r, r];
        } else {
          // 중간: 모두 0
          effectiveBorderRadius = [0, 0, 0, 0];
        }
      }
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
      effectiveBorderRadius
    );

    const hoverView = createToggleButtonGraphics(
      layout.width,
      layout.height,
      hoverBgColor,
      borderCol,
      effectiveBorderRadius
    );

    const pressedView = createToggleButtonGraphics(
      layout.width,
      layout.height,
      pressedBgColor,
      borderCol,
      effectiveBorderRadius
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
    // effectiveBorderRadius가 배열인 경우 최대값 사용
    const overlayRadius = Array.isArray(effectiveBorderRadius)
      ? Math.max(...effectiveBorderRadius)
      : effectiveBorderRadius;

    if (layout.isDisabled) {
      const disabledOverlay = createDisabledOverlay(
        layout.width,
        layout.height,
        overlayRadius
      );
      container.addChild(disabledOverlay);
      disabledOverlayRef.current = disabledOverlay;
    }

    // Cleanup
    // ⚠️ try-catch: CanvasTextSystem이 이미 정리된 경우 에러 방지
    return () => {
      try {
        // Graphics 객체 명시적 destroy (GPU 리소스 해제)
        defaultView.destroy(true);
        hoverView.destroy(true);
        pressedView.destroy(true);
        textView.destroy(true);
      } catch {
        // CanvasTextSystem race condition - 무시
      }

      if (buttonRef.current) {
        try {
          if (container.children.includes(buttonRef.current)) {
            container.removeChild(buttonRef.current);
          }
          if (!buttonRef.current.destroyed) {
            buttonRef.current.destroy({ children: true });
          }
        } catch {
          // ignore
        }
        buttonRef.current = null;
      }
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
    groupPositionInfo,
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

  // @pixi/layout에 크기 전달 - Yoga 레이아웃 계산용
  const containerLayout = useMemo(() => ({
    width: layout.width,
    height: layout.height,
  }), [layout.width, layout.height]);

  return (
    <pixiContainer
      x={layout.left}
      y={layout.top}
      ref={(c: PixiContainer | null) => {
        containerRef.current = c;
      }}
      layout={containerLayout}
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
