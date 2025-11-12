/**
 * usePanelLayout Hook
 *
 * 패널 레이아웃 상태 관리 및 액션 제공
 * Zustand store와 연동
 */

import { useCallback } from 'react';
import { useStore } from '../stores';
import type { PanelId, PanelSide, PanelLayoutState } from '../panels/core/types';
import type { UsePanelLayoutReturn } from './types';

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

      const fromKey = from === 'left' ? 'leftPanels' : 'rightPanels';
      const toKey = to === 'left' ? 'leftPanels' : 'rightPanels';

      const fromPanels = layout[fromKey];
      const toPanels = layout[toKey];

      // 패널이 from에 없으면 무시
      if (!fromPanels.includes(panelId)) {
        console.warn(`[usePanelLayout] Panel "${panelId}" not found in ${from} side`);
        return;
      }

      // from에서 제거, to에 추가
      const newLayout: PanelLayoutState = {
        ...layout,
        [fromKey]: fromPanels.filter((id) => id !== panelId),
        [toKey]: [...toPanels, panelId],
      };

      // 활성 패널이 이동된 패널이면 비활성화
      if (layout.activeLeftPanel === panelId && from === 'left') {
        newLayout.activeLeftPanel = null;
      }
      if (layout.activeRightPanel === panelId && from === 'right') {
        newLayout.activeRightPanel = null;
      }

      setPanelLayout(newLayout);
    },
    [layout, setPanelLayout]
  );

  /**
   * 활성 패널 설정
   */
  const setActivePanel = useCallback(
    (side: PanelSide, panelId: PanelId | null) => {
      const panelsKey = side === 'left' ? 'leftPanels' : 'rightPanels';
      const activeKey = side === 'left' ? 'activeLeftPanel' : 'activeRightPanel';

      // panelId가 null이 아니면 해당 사이드에 패널이 있는지 확인
      if (panelId !== null && !layout[panelsKey].includes(panelId)) {
        console.warn(`[usePanelLayout] Panel "${panelId}" not available on ${side} side`);
        return;
      }

      setPanelLayout({
        ...layout,
        [activeKey]: panelId,
      });
    },
    [layout, setPanelLayout]
  );

  /**
   * 패널 토글 (활성화/비활성화)
   */
  const togglePanel = useCallback(
    (side: PanelSide, panelId: PanelId) => {
      const activeKey = side === 'left' ? 'activeLeftPanel' : 'activeRightPanel';
      const currentActive = layout[activeKey];

      // 이미 활성화된 패널이면 비활성화, 아니면 활성화
      setActivePanel(side, currentActive === panelId ? null : panelId);
    },
    [layout, setActivePanel]
  );

  /**
   * 사이드바/인스펙터 표시/숨김 토글
   */
  const toggleSide = useCallback(
    (side: PanelSide) => {
      const showKey = side === 'left' ? 'showLeft' : 'showRight';
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

  return {
    layout,
    isLoading: false, // 나중에 비동기 로딩 추가 시 사용
    isLoaded: true,
    movePanel,
    setActivePanel,
    togglePanel,
    toggleSide,
    resetLayout,
    setLayout,
  };
}
