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
      // rAF 기반 FPS는 모니터 주사율을 반영한다(렌더링된 프레임 수와는 별개).
      // 정밀도를 유지하기 위해 clamp/round를 하지 않는다.
      averageFps: fps,
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
// WASM Benchmark Utilities (§0.2)
// ============================================

/**
 * 단일 작업의 실행 시간을 측정하고 이동 평균으로 관리
 */
class MetricTracker {
  private samples: number[] = [];
  private readonly maxSamples: number;

  constructor(maxSamples = 60) {
    this.maxSamples = maxSamples;
  }

  record(ms: number): void {
    this.samples.push(ms);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  getAverage(): number {
    if (this.samples.length === 0) return 0;
    return this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
  }

  reset(): void {
    this.samples = [];
  }
}

/** WASM 벤치마크 트래커 */
const wasmTrackers = {
  boundsLookup: new MetricTracker(),
  cullingFilter: new MetricTracker(),
  blockLayout: new MetricTracker(),
  gridLayout: new MetricTracker(),
  skiaFrameTime: new MetricTracker(),
  contentRenderTime: new MetricTracker(),
  blitTime: new MetricTracker(),
  idleFrameRatio: new MetricTracker(),
  dirtyRectCount: new MetricTracker(),
  contentRendersPerSec: new MetricTracker(),
  registryChangesPerSec: new MetricTracker(),
  presentFramesPerSec: new MetricTracker(),
  skiaTreeBuildTime: new MetricTracker(),
  selectionBuildTime: new MetricTracker(),
  aiBoundsBuildTime: new MetricTracker(),
} as const;

export function recordWasmMetric(
  metric: keyof typeof wasmTrackers,
  ms: number,
): void {
  wasmTrackers[metric].record(ms);
}

/**
 * performance.now() 기반 측정 헬퍼.
 * 콜백 실행 시간을 자동으로 기록한다.
 */
export function measureWasm<T>(
  metric: keyof typeof wasmTrackers,
  fn: () => T,
): T {
  const start = performance.now();
  const result = fn();
  recordWasmMetric(metric, performance.now() - start);
  return result;
}

/** 현재 WASM 메트릭을 canvasSync 스토어에 플러시 */
export function flushWasmMetrics(): void {
  useCanvasSyncStore.getState().updateGPUMetrics({
    boundsLookupAvgMs: wasmTrackers.boundsLookup.getAverage(),
    cullingFilterAvgMs: wasmTrackers.cullingFilter.getAverage(),
    blockLayoutAvgMs: wasmTrackers.blockLayout.getAverage(),
    gridLayoutAvgMs: wasmTrackers.gridLayout.getAverage(),
    skiaFrameTimeAvgMs: wasmTrackers.skiaFrameTime.getAverage(),
    contentRenderTimeMs: wasmTrackers.contentRenderTime.getAverage(),
    blitTimeMs: wasmTrackers.blitTime.getAverage(),
    idleFrameRatio: wasmTrackers.idleFrameRatio.getAverage(),
    dirtyRectCountAvg: wasmTrackers.dirtyRectCount.getAverage(),
    contentRendersPerSec: wasmTrackers.contentRendersPerSec.getAverage(),
    registryChangesPerSec: wasmTrackers.registryChangesPerSec.getAverage(),
    presentFramesPerSec: wasmTrackers.presentFramesPerSec.getAverage(),
    skiaTreeBuildTimeMs: wasmTrackers.skiaTreeBuildTime.getAverage(),
    selectionBuildTimeMs: wasmTrackers.selectionBuildTime.getAverage(),
    aiBoundsBuildTimeMs: wasmTrackers.aiBoundsBuildTime.getAverage(),
  });
}

export function updateElementCount(count: number): void {
  useCanvasSyncStore.getState().updateGPUMetrics({ elementCount: count });
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
