/**
 * Pixi Tabs
 *
 * 🚀 Phase 2: Tabs WebGL 컴포넌트 (Pattern C)
 *
 * 탭 기반 콘텐츠 전환 컴포넌트
 * - variant (default, primary, secondary, tertiary) 지원
 * - size (sm, md, lg) 지원
 * - orientation (horizontal, vertical) 지원
 * - Store에서 Tab/TabPanel 자식 요소 읽기
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
import { parseCSSSize } from "../sprites/styleConverter";
import {
  getTabsSizePreset,
  getTabsColorPreset,
} from "../utils/cssVariableReader";
import { useStore } from "../../../stores";

// ============================================
// Types
// ============================================

export interface PixiTabsProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
}

interface TabsElementProps {
  variant?: "default" | "primary" | "secondary" | "tertiary";
  size?: "sm" | "md" | "lg";
  orientation?: "horizontal" | "vertical";
  selectedKey?: string;
  style?: CSSStyle;
}

interface TabData {
  id: string;
  tabId: string;
  text: string;
  isDisabled?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================
// Component
// ============================================

export const PixiTabs = memo(function PixiTabs({
  element,
  onClick,
}: PixiTabsProps) {
  useExtend(PIXI_COMPONENTS);
  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as TabsElementProps | undefined;

  // Store에서 자식 요소 읽기
  const elements = useStore((state) => state.elements);
  const tabItems = useMemo(() => {
    return elements
      .filter((el) => el.parent_id === element.id && el.tag === "Tab")
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
  }, [elements, element.id]);

  // variant, size, orientation
  const variant = useMemo(() => String(props?.variant || "default"), [props?.variant]);
  const size = useMemo(() => String(props?.size || "md"), [props?.size]);
  const orientation = useMemo(
    () => String(props?.orientation || "horizontal"),
    [props?.orientation]
  );
  const isVertical = orientation === "vertical";

  // 선택된 탭 (첫 번째 탭이 기본 선택)
  const [selectedTabId, setSelectedTabId] = useState<string | null>(() => {
    if (props?.selectedKey) return props.selectedKey;
    if (tabItems.length > 0) {
      const firstTabId = tabItems[0].props?.tabId as string | undefined;
      return firstTabId || tabItems[0].id;
    }
    return null;
  });

  // 🚀 CSS에서 프리셋 읽기
  const sizePreset = useMemo(() => getTabsSizePreset(size), [size]);
  const colorPreset = useMemo(() => getTabsColorPreset(variant), [variant]);

  // hover 상태 관리
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 위치
  const posX = parseCSSSize(style?.left, undefined, 0);
  const posY = parseCSSSize(style?.top, undefined, 0);

  // 탭 레이아웃 계산
  const tabsLayout = useMemo(() => {
    const tabs: TabData[] = [];
    let currentX = 0;
    let currentY = 0;
    let maxWidth = 0;
    let maxHeight = 0;

    const textStyle = new TextStyle({
      fontFamily: "Pretendard, sans-serif",
      fontSize: sizePreset.fontSize,
      fontWeight: "500",
    });

    tabItems.forEach((tab) => {
      const tabText = String(
        tab.props?.children || tab.props?.text || tab.props?.title || "Tab"
      );
      const tabId = (tab.props?.tabId as string) || tab.id;
      const isDisabled = Boolean(tab.props?.isDisabled);

      const metrics = CanvasTextMetrics.measureText(tabText, textStyle);
      const tabWidth = metrics.width + sizePreset.tabPaddingX * 2;
      const tabHeight = sizePreset.fontSize + sizePreset.tabPaddingY * 2;

      tabs.push({
        id: tab.id,
        tabId,
        text: tabText,
        isDisabled,
        x: isVertical ? 0 : currentX,
        y: isVertical ? currentY : 0,
        width: tabWidth,
        height: tabHeight,
      });

      if (isVertical) {
        currentY += tabHeight;
        maxWidth = Math.max(maxWidth, tabWidth);
        maxHeight = currentY;
      } else {
        currentX += tabWidth;
        maxWidth = currentX;
        maxHeight = Math.max(maxHeight, tabHeight);
      }
    });

    return {
      tabs,
      totalWidth: maxWidth,
      totalHeight: maxHeight,
    };
  }, [tabItems, sizePreset, isVertical]);

  // 탭 리스트 배경 (border-bottom 또는 border-right)
  const drawTabListBorder = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.setStrokeStyle({ width: 1, color: colorPreset.borderColor });

      if (isVertical) {
        // 세로 - 오른쪽 border
        g.moveTo(tabsLayout.totalWidth, 0);
        g.lineTo(tabsLayout.totalWidth, tabsLayout.totalHeight);
      } else {
        // 가로 - 아래 border
        g.moveTo(0, tabsLayout.totalHeight);
        g.lineTo(tabsLayout.totalWidth, tabsLayout.totalHeight);
      }
      g.stroke();
    },
    [isVertical, tabsLayout.totalWidth, tabsLayout.totalHeight, colorPreset.borderColor]
  );

  // 선택 인디케이터 그리기
  const drawIndicator = useCallback(
    (g: PixiGraphics, tab: TabData) => {
      g.clear();
      const tabId = tab.tabId;
      if (tabId !== selectedTabId) return;

      g.rect(0, 0, isVertical ? sizePreset.indicatorHeight : tab.width, isVertical ? tab.height : sizePreset.indicatorHeight);
      g.fill({ color: colorPreset.indicatorColor });
    },
    [selectedTabId, isVertical, sizePreset.indicatorHeight, colorPreset.indicatorColor]
  );

  // 탭 배경 그리기 (hover 효과)
  const drawTabBackground = useCallback(
    (g: PixiGraphics, tab: TabData, isHovered: boolean) => {
      g.clear();
      if (isHovered && !tab.isDisabled && tab.tabId !== selectedTabId) {
        g.rect(0, 0, tab.width, tab.height);
        g.fill({ color: colorPreset.hoverBgColor });
      }
    },
    [selectedTabId, colorPreset.hoverBgColor]
  );

  // 텍스트 스타일
  const createTextStyle = useCallback(
    (isSelected: boolean, isHovered: boolean, isDisabled: boolean) =>
      new TextStyle({
        fontFamily: "Pretendard, sans-serif",
        fontSize: sizePreset.fontSize,
        fill: isDisabled
          ? 0x9ca3af
          : isSelected
          ? colorPreset.selectedTextColor
          : isHovered
          ? colorPreset.selectedTextColor
          : colorPreset.textColor,
        fontWeight: "500",
      }),
    [sizePreset.fontSize, colorPreset]
  );

  // 탭 클릭 핸들러
  const handleTabClick = useCallback(
    (tab: TabData) => {
      if (!tab.isDisabled) {
        setSelectedTabId(tab.tabId);
        onClick?.(tab.id);
      }
    },
    [onClick]
  );

  return (
    <pixiContainer x={posX} y={posY}>
      {/* 탭 리스트 border */}
      <pixiGraphics draw={drawTabListBorder} />

      {/* 탭들 */}
      {tabsLayout.tabs.map((tab, index) => {
        const isHovered = hoveredIndex === index;
        const isSelected = tab.tabId === selectedTabId;

        // 인디케이터 위치 계산
        const indicatorX = isVertical ? tab.width - sizePreset.indicatorHeight : 0;
        const indicatorY = isVertical ? 0 : tab.height - sizePreset.indicatorHeight;

        return (
          <pixiContainer key={tab.id} x={tab.x} y={tab.y}>
            {/* hover 배경 */}
            <pixiGraphics
              draw={(g) => drawTabBackground(g, tab, isHovered)}
              eventMode="static"
              cursor={tab.isDisabled ? "not-allowed" : "pointer"}
              onPointerEnter={() => !tab.isDisabled && setHoveredIndex(index)}
              onPointerLeave={() => setHoveredIndex(null)}
              onPointerDown={() => handleTabClick(tab)}
            />

            {/* 탭 텍스트 */}
            <pixiText
              text={tab.text}
              style={createTextStyle(isSelected, isHovered, Boolean(tab.isDisabled))}
              x={sizePreset.tabPaddingX}
              y={sizePreset.tabPaddingY}
              eventMode="static"
              cursor={tab.isDisabled ? "not-allowed" : "pointer"}
              onPointerEnter={() => !tab.isDisabled && setHoveredIndex(index)}
              onPointerLeave={() => setHoveredIndex(null)}
              onPointerDown={() => handleTabClick(tab)}
            />

            {/* 선택 인디케이터 */}
            <pixiContainer x={indicatorX} y={indicatorY}>
              <pixiGraphics draw={(g) => drawIndicator(g, tab)} />
            </pixiContainer>
          </pixiContainer>
        );
      })}
    </pixiContainer>
  );
});

export default PixiTabs;
