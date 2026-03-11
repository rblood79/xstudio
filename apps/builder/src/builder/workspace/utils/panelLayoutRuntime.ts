import { useStore } from "../../stores";

export interface WorkspacePanelInsets {
  left: number;
  right: number;
}

export interface SubscribePanelLayoutOptions {
  animationDelayMs?: number;
  onBeforeDelay?: () => void;
  onLayoutChange: () => void;
}

const DEFAULT_PANEL_LAYOUT_ANIMATION_DELAY_MS = 350;
const SIDEBAR_SELECTOR = "aside.sidebar";
const INSPECTOR_SELECTOR = "aside.inspector";

export function measureWorkspacePanelInsets(): WorkspacePanelInsets {
  const { panelLayout } = useStore.getState();

  const left = panelLayout.showLeft
    ? (document.querySelector(SIDEBAR_SELECTOR) as HTMLElement | null)
        ?.offsetWidth ?? 0
    : 0;
  const right = panelLayout.showRight
    ? (document.querySelector(INSPECTOR_SELECTOR) as HTMLElement | null)
        ?.offsetWidth ?? 0
    : 0;

  return { left, right };
}

export function subscribeToPanelLayoutChanges({
  animationDelayMs = DEFAULT_PANEL_LAYOUT_ANIMATION_DELAY_MS,
  onBeforeDelay,
  onLayoutChange,
}: SubscribePanelLayoutOptions): () => void {
  let resizeTimeoutId: number | null = null;
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

    if (!hasChanged) {
      return;
    }

    prevShowLeft = showLeft;
    prevShowRight = showRight;
    prevActiveLeftCount = activeLeftCount;
    prevActiveRightCount = activeRightCount;

    onBeforeDelay?.();

    if (resizeTimeoutId !== null) {
      window.clearTimeout(resizeTimeoutId);
    }

    resizeTimeoutId = window.setTimeout(() => {
      onLayoutChange();
    }, animationDelayMs);
  });

  return () => {
    if (resizeTimeoutId !== null) {
      window.clearTimeout(resizeTimeoutId);
    }
    unsubscribe();
  };
}
