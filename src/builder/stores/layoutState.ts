/**
 * Layout State Store
 *
 * Phase G: UI 레이아웃 전용 상태 관리
 *
 * 렌더링 상태와 분리하여 불필요한 리렌더링 방지
 * 뷰포트, 패널 크기 등 레이아웃 관련 상태만 관리
 */

import { create } from "zustand";

interface ViewportSize {
  width: number;
  height: number;
}

interface PanelWidths {
  left: number;
  right: number;
  bottom: number;
}

interface LayoutState {
  /** 뷰포트 크기 */
  viewportSize: ViewportSize;

  /** 패널 너비 */
  panelWidths: PanelWidths;

  /** 헤더 높이 */
  headerHeight: number;

  /** 작업 가능 영역 */
  workableArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  // Actions
  setViewportSize: (size: ViewportSize) => void;
  setPanelWidth: (side: "left" | "right" | "bottom", width: number) => void;
  setHeaderHeight: (height: number) => void;
  updateWorkableArea: () => void;
}

const DEFAULT_PANEL_WIDTH = 233;
const DEFAULT_HEADER_HEIGHT = 48;

export const useLayoutState = create<LayoutState>((set, get) => ({
  viewportSize: {
    width: typeof window !== "undefined" ? window.innerWidth : 1920,
    height: typeof window !== "undefined" ? window.innerHeight : 1080,
  },

  panelWidths: {
    left: DEFAULT_PANEL_WIDTH,
    right: DEFAULT_PANEL_WIDTH,
    bottom: 200,
  },

  headerHeight: DEFAULT_HEADER_HEIGHT,

  workableArea: {
    x: 0,
    y: DEFAULT_HEADER_HEIGHT,
    width: typeof window !== "undefined" ? window.innerWidth : 1920,
    height:
      typeof window !== "undefined"
        ? window.innerHeight - DEFAULT_HEADER_HEIGHT
        : 1032,
  },

  setViewportSize: (size) => {
    set({ viewportSize: size });
    get().updateWorkableArea();
  },

  setPanelWidth: (side, width) => {
    set((state) => ({
      panelWidths: { ...state.panelWidths, [side]: width },
    }));
    get().updateWorkableArea();
  },

  setHeaderHeight: (height) => {
    set({ headerHeight: height });
    get().updateWorkableArea();
  },

  updateWorkableArea: () => {
    const { viewportSize, panelWidths, headerHeight } = get();

    set({
      workableArea: {
        x: panelWidths.left,
        y: headerHeight,
        width: viewportSize.width - panelWidths.left - panelWidths.right,
        height: viewportSize.height - headerHeight - panelWidths.bottom,
      },
    });
  },
}));

/**
 * 레이아웃 상태 선택자
 */
export const selectViewportSize = (state: LayoutState) => state.viewportSize;
export const selectPanelWidths = (state: LayoutState) => state.panelWidths;
export const selectWorkableArea = (state: LayoutState) => state.workableArea;
