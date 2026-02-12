/**
 * Pixi Breadcrumbs
 *
 * 🚀 Phase 2: Breadcrumbs WebGL 컴포넌트 (Pattern C)
 * 🚀 Phase 11: @pixi/layout 기반 리팩토링
 *
 * 네비게이션 경로 표시 컴포넌트
 * - variant (default, primary, secondary, tertiary, error, filled) 지원
 * - size (sm, md, lg) 지원
 * - Store에서 Breadcrumb 자식 요소 읽기
 *
 * CSS 동기화:
 * - .react-aria-Breadcrumbs: display: flex, align-items: center
 * - .react-aria-Breadcrumb:not(:last-child)::after: separator padding
 * - .filled: background, padding, border-radius
 *
 * @since 2025-12-16 Phase 2 WebGL Migration
 * @updated 2025-01-07 Phase 11 @pixi/layout migration
 */

import '@pixi/layout';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { TextStyle, Graphics as PixiGraphics } from "pixi.js";
import type { Element } from "../../../../types/core/store.types";
import type { CSSStyle } from "../sprites/styleConverter";
import { cssColorToHex } from "../sprites/styleConverter";
import { useStore } from "../../../stores";

// 🚀 Component Spec
import {
  BreadcrumbsSpec,
  getVariantColors as getSpecVariantColors,
  getSizePreset as getSpecSizePreset,
} from '@xstudio/specs';

// ============================================
// Types
// ============================================

export interface PixiBreadcrumbsProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
}

interface BreadcrumbsElementProps {
  variant?: "default" | "primary" | "secondary" | "tertiary" | "error" | "filled";
  size?: "sm" | "md" | "lg";
  separator?: string;
  style?: CSSStyle;
}

// ============================================
// Component
// ============================================

export const PixiBreadcrumbs = memo(function PixiBreadcrumbs({
  element,
  onClick,
}: PixiBreadcrumbsProps) {
  useExtend(PIXI_COMPONENTS);
  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as BreadcrumbsElementProps | undefined;

  // Store에서 자식 요소 읽기
  const elements = useStore((state) => state.elements);
  const childItems = useMemo(() => {
    return elements
      .filter((el) => el.parent_id === element.id && el.tag === "Breadcrumb")
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
  }, [elements, element.id]);

  // variant, size
  const variant = useMemo(() => String(props?.variant || "default"), [props?.variant]);
  const size = useMemo(() => String(props?.size || "md"), [props?.size]);
  const separator = useMemo(() => String(props?.separator || "›"), [props?.separator]);

  // 🚀 Spec Migration
  const sizePreset = useMemo(() => {
    const sizeSpec = BreadcrumbsSpec.sizes[size] || BreadcrumbsSpec.sizes[BreadcrumbsSpec.defaultSize];
    return getSpecSizePreset(sizeSpec, 'light');
  }, [size]);

  // 🚀 Spec Migration: variant에 따른 테마 색상
  const variantColors = useMemo(() => {
    const variantSpec = BreadcrumbsSpec.variants[variant] || BreadcrumbsSpec.variants[BreadcrumbsSpec.defaultVariant];
    return getSpecVariantColors(variantSpec, 'light');
  }, [variant]);

  // 색상 프리셋 값들 (테마 색상 적용)
  const colorPreset = useMemo(() => ({
    textColor: variantColors.text,
    currentColor: variantColors.bg,
    separatorColor: 0x9ca3af,
    backgroundColor: 0xf3f4f6,
  }), [variantColors]);

  // 텍스트 색상 (inline style 오버라이드 지원)
  const textColor = useMemo(() => {
    if (style?.color) {
      return cssColorToHex(style.color, colorPreset.textColor);
    }
    return colorPreset.textColor;
  }, [style, colorPreset]);

  // hover 상태 관리 (각 항목별)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 🚀 Phase 11: onLayout으로 계산된 크기 (filled 배경용)
  const layoutWidthRef = useRef<number | null>(null);
  const layoutHeightRef = useRef<number | null>(null);
  const [layoutWidth, setLayoutWidth] = useState<number | null>(null);
  const [layoutHeight, setLayoutHeight] = useState<number | null>(null);

  // 텍스트 스타일
  const createTextStyle = useCallback(
    (isLast: boolean, isHovered: boolean) =>
      new TextStyle({
        fontFamily: "Pretendard, sans-serif",
        fontSize: sizePreset.fontSize,
        fill: isLast ? colorPreset.currentColor : isHovered ? colorPreset.currentColor : textColor,
        fontWeight: isLast ? "500" : "400",
      }),
    [sizePreset.fontSize, colorPreset.currentColor, textColor]
  );

  // 구분자 스타일
  const separatorStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily: "Pretendard, sans-serif",
        fontSize: sizePreset.fontSize,
        fill: colorPreset.separatorColor,
        fontWeight: "400",
      }),
    [sizePreset.fontSize, colorPreset.separatorColor]
  );

  // 🚀 Phase 11: @pixi/layout - CSS .react-aria-Breadcrumbs 동기화
  // CSS: display: flex; align-items: center;
  const rootLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    // filled variant: padding 적용
    padding: variant === 'filled' ? sizePreset.padding : 0,
  }), [variant, sizePreset.padding]);

  // 🚀 Phase 11: separator 레이아웃
  // CSS: .react-aria-Breadcrumb:not(:last-child)::after { padding: 0 var(--spacing); }
  const separatorLayout = useMemo(() => ({
    paddingLeft: sizePreset.gap,
    paddingRight: sizePreset.gap,
  }), [sizePreset.gap]);

  // 클릭 핸들러
  const handleItemClick = useCallback(
    (index: number) => {
      const item = childItems[index];
      if (item) {
        onClick?.(item.id);
      }
    },
    [childItems, onClick]
  );

  // 🚀 Phase 11: onLayout 콜백 - filled 배경 크기 계산용
  const handleLayout = useCallback((layout: { computedLayout?: { width?: number; height?: number } }) => {
    const nextWidth = layout.computedLayout?.width;
    const nextHeight = layout.computedLayout?.height;

    if (nextWidth && layoutWidthRef.current !== nextWidth) {
      layoutWidthRef.current = nextWidth;
      setLayoutWidth(nextWidth);
    }
    if (nextHeight && layoutHeightRef.current !== nextHeight) {
      layoutHeightRef.current = nextHeight;
      setLayoutHeight(nextHeight);
    }
  }, []);

  // 배경 그리기 (filled variant용)
  const drawBackground = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (variant === "filled" && layoutWidth && layoutHeight) {
        g.roundRect(0, 0, layoutWidth, layoutHeight, 8);
        g.fill({ color: 0xf3f4f6 });
      }
    },
    [variant, layoutWidth, layoutHeight]
  );

  // 🚀 Phase 11: 빵부스러기 아이템 데이터 준비
  const breadcrumbItems = useMemo(() => {
    return childItems.map((item, index) => ({
      id: item.id,
      text: String(item.props?.children || item.props?.text || item.props?.title || "Item"),
      isLast: index === childItems.length - 1,
      index,
    }));
  }, [childItems]);

  return (
    // @ts-expect-error - onLayout is added by @pixi/layout at runtime
    <pixiContainer layout={rootLayout} onLayout={handleLayout}>
      {/* 배경 (filled variant) */}
      {variant === "filled" && <pixiGraphics draw={drawBackground} />}

      {/* 🚀 Phase 11: @pixi/layout flex로 항목 배치 */}
      {breadcrumbItems.map((item) => {
        const isHovered = hoveredIndex === item.index;

        return (
          <pixiContainer key={item.id} layout={{ display: 'flex' as const, flexDirection: 'row' as const, alignItems: 'center' as const }}>
            {/* Breadcrumb 텍스트 */}
            <pixiText
              text={item.text}
              style={createTextStyle(item.isLast, isHovered)}
              eventMode="static"
              cursor={item.isLast ? "default" : "pointer"}
              onPointerEnter={() => !item.isLast && setHoveredIndex(item.index)}
              onPointerLeave={() => setHoveredIndex(null)}
              onPointerDown={() => !item.isLast && handleItemClick(item.index)}
              layout={{ isLeaf: true }}
            />

            {/* Separator (마지막 항목 제외) */}
            {!item.isLast && (
              <pixiContainer layout={separatorLayout}>
                <pixiText
                  text={separator}
                  style={separatorStyle}
                  layout={{ isLeaf: true }}
                />
              </pixiContainer>
            )}
          </pixiContainer>
        );
      })}
    </pixiContainer>
  );
});

export default PixiBreadcrumbs;
