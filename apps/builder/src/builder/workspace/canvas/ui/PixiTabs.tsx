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
import { memo, useCallback, useEffect, useMemo, useState } from "react";
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
import { PixiPanel } from "./PixiPanel";

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

  // Panel(TabPanel) 자식들 가져오기
  const panelItems = useMemo(() => {
    return elements
      .filter((el) => el.parent_id === element.id && el.tag === "Panel")
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
  const [selectedTabId, setSelectedTabId] = useState<string | null>(
    props?.selectedKey || null
  );

  // 🚀 tabItems가 로드된 후 초기 선택 설정
  // useState 초기값은 컴포넌트 마운트 시 한 번만 실행되므로,
  // tabItems가 비어있을 때 초기화되면 null이 됨
  // useEffect로 tabItems 로드 후 첫 번째 탭 선택
  useEffect(() => {
    if (selectedTabId === null && tabItems.length > 0) {
      const firstTabId = tabItems[0].props?.tabId as string | undefined;
      setSelectedTabId(firstTabId || tabItems[0].id);
    }
  }, [tabItems, selectedTabId]);

  // 🚀 CSS에서 프리셋 읽기
  const sizePreset = useMemo(() => getTabsSizePreset(size), [size]);

  // 🚀 variant에 따른 Tabs 전용 색상 프리셋
  const colorPreset = useMemo(
    () => getTabsColorPreset(variant),
    [variant]
  );

  // hover 상태 관리
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 탭 레이아웃 계산
  const tabsLayout = useMemo(() => {
    const tabs: TabData[] = [];
    let totalWidth = 0;
    let totalHeight = 0;

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
      // CSS .react-aria-Tab { padding: var(--spacing) var(--spacing-lg); }
      // 높이 = fontSize * lineHeight + paddingY * 2
      const lineHeight = 1.4;
      const tabHeight = Math.ceil(sizePreset.fontSize * lineHeight) + sizePreset.tabPaddingY * 2;

      tabs.push({
        id: tab.id,
        tabId,
        text: tabText,
        isDisabled,
        width: tabWidth,
        height: tabHeight,
      });

      if (isVertical) {
        totalHeight += tabHeight;
        totalWidth = Math.max(totalWidth, tabWidth);
      } else {
        totalWidth += tabWidth;
        totalHeight = Math.max(totalHeight, tabHeight);
      }
    });

    return {
      tabs,
      totalWidth,
      totalHeight,
    };
  }, [tabItems, sizePreset, isVertical]);

  // Tabs 전체 너비 (CSS width: 100% 또는 명시적 width)
  const tabsWidth = parseCSSSize(style?.width, undefined, 300);

  const rootLayout = useMemo(() => ({
    display: 'flex',
    flexDirection: isVertical ? 'row' : 'column',
    width: tabsWidth,
  }), [isVertical, tabsWidth]);

  const tabListLayout = useMemo(() => ({
    display: 'flex',
    flexDirection: isVertical ? 'column' : 'row',
    width: isVertical ? tabsLayout.totalWidth : tabsWidth,
  }), [isVertical, tabsLayout.totalWidth, tabsWidth]);

  const panelLayout = useMemo(() => ({
    display: 'flex',
    flexDirection: 'column',
    width: Math.max(0, isVertical ? tabsWidth - tabsLayout.totalWidth : tabsWidth),
    padding: sizePreset.panelPadding,
  }), [isVertical, tabsWidth, tabsLayout.totalWidth, sizePreset.panelPadding]);

  // 탭 리스트 배경 (border-bottom 또는 border-right)
  // CSS: .react-aria-TabList { display: flex; } → Tabs 전체 너비를 차지
  const drawTabListBorder = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.setStrokeStyle({ width: 1, color: colorPreset.borderColor });

      if (isVertical) {
        // 세로 - 오른쪽 border (TabList 너비만큼)
        g.moveTo(tabsLayout.totalWidth, 0);
        g.lineTo(tabsLayout.totalWidth, tabsLayout.totalHeight);
      } else {
        // 가로 - 아래 border (Tabs 전체 너비만큼, CSS display: flex 반영)
        g.moveTo(0, tabsLayout.totalHeight);
        g.lineTo(tabsWidth, tabsLayout.totalHeight);
      }
      g.stroke();
    },
    [isVertical, tabsLayout.totalWidth, tabsLayout.totalHeight, tabsWidth, colorPreset.borderColor]
  );

  // 선택 인디케이터 그리기
  const drawIndicator = useCallback(
    (g: PixiGraphics, tab: TabData, isSelected: boolean) => {
      g.clear();
      if (!isSelected) return; // 선택되지 않은 탭은 그리지 않음

      const width = isVertical ? sizePreset.indicatorHeight : tab.width;
      const height = isVertical ? tab.height : sizePreset.indicatorHeight;
      g.rect(0, 0, width, height);
      g.fill({ color: colorPreset.indicatorColor });
    },
    [isVertical, sizePreset.indicatorHeight, colorPreset.indicatorColor]
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

  // 선택된 탭의 인덱스 찾기
  const selectedTabIndex = useMemo(() => {
    return tabsLayout.tabs.findIndex((tab) => tab.tabId === selectedTabId);
  }, [tabsLayout.tabs, selectedTabId]);

  // 선택된 Panel 요소 찾기
  const selectedPanel = useMemo(() => {
    if (selectedTabIndex < 0 || selectedTabIndex >= panelItems.length) {
      return null;
    }
    return panelItems[selectedTabIndex];
  }, [selectedTabIndex, panelItems]);

  // 🚀 Panel 자손들은 ElementsLayer에서 렌더링됨 (layoutPosition 사용)
  // PixiTabs에서는 Panel 자체만 렌더링

  // Panel 위치: TabList 아래 (horizontal) 또는 오른쪽 (vertical)
  // CSS 동기화: .react-aria-TabPanel { padding: 16px }
  const panelPadding = sizePreset.panelPadding;
  const panelContainerWidth = Math.max(
    0,
    (isVertical ? tabsWidth - tabsLayout.totalWidth : tabsWidth) - panelPadding * 2
  );

  return (
    <pixiContainer layout={rootLayout}>
      <pixiContainer layout={tabListLayout}>
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
            <pixiContainer key={tab.id} layout={{ width: tab.width, height: tab.height }}>
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
                <pixiGraphics draw={(g) => drawIndicator(g, tab, isSelected)} />
              </pixiContainer>
            </pixiContainer>
          );
        })}
      </pixiContainer>

      {/* 선택된 TabPanel 렌더링 */}
      {/* 🚀 Panel 자손들은 ElementsLayer에서 layoutPosition과 함께 렌더링됨 */}
      {selectedPanel && (
        <pixiContainer layout={panelLayout}>
          <PixiPanel
            element={selectedPanel}
            isSelected={false}
            onClick={onClick}
            containerWidth={panelContainerWidth}
          />
        </pixiContainer>
      )}
    </pixiContainer>
  );
});

export default PixiTabs;
