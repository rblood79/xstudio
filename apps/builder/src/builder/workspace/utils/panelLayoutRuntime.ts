/**
 * Panel Layout Runtime (ADR-035 Phase 7)
 *
 * 패널 inset 측정을 DOM querySelector에서 등록 기반 ResizeObserver 캐시로 전환.
 * CSS transition 타이밍 가정(350ms)을 제거하고 실제 크기 변경 완료 시 콜백.
 *
 * 패널 컴포넌트가 마운트 시 registerPanelElement()로 DOM 요소를 등록하면,
 * ResizeObserver가 자동으로 크기를 추적한다.
 */

import { useStore } from "../../stores";

export interface WorkspacePanelInsets {
  left: number;
  right: number;
}

export interface SubscribePanelLayoutOptions {
  /** 패널 토글 직후 즉시 호출 (리사이징 시작 알림) */
  onToggle?: () => void;
  /** 크기 변경 완료 후 호출 (ResizeObserver 또는 토글) */
  onLayoutChange: () => void;
}

// ============================================
// Panel Insets — 등록 기반 ResizeObserver 캐시
// ============================================

/** 캐시된 패널 너비 (ResizeObserver가 갱신) */
let cachedLeftWidth = 0;
let cachedRightWidth = 0;

/** 등록된 observer */
let sidebarObserver: ResizeObserver | null = null;
let inspectorObserver: ResizeObserver | null = null;

/** 크기 변경 리스너 */
const resizeListeners = new Set<() => void>();

function createPanelObserver(
  side: "left" | "right",
  el: HTMLElement,
): ResizeObserver {
  const initialWidth = el.offsetWidth;
  if (side === "left") {
    cachedLeftWidth = initialWidth;
  } else {
    cachedRightWidth = initialWidth;
  }

  const observer = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;
    const newWidth = Math.round(
      entry.contentBoxSize?.[0]?.inlineSize ??
        entry.target.getBoundingClientRect().width,
    );

    if (side === "left") {
      if (newWidth !== cachedLeftWidth) {
        cachedLeftWidth = newWidth;
        notifyResizeListeners();
      }
    } else {
      if (newWidth !== cachedRightWidth) {
        cachedRightWidth = newWidth;
        notifyResizeListeners();
      }
    }
  });

  observer.observe(el);
  return observer;
}

/**
 * 패널 DOM 요소를 등록한다.
 *
 * BuilderCore의 aside 요소에 ref 콜백으로 호출.
 * 마운트 시 ResizeObserver를 부착, 언마운트 시(null) 해제.
 */
export function registerPanelElement(
  side: "left" | "right",
  el: HTMLElement | null,
): void {
  if (side === "left") {
    if (sidebarObserver) {
      sidebarObserver.disconnect();
      sidebarObserver = null;
    }
    if (el) {
      sidebarObserver = createPanelObserver("left", el);
    } else {
      cachedLeftWidth = 0;
    }
  } else {
    if (inspectorObserver) {
      inspectorObserver.disconnect();
      inspectorObserver = null;
    }
    if (el) {
      inspectorObserver = createPanelObserver("right", el);
    } else {
      cachedRightWidth = 0;
    }
  }
}

function notifyResizeListeners(): void {
  for (const listener of resizeListeners) {
    listener();
  }
}

/**
 * 패널 inset을 반환한다.
 * ResizeObserver가 캐시한 값을 사용하여 querySelector 호출을 회피한다.
 */
export function measureWorkspacePanelInsets(): WorkspacePanelInsets {
  const { panelLayout } = useStore.getState();
  return {
    left: panelLayout.showLeft ? cachedLeftWidth : 0,
    right: panelLayout.showRight ? cachedRightWidth : 0,
  };
}

/**
 * 패널 레이아웃 변경을 구독한다.
 *
 * CSS transition 타이밍 가정 없이:
 * - Zustand store 변경 (showLeft/showRight 토글)
 * - ResizeObserver (실제 크기 변경 완료)
 * 두 소스를 모두 감지하여 콜백을 호출한다.
 */
export function subscribeToPanelLayoutChanges({
  onToggle,
  onLayoutChange,
}: SubscribePanelLayoutOptions): () => void {
  // 소스 1: ResizeObserver (실제 크기 변경 — CSS transition 완료 후)
  resizeListeners.add(onLayoutChange);

  // 소스 2: Zustand store (showLeft/showRight 토글 즉시 감지)
  let prevShowLeft = useStore.getState().panelLayout.showLeft;
  let prevShowRight = useStore.getState().panelLayout.showRight;
  let prevActiveLeftCount =
    useStore.getState().panelLayout.activeLeftPanels?.length ?? 0;
  let prevActiveRightCount =
    useStore.getState().panelLayout.activeRightPanels?.length ?? 0;

  const unsubscribe = useStore.subscribe((state) => {
    const { showLeft, showRight, activeLeftPanels, activeRightPanels } =
      state.panelLayout;
    const activeLeftCount = activeLeftPanels?.length ?? 0;
    const activeRightCount = activeRightPanels?.length ?? 0;
    const hasChanged =
      showLeft !== prevShowLeft ||
      showRight !== prevShowRight ||
      activeLeftCount !== prevActiveLeftCount ||
      activeRightCount !== prevActiveRightCount;

    if (!hasChanged) return;

    prevShowLeft = showLeft;
    prevShowRight = showRight;
    prevActiveLeftCount = activeLeftCount;
    prevActiveRightCount = activeRightCount;

    // showLeft/showRight 토글 즉시 반응
    onToggle?.();
    onLayoutChange();
  });

  return () => {
    resizeListeners.delete(onLayoutChange);
    unsubscribe();
  };
}
