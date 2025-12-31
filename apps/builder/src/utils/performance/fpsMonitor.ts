/**
 * FPS Monitor
 *
 * requestAnimationFrame 기반 정확한 FPS 측정
 * - 프레임 드롭 감지
 * - 평균/최소/최대 FPS 추적
 * - 장기 실행 태스크 감지
 *
 * @example
 * // 모니터링 시작
 * fpsMonitor.start();
 *
 * // ... 작업 수행
 *
 * // 통계 조회
 * const stats = fpsMonitor.getStats();
 * console.log(`Avg FPS: ${stats.avgFps}`);
 *
 * // 모니터링 중지
 * fpsMonitor.stop();
 *
 * @since 2025-12-20 Phase 0 - Benchmark Infrastructure
 */

// ============================================
// Types
// ============================================

export interface FPSStats {
  /** 현재 FPS */
  currentFps: number;

  /** 평균 FPS */
  avgFps: number;

  /** 최소 FPS */
  minFps: number;

  /** 최대 FPS */
  maxFps: number;

  /** 프레임 드롭 횟수 (< 30fps) */
  frameDrops: number;

  /** 장기 프레임 횟수 (> 33ms, 즉 < 30fps) */
  longFrames: number;

  /** 총 프레임 수 */
  totalFrames: number;

  /** 측정 시간 (ms) */
  duration: number;

  /** FPS 히스토리 (최근 60초) */
  history: number[];
}

export interface FrameInfo {
  /** 프레임 시작 시간 */
  timestamp: number;

  /** 프레임 지속 시간 (ms) */
  duration: number;

  /** 이 프레임의 FPS */
  fps: number;
}

// ============================================
// Constants
// ============================================

const LONG_FRAME_THRESHOLD = 33; // 30fps 이하
const FRAME_DROP_THRESHOLD = 30; // fps

// ============================================
// FPSMonitor Class
// ============================================

class FPSMonitor {
  private running: boolean = false;
  private rafId: number | null = null;

  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private startTime: number = 0;

  private fpsHistory: number[] = [];
  private frameDropCount: number = 0;
  private longFrameCount: number = 0;

  private currentFps: number = 0;
  private fpsUpdateInterval: number = 500; // FPS 업데이트 간격 (ms)
  private lastFpsUpdate: number = 0;
  private framesInInterval: number = 0;

  private callbacks: Set<(stats: FPSStats) => void> = new Set();

  /**
   * FPS 모니터링 시작
   */
  start(): void {
    if (this.running) return;

    this.running = true;
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.lastFpsUpdate = this.startTime;
    this.frameCount = 0;
    this.framesInInterval = 0;
    this.fpsHistory = [];
    this.frameDropCount = 0;
    this.longFrameCount = 0;

    console.log('🎬 [FPSMonitor] Started');
    this.tick();
  }

  /**
   * FPS 모니터링 중지
   */
  stop(): void {
    if (!this.running) return;

    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    console.log('🛑 [FPSMonitor] Stopped');
  }

  /**
   * RAF 루프
   */
  private tick = (): void => {
    if (!this.running) return;

    const now = performance.now();
    const frameDuration = now - this.lastFrameTime;

    this.frameCount++;
    this.framesInInterval++;

    // 프레임 드롭 감지
    if (frameDuration > LONG_FRAME_THRESHOLD) {
      this.longFrameCount++;
    }

    // FPS 계산 (일정 간격마다)
    const timeSinceLastUpdate = now - this.lastFpsUpdate;
    if (timeSinceLastUpdate >= this.fpsUpdateInterval) {
      this.currentFps = Math.round((this.framesInInterval * 1000) / timeSinceLastUpdate);

      // 히스토리에 추가 (최근 60초 = 120개 샘플)
      this.fpsHistory.push(this.currentFps);
      if (this.fpsHistory.length > 120) {
        this.fpsHistory.shift();
      }

      // 프레임 드롭 카운트
      if (this.currentFps < FRAME_DROP_THRESHOLD) {
        this.frameDropCount++;
      }

      // 콜백 호출
      if (this.callbacks.size > 0) {
        const stats = this.getStats();
        this.callbacks.forEach((cb) => cb(stats));
      }

      // 리셋
      this.framesInInterval = 0;
      this.lastFpsUpdate = now;
    }

    this.lastFrameTime = now;
    this.rafId = requestAnimationFrame(this.tick);
  };

  /**
   * FPS 변경 콜백 등록
   */
  subscribe(callback: (stats: FPSStats) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * 현재 통계 조회
   */
  getStats(): FPSStats {
    const duration = performance.now() - this.startTime;

    return {
      currentFps: this.currentFps,
      avgFps: this.fpsHistory.length > 0 ? Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length) : 0,
      minFps: this.fpsHistory.length > 0 ? Math.min(...this.fpsHistory) : 0,
      maxFps: this.fpsHistory.length > 0 ? Math.max(...this.fpsHistory) : 0,
      frameDrops: this.frameDropCount,
      longFrames: this.longFrameCount,
      totalFrames: this.frameCount,
      duration,
      history: [...this.fpsHistory],
    };
  }

  /**
   * 실행 중 여부
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * 콘솔에 통계 출력
   */
  printStats(): void {
    const stats = this.getStats();

    console.log('\n🎬 FPS Monitor Stats');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Current FPS: ${stats.currentFps}`);
    console.log(`  Average FPS: ${stats.avgFps}`);
    console.log(`  Min FPS: ${stats.minFps}`);
    console.log(`  Max FPS: ${stats.maxFps}`);
    console.log(`  Frame Drops (< 30fps): ${stats.frameDrops}`);
    console.log(`  Long Frames (> 33ms): ${stats.longFrames}`);
    console.log(`  Total Frames: ${stats.totalFrames}`);
    console.log(`  Duration: ${(stats.duration / 1000).toFixed(2)}s`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * 리셋
   */
  reset(): void {
    const wasRunning = this.running;
    this.stop();

    this.frameCount = 0;
    this.fpsHistory = [];
    this.frameDropCount = 0;
    this.longFrameCount = 0;
    this.currentFps = 0;

    if (wasRunning) {
      this.start();
    }

    console.log('🔄 [FPSMonitor] Reset');
  }
}

// ============================================
// Frame Time Measurement Helper
// ============================================

/**
 * 단일 프레임 시간 측정
 *
 * @example
 * const frameTime = await measureFrameTime();
 * console.log(`Frame took ${frameTime}ms`);
 */
export function measureFrameTime(): Promise<number> {
  return new Promise((resolve) => {
    const start = performance.now();
    requestAnimationFrame(() => {
      resolve(performance.now() - start);
    });
  });
}

/**
 * N 프레임 평균 시간 측정
 */
export async function measureAverageFrameTime(frames: number = 60): Promise<number> {
  const times: number[] = [];

  for (let i = 0; i < frames; i++) {
    const time = await measureFrameTime();
    times.push(time);
  }

  return times.reduce((a, b) => a + b, 0) / times.length;
}

// ============================================
// Singleton Export
// ============================================

export const fpsMonitor = new FPSMonitor();

// 개발 환경에서 전역 접근 허용
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as unknown as { __fpsMonitor: FPSMonitor }).__fpsMonitor = fpsMonitor;
}
