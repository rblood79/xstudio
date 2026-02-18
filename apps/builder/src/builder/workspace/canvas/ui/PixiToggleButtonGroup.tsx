/**
 * Pixi ToggleButtonGroup
 *
 * 🚀 Phase 1: ToggleButtonGroup WebGL 컴포넌트 (Pattern C)
 *
 * Store에서 자식 ToggleButton 요소들을 읽어 그룹으로 렌더링
 * - variant (default, primary, secondary, surface) 지원
 * - size (sm, md, lg) 지원
 * - selectionMode: single (기본) / multiple
 * - orientation: horizontal (기본) / vertical
 *
 * @since 2025-12-16 Phase 1 WebGL Migration
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useContext, useMemo } from "react";
import {
  Graphics as PixiGraphics,
  TextStyle,
  CanvasTextMetrics,
} from "pixi.js";
import type { Element } from "../../../../types/core/store.types";
import type { CSSStyle } from "../sprites/styleConverter";
import { cssColorToHex, cssColorToAlpha, parseCSSSize } from "../sprites/styleConverter";
import { parsePadding } from "../sprites/paddingUtils";
import { drawBox, parseBorderConfig } from "../utils";

// 🚀 Component Spec
import {
  ToggleButtonGroupSpec,
  getSizePreset as getSpecSizePreset,
} from '@xstudio/specs';
import { LayoutComputedSizeContext } from "../layoutContext";
import { useStore } from "../../../stores";


// ============================================
// Types
// ============================================

export interface PixiToggleButtonGroupProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, selectedKeys: string[]) => void;
  // 🚀 CONTAINER_TAGS 지원: 자식 요소 내부 렌더링
  childElements?: Element[];
  renderChildElement?: (child: Element) => React.ReactNode;
}

interface ToggleButtonItem {
  id: string;
  value: string;
  label: string;
  isDisabled?: boolean;
}

// ============================================
// Constants
// ============================================

const DEFAULT_GAP = 0;  // CSS 기본값: gap: 0
const MIN_BUTTON_WIDTH = 48;

// ============================================
// Helper Functions
// ============================================

/**
 * 자식 ToggleButton 요소들에서 아이템 파싱
 */
function parseToggleButtonsFromChildren(childButtons: Element[]): ToggleButtonItem[] {
  if (childButtons.length === 0) return [];

  return childButtons
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
    .map((button, index) => {
      const props = button.props as Record<string, unknown> | undefined;
      return {
        id: button.id,
        value: String(props?.value || props?.id || button.id || index),
        label: String(props?.children || props?.label || props?.text || `Button ${index + 1}`),
        isDisabled: Boolean(props?.isDisabled),
      };
    });
}

/**
 * props.items에서 아이템 파싱
 */
function parseToggleButtonsFromProps(props: Record<string, unknown> | undefined): ToggleButtonItem[] | null {
  if (!props || !Array.isArray(props.items) || props.items.length === 0) {
    return null;
  }

  return props.items.map((item: unknown, index: number) => {
    if (typeof item === "string") {
      return { id: String(index), value: item, label: item };
    }
    if (typeof item === "object" && item !== null) {
      const itemObj = item as Record<string, unknown>;
      return {
        id: String(itemObj.id || index),
        value: String(itemObj.value || itemObj.id || index),
        label: String(itemObj.label || itemObj.name || itemObj.text || `Button ${index + 1}`),
        isDisabled: Boolean(itemObj.isDisabled),
      };
    }
    return { id: String(index), value: String(index), label: String(item) };
  });
}

// ============================================
// Main Component
// ============================================

export const PixiToggleButtonGroup = memo(function PixiToggleButtonGroup({
  element,
  onClick,
  childElements,
  renderChildElement,
}: PixiToggleButtonGroupProps) {
  useExtend(PIXI_COMPONENTS);
  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // Store에서 자식 ToggleButton 요소들 가져오기
  const elements = useStore((state) => state.elements);
  const childButtons = useMemo(() => {
    return elements.filter(
      (el) => el.parent_id === element.id && el.tag === "ToggleButton"
    );
  }, [elements, element.id]);

  // 아이템들: 자식 요소 > props.items > 기본값
  const items = useMemo(() => {
    // 1. 자식 ToggleButton 요소들이 있으면 사용
    const fromChildren = parseToggleButtonsFromChildren(childButtons);
    if (fromChildren.length > 0) return fromChildren;

    // 2. props.items가 있으면 사용
    const fromProps = parseToggleButtonsFromProps(props);
    if (fromProps) return fromProps;

    // 3. 기본값
    return [
      { id: "1", value: "option1", label: "Option 1" },
      { id: "2", value: "option2", label: "Option 2" },
    ];
  }, [childButtons, props]);

  // 🚀 Store에서 최신 element를 직접 구독하여 size 변경 시 리렌더링 보장
  const latestElement = useStore((state) =>
    state.elementsMap.get(element.id)
  ) ?? element;

  // size - 최신 element에서 읽기
  const size = String((latestElement.props as Record<string, unknown>)?.size || "md");

  // 🚀 Spec Migration
  const sizePreset = useMemo(() => {
    const sizeSpec = ToggleButtonGroupSpec.sizes[size] || ToggleButtonGroupSpec.sizes[ToggleButtonGroupSpec.defaultSize];
    return getSpecSizePreset(sizeSpec, 'light');
  }, [size]);

  // 기본 테두리 색상 (gray-300)
  const defaultBorderColor = 0xd1d5db;

  // 방향: horizontal (기본) | vertical
  const isHorizontal = useMemo(() => {
    const orientation = String(props?.orientation || "horizontal");
    const flexDirection = (style as Record<string, unknown>)?.flexDirection;
    return orientation === "horizontal" || flexDirection === "row";
  }, [props?.orientation, style]);

  // gap - CSS 문자열 값도 지원 ("8px", "16" 등)
  const gap = useMemo(() => {
    if (style?.gap === undefined || style?.gap === null || style?.gap === '') {
      return DEFAULT_GAP;
    }
    if (typeof style.gap === 'number') {
      return style.gap;
    }
    const parsed = parseCSSSize(style.gap, undefined, undefined);
    return parsed ?? DEFAULT_GAP;
  }, [style]);

  // 🚀 Phase 13: 사용자 정의 스타일 파싱
  const styleBackgroundColor = useMemo(() => {
    return cssColorToHex(style?.backgroundColor, 0xffffff);
  }, [style]);

  const styleBackgroundAlpha = useMemo(() => {
    if (!style?.backgroundColor) return 0.3;
    return cssColorToAlpha(style.backgroundColor);
  }, [style]);

  // border
  const styleBorderConfig = useMemo(() => parseBorderConfig(style), [style]);

  // borderRadius
  const styleBorderRadius = useMemo(() => {
    const parsed = parseCSSSize(style?.borderRadius, undefined, undefined);
    return parsed ?? (sizePreset.borderRadius + 2);
  }, [style?.borderRadius, sizePreset.borderRadius]);

  // padding
  const stylePadding = useMemo(() => parsePadding(style), [style]);

  // 버튼 크기 계산 (텍스트 기반)
  const buttonSizes = useMemo(() => {
    const textStyle = new TextStyle({
      fontFamily: "Pretendard, sans-serif",
      fontSize: sizePreset.fontSize,
    });

    const borderWidth = 1;
    return items.map((item) => {
      const metrics = CanvasTextMetrics.measureText(item.label, textStyle);
      const width = Math.max(MIN_BUTTON_WIDTH, borderWidth + sizePreset.paddingX + metrics.width + sizePreset.paddingX + borderWidth);
      const height = borderWidth + sizePreset.paddingY + metrics.height + sizePreset.paddingY + borderWidth;
      return { width, height };
    });
  }, [items, sizePreset.fontSize, sizePreset.paddingX, sizePreset.paddingY]);

  // 전체 그룹 배경 크기 계산
  const contentWidth = useMemo(() => {
    if (isHorizontal) {
      return buttonSizes.reduce((sum, s) => sum + s.width, 0) + gap * (items.length - 1);
    }
    return Math.max(...buttonSizes.map((s) => s.width));
  }, [isHorizontal, buttonSizes, gap, items.length]);

  const contentHeight = useMemo(() => {
    if (isHorizontal) {
      return Math.max(...buttonSizes.map((s) => s.height));
    }
    return buttonSizes.reduce((sum, s) => sum + s.height, 0) + gap * (items.length - 1);
  }, [isHorizontal, buttonSizes, gap, items.length]);

  // 배경 그리기용 총 크기 (padding 포함)
  const backgroundWidth = contentWidth + stylePadding.left + stylePadding.right;
  const backgroundHeight = contentHeight + stylePadding.top + stylePadding.bottom;

  // 사용자 정의 width/height 파싱
  const explicitWidth = useMemo(() => {
    const w = style?.width;
    if (w === undefined || w === null || w === '') return null;
    return typeof w === 'number' ? w : parseCSSSize(w);
  }, [style?.width]);

  const explicitHeight = useMemo(() => {
    const h = style?.height;
    if (h === undefined || h === null || h === '') return null;
    return typeof h === 'number' ? h : parseCSSSize(h);
  }, [style?.height]);

  // 🚀 Yoga computed size
  const computedSize = useContext(LayoutComputedSizeContext);

  // 배경 크기: Yoga computed (>0) > 명시적 style > 콘텐츠 기반 자동 계산
  const bgWidth = (computedSize?.width && computedSize.width > 0)
    ? computedSize.width
    : ((explicitWidth && explicitWidth > 0) ? explicitWidth : backgroundWidth);
  const bgHeight = (computedSize?.height && computedSize.height > 0)
    ? computedSize.height
    : ((explicitHeight && explicitHeight > 0) ? explicitHeight : backgroundHeight);

  // 그룹 배경 그리기 (pill 형태)
  const drawGroupBackground = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      const actualWidth = bgWidth;
      const actualHeight = bgHeight;

      const borderConfig = styleBorderConfig ?? {
        width: 1,
        color: defaultBorderColor,
        alpha: 0.5,
        style: "solid" as const,
        radius: styleBorderRadius,
      };

      drawBox(g, {
        width: actualWidth,
        height: actualHeight,
        backgroundColor: styleBackgroundColor,
        backgroundAlpha: styleBackgroundAlpha,
        borderRadius: styleBorderRadius,
        border: borderConfig,
      });
    },
    [bgWidth, bgHeight, styleBackgroundColor, styleBackgroundAlpha, styleBorderRadius, styleBorderConfig, defaultBorderColor]
  );

  // 그룹 클릭 핸들러
  const handleGroupClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  // 🚀 CONTAINER_TAGS: 자식 ToggleButton 내부 렌더링
  const hasChildren = childElements && childElements.length > 0;

  return (
    <pixiContainer>
      {/* 배경 그래픽 */}
      <pixiGraphics
        draw={drawGroupBackground}
        x={0}
        y={0}
        eventMode="static"
        cursor="default"
        onPointerDown={handleGroupClick}
      />
      {/* 자식 ToggleButton 렌더링 - 부모의 size 상속 */}
      {hasChildren && renderChildElement && childElements.map((childEl, index) => {
        const childProps = childEl.props as Record<string, unknown> | undefined;
        const childSize = childProps?.size;
        const inheritedSize = (childSize === undefined || childSize === null || childSize === '') ? size : childSize;

        const childStyle = (childEl.props?.style || {}) as Record<string, unknown>;
        const marginStyle = index > 0
          ? (isHorizontal ? { marginLeft: -1 } : { marginTop: -1 })
          : {};

        const modifiedChild: Element = {
          ...childEl,
          props: {
            ...childEl.props,
            size: inheritedSize,
            _parentSize: size,
            style: {
              ...childStyle,
              ...marginStyle,
            },
          },
        };
        return renderChildElement(modifiedChild);
      })}
    </pixiContainer>
  );
});

export default PixiToggleButtonGroup;
