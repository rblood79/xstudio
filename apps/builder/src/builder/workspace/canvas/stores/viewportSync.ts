import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { CanvasViewportSnapshot } from "./types";

export interface ViewportSyncState {
  zoom: number;
  panOffset: { x: number; y: number };
  containerSize: { width: number; height: number };
  canvasSize: { width: number; height: number };
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  setViewportSnapshot: (viewport: CanvasViewportSnapshot) => void;
  setContainerSize: (size: { width: number; height: number }) => void;
  setCanvasSize: (size: { width: number; height: number }) => void;
  reset: () => void;
}

const initialViewportState = {
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  containerSize: { width: 0, height: 0 },
  canvasSize: { width: 1920, height: 1080 },
};

export const useViewportSyncStore = create<ViewportSyncState>()(
  subscribeWithSelector((set) => ({
    ...initialViewportState,

    setZoom: (zoom) => {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[ViewportSync] setZoom is deprecated — use applyViewportState()",
        );
      }
      set({ zoom: Math.max(0.1, Math.min(5, zoom)) });
    },

    setPanOffset: (offset) => {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[ViewportSync] setPanOffset is deprecated — use applyViewportState()",
        );
      }
      set({ panOffset: offset });
    },

    setViewportSnapshot: (viewport) => {
      set({
        panOffset: viewport.panOffset,
        zoom: Math.max(0.1, Math.min(5, viewport.zoom)),
      });
    },

    setContainerSize: (size) => {
      set({ containerSize: size });
    },

    setCanvasSize: (size) => {
      set({ canvasSize: size });
    },

    reset: () => {
      set(initialViewportState);
    },
  })),
);

export const selectCanvasViewportSnapshot = (
  state: Pick<ViewportSyncState, "panOffset" | "zoom">,
): CanvasViewportSnapshot => ({
  panOffset: state.panOffset,
  zoom: state.zoom,
});

export function isCanvasViewportSnapshotEqual(
  a: CanvasViewportSnapshot,
  b: CanvasViewportSnapshot,
): boolean {
  return (
    a.zoom === b.zoom &&
    a.panOffset.x === b.panOffset.x &&
    a.panOffset.y === b.panOffset.y
  );
}
