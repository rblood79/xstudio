/**
 * usePanelLayout Hook
 *
 * 패널 레이아웃 상태 관리 및 액션 제공
 * Zustand store와 연동
 * @since Phase 2 - 승격 from layout/ (2025-12-30)
 */

import { useCallback } from "react";
import { useStore } from "../stores";
import type {
  PanelId,
  PanelSide,
  PanelLayoutState,
  ModalPanelState,
} from "../panels/core/types";
import { PanelRegistry } from "../panels/core/PanelRegistry";
import type { UsePanelLayoutReturn } from "../layout/types";

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

  /**
   * 위치 경계 검사 (화면 밖으로 나가지 않도록 clamp)
   */
  const clampPosition = useCallback(
    (x: number, y: number, width: number, height: number) => ({
      x: Math.max(0, Math.min(x, window.innerWidth - width)),
      y: Math.max(0, Math.min(y, window.innerHeight - height)),
    }),
    []
  );

  /**
   * 패널을 Modal로 열기
   */
  const openPanelAsModal = useCallback(
    (panelId: PanelId) => {
      // 이미 열려있으면 포커스만
      const existing = layout.modalPanels.find((p) => p.panelId === panelId);
      if (existing) {
        // focusModalPanel 대신 직접 z-index 업데이트 (순환 참조 방지)
        const maxZIndex = Math.max(...layout.modalPanels.map((p) => p.zIndex));
        if (existing.zIndex !== maxZIndex) {
          setPanelLayout({
            ...layout,
            modalPanels: layout.modalPanels.map((p) =>
              p.panelId === panelId
                ? { ...p, zIndex: layout.nextModalZIndex }
                : p
            ),
            nextModalZIndex: layout.nextModalZIndex + 1,
          });
        }
        return;
      }

      // 패널 설정 가져오기
      const panelConfig = PanelRegistry.getPanel(panelId);
      if (!panelConfig) {
        console.warn(`[usePanelLayout] Panel "${panelId}" not found in registry`);
        return;
      }

      // Modal 모드 지원 여부 확인
      if (!PanelRegistry.supportsDisplayMode(panelId, "modal")) {
        console.warn(`[usePanelLayout] Panel "${panelId}" does not support modal mode`);
        return;
      }

      // 초기 크기 계산
      const width = panelConfig.defaultWidth || panelConfig.minWidth || 360;
      const height = panelConfig.defaultHeight || panelConfig.minHeight || 480;

      // 초기 위치 계산 (화면 중앙)
      const x = Math.max(100, (window.innerWidth - width) / 2);
      const y = Math.max(100, (window.innerHeight - height) / 2);

      // 위치 경계 검사
      const clamped = clampPosition(x, y, width, height);

      const newPanel: ModalPanelState = {
        panelId,
        mode: "modal",
        position: { x: clamped.x, y: clamped.y },
        size: { width, height },
        zIndex: layout.nextModalZIndex,
      };

      setPanelLayout({
        ...layout,
        modalPanels: [...layout.modalPanels, newPanel],
        nextModalZIndex: layout.nextModalZIndex + 1,
      });
    },
    [layout, setPanelLayout, clampPosition]
  );

  /**
   * Modal 패널 닫기
   */
  const closeModalPanel = useCallback(
    (panelId: PanelId) => {
      setPanelLayout({
        ...layout,
        modalPanels: layout.modalPanels.filter((p) => p.panelId !== panelId),
      });
    },
    [layout, setPanelLayout]
  );

  /**
   * Modal 패널 포커스 (z-index 업데이트)
   */
  const focusModalPanel = useCallback(
    (panelId: PanelId) => {
      const panel = layout.modalPanels.find((p) => p.panelId === panelId);
      if (!panel) return;

      // 이미 최상위면 무시
      const maxZIndex = Math.max(...layout.modalPanels.map((p) => p.zIndex));
      if (panel.zIndex === maxZIndex) return;

      setPanelLayout({
        ...layout,
        modalPanels: layout.modalPanels.map((p) =>
          p.panelId === panelId
            ? { ...p, zIndex: layout.nextModalZIndex }
            : p
        ),
        nextModalZIndex: layout.nextModalZIndex + 1,
      });
    },
    [layout, setPanelLayout]
  );

  /**
   * Modal 패널 위치 업데이트
   */
  const updateModalPanelPosition = useCallback(
    (panelId: PanelId, position: { x: number; y: number }) => {
      const panel = layout.modalPanels.find((p) => p.panelId === panelId);
      if (!panel) return;

      // 위치 경계 검사
      const clamped = clampPosition(
        position.x,
        position.y,
        panel.size.width,
        panel.size.height
      );

      setPanelLayout({
        ...layout,
        modalPanels: layout.modalPanels.map((p) =>
          p.panelId === panelId ? { ...p, position: clamped } : p
        ),
      });
    },
    [layout, setPanelLayout, clampPosition]
  );

  /**
   * Modal 패널 크기 업데이트
   */
  const updateModalPanelSize = useCallback(
    (panelId: PanelId, size: { width: number; height: number }) => {
      const panel = layout.modalPanels.find((p) => p.panelId === panelId);
      if (!panel) return;

      // 패널 설정에서 min/max 제약 가져오기
      const panelConfig = PanelRegistry.getPanel(panelId);
      const minWidth = panelConfig?.minWidth || 200;
      const maxWidth = panelConfig?.maxWidth || 800;
      const minHeight = panelConfig?.minHeight || 200;
      const maxHeight = panelConfig?.maxHeight || 800;

      // 크기 제약 적용
      const clampedSize = {
        width: Math.max(minWidth, Math.min(maxWidth, size.width)),
        height: Math.max(minHeight, Math.min(maxHeight, size.height)),
      };

      setPanelLayout({
        ...layout,
        modalPanels: layout.modalPanels.map((p) =>
          p.panelId === panelId ? { ...p, size: clampedSize } : p
        ),
      });
    },
    [layout, setPanelLayout]
  );

  /**
   * 모든 Modal 패널 닫기
   */
  const closeAllModalPanels = useCallback(() => {
    setPanelLayout({
      ...layout,
      modalPanels: [],
    });
  }, [layout, setPanelLayout]);

  return {
    layout,
    isLoading: false, // 나중에 비동기 로딩 추가 시 사용
    isLoaded: true,
    movePanel,
    togglePanel,
    resetLayout,
    setLayout,
    toggleBottomPanel,
    setBottomHeight,
    closeBottomPanel,
    // Modal 패널 액션
    openPanelAsModal,
    closeModalPanel,
    focusModalPanel,
    updateModalPanelPosition,
    updateModalPanelSize,
    closeAllModalPanels,
  };
}
