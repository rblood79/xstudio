/**
 * Cache Metrics Tracker (ADR-100 Phase 4)
 *
 * Dual-surface 캐시, paragraph 캐시, texture 캐시 등의 적중률 추적.
 * 개발 모드에서만 활성화 (production에서는 no-op).
 */

export interface CacheMetricsSnapshot {
  name: string;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  size: number;
}

export class CacheMetrics {
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private currentSize = 0;

  constructor(readonly name: string) {}

  recordHit(): void {
    this.hits++;
  }

  recordMiss(): void {
    this.misses++;
  }

  recordEviction(): void {
    this.evictions++;
  }

  setSize(size: number): void {
    this.currentSize = size;
  }

  get hitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 1 : this.hits / total;
  }

  get totalRequests(): number {
    return this.hits + this.misses;
  }

  snapshot(): CacheMetricsSnapshot {
    return {
      name: this.name,
      hits: this.hits,
      misses: this.misses,
      hitRate: Math.round(this.hitRate * 10000) / 100, // percentage with 2 decimals
      evictions: this.evictions,
      size: this.currentSize,
    };
  }

  reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
    this.currentSize = 0;
  }
}

/** 전역 캐시 메트릭스 레지스트리 */
const registry = new Map<string, CacheMetrics>();

export function getCacheMetrics(name: string): CacheMetrics {
  let metrics = registry.get(name);
  if (!metrics) {
    metrics = new CacheMetrics(name);
    registry.set(name, metrics);
  }
  return metrics;
}

export function getAllCacheMetrics(): CacheMetricsSnapshot[] {
  return Array.from(registry.values()).map((m) => m.snapshot());
}

export function resetAllCacheMetrics(): void {
  for (const m of registry.values()) {
    m.reset();
  }
}
