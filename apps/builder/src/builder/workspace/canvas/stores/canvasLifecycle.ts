import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export interface CanvasLifecycleState {
  renderVersion: number;
  lastPixiRenderVersion: number;
  isCanvasReady: boolean;
  isContextLost: boolean;
  incrementRenderVersion: () => void;
  syncPixiVersion: (version: number) => void;
  setCanvasReady: (ready: boolean) => void;
  setContextLost: (lost: boolean) => void;
  reset: () => void;
}

const initialLifecycleState = {
  renderVersion: 0,
  lastPixiRenderVersion: 0,
  isCanvasReady: false,
  isContextLost: false,
};

export const useCanvasLifecycleStore = create<CanvasLifecycleState>()(
  subscribeWithSelector((set, get) => ({
    ...initialLifecycleState,

    incrementRenderVersion: () => {
      set((state) => ({ renderVersion: state.renderVersion + 1 }));
    },

    syncPixiVersion: (version) => {
      set({ lastPixiRenderVersion: version });

      const { renderVersion } = get();
      if (renderVersion - version > 2) {
        console.warn(
          `[CanvasLifecycle] Mismatch detected: store=${renderVersion}, pixi=${version}`,
        );
      }
    },

    setCanvasReady: (ready) => {
      set({ isCanvasReady: ready });
    },

    setContextLost: (lost) => {
      set({ isContextLost: lost });
      if (lost) {
        console.warn("⚠️ [CanvasLifecycle] WebGL context lost");
      } else {
        console.log("✅ [CanvasLifecycle] WebGL context restored");
      }
    },

    reset: () => {
      set(initialLifecycleState);
    },
  })),
);

export const selectIsSyncMismatch = (
  state: Pick<CanvasLifecycleState, "lastPixiRenderVersion" | "renderVersion">,
): boolean => state.renderVersion - state.lastPixiRenderVersion > 2;

export const selectIsCanvasUsable = (
  state: Pick<CanvasLifecycleState, "isCanvasReady" | "isContextLost">,
): boolean => state.isCanvasReady && !state.isContextLost;
