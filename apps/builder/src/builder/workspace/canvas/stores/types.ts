export interface GPUMetrics {
  vramUsed: number;
  textureCount: number;
  spriteCount: number;
  lastFrameTime: number;
  averageFps: number;
  boundsLookupAvgMs: number;
  cullingFilterAvgMs: number;
  blockLayoutAvgMs: number;
  gridLayoutAvgMs: number;
  skiaFrameTimeAvgMs: number;
  elementCount: number;
  contentRenderTimeMs: number;
  blitTimeMs: number;
  idleFrameRatio: number;
  dirtyRectCountAvg: number;
  contentRendersPerSec: number;
  registryChangesPerSec: number;
  presentFramesPerSec: number;
  skiaTreeBuildTimeMs: number;
  selectionBuildTimeMs: number;
  aiBoundsBuildTimeMs: number;
}

export interface CanvasViewportSnapshot {
  panOffset: { x: number; y: number };
  zoom: number;
}
