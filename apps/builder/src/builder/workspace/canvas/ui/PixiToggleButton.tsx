/**
 * Pixi ToggleButton
 *
 * 투명 히트 영역(pixiGraphics) 기반 ToggleButton
 * - Skia가 시각적 렌더링을 담당, PixiJS는 이벤트 히트 영역만 제공
 * - selected/unselected 상태에 따른 색상 변경
 * - variant (default, primary, secondary, surface) 지원
 * - size (sm, md, lg) 지원
 *
 * @since 2025-12-16 Phase 1 WebGL Migration
 * @updated 2026-02-18 @pixi/ui FancyButton 의존성 제거 (Skia 렌더링 전환)
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useRef, useMemo } from "react";
import {
  Container as PixiContainer,
  Graphics as PixiGraphicsClass,
  TextStyle,
  CanvasTextMetrics,
} from "pixi.js";
import type { Element } from "../../../../types/core/store.types";
import type { CSSStyle } from "../sprites/styleConverter";
import { cssColorToHex, parseCSSSize } from "../sprites/styleConverter";
import { measureTextWidth as measureTextWidthCanvas } from "../layout/engines/utils";
import { useCanvasSyncStore } from "../canvasSync";
import { parsePadding, parseBorderWidth } from "../sprites/paddingUtils";
import { useStore } from "../../../stores";

interface ToggleButtonSizePreset {
  fontSize: number;
  paddingX: number;
  paddingY: number;
  borderRadius: number;
}

// ============================================
// 🚀 Component Spec
// ============================================

import { resolveTokenColor } from '../hooks/useSpecRenderer';
import {
  ToggleButtonSpec,
  TOGGLE_SELECTED_COLORS,
  getVariantColors as getSpecVariantColors,
  getSizePreset as getSpecSizePreset,
} from '@xstudio/specs';

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

  // 🚀 Spec Migration
  const sizeSpec = ToggleButtonSpec.sizes[size] || ToggleButtonSpec.sizes[ToggleButtonSpec.defaultSize];
  const specPreset = getSpecSizePreset(sizeSpec, 'light');
  const sizePreset: ToggleButtonSizePreset = {
    fontSize: specPreset.fontSize,
    paddingX: specPreset.paddingX,
    paddingY: specPreset.paddingY,
    borderRadius: specPreset.borderRadius,
  };

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
  // 개별 selector로 분리하여 primitive 비교 (useShallow 대체)
  const isInToggleGroup = useStore((state) => {
    if (!element.parent_id) return false;
    const parent = state.elementsMap.get(element.parent_id);
    return parent?.tag === 'ToggleButtonGroup';
  });

  const groupOrientation = useStore((state) => {
    if (!element.parent_id || !isInToggleGroup) return 'horizontal';
    const parent = state.elementsMap.get(element.parent_id);
    if (!parent) return 'horizontal';
    return ((parent.props as Record<string, unknown>)?.orientation as string) || 'horizontal';
  });

  const groupPositionIndex = useStore((state) => {
    if (!element.parent_id || !isInToggleGroup) return -1;
    const parent = state.elementsMap.get(element.parent_id);
    if (!parent) return -1;
    const siblings = (state.childrenMap.get(parent.id) || [])
      .slice()
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    return siblings.findIndex(s => s.id === element.id);
  });

  const groupSiblingCount = useStore((state) => {
    if (!element.parent_id || !isInToggleGroup) return 0;
    const parent = state.elementsMap.get(element.parent_id);
    if (!parent) return 0;
    return (state.childrenMap.get(parent.id) || []).length;
  });

  const groupPositionInfo = isInToggleGroup
    ? {
        orientation: groupOrientation,
        isFirst: groupPositionIndex === 0,
        isLast: groupPositionIndex === groupSiblingCount - 1,
        isOnly: groupSiblingCount === 1,
      }
    : null;

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

    // padding + border 차감 (border-box 모델)
    const pp = parsePadding(parentStyle);
    const pb = parseBorderWidth(parentStyle);

    return {
      width: Math.max(0, pw - pp.left - pp.right - pb.left - pb.right),
      height: Math.max(0, ph - pp.top - pp.bottom - pb.top - pb.bottom),
    };
  }, [parentElement, canvasSize]);

  // Unselected 상태 색상 (항상 default - surface-container-high)
  const unselectedColors = useMemo(() => {
    const variantSpec = ToggleButtonSpec.variants['default'] || ToggleButtonSpec.variants[ToggleButtonSpec.defaultVariant];
    return getSpecVariantColors(variantSpec, 'light') as VariantColors;
  }, []);

  // Selected 상태 색상 (variant에 맞게)
  const selectedColors = useMemo(() => {
    const variant = props?.variant || "default";
    const selectedColorDef = TOGGLE_SELECTED_COLORS[variant] || TOGGLE_SELECTED_COLORS['default'];
    return {
      bg: resolveTokenColor(selectedColorDef.bg, 'light'),
      bgHover: resolveTokenColor(selectedColorDef.bg, 'light'),
      bgPressed: resolveTokenColor(selectedColorDef.bg, 'light'),
      text: resolveTokenColor(selectedColorDef.text, 'light'),
      border: resolveTokenColor(selectedColorDef.border, 'light'),
    } as VariantColors;
  }, [props?.variant]);

  // 버튼 텍스트
  const buttonText = useMemo(() => {
    return String(props?.children || props?.text || props?.label || "Toggle");
  }, [props?.children, props?.text, props?.label]);

  // 🚀 size 우선순위: 부모 ToggleButtonGroup size > props.size > 기본값 'sm'
  // ToggleButtonGroup 안의 버튼은 부모의 size를 따라야 함 (CSS 동작과 일치)
  const effectiveSize = (parentSize || props?.size || 'sm') as 'xs' | 'sm' | 'md' | 'lg' | 'xl';

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
  // Note: cursorStyle 변수는 사용하지 않음 (Pencil 동작과 일치하도록 항상 default)

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
        cursor="default"
        onPointerDown={handleClick}
      />
    </pixiContainer>
  );
});

export default PixiToggleButton;
