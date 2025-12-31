/**
 * Memory Monitor
 *
 * JavaScript 힙 메모리 사용량 모니터링
 * - performance.memory API 기반 (Chrome only)
 * - GC 이벤트 감지
 * - 메모리 누수 경고
 *
 * @example
 * // 모니터링 시작
 * memoryMonitor.start();
 *
 * // 스냅샷 생성
 * const snapshot = memoryMonitor.takeSnapshot('before-operation');
 *
 * // 작업 수행 후 비교
 * const diff = memoryMonitor.compareWithSnapshot('before-operation');
 * console.log(`Memory delta: ${diff.heapUsedDelta}MB`);
 *
 * @since 2025-12-20 Phase 0 - Benchmark Infrastructure
 */

// ============================================
// Types
// ============================================

export interface MemoryInfo {
  /** 사용 중인 JS 힙 크기 (bytes) */
  usedJSHeapSize: number;

  /** 할당된 총 JS 힙 크기 (bytes) */
  totalJSHeapSize: number;

  /** JS 힙 크기 제한 (bytes) */
  jsHeapSizeLimit: number;

  /** 타임스탬프 */
  timestamp: number;
}

export interface MemorySnapshot {
  /** 스냅샷 ID */
  id: string;

  /** 메모리 정보 */
  memory: MemoryInfo;

  /** 생성 시간 */
  createdAt: number;
}

export interface MemoryStats {
  /** 현재 메모리 */
  current: MemoryInfo;

  /** 시작 시점 메모리 */
  baseline: MemoryInfo | null;

  /** 최대 사용량 */
  peakUsage: number;

  /** 최소 사용량 */
  minUsage: number;

  /** 샘플 수 */
  sampleCount: number;

  /** GC 감지 횟수 (추정) */
  estimatedGCCount: number;

  /** 메모리 증가 추세 (bytes/s) */
  growthRate: number;

  /** 모니터링 시간 (ms) */
  duration: number;
}

export interface MemoryDiff {
  /** 힙 사용량 차이 (bytes) */
  heapUsedDelta: number;

  /** 힙 사용량 차이 (MB) */
  heapUsedDeltaMB: number;

  /** 총 힙 크기 차이 (bytes) */
  totalHeapDelta: number;

  /** 증가율 (%) */
  percentChange: number;
}

// ============================================
// Utility Functions
// ============================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function bytesToMB(bytes: number): number {
  return bytes / (1024 * 1024);
}

// ============================================
// MemoryMonitor Class
// ============================================

class MemoryMonitor {
  private running: boolean = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private sampleInterval: number = 1000; // 1초

  private baseline: MemoryInfo | null = null;
  private samples: MemoryInfo[] = [];
  private snapshots: Map<string, MemorySnapshot> = new Map();

  private peakUsage: number = 0;
  private minUsage: number = Infinity;
  private lastUsage: number = 0;
  private estimatedGCCount: number = 0;

  private startTime: number = 0;

  private callbacks: Set<(stats: MemoryStats) => void> = new Set();

  /**
   * memory API 지원 여부 확인
   */
  isSupported(): boolean {
    return typeof performance !== 'undefined' && 'memory' in performance;
  }

  /**
   * 현재 메모리 정보 조회
   */
  getMemoryInfo(): MemoryInfo | null {
    if (!this.isSupported()) {
      return null;
    }

    const memory = (performance as Performance & { memory: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    } }).memory;

    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      timestamp: Date.now(),
    };
  }

  /**
   * 모니터링 시작
   */
  start(intervalMs: number = 1000): void {
    if (this.running) return;

    if (!this.isSupported()) {
      console.warn('⚠️ [MemoryMonitor] performance.memory not supported (Chrome only)');
      return;
    }

    this.running = true;
    this.startTime = performance.now();
    this.sampleInterval = intervalMs;
    this.samples = [];
    this.estimatedGCCount = 0;

    // 기준선 설정
    this.baseline = this.getMemoryInfo();
    if (this.baseline) {
      this.lastUsage = this.baseline.usedJSHeapSize;
      this.peakUsage = this.baseline.usedJSHeapSize;
      this.minUsage = this.baseline.usedJSHeapSize;
    }

    console.log('🧠 [MemoryMonitor] Started');

    this.intervalId = setInterval(() => this.sample(), this.sampleInterval);
  }

  /**
   * 모니터링 중지
   */
  stop(): void {
    if (!this.running) return;

    this.running = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('🛑 [MemoryMonitor] Stopped');
  }

  /**
   * 샘플 수집
   */
  private sample(): void {
    const memory = this.getMemoryInfo();
    if (!memory) return;

    this.samples.push(memory);

    // 피크/최소 업데이트
    if (memory.usedJSHeapSize > this.peakUsage) {
      this.peakUsage = memory.usedJSHeapSize;
    }
    if (memory.usedJSHeapSize < this.minUsage) {
      this.minUsage = memory.usedJSHeapSize;
    }

    // GC 감지 (메모리가 크게 감소하면 GC로 추정)
    const delta = memory.usedJSHeapSize - this.lastUsage;
    if (delta < -1024 * 1024) {
      // 1MB 이상 감소
      this.estimatedGCCount++;
    }
    this.lastUsage = memory.usedJSHeapSize;

    // 최근 100개 샘플만 유지
    if (this.samples.length > 100) {
      this.samples.shift();
    }

    // 콜백 호출
    if (this.callbacks.size > 0) {
      const stats = this.getStats();
      this.callbacks.forEach((cb) => cb(stats));
    }
  }

  /**
   * 스냅샷 생성
   */
  takeSnapshot(id: string): MemorySnapshot | null {
    const memory = this.getMemoryInfo();
    if (!memory) return null;

    const snapshot: MemorySnapshot = {
      id,
      memory,
      createdAt: Date.now(),
    };

    this.snapshots.set(id, snapshot);
    console.log(`📸 [MemoryMonitor] Snapshot '${id}': ${formatBytes(memory.usedJSHeapSize)}`);

    return snapshot;
  }

  /**
   * 스냅샷과 현재 메모리 비교
   */
  compareWithSnapshot(snapshotId: string): MemoryDiff | null {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      console.warn(`⚠️ [MemoryMonitor] Snapshot '${snapshotId}' not found`);
      return null;
    }

    const current = this.getMemoryInfo();
    if (!current) return null;

    const heapUsedDelta = current.usedJSHeapSize - snapshot.memory.usedJSHeapSize;

    return {
      heapUsedDelta,
      heapUsedDeltaMB: bytesToMB(heapUsedDelta),
      totalHeapDelta: current.totalJSHeapSize - snapshot.memory.totalJSHeapSize,
      percentChange: (heapUsedDelta / snapshot.memory.usedJSHeapSize) * 100,
    };
  }

  /**
   * 스냅샷 삭제
   */
  deleteSnapshot(id: string): boolean {
    return this.snapshots.delete(id);
  }

  /**
   * 통계 변경 콜백 등록
   */
  subscribe(callback: (stats: MemoryStats) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * 통계 조회
   */
  getStats(): MemoryStats {
    const current = this.getMemoryInfo();
    const duration = performance.now() - this.startTime;

    // 메모리 증가 추세 계산
    let growthRate = 0;
    if (this.samples.length >= 2 && duration > 0) {
      const first = this.samples[0];
      const last = this.samples[this.samples.length - 1];
      const timeDiff = last.timestamp - first.timestamp;
      if (timeDiff > 0) {
        growthRate = ((last.usedJSHeapSize - first.usedJSHeapSize) / timeDiff) * 1000; // bytes/s
      }
    }

    return {
      current: current || {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
        timestamp: Date.now(),
      },
      baseline: this.baseline,
      peakUsage: this.peakUsage,
      minUsage: this.minUsage === Infinity ? 0 : this.minUsage,
      sampleCount: this.samples.length,
      estimatedGCCount: this.estimatedGCCount,
      growthRate,
      duration,
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

    console.log('\n🧠 Memory Monitor Stats');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Current Heap Used: ${formatBytes(stats.current.usedJSHeapSize)}`);
    console.log(`  Total Heap Size: ${formatBytes(stats.current.totalJSHeapSize)}`);
    console.log(`  Heap Limit: ${formatBytes(stats.current.jsHeapSizeLimit)}`);
    console.log(`  Peak Usage: ${formatBytes(stats.peakUsage)}`);
    console.log(`  Min Usage: ${formatBytes(stats.minUsage)}`);
    console.log(`  Estimated GC Count: ${stats.estimatedGCCount}`);
    console.log(`  Growth Rate: ${formatBytes(stats.growthRate)}/s`);
    console.log(`  Samples: ${stats.sampleCount}`);
    console.log(`  Duration: ${(stats.duration / 1000).toFixed(2)}s`);

    if (stats.baseline) {
      const delta = stats.current.usedJSHeapSize - stats.baseline.usedJSHeapSize;
      console.log(`  Delta from Baseline: ${formatBytes(delta)}`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * 리셋
   */
  reset(): void {
    const wasRunning = this.running;
    this.stop();

    this.baseline = null;
    this.samples = [];
    this.snapshots.clear();
    this.peakUsage = 0;
    this.minUsage = Infinity;
    this.lastUsage = 0;
    this.estimatedGCCount = 0;

    if (wasRunning) {
      this.start(this.sampleInterval);
    }

    console.log('🔄 [MemoryMonitor] Reset');
  }

  /**
   * 수동 GC 트리거 (Chrome DevTools 필요)
   */
  requestGC(): void {
    if (typeof window !== 'undefined' && 'gc' in window) {
      console.log('🗑️ [MemoryMonitor] Requesting GC...');
      (window as unknown as { gc: () => void }).gc();
    } else {
      console.warn('⚠️ [MemoryMonitor] Manual GC not available. Run Chrome with --js-flags="--expose-gc"');
    }
  }
}

// ============================================
// Singleton Export
// ============================================

export const memoryMonitor = new MemoryMonitor();

// 개발 환경에서 전역 접근 허용
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as unknown as { __memoryMonitor: MemoryMonitor }).__memoryMonitor = memoryMonitor;
}

// ============================================
// Convenience Functions
// ============================================

/**
 * 메모리 정보 포맷팅
 */
export { formatBytes };

/**
 * 현재 메모리 사용량 (MB)
 */
export function getCurrentMemoryMB(): number | null {
  const info = memoryMonitor.getMemoryInfo();
  return info ? bytesToMB(info.usedJSHeapSize) : null;
}
