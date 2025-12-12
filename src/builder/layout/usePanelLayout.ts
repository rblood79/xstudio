/**
 * usePanelLayout Hook
 *
 * 패널 레이아웃 상태 관리 및 액션 제공
 * Zustand store와 연동
 */

import { useCallback } from "react";
import { useStore } from "../stores";
import type {
  PanelId,
  PanelSide,
  PanelLayoutState,
} from "../panels/core/types";
import type { UsePanelLayoutReturn } from "./types";

/**
 * 패널 레이아웃 관리 훅
 *
 * @returns 레이아웃 상태 및 액션
 */
export function usePanelLayout(): UsePanelLayoutReturn {
  // Zustand store에서 상태 가져오기
  const layout = useStore((state) => state.panelLayout);
  const setPanelLayout = useStore((state) => state.setPanelLayout);

  /**
   * 패널을 다른 사이드로 이동
   */
  const movePanel = useCallback(
    (panelId: PanelId, from: PanelSide, to: PanelSide) => {
      if (from === to) return;

      const fromKey = from === "left" ? "leftPanels" : "rightPanels";
      const toKey = to === "left" ? "leftPanels" : "rightPanels";
      const fromActiveKey =
        from === "left" ? "activeLeftPanels" : "activeRightPanels";

      const fromPanels = layout[fromKey];
      const toPanels = layout[toKey];

      // 패널이 from에 없으면 무시
      if (!fromPanels.includes(panelId)) {
        console.warn(
          `[usePanelLayout] Panel "${panelId}" not found in ${from} side`
        );
        return;
      }

      // from에서 제거, to에 추가
      const newLayout: PanelLayoutState = {
        ...layout,
        [fromKey]: fromPanels.filter((id) => id !== panelId),
        [toKey]: [...toPanels, panelId],
        // 활성 패널에서도 제거
        [fromActiveKey]: layout[fromActiveKey].filter((id) => id !== panelId),
      };

      setPanelLayout(newLayout);
    },
    [layout, setPanelLayout]
  );

  /**
   * 패널 토글 (활성화/비활성화) - Multi toggle 지원
   *
   * ✅ 성능 최적화: 패널을 DOM에서 제거하지 않고 CSS transform으로만 숨김
   * - 패널을 열면 사이드바도 자동으로 열림 (showLeft/showRight = true)
   * - 패널을 닫아도 사이드바는 열려있음 (다른 패널이 열려있을 수 있으므로)
   * - 패널은 activePanels 배열에서 제거되지만 DOM에는 유지됨
   */
  const togglePanel = useCallback(
    (side: PanelSide, panelId: PanelId) => {
      const panelsKey = side === "left" ? "leftPanels" : "rightPanels";
      const activeKey =
        side === "left" ? "activeLeftPanels" : "activeRightPanels";
      const showKey = side === "left" ? "showLeft" : "showRight";

      // 패널이 해당 사이드에 없으면 무시
      if (!layout[panelsKey].includes(panelId)) {
        console.warn(
          `[usePanelLayout] Panel "${panelId}" not available on ${side} side`
        );
        return;
      }

      const currentActive = layout[activeKey];
      const isActive = currentActive.includes(panelId);

      // 이미 활성화된 패널이면 제거, 아니면 추가
      const newActive = isActive
        ? currentActive.filter((id) => id !== panelId)
        : [...currentActive, panelId];

      // 패널을 열 때는 사이드바도 자동으로 열림
      // 패널을 닫을 때는 사이드바 상태 유지 (다른 패널이 열려있을 수 있으므로)
      const newShow = isActive ? layout[showKey] : true;

      setPanelLayout({
        ...layout,
        [activeKey]: newActive,
        [showKey]: newShow,
      });
    },
    [layout, setPanelLayout]
  );

  /**
   * 사이드바/인스펙터 표시/숨김 토글
   */
  const toggleSide = useCallback(
    (side: PanelSide) => {
      const showKey = side === "left" ? "showLeft" : "showRight";
      setPanelLayout({
        ...layout,
        [showKey]: !layout[showKey],
      });
    },
    [layout, setPanelLayout]
  );

  /**
   * 레이아웃 초기화
   */
  const resetLayout = useCallback(() => {
    const resetLayoutAction = useStore.getState().resetPanelLayout;
    if (resetLayoutAction) {
      resetLayoutAction();
    }
  }, []);

  /**
   * 레이아웃 전체 설정
   */
  const setLayout = useCallback(
    (newLayout: PanelLayoutState) => {
      setPanelLayout(newLayout);
    },
    [setPanelLayout]
  );

  /**
   * 하단 패널 토글 (활성화/비활성화)
   */
  const toggleBottomPanel = useCallback(
    (panelId: PanelId) => {
      // 패널이 bottom에 없으면 무시
      if (!layout.bottomPanels.includes(panelId)) {
        console.warn(
          `[usePanelLayout] Panel "${panelId}" not available on bottom`
        );
        return;
      }

      const isActive = layout.activeBottomPanels.includes(panelId);

      setPanelLayout({
        ...layout,
        activeBottomPanels: isActive ? [] : [panelId],
        showBottom: !isActive,
      });
    },
    [layout, setPanelLayout]
  );

  /**
   * 하단 패널 높이 설정 (150px ~ 600px)
   */
  const setBottomHeight = useCallback(
    (height: number) => {
      const clampedHeight = Math.max(150, Math.min(600, height));
      setPanelLayout({
        ...layout,
        bottomHeight: clampedHeight,
      });
    },
    [layout, setPanelLayout]
  );

  /**
   * 하단 패널 닫기
   */
  const closeBottomPanel = useCallback(() => {
    setPanelLayout({
      ...layout,
      activeBottomPanels: [],
      showBottom: false,
    });
  }, [layout, setPanelLayout]);

  return {
    layout,
    isLoading: false, // 나중에 비동기 로딩 추가 시 사용
    isLoaded: true,
    movePanel,
    togglePanel,
    toggleSide,
    resetLayout,
    setLayout,
    toggleBottomPanel,
    setBottomHeight,
    closeBottomPanel,
  };
}
