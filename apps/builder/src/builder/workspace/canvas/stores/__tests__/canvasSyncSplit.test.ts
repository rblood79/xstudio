import { afterEach, describe, expect, it } from "vitest";
import { useCanvasSyncStore } from "../../canvasSync";
import {
  isCanvasViewportSnapshotEqual,
  selectCanvasViewportSnapshot,
  useCanvasLifecycleStore,
  useCanvasMetricsStore,
  useViewportSyncStore,
} from "..";

function resetAllStores(): void {
  useViewportSyncStore.getState().reset();
  useCanvasLifecycleStore.getState().reset();
  useCanvasMetricsStore.getState().reset();
}

describe("canvasSync split stores", () => {
  afterEach(() => {
    resetAllStores();
  });

  it("compat adapter가 분리된 store 상태를 반영한다", () => {
    useViewportSyncStore.getState().setViewportSnapshot({
      panOffset: { x: 120, y: 80 },
      zoom: 1.5,
    });
    useCanvasLifecycleStore.getState().setCanvasReady(true);
    useCanvasMetricsStore.getState().updateGPUMetrics({
      averageFps: 57,
      textureCount: 12,
    });

    const canvasSyncState = useCanvasSyncStore.getState();
    expect(canvasSyncState.zoom).toBe(1.5);
    expect(canvasSyncState.panOffset).toEqual({ x: 120, y: 80 });
    expect(canvasSyncState.isCanvasReady).toBe(true);
    expect(canvasSyncState.gpuMetrics.averageFps).toBe(57);
    expect(canvasSyncState.gpuMetrics.textureCount).toBe(12);
  });

  it("metrics 업데이트가 viewport state를 바꾸지 않는다", () => {
    useViewportSyncStore.getState().setViewportSnapshot({
      panOffset: { x: 40, y: 24 },
      zoom: 2,
    });

    const before = selectCanvasViewportSnapshot(useViewportSyncStore.getState());
    useCanvasMetricsStore.getState().updateGPUMetrics({ averageFps: 48 });
    const after = selectCanvasViewportSnapshot(useViewportSyncStore.getState());

    expect(isCanvasViewportSnapshotEqual(before, after)).toBe(true);
    expect(useCanvasSyncStore.getState().gpuMetrics.averageFps).toBe(48);
  });
});
