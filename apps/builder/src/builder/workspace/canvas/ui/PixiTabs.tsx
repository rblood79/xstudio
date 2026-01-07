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
import {
  getTabsSizePreset,
  getTabsColorPreset,
} from "../utils/cssVariableReader";
import { useStore } from "../../../stores";
import { PixiPanel } from "./PixiPanel";
import { ElementSprite } from "../sprites";
import { styleToLayout } from "../layout";

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

  // 🚀 React Compiler: 파생 상태 패턴 사용하여 cascading render 방지
  // useState는 사용자 선택만 저장하고, 실제 활성 탭은 파생 계산
  const [userSelectedTabId, setUserSelectedTabId] = useState<string | null>(
    props?.selectedKey || null
  );

  // 활성 탭 ID 계산: props > 사용자 선택 > 첫 번째 탭
  const activeTabId = useMemo(() => {
    // props에서 제공된 selectedKey가 있으면 우선
    if (props?.selectedKey) return props.selectedKey;
    // 사용자가 선택한 탭이 있으면 사용
    if (userSelectedTabId) return userSelectedTabId;
    // 기본값: 첫 번째 탭
    if (tabItems.length === 0) return null;
    const firstTabId = tabItems[0].props?.tabId as string | undefined;
    return firstTabId || tabItems[0].id;
  }, [props?.selectedKey, userSelectedTabId, tabItems]);

  // 탭 선택 핸들러에서 사용할 setter (기존 setSelectedTabId 대체)
  const setSelectedTabId = setUserSelectedTabId;

  // 🚀 CSS에서 프리셋 읽기
  const sizePreset = useMemo(() => getTabsSizePreset(size), [size]);

  // 🚀 variant에 따른 Tabs 전용 색상 프리셋
  const colorPreset = useMemo(
    () => getTabsColorPreset(variant),
    [variant]
  );

  // hover 상태 관리
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 🚀 Phase 11: TabList의 실제 렌더링된 너비 (onLayout으로 업데이트)
  const [tabListComputedWidth, setTabListComputedWidth] = useState<number | null>(null);

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

  // 🚀 @pixi/layout: style?.width를 그대로 전달 (% 문자열 지원)
  // @pixi/layout이 % 값을 부모 크기 기준으로 자동 계산
  const styleWidth = style?.width;

  // 🚀 Phase 11: CSS .react-aria-Tabs와 동기화
  // CSS: .react-aria-Tabs { width: 100%; display: flex; }
  // CSS: [data-orientation="horizontal"] { flex-direction: column; }
  // CSS: [data-orientation="vertical"] { flex-direction: row; }
  const rootLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: (isVertical ? 'row' : 'column') as 'row' | 'column',
    width: styleWidth ?? '100%',
    // 세로 늘어남 방지 (CSS block 요소 동작)
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'flex-start' as const,
  }), [isVertical, styleWidth]);

  // 🚀 Phase 11: CSS .react-aria-TabList와 동기화
  // CSS: .react-aria-TabList { display: flex; position: relative; }
  // CSS: [data-orientation="horizontal"] { border-bottom: 1px solid var(--outline-variant); }
  // CSS: [data-orientation="vertical"] { flex-direction: column; border-right: 1px solid; }
  const tabListLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: (isVertical ? 'column' : 'row') as 'column' | 'row',
    // vertical: 고정 너비, horizontal: 부모 너비 채움
    width: isVertical ? tabsLayout.totalWidth : '100%',
    flexShrink: 0,
    position: 'relative' as const,
  }), [isVertical, tabsLayout.totalWidth]);

  // 🚀 Phase 11: CSS .react-aria-TabPanel과 동기화
  // CSS: .react-aria-TabPanel { padding: var(--spacing-lg); } (md)
  // CSS: sm: padding: var(--spacing-md), lg: padding: var(--spacing-xl)
  const panelLayout = useMemo(() => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    // @pixi/layout flex로 남은 공간 채움
    flexGrow: 1,
    padding: sizePreset.panelPadding,
  }), [sizePreset.panelPadding]);

  // 🚀 Phase 11: CSS .react-aria-TabList border 동기화
  // CSS: [data-orientation="horizontal"] { border-bottom: 1px solid var(--outline-variant); }
  // CSS: [data-orientation="vertical"] { border-right: 1px solid var(--outline-variant); }
  // horizontal: TabList 전체 너비(100%)에 border-bottom
  // vertical: 탭 콘텐츠 너비에 border-right
  const borderWidth = isVertical ? tabsLayout.totalWidth : (tabListComputedWidth ?? tabsLayout.totalWidth);

  const drawTabListBorder = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      if (isVertical) {
        // vertical: border-right (오른쪽 세로선)
        g.moveTo(tabsLayout.totalWidth, 0);
        g.lineTo(tabsLayout.totalWidth, tabsLayout.totalHeight);
      } else {
        // horizontal: border-bottom (하단 가로선) - TabList 전체 너비
        g.moveTo(0, tabsLayout.totalHeight);
        g.lineTo(borderWidth, tabsLayout.totalHeight);
      }
      g.stroke({ color: colorPreset.borderColor, width: 1 });
    },
    [isVertical, tabsLayout.totalWidth, tabsLayout.totalHeight, borderWidth, colorPreset.borderColor]
  );

  // 🚀 Phase 11: TabList onLayout 콜백 - 실제 렌더링된 너비 가져오기
  const handleTabListLayout = useCallback((layout: { computedLayout?: { width?: number } }) => {
    const width = layout.computedLayout?.width;
    if (width && width !== tabListComputedWidth) {
      setTabListComputedWidth(width);
    }
  }, [tabListComputedWidth]);

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
      if (isHovered && !tab.isDisabled && tab.tabId !== activeTabId) {
        g.rect(0, 0, tab.width, tab.height);
        g.fill({ color: colorPreset.hoverBgColor });
      }
    },
    [activeTabId, colorPreset.hoverBgColor]
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
    return tabsLayout.tabs.findIndex((tab) => tab.tabId === activeTabId);
  }, [tabsLayout.tabs, activeTabId]);

  // 선택된 Panel 요소 찾기
  const selectedPanel = useMemo(() => {
    if (selectedTabIndex < 0 || selectedTabIndex >= panelItems.length) {
      return null;
    }
    return panelItems[selectedTabIndex];
  }, [selectedTabIndex, panelItems]);

  // 🚀 Phase 11: 선택된 Panel의 children 가져오기
  const selectedPanelChildren = useMemo(() => {
    if (!selectedPanel) return [];
    return elements
      .filter((el) => el.parent_id === selectedPanel.id)
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
  }, [elements, selectedPanel]);

  // 🚀 Panel children 렌더링 함수
  const renderPanelChild = useCallback((childEl: Element) => {
    // styleToLayout은 Element 객체를 받음
    const childLayout = styleToLayout(childEl);

    return (
      <pixiContainer key={childEl.id} layout={childLayout}>
        <ElementSprite
          element={childEl}
          onClick={onClick}
        />
      </pixiContainer>
    );
  }, [onClick]);

  return (
    <pixiContainer layout={rootLayout}>
      <pixiContainer layout={tabListLayout} onLayout={handleTabListLayout}>
        {/* 🚀 Phase 11: CSS border-bottom/border-right 동기화 */}
        <pixiGraphics draw={drawTabListBorder} />

        {/* 탭들 */}
        {tabsLayout.tabs.map((tab, index) => {
          const isHovered = hoveredIndex === index;
          const isSelected = tab.tabId === activeTabId;

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
      {/* 🚀 Phase 11: Panel children을 PixiPanel에 전달 */}
      {selectedPanel && (
        <pixiContainer layout={panelLayout}>
          <PixiPanel
            element={selectedPanel}
            isSelected={false}
            onClick={onClick}
            childElements={selectedPanelChildren}
            renderChildElement={renderPanelChild}
          />
        </pixiContainer>
      )}
    </pixiContainer>
  );
});

export default PixiTabs;
