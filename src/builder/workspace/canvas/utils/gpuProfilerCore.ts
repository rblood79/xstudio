import { useEffect } from 'react';
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

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('📊 [GPUProfiler] Stopped');
    }
  }

  private tick = (): void => {
    const now = performance.now();
    const delta = now - this.lastTime;

    this.frameCount++;
    this.frameTimes.push(delta);

    if (this.frameTimes.length > this.config.sampleCount) {
      this.frameTimes.shift();
    }

    if (this.frameCount >= 60 || delta >= this.config.sampleInterval) {
      this.updateMetrics();
      this.frameCount = 0;
    }

    this.lastTime = now;
    this.rafId = requestAnimationFrame(this.tick);
  };

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

  getFPS(): number {
    if (this.frameTimes.length === 0) return 60;
    const avg =
      this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return Math.min(60, Math.round(1000 / avg));
  }

  getFrameTime(): number {
    if (this.frameTimes.length === 0) return 16.67;
    return this.frameTimes[this.frameTimes.length - 1];
  }

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

export function updateTextureCount(count: number): void {
  useCanvasSyncStore.getState().updateGPUMetrics({ textureCount: count });
}

export function updateSpriteCount(count: number): void {
  useCanvasSyncStore.getState().updateGPUMetrics({ spriteCount: count });
}

export function updateVRAMUsage(bytes: number): void {
  useCanvasSyncStore.getState().updateGPUMetrics({ vramUsed: bytes });
}

// ============================================
// React Hook
// ============================================

export function useGPUProfiler(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    gpuProfiler.start();
    return () => gpuProfiler.stop();
  }, [enabled]);
}

