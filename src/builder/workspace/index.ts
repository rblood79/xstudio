/**
 * Workspace Module
 *
 * 🚀 Phase 10: WebGL Builder 워크스페이스
 *
 * @since 2025-12-11 Phase 10 B1.1
 * @updated 2025-12-11 Phase 10 B1.2-B1.5 완료
 */

// Main Components
export { Workspace } from './Workspace';
export { BuilderCanvas, BuilderCanvasWithFlag } from './canvas/BuilderCanvas';

// Stores
export { useCanvasSyncStore, type CanvasSyncState, type GPUMetrics } from './canvas/canvasSync';
export * from './canvas/store'; // B2.4: Direct Zustand Access

// Utils
export {
  gpuProfiler,
  useGPUProfiler,
  GPUDebugOverlay,
  updateTextureCount,
  updateSpriteCount,
  updateVRAMUsage,
} from './canvas/utils/gpuProfiler';

// Sprites (B1.2)
export * from './canvas/sprites';

// Selection (B1.3)
export * from './canvas/selection';

// Grid + Zoom/Pan (B1.4)
export * from './canvas/grid';

// Text Edit Overlay (B1.5)
export * from './overlay';
