/**
 * Pixi Breadcrumbs
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
 * @updated 2026-02-19 Wave 4: LayoutComputedSizeContext로 히트 영역 통합
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useMemo, useState, useContext } from "react";
import { TextStyle, Graphics as PixiGraphics } from "pixi.js";
import type { Element } from "../../../../types/core/store.types";
import type { CSSStyle } from "../sprites/styleConverter";
import { cssColorToHex } from "../sprites/styleConverter";
import { useStore } from "../../../stores";
import { LayoutComputedSizeContext } from '../layoutContext';

// 🚀 Component Spec
import {
  BreadcrumbsSpec,
  getVariantColors as getSpecVariantColors,
  getSizePreset as getSpecSizePreset,
} from '@xstudio/specs';

// ============================================
// Constants
// ============================================

const FALLBACK_WIDTH = 200;
const FALLBACK_HEIGHT = 32;

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

  // 레이아웃 엔진(Taffy/Dropflow) 계산 결과 — DirectContainer가 제공
  const computedSize = useContext(LayoutComputedSizeContext);
  const hitWidth = computedSize?.width ?? FALLBACK_WIDTH;
  const hitHeight = computedSize?.height ?? FALLBACK_HEIGHT;

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

  // 배경 그리기 (filled variant용) — 엔진 계산 크기 사용, fallback: FALLBACK_WIDTH x FALLBACK_HEIGHT
  const drawBackground = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (variant === "filled") {
        g.roundRect(0, 0, hitWidth, hitHeight, 8);
        g.fill({ color: 0xf3f4f6 });
      }
    },
    [variant, hitWidth, hitHeight]
  );

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

  // 빵부스러기 아이템 데이터 준비
  const breadcrumbItems = useMemo(() => {
    return childItems.map((item, index) => ({
      id: item.id,
      text: String(item.props?.children || item.props?.text || item.props?.title || "Item"),
      isLast: index === childItems.length - 1,
      index,
    }));
  }, [childItems]);

  return (
    <pixiContainer>
      {/* 배경 (filled variant) — 엔진 계산 크기 적용 */}
      {variant === "filled" && <pixiGraphics draw={drawBackground} />}

      {breadcrumbItems.map((item) => {
        const isHovered = hoveredIndex === item.index;

        return (
          <pixiContainer key={item.id}>
            {/* Breadcrumb 텍스트 */}
            <pixiText
              text={item.text}
              style={createTextStyle(item.isLast, isHovered)}
              eventMode="static"
              cursor="default"
              onPointerEnter={() => !item.isLast && setHoveredIndex(item.index)}
              onPointerLeave={() => setHoveredIndex(null)}
              onPointerDown={() => !item.isLast && handleItemClick(item.index)}
            />

            {/* Separator (마지막 항목 제외) */}
            {!item.isLast && (
              <pixiContainer>
                <pixiText
                  text={separator}
                  style={separatorStyle}
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
