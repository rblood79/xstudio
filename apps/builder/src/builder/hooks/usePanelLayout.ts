/**
 * usePanelLayout Hook
 *
 * 패널 레이아웃 상태 관리 및 액션 제공
 * Zustand store와 연동
 * @since Phase 2 - 승격 from layout/ (2025-12-30)
 */

import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "../stores";
import type {
  PanelId,
  PanelSide,
  PanelLayoutState,
  ModalPanelState,
} from "../panels/core/types";
import { PanelRegistry } from "../panels/core/PanelRegistry";
import type { UsePanelLayoutReturn } from "../layout/types";

/** stale closure 방지: callback 내부에서 최신 panelLayout 읽기 */
const getLayout = () => useStore.getState().panelLayout;

/**
 * 패널 레이아웃 관리 훅
 *
 * panelLayout 최상위 필드(showLeft, activeLeftPanels 등)를 shallow 비교하여
 * 변경되지 않은 필드만 사용하는 소비자의 불필요한 리렌더를 방지한다.
 *
 * @returns 레이아웃 상태 및 액션
 */
export function usePanelLayout(): UsePanelLayoutReturn {
  // useShallow: panelLayout 객체의 최상위 키를 개별 비교
  const layout = useStore(useShallow((state) => state.panelLayout));
  const setPanelLayout = useStore((state) => state.setPanelLayout);

  /**
   * 패널을 다른 사이드로 이동
   */
  const movePanel = useCallback(
    (panelId: PanelId, from: PanelSide, to: PanelSide) => {
      if (from === to) return;

      const currentLayout = getLayout();

      const fromKey = from === "left" ? "leftPanels" : "rightPanels";
      const toKey = to === "left" ? "leftPanels" : "rightPanels";
      const fromActiveKey =
        from === "left" ? "activeLeftPanels" : "activeRightPanels";

      const fromPanels = currentLayout[fromKey];
      const toPanels = currentLayout[toKey];

      // 패널이 from에 없으면 무시
      if (!fromPanels.includes(panelId)) {
        console.warn(
          `[usePanelLayout] Panel "${panelId}" not found in ${from} side`,
        );
        return;
      }

      // from에서 제거, to에 추가
      const newLayout: PanelLayoutState = {
        ...currentLayout,
        [fromKey]: fromPanels.filter((id) => id !== panelId),
        [toKey]: [...toPanels, panelId],
        // 활성 패널에서도 제거
        [fromActiveKey]: currentLayout[fromActiveKey].filter(
          (id) => id !== panelId,
        ),
      };

      setPanelLayout(newLayout);
    },
    [setPanelLayout],
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
      const currentLayout = getLayout();

      const panelsKey = side === "left" ? "leftPanels" : "rightPanels";
      const activeKey =
        side === "left" ? "activeLeftPanels" : "activeRightPanels";
      const showKey = side === "left" ? "showLeft" : "showRight";

      // 패널이 해당 사이드에 없으면 무시
      if (!currentLayout[panelsKey].includes(panelId)) {
        console.warn(
          `[usePanelLayout] Panel "${panelId}" not available on ${side} side`,
        );
        return;
      }

      const currentActive = currentLayout[activeKey];
      const isActive = currentActive.includes(panelId);

      // 이미 활성화된 패널이면 제거, 아니면 추가
      const newActive = isActive
        ? currentActive.filter((id) => id !== panelId)
        : [...currentActive, panelId];

      // 패널을 열 때는 사이드바도 자동으로 열림
      // 패널을 닫을 때는 사이드바 상태 유지 (다른 패널이 열려있을 수 있으므로)
      const newShow = isActive ? currentLayout[showKey] : true;

      setPanelLayout({
        ...currentLayout,
        [activeKey]: newActive,
        [showKey]: newShow,
      });
    },
    [setPanelLayout],
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
    [setPanelLayout],
  );

  /**
   * 하단 패널 토글 (활성화/비활성화)
   */
  const toggleBottomPanel = useCallback(
    (panelId: PanelId) => {
      const currentLayout = getLayout();

      // 패널이 bottom에 없으면 무시
      if (!currentLayout.bottomPanels.includes(panelId)) {
        console.warn(
          `[usePanelLayout] Panel "${panelId}" not available on bottom`,
        );
        return;
      }

      const isActive = currentLayout.activeBottomPanels.includes(panelId);

      setPanelLayout({
        ...currentLayout,
        activeBottomPanels: isActive ? [] : [panelId],
        showBottom: !isActive,
      });
    },
    [setPanelLayout],
  );

  /**
   * 하단 패널 높이 설정 (150px ~ 600px)
   */
  const setBottomHeight = useCallback(
    (height: number) => {
      const clampedHeight = Math.max(150, Math.min(600, height));
      const currentLayout = getLayout();
      setPanelLayout({
        ...currentLayout,
        bottomHeight: clampedHeight,
      });
    },
    [setPanelLayout],
  );

  /**
   * 하단 패널 닫기
   */
  const closeBottomPanel = useCallback(() => {
    const currentLayout = getLayout();
    setPanelLayout({
      ...currentLayout,
      activeBottomPanels: [],
      showBottom: false,
    });
  }, [setPanelLayout]);

  /**
   * 위치 경계 검사 (화면 밖으로 나가지 않도록 clamp)
   */
  const clampPosition = useCallback(
    (x: number, y: number, width: number, height: number) => ({
      x: Math.max(0, Math.min(x, window.innerWidth - width)),
      y: Math.max(0, Math.min(y, window.innerHeight - height)),
    }),
    [],
  );

  /**
   * 패널을 Modal로 열기
   */
  const openPanelAsModal = useCallback(
    (panelId: PanelId) => {
      const currentLayout = getLayout();

      // 이미 열려있으면 포커스만
      const existing = currentLayout.modalPanels.find(
        (p) => p.panelId === panelId,
      );
      if (existing) {
        // focusModalPanel 대신 직접 z-index 업데이트 (순환 참조 방지)
        const maxZIndex = Math.max(
          ...currentLayout.modalPanels.map((p) => p.zIndex),
        );
        if (existing.zIndex !== maxZIndex) {
          setPanelLayout({
            ...currentLayout,
            modalPanels: currentLayout.modalPanels.map((p) =>
              p.panelId === panelId
                ? { ...p, zIndex: currentLayout.nextModalZIndex }
                : p,
            ),
            nextModalZIndex: currentLayout.nextModalZIndex + 1,
          });
        }
        return;
      }

      // 패널 설정 가져오기
      const panelConfig = PanelRegistry.getPanel(panelId);
      if (!panelConfig) {
        console.warn(
          `[usePanelLayout] Panel "${panelId}" not found in registry`,
        );
        return;
      }

      // Modal 모드 지원 여부 확인
      if (!PanelRegistry.supportsDisplayMode(panelId, "modal")) {
        console.warn(
          `[usePanelLayout] Panel "${panelId}" does not support modal mode`,
        );
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
        zIndex: currentLayout.nextModalZIndex,
      };

      setPanelLayout({
        ...currentLayout,
        modalPanels: [...currentLayout.modalPanels, newPanel],
        nextModalZIndex: currentLayout.nextModalZIndex + 1,
      });
    },
    [setPanelLayout, clampPosition],
  );

  /**
   * Modal 패널 닫기
   */
  const closeModalPanel = useCallback(
    (panelId: PanelId) => {
      const currentLayout = getLayout();
      setPanelLayout({
        ...currentLayout,
        modalPanels: currentLayout.modalPanels.filter(
          (p) => p.panelId !== panelId,
        ),
      });
    },
    [setPanelLayout],
  );

  /**
   * Modal 패널 포커스 (z-index 업데이트)
   */
  const focusModalPanel = useCallback(
    (panelId: PanelId) => {
      const currentLayout = getLayout();
      const panel = currentLayout.modalPanels.find(
        (p) => p.panelId === panelId,
      );
      if (!panel) return;

      // 이미 최상위면 무시
      const maxZIndex = Math.max(
        ...currentLayout.modalPanels.map((p) => p.zIndex),
      );
      if (panel.zIndex === maxZIndex) return;

      setPanelLayout({
        ...currentLayout,
        modalPanels: currentLayout.modalPanels.map((p) =>
          p.panelId === panelId
            ? { ...p, zIndex: currentLayout.nextModalZIndex }
            : p,
        ),
        nextModalZIndex: currentLayout.nextModalZIndex + 1,
      });
    },
    [setPanelLayout],
  );

  /**
   * Modal 패널 위치 업데이트
   */
  const updateModalPanelPosition = useCallback(
    (panelId: PanelId, position: { x: number; y: number }) => {
      const currentLayout = getLayout();
      const panel = currentLayout.modalPanels.find(
        (p) => p.panelId === panelId,
      );
      if (!panel) return;

      // 위치 경계 검사
      const clamped = clampPosition(
        position.x,
        position.y,
        panel.size.width,
        panel.size.height,
      );

      setPanelLayout({
        ...currentLayout,
        modalPanels: currentLayout.modalPanels.map((p) =>
          p.panelId === panelId ? { ...p, position: clamped } : p,
        ),
      });
    },
    [setPanelLayout, clampPosition],
  );

  /**
   * Modal 패널 크기 업데이트
   */
  const updateModalPanelSize = useCallback(
    (panelId: PanelId, size: { width: number; height: number }) => {
      const currentLayout = getLayout();
      const panel = currentLayout.modalPanels.find(
        (p) => p.panelId === panelId,
      );
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
        ...currentLayout,
        modalPanels: currentLayout.modalPanels.map((p) =>
          p.panelId === panelId ? { ...p, size: clampedSize } : p,
        ),
      });
    },
    [setPanelLayout],
  );

  /**
   * 모든 Modal 패널 닫기
   */
  const closeAllModalPanels = useCallback(() => {
    const currentLayout = getLayout();
    setPanelLayout({
      ...currentLayout,
      modalPanels: [],
    });
  }, [setPanelLayout]);

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
