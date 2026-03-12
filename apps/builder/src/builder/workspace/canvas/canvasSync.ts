/**
 * Canvas Sync Compatibility Layer
 *
 * ADR-037 Phase 5:
 * - viewport -> stores/viewportSync
 * - lifecycle -> stores/canvasLifecycle
 * - metrics -> stores/canvasMetrics
 *
 * 이 파일은 기존 호출부 호환을 위한 adapter/barrel만 담당한다.
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import {
  useCanvasLifecycleStore,
  useCanvasMetricsStore,
  useViewportSyncStore,
  selectCanvasViewportSnapshot,
  isCanvasViewportSnapshotEqual,
  selectIsCanvasUsable,
  selectIsSyncMismatch,
  type CanvasLifecycleState,
  type CanvasMetricsState,
  type CanvasViewportSnapshot,
  type GPUMetrics,
  type ViewportSyncState,
} from "./stores";

export interface CanvasSyncState
  extends ViewportSyncState,
    CanvasLifecycleState,
    CanvasMetricsState {}

function createCanvasSyncState(): CanvasSyncState {
  const viewport = useViewportSyncStore.getState();
  const lifecycle = useCanvasLifecycleStore.getState();
  const metrics = useCanvasMetricsStore.getState();

  return {
    ...viewport,
    ...lifecycle,
    ...metrics,
  };
}

export const useCanvasSyncStore = create<CanvasSyncState>()(
  subscribeWithSelector(() => createCanvasSyncState()),
);

function syncCanvasSyncStore(): void {
  useCanvasSyncStore.setState(createCanvasSyncState());
}

useViewportSyncStore.subscribe(syncCanvasSyncStore);
useCanvasLifecycleStore.subscribe(syncCanvasSyncStore);
useCanvasMetricsStore.subscribe(syncCanvasSyncStore);

export {
  selectCanvasViewportSnapshot,
  isCanvasViewportSnapshotEqual,
  selectIsCanvasUsable,
  selectIsSyncMismatch,
};

export function detectSyncMismatch(): void {
  if (process.env.NODE_ENV !== "development") return;

  const lifecycleState = useCanvasLifecycleStore.getState();
  if (selectIsSyncMismatch(lifecycleState)) {
    console.warn(
      `🔄 [CanvasSync] Sync mismatch: store=${lifecycleState.renderVersion}, pixi=${lifecycleState.lastPixiRenderVersion}`,
    );
  }
}

export function logGPUMetrics(): void {
  if (process.env.NODE_ENV !== "development") return;

  const { gpuMetrics } = useCanvasMetricsStore.getState();
  console.log("📊 [CanvasSync] GPU Metrics:", {
    vram: `${(gpuMetrics.vramUsed / 1024 / 1024).toFixed(1)}MB`,
    textures: gpuMetrics.textureCount,
    sprites: gpuMetrics.spriteCount,
    fps: gpuMetrics.averageFps.toFixed(1),
    frameTime: `${gpuMetrics.lastFrameTime.toFixed(2)}ms`,
  });
}

export type { GPUMetrics, CanvasViewportSnapshot };

export default useCanvasSyncStore;
