/**
 * Canvas Sync Store
 *
 * 🚀 Phase 10 B1.1: Pixi↔React DOM 동기화 상태 관리
 *
 * 기능:
 * - 렌더 버전 추적 (React DOM ↔ PixiJS)
 * - 불일치 감지 및 경고
 * - GPU 메트릭 추적
 *
 * @since 2025-12-11 Phase 10 B1.1
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// ============================================
// Types
// ============================================

export interface GPUMetrics {
  /** 현재 VRAM 사용량 (bytes) */
  vramUsed: number;
  /** 텍스처 수 */
  textureCount: number;
  /** 스프라이트 수 */
  spriteCount: number;
  /** 마지막 프레임 시간 (ms) */
  lastFrameTime: number;
  /** 평균 FPS */
  averageFps: number;

  // WASM 벤치마크 메트릭 (§0.2)
  /** 뷰포트 바운드 조회 평균 시간 (ms) */
  boundsLookupAvgMs: number;
  /** 컬링 필터 평균 시간 (ms) */
  cullingFilterAvgMs: number;
  /** 블록 레이아웃 평균 시간 (ms) */
  blockLayoutAvgMs: number;
  /** 그리드 레이아웃 평균 시간 (ms) */
  gridLayoutAvgMs: number;
  /** CanvasKit 프레임 시간 (ms) */
  skiaFrameTimeAvgMs: number;
  /** 현재 요소 수 */
  elementCount: number;

  // Phase 6 메트릭
  /** Content surface 렌더 시간 (ms) */
  contentRenderTimeMs: number;
  /** Main surface 블리팅 시간 (ms) */
  blitTimeMs: number;
  /** idle 프레임 비율 (0-1) */
  idleFrameRatio: number;
  /** 프레임당 평균 dirty rect 수 */
  dirtyRectCountAvg: number;
}

export interface CanvasSyncState {
  // ============================================
  // Render Version Sync
  // ============================================

  /** React DOM 렌더 버전 (Store 업데이트 시 증가) */
  renderVersion: number;
  /** PixiJS 마지막 렌더 버전 */
  lastPixiRenderVersion: number;

  // ============================================
  // Canvas State
  // ============================================

  /** 캔버스 준비 완료 여부 */
  isCanvasReady: boolean;
  /** WebGL 컨텍스트 유실 상태 */
  isContextLost: boolean;
  /** 현재 줌 레벨 */
  zoom: number;
  /** 팬 오프셋 */
  panOffset: { x: number; y: number };
  /** 컨테이너 크기 (패널 토글 최적화용) */
  containerSize: { width: number; height: number };
  /** 캔버스 크기 (breakpoint 기반) */
  canvasSize: { width: number; height: number };

  // ============================================
  // GPU Metrics
  // ============================================

  /** GPU 메트릭 */
  gpuMetrics: GPUMetrics;

  // ============================================
  // Actions
  // ============================================

  /** 렌더 버전 증가 (Store 업데이트 시 호출) */
  incrementRenderVersion: () => void;
  /** PixiJS 렌더 완료 시 버전 동기화 */
  syncPixiVersion: (version: number) => void;
  /** 캔버스 준비 완료 설정 */
  setCanvasReady: (ready: boolean) => void;
  /** WebGL 컨텍스트 상태 설정 */
  setContextLost: (lost: boolean) => void;
  /** 줌 레벨 설정 */
  setZoom: (zoom: number) => void;
  /** 팬 오프셋 설정 */
  setPanOffset: (offset: { x: number; y: number }) => void;
  /** 컨테이너 크기 설정 */
  setContainerSize: (size: { width: number; height: number }) => void;
  /** 캔버스 크기 설정 */
  setCanvasSize: (size: { width: number; height: number }) => void;
  /** GPU 메트릭 업데이트 */
  updateGPUMetrics: (metrics: Partial<GPUMetrics>) => void;
  /** 상태 리셋 */
  reset: () => void;
}

// ============================================
// Initial State
// ============================================

const initialGPUMetrics: GPUMetrics = {
  vramUsed: 0,
  textureCount: 0,
  spriteCount: 0,
  lastFrameTime: 0,
  averageFps: 60,
  boundsLookupAvgMs: 0,
  cullingFilterAvgMs: 0,
  blockLayoutAvgMs: 0,
  gridLayoutAvgMs: 0,
  skiaFrameTimeAvgMs: 0,
  elementCount: 0,
  contentRenderTimeMs: 0,
  blitTimeMs: 0,
  idleFrameRatio: 0,
  dirtyRectCountAvg: 0,
};

const initialState = {
  renderVersion: 0,
  lastPixiRenderVersion: 0,
  isCanvasReady: false,
  isContextLost: false,
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  containerSize: { width: 0, height: 0 },
  canvasSize: { width: 1920, height: 1080 },
  gpuMetrics: initialGPUMetrics,
};

// ============================================
// Store
// ============================================

export const useCanvasSyncStore = create<CanvasSyncState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    incrementRenderVersion: () => {
      set((state) => ({ renderVersion: state.renderVersion + 1 }));
    },

    syncPixiVersion: (version) => {
      set({ lastPixiRenderVersion: version });

      // 불일치 감지
      const { renderVersion } = get();
      if (renderVersion - version > 2) {
        console.warn(
          `[CanvasSync] Mismatch detected: store=${renderVersion}, pixi=${version}`
        );
      }
    },

    setCanvasReady: (ready) => {
      set({ isCanvasReady: ready });
      if (ready) {
        console.log('🎮 [CanvasSync] Canvas ready');
      }
    },

    setContextLost: (lost) => {
      set({ isContextLost: lost });
      if (lost) {
        console.warn('⚠️ [CanvasSync] WebGL context lost');
      } else {
        console.log('✅ [CanvasSync] WebGL context restored');
      }
    },

    setZoom: (zoom) => {
      set({ zoom: Math.max(0.1, Math.min(5, zoom)) });
    },

    setPanOffset: (offset) => {
      set({ panOffset: offset });
    },

    setContainerSize: (size) => {
      set({ containerSize: size });
    },

    setCanvasSize: (size) => {
      set({ canvasSize: size });
    },

    updateGPUMetrics: (metrics) => {
      set((state) => ({
        gpuMetrics: { ...state.gpuMetrics, ...metrics },
      }));
    },

    reset: () => {
      set(initialState);
    },
  }))
);

// ============================================
// Selectors
// ============================================

/** 동기화 불일치 여부 */
export const selectIsSyncMismatch = (state: CanvasSyncState) =>
  state.renderVersion - state.lastPixiRenderVersion > 2;

/** 캔버스 사용 가능 여부 */
export const selectIsCanvasUsable = (state: CanvasSyncState) =>
  state.isCanvasReady && !state.isContextLost;

// ============================================
// Utilities
// ============================================

/**
 * 불일치 감지 로그 (개발 환경)
 */
export function detectSyncMismatch(): void {
  if (process.env.NODE_ENV !== 'development') return;

  const { renderVersion, lastPixiRenderVersion } = useCanvasSyncStore.getState();
  if (renderVersion - lastPixiRenderVersion > 2) {
    console.warn(
      `🔄 [CanvasSync] Sync mismatch: store=${renderVersion}, pixi=${lastPixiRenderVersion}`
    );
  }
}

/**
 * GPU 메트릭 로깅 (개발 환경)
 */
export function logGPUMetrics(): void {
  if (process.env.NODE_ENV !== 'development') return;

  const { gpuMetrics } = useCanvasSyncStore.getState();
  console.log('📊 [CanvasSync] GPU Metrics:', {
    vram: `${(gpuMetrics.vramUsed / 1024 / 1024).toFixed(1)}MB`,
    textures: gpuMetrics.textureCount,
    sprites: gpuMetrics.spriteCount,
    fps: gpuMetrics.averageFps.toFixed(1),
    frameTime: `${gpuMetrics.lastFrameTime.toFixed(2)}ms`,
  });
}

export default useCanvasSyncStore;
