import { useViewportSyncStore } from "../canvas/stores";
import {
  getViewportController,
  type ViewportState,
} from "../canvas/viewport/ViewportController";
import { calculateWorldBounds, type WorldBounds } from "./calculateWorldBounds";

export interface ViewportInsets {
  left: number;
  right: number;
}

export interface ViewportVisibleWorldBounds {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface ScrollbarViewportMetrics {
  containerSize: { height: number; width: number };
  visibleViewport: ViewportVisibleWorldBounds;
  viewportState: ViewportState;
  world: WorldBounds;
}

export interface ScrollbarAxisMetrics {
  scrollableTrack: number;
  scrollableWorld: number;
  thumbSize: number;
  viewportSize: number;
  viewportStart: number;
  worldMax: number;
  worldMin: number;
  worldSize: number;
}

export function getViewportAuthoritativeState(): ViewportState {
  const controller = getViewportController();

  if (controller.isAttached()) {
    return controller.getState();
  }

  const { panOffset, zoom } = useViewportSyncStore.getState();
  return {
    scale: zoom,
    x: panOffset.x,
    y: panOffset.y,
  };
}

export function getScrollbarViewportMetrics(
  insets: ViewportInsets,
  viewportState = getViewportAuthoritativeState(),
): ScrollbarViewportMetrics | null {
  const { canvasSize, containerSize } = useViewportSyncStore.getState();
  if (containerSize.width <= 0 || containerSize.height <= 0) {
    return null;
  }

  const visibleWidth = containerSize.width - insets.left - insets.right;
  const visibleHeight = containerSize.height;
  if (visibleWidth <= 0 || visibleHeight <= 0 || viewportState.scale <= 0) {
    return null;
  }

  const visibleViewport = {
    height: visibleHeight / viewportState.scale,
    width: visibleWidth / viewportState.scale,
    x: (insets.left - viewportState.x) / viewportState.scale,
    y: -viewportState.y / viewportState.scale,
  };

  const world = calculateWorldBounds(canvasSize, visibleViewport, viewportState);

  return {
    containerSize,
    viewportState,
    visibleViewport,
    world,
  };
}

export function getScrollbarAxisMetrics(
  metrics: ScrollbarViewportMetrics,
  direction: "horizontal" | "vertical",
  trackLength: number,
): ScrollbarAxisMetrics | null {
  if (trackLength <= 0) {
    return null;
  }

  const isHorizontal = direction === "horizontal";
  const worldSize = isHorizontal ? metrics.world.width : metrics.world.height;
  const viewportSize = isHorizontal
    ? metrics.visibleViewport.width
    : metrics.visibleViewport.height;
  if (worldSize <= 0 || viewportSize <= 0) {
    return null;
  }

  const thumbSize = Math.max(30, (viewportSize / worldSize) * trackLength);

  return {
    scrollableTrack: trackLength - thumbSize,
    scrollableWorld: worldSize - viewportSize,
    thumbSize,
    viewportSize,
    viewportStart: isHorizontal
      ? metrics.visibleViewport.x - metrics.world.minX
      : metrics.visibleViewport.y - metrics.world.minY,
    worldMax: isHorizontal ? metrics.world.maxX : metrics.world.maxY,
    worldMin: isHorizontal ? metrics.world.minX : metrics.world.minY,
    worldSize,
  };
}
