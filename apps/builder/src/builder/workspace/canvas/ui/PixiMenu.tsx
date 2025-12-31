/**
 * Pixi Menu
 *
 * 🚀 Phase 2: Menu WebGL 컴포넌트 (Pattern C)
 *
 * 드롭다운/컨텍스트 메뉴 컴포넌트
 * - variant (default, primary, secondary, tertiary, error, filled) 지원
 * - size (sm, md, lg) 지원
 * - Store에서 MenuItem 자식 요소 읽기
 * - hover/selected 상태 지원
 *
 * @since 2025-12-16 Phase 2 WebGL Migration
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useMemo, useState } from "react";
import {
  Graphics as PixiGraphics,
  TextStyle,
  CanvasTextMetrics,
} from "pixi.js";
import type { Element } from "../../../../types/core/store.types";
import type { CSSStyle } from "../sprites/styleConverter";
import { cssColorToHex, parseCSSSize } from "../sprites/styleConverter";
import {
  getMenuSizePreset,
  getMenuColorPreset,
} from "../utils/cssVariableReader";
import { drawBox } from "../utils";
import { useStore } from "../../../stores";

// ============================================
// Types
// ============================================

export interface PixiMenuProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
}

interface MenuElementProps {
  variant?: "default" | "primary" | "secondary" | "tertiary" | "error" | "filled";
  size?: "sm" | "md" | "lg";
  style?: CSSStyle;
}

interface MenuItemData {
  id: string;
  text: string;
  icon?: string;
  shortcut?: string;
  isSeparator?: boolean;
  isDisabled?: boolean;
  y: number;
  height: number;
}

// ============================================
// Component
// ============================================

export const PixiMenu = memo(function PixiMenu({
  element,
  onClick,
}: PixiMenuProps) {
  useExtend(PIXI_COMPONENTS);
  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as MenuElementProps | undefined;

  // Store에서 자식 요소 읽기
  const elements = useStore((state) => state.elements);
  const childItems = useMemo(() => {
    return elements
      .filter(
        (el) =>
          el.parent_id === element.id &&
          (el.tag === "MenuItem" || el.tag === "MenuSeparator" || el.tag === "Separator")
      )
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
  }, [elements, element.id]);

  // variant, size
  const variant = useMemo(() => String(props?.variant || "default"), [props?.variant]);
  const size = useMemo(() => String(props?.size || "md"), [props?.size]);

  // 🚀 CSS에서 프리셋 읽기
  const sizePreset = useMemo(() => getMenuSizePreset(size), [size]);
  const colorPreset = useMemo(() => getMenuColorPreset(variant), [variant]);

  // hover 상태 관리
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 색상 (inline style 오버라이드 지원)
  const bgColor = useMemo(() => {
    if (style?.backgroundColor) {
      return cssColorToHex(style.backgroundColor, colorPreset.backgroundColor);
    }
    return colorPreset.backgroundColor;
  }, [style, colorPreset]);

  const borderColor = useMemo(() => {
    if (style?.borderColor) {
      return cssColorToHex(style.borderColor, colorPreset.borderColor);
    }
    return colorPreset.borderColor;
  }, [style, colorPreset]);

  // 위치
  const posX = parseCSSSize(style?.left, undefined, 0);
  const posY = parseCSSSize(style?.top, undefined, 0);

  // 레이아웃 계산
  const menuLayout = useMemo(() => {
    const items: MenuItemData[] = [];
    let currentY = sizePreset.containerPadding;
    let maxWidth = sizePreset.minWidth;

    const textStyle = new TextStyle({
      fontFamily: "Pretendard, sans-serif",
      fontSize: sizePreset.fontSize,
      fontWeight: "600",
    });

    childItems.forEach((item) => {
      const isSeparator = item.tag === "MenuSeparator" || item.tag === "Separator";
      const isDisabled = Boolean(item.props?.isDisabled);

      if (isSeparator) {
        items.push({
          id: item.id,
          text: "",
          isSeparator: true,
          y: currentY,
          height: 1 + sizePreset.itemPaddingY * 2,
        });
        currentY += 1 + sizePreset.itemPaddingY * 2;
      } else {
        const itemText = String(
          item.props?.children || item.props?.text || item.props?.title || "Menu Item"
        );
        const shortcut = item.props?.shortcut as string | undefined;

        const metrics = CanvasTextMetrics.measureText(itemText, textStyle);
        const shortcutWidth = shortcut
          ? CanvasTextMetrics.measureText(shortcut, textStyle).width + 20
          : 0;

        const itemWidth =
          sizePreset.itemPaddingX * 2 + metrics.width + shortcutWidth + 20;
        maxWidth = Math.max(maxWidth, itemWidth);

        const itemHeight = sizePreset.fontSize + sizePreset.itemPaddingY * 2;

        items.push({
          id: item.id,
          text: itemText,
          shortcut,
          isDisabled,
          y: currentY,
          height: itemHeight,
        });

        currentY += itemHeight;
      }
    });

    return {
      items,
      totalWidth: maxWidth + sizePreset.containerPadding * 2,
      totalHeight: currentY + sizePreset.containerPadding,
    };
  }, [childItems, sizePreset]);

  // 메뉴 배경 그리기
  const drawMenuBackground = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      drawBox(g, {
        width: menuLayout.totalWidth,
        height: menuLayout.totalHeight,
        backgroundColor: bgColor,
        backgroundAlpha: 1,
        borderRadius: sizePreset.borderRadius,
        border: borderColor !== 0x00000000 ? { width: 1, color: borderColor, alpha: 1, style: 'solid' as const, radius: sizePreset.borderRadius } : undefined,
      });
    },
    [menuLayout.totalWidth, menuLayout.totalHeight, bgColor, borderColor, sizePreset.borderRadius]
  );

  // 메뉴 아이템 배경 그리기
  const drawItemBackground = useCallback(
    (g: PixiGraphics, item: MenuItemData, isHovered: boolean) => {
      g.clear();
      if (item.isSeparator) {
        // 구분선
        g.rect(
          sizePreset.containerPadding,
          0,
          menuLayout.totalWidth - sizePreset.containerPadding * 2,
          1
        );
        g.fill({ color: colorPreset.separatorColor, alpha: 0.3 });
      } else if (isHovered && !item.isDisabled) {
        // hover 배경
        g.roundRect(
          sizePreset.containerPadding / 2,
          0,
          menuLayout.totalWidth - sizePreset.containerPadding,
          item.height,
          4
        );
        g.fill({ color: colorPreset.hoverBgColor });
      }
    },
    [menuLayout.totalWidth, sizePreset.containerPadding, colorPreset]
  );

  // 텍스트 스타일
  const createTextStyle = useCallback(
    (isHovered: boolean, isDisabled: boolean) =>
      new TextStyle({
        fontFamily: "Pretendard, sans-serif",
        fontSize: sizePreset.fontSize,
        fill: isDisabled
          ? 0x9ca3af
          : isHovered
          ? colorPreset.hoverTextColor
          : colorPreset.textColor,
        fontWeight: "600",
      }),
    [sizePreset, colorPreset]
  );

  // shortcut 스타일
  const shortcutStyle = useMemo(
    () =>
      new TextStyle({
        fontFamily: "monospace",
        fontSize: sizePreset.fontSize - 2,
        fill: 0x9ca3af,
        fontWeight: "400",
      }),
    [sizePreset.fontSize]
  );

  // 클릭 핸들러
  const handleItemClick = useCallback(
    (item: MenuItemData) => {
      if (!item.isSeparator && !item.isDisabled) {
        onClick?.(item.id);
      }
    },
    [onClick]
  );

  return (
    <pixiContainer x={posX} y={posY}>
      {/* 메뉴 배경 */}
      <pixiGraphics draw={drawMenuBackground} />

      {/* 메뉴 아이템들 */}
      {menuLayout.items.map((item, index) => {
        const isHovered = hoveredIndex === index;

        return (
          <pixiContainer key={item.id} x={0} y={item.y}>
            {/* 아이템 배경 */}
            <pixiGraphics
              draw={(g) => drawItemBackground(g, item, isHovered)}
              eventMode="static"
              cursor={item.isSeparator || item.isDisabled ? "default" : "pointer"}
              onPointerEnter={() => !item.isSeparator && setHoveredIndex(index)}
              onPointerLeave={() => setHoveredIndex(null)}
              onPointerDown={() => handleItemClick(item)}
            />

            {/* 아이템 텍스트 */}
            {!item.isSeparator && (
              <>
                <pixiText
                  text={item.text}
                  style={createTextStyle(isHovered, Boolean(item.isDisabled))}
                  x={sizePreset.containerPadding + sizePreset.itemPaddingX}
                  y={sizePreset.itemPaddingY}
                  eventMode="static"
                  cursor={item.isDisabled ? "default" : "pointer"}
                  onPointerEnter={() => setHoveredIndex(index)}
                  onPointerLeave={() => setHoveredIndex(null)}
                  onPointerDown={() => handleItemClick(item)}
                />

                {/* 단축키 */}
                {item.shortcut && (
                  <pixiText
                    text={item.shortcut}
                    style={shortcutStyle}
                    x={menuLayout.totalWidth - sizePreset.containerPadding - sizePreset.itemPaddingX - 40}
                    y={sizePreset.itemPaddingY + 1}
                  />
                )}
              </>
            )}
          </pixiContainer>
        );
      })}
    </pixiContainer>
  );
});

export default PixiMenu;
