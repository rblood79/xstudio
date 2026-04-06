/**
 * GPU Texture Cache (ADR-100 Phase 4)
 *
 * 이미지/gradient shader LRU 캐시.
 * VRAM 사용량 추적 + 자동 eviction.
 */

export interface CacheEntry<T> {
  value: T;
  size: number; // bytes
  lastAccess: number;
}

export class LRUTextureCache<T extends { delete?: () => void }> {
  private cache = new Map<string, CacheEntry<T>>();
  private totalSize = 0;
  private _hits = 0;
  private _misses = 0;

  constructor(
    private maxSize: number = 64 * 1024 * 1024, // 64MB default
    private maxEntries: number = 1000,
  ) {}

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    entry.lastAccess = performance.now();
    return entry.value;
  }

  set(key: string, value: T, size: number): void {
    // 기존 항목 교체
    const existing = this.cache.get(key);
    if (existing) {
      this.totalSize -= existing.size;
      if (existing.value.delete) existing.value.delete();
    }

    // eviction 필요 시
    while (
      (this.totalSize + size > this.maxSize ||
        this.cache.size >= this.maxEntries) &&
      this.cache.size > 0
    ) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      size,
      lastAccess: performance.now(),
    });
    this.totalSize += size;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    this.totalSize -= entry.size;
    if (entry.value.delete) entry.value.delete();
    this.cache.delete(key);
    return true;
  }

  clear(): void {
    for (const entry of this.cache.values()) {
      if (entry.value.delete) entry.value.delete();
    }
    this.cache.clear();
    this.totalSize = 0;
  }

  /** 현재 VRAM 사용량 (bytes) */
  get vramUsage(): number {
    return this.totalSize;
  }

  /** 현재 VRAM 사용량 (MB) */
  get vramUsageMB(): number {
    return Math.round((this.totalSize / (1024 * 1024)) * 100) / 100;
  }

  /** 캐시 항목 수 */
  get size(): number {
    return this.cache.size;
  }

  getWithStats(key: string): T | undefined {
    const result = this.get(key);
    if (result) this._hits++;
    else this._misses++;
    return result;
  }

  get hitRate(): number {
    const total = this._hits + this._misses;
    return total === 0 ? 1 : this._hits / total;
  }

  resetStats(): void {
    this._hits = 0;
    this._misses = 0;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }
}
