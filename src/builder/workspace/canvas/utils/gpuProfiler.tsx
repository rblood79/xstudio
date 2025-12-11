/**
 * GPU Profiler
 *
 * 🚀 Phase 10 B1.1: WebGL/GPU 성능 모니터링
 *
 * 기능:
 * - FPS 측정
 * - 프레임 타임 측정
 * - VRAM 사용량 추정
 * - 텍스처/스프라이트 카운트
 *
 * @since 2025-12-11 Phase 10 B1.1
 */

import { useCanvasSyncStore } from '../canvasSync';

// ============================================
// Types
// ============================================

export interface FrameStats {
  fps: number;
  frameTime: number;
  timestamp: number;
}

export interface GPUProfilerConfig {
  /** FPS 측정 간격 (ms) */
  sampleInterval?: number;
  /** 평균 FPS 계산을 위한 샘플 수 */
  sampleCount?: number;
  /** 자동 업데이트 여부 */
  autoUpdate?: boolean;
}

// ============================================
// GPU Profiler Class
// ============================================

class GPUProfiler {
  private frameCount = 0;
  private lastTime = 0;
  private frameTimes: number[] = [];
  private rafId: number | null = null;
  private config: Required<GPUProfilerConfig>;

  constructor(config: GPUProfilerConfig = {}) {
    this.config = {
      sampleInterval: config.sampleInterval ?? 1000,
      sampleCount: config.sampleCount ?? 60,
      autoUpdate: config.autoUpdate ?? true,
    };
  }

  /**
   * 프로파일링 시작
   */
  start(): void {
    if (this.rafId !== null) return;

    this.lastTime = performance.now();
    this.frameCount = 0;
    this.frameTimes = [];

    if (this.config.autoUpdate) {
      this.tick();
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('📊 [GPUProfiler] Started');
    }
  }

  /**
   * 프로파일링 중지
   */
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('📊 [GPUProfiler] Stopped');
    }
  }

  /**
   * 프레임 틱 (매 프레임 호출)
   */
  private tick = (): void => {
    const now = performance.now();
    const delta = now - this.lastTime;

    this.frameCount++;
    this.frameTimes.push(delta);

    // 샘플 수 제한
    if (this.frameTimes.length > this.config.sampleCount) {
      this.frameTimes.shift();
    }

    // 1초마다 FPS 계산 및 업데이트
    if (this.frameCount >= 60 || delta >= this.config.sampleInterval) {
      this.updateMetrics();
      this.frameCount = 0;
    }

    this.lastTime = now;
    this.rafId = requestAnimationFrame(this.tick);
  };

  /**
   * 메트릭 업데이트
   */
  private updateMetrics(): void {
    const avgFrameTime =
      this.frameTimes.length > 0
        ? this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
        : 16.67;

    const fps = 1000 / avgFrameTime;

    useCanvasSyncStore.getState().updateGPUMetrics({
      lastFrameTime: avgFrameTime,
      averageFps: Math.min(60, Math.round(fps)),
    });
  }

  /**
   * 수동 프레임 마크 (RAF 없이 사용 시)
   */
  markFrame(): void {
    const now = performance.now();
    const delta = now - this.lastTime;

    this.frameCount++;
    this.frameTimes.push(delta);

    if (this.frameTimes.length > this.config.sampleCount) {
      this.frameTimes.shift();
    }

    this.lastTime = now;
  }

  /**
   * 현재 FPS 조회
   */
  getFPS(): number {
    if (this.frameTimes.length === 0) return 60;
    const avg =
      this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return Math.min(60, Math.round(1000 / avg));
  }

  /**
   * 현재 프레임 타임 조회
   */
  getFrameTime(): number {
    if (this.frameTimes.length === 0) return 16.67;
    return this.frameTimes[this.frameTimes.length - 1];
  }

  /**
   * 평균 프레임 타임 조회
   */
  getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 16.67;
    return this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
  }
}

// ============================================
// Singleton Instance
// ============================================

export const gpuProfiler = new GPUProfiler();

// ============================================
// Texture Tracking Utilities
// ============================================

/**
 * 텍스처 수 업데이트
 */
export function updateTextureCount(count: number): void {
  useCanvasSyncStore.getState().updateGPUMetrics({ textureCount: count });
}

/**
 * 스프라이트 수 업데이트
 */
export function updateSpriteCount(count: number): void {
  useCanvasSyncStore.getState().updateGPUMetrics({ spriteCount: count });
}

/**
 * VRAM 사용량 추정 업데이트
 */
export function updateVRAMUsage(bytes: number): void {
  useCanvasSyncStore.getState().updateGPUMetrics({ vramUsed: bytes });
}

// ============================================
// React Hook
// ============================================

import { useEffect } from 'react';

/**
 * GPU 프로파일링 훅
 *
 * @example
 * ```tsx
 * function Canvas() {
 *   useGPUProfiler();
 *   // ...
 * }
 * ```
 */
export function useGPUProfiler(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    gpuProfiler.start();
    return () => gpuProfiler.stop();
  }, [enabled]);
}

// ============================================
// Debug Overlay Component
// ============================================

import { type CSSProperties } from 'react';

const overlayStyle: CSSProperties = {
  position: 'absolute',
  top: 8,
  left: 8,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  color: '#00ff00',
  fontFamily: 'monospace',
  fontSize: 12,
  padding: '8px 12px',
  borderRadius: 4,
  pointerEvents: 'none',
  zIndex: 9999,
};

/**
 * GPU 메트릭 디버그 오버레이
 * 개발 환경에서만 표시
 */
export function GPUDebugOverlay() {
  const gpuMetrics = useCanvasSyncStore((state) => state.gpuMetrics);

  // 개발 환경에서만 표시
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div style={overlayStyle}>
      <div>FPS: {gpuMetrics.averageFps.toFixed(0)}</div>
      <div>Frame: {gpuMetrics.lastFrameTime.toFixed(2)}ms</div>
      <div>Textures: {gpuMetrics.textureCount}</div>
      <div>Sprites: {gpuMetrics.spriteCount}</div>
      <div>VRAM: {(gpuMetrics.vramUsed / 1024 / 1024).toFixed(1)}MB</div>
    </div>
  );
}

export default gpuProfiler;
