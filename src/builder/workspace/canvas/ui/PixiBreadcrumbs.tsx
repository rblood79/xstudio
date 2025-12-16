/**
 * Pixi Breadcrumbs
 *
 * 🚀 Phase 2: Breadcrumbs WebGL 컴포넌트 (Pattern C)
 *
 * 네비게이션 경로 표시 컴포넌트
 * - variant (default, primary, secondary, tertiary, error, filled) 지원
 * - size (sm, md, lg) 지원
 * - Store에서 Breadcrumb 자식 요소 읽기
 *
 * @since 2025-12-16 Phase 2 WebGL Migration
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useMemo, useState } from "react";
import { TextStyle, CanvasTextMetrics, Graphics as PixiGraphics } from "pixi.js";
import type { Element } from "../../../../types/core/store.types";
import type { CSSStyle } from "../sprites/styleConverter";
import { cssColorToHex, parseCSSSize } from "../sprites/styleConverter";
import {
  getBreadcrumbsSizePreset,
  getBreadcrumbsColorPreset,
} from "../utils/cssVariableReader";
import { useStore } from "../../../stores";

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

  // 🚀 CSS에서 프리셋 읽기
  const sizePreset = useMemo(() => getBreadcrumbsSizePreset(size), [size]);
  const colorPreset = useMemo(() => getBreadcrumbsColorPreset(variant), [variant]);

  // 텍스트 색상 (inline style 오버라이드 지원)
  const textColor = useMemo(() => {
    if (style?.color) {
      return cssColorToHex(style.color, colorPreset.textColor);
    }
    return colorPreset.textColor;
  }, [style?.color, colorPreset.textColor]);

  // 위치
  const posX = parseCSSSize(style?.left, undefined, 0);
  const posY = parseCSSSize(style?.top, undefined, 0);

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

  // 레이아웃 계산
  const layout = useMemo(() => {
    let currentX = 0;
    const items: Array<{
      type: "item" | "separator";
      text: string;
      x: number;
      width: number;
      index?: number;
    }> = [];

    childItems.forEach((item, index) => {
      const itemText = String(
        item.props?.children || item.props?.text || item.props?.title || "Item"
      );
      const isLast = index === childItems.length - 1;
      const itemStyle = createTextStyle(isLast, false);
      const metrics = CanvasTextMetrics.measureText(itemText, itemStyle);

      items.push({
        type: "item",
        text: itemText,
        x: currentX,
        width: metrics.width,
        index,
      });

      currentX += metrics.width;

      // 마지막 항목이 아니면 구분자 추가
      if (!isLast) {
        const sepMetrics = CanvasTextMetrics.measureText(separator, separatorStyle);
        items.push({
          type: "separator",
          text: separator,
          x: currentX + sizePreset.gap,
          width: sepMetrics.width,
        });
        currentX += sizePreset.gap * 2 + sepMetrics.width;
      }
    });

    return items;
  }, [childItems, createTextStyle, separatorStyle, separator, sizePreset.gap]);

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

  // 배경 그리기 (filled variant용)
  const drawBackground = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (variant === "filled") {
        const totalWidth = layout.length > 0
          ? layout[layout.length - 1].x + layout[layout.length - 1].width + sizePreset.padding * 2
          : 100;
        g.roundRect(
          0,
          0,
          totalWidth,
          sizePreset.fontSize + sizePreset.padding * 2,
          8
        );
        g.fill({ color: 0xf3f4f6 });
      }
    },
    [variant, layout, sizePreset.fontSize, sizePreset.padding]
  );

  const containerOffset = variant === "filled" ? sizePreset.padding : 0;

  return (
    <pixiContainer x={posX} y={posY}>
      {/* 배경 (filled variant) */}
      <pixiGraphics draw={drawBackground} />

      {/* 빵 부스러기 항목들 */}
      <pixiContainer x={containerOffset} y={containerOffset}>
        {layout.map((item, idx) => {
          if (item.type === "separator") {
            return (
              <pixiText
                key={`sep-${idx}`}
                text={item.text}
                style={separatorStyle}
                x={item.x}
                y={0}
              />
            );
          }

          const itemIndex = item.index!;
          const isLast = itemIndex === childItems.length - 1;
          const isHovered = hoveredIndex === itemIndex;

          return (
            <pixiText
              key={`item-${idx}`}
              text={item.text}
              style={createTextStyle(isLast, isHovered)}
              x={item.x}
              y={0}
              eventMode="static"
              cursor={isLast ? "default" : "pointer"}
              onPointerEnter={() => !isLast && setHoveredIndex(itemIndex)}
              onPointerLeave={() => setHoveredIndex(null)}
              onPointerDown={() => !isLast && handleItemClick(itemIndex)}
            />
          );
        })}
      </pixiContainer>
    </pixiContainer>
  );
});

export default PixiBreadcrumbs;
