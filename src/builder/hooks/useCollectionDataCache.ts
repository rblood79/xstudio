/**
 * Collection Data Cache System
 *
 * API 호출 결과를 캐싱하여 중복 요청을 방지하고 성능을 향상시킵니다.
 *
 * Features:
 * - TTL(Time-to-Live) 기반 자동 만료
 * - 캐시 키 기반 저장/조회
 * - 수동 캐시 무효화
 * - 메모리 제한 (최대 항목 수)
 */

export interface CacheEntry<T> {
  /** 캐시된 데이터 */
  data: T;
  /** 캐시 생성 시간 (timestamp) */
  createdAt: number;
  /** 마지막 접근 시간 (LRU용) */
  lastAccessedAt: number;
  /** TTL (밀리초) */
  ttl: number;
}

export interface CacheOptions {
  /** TTL (기본: 5분) */
  ttl?: number;
  /** 최대 캐시 항목 수 (기본: 100) */
  maxEntries?: number;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5분
const DEFAULT_MAX_ENTRIES = 100;

/**
 * Collection Data Cache 클래스
 *
 * @example
 * ```typescript
 * const cache = new CollectionDataCache({ ttl: 60000 }); // 1분 TTL
 *
 * // 캐시 저장
 * cache.set('users-list', userData);
 *
 * // 캐시 조회
 * const cached = cache.get('users-list');
 * if (cached) {
 *   return cached; // 캐시 히트
 * }
 * ```
 */
class CollectionDataCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private ttl: number;
  private maxEntries: number;

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl || DEFAULT_TTL;
    this.maxEntries = options.maxEntries || DEFAULT_MAX_ENTRIES;
  }

  /**
   * 캐시 키 생성
   *
   * PropertyDataBinding 또는 DataBinding 설정에서 고유 키를 생성합니다.
   */
  static createKey(binding: unknown): string {
    if (!binding) return '';

    try {
      // PropertyDataBinding 형식: { source: 'api', name: 'users' }
      if (
        typeof binding === 'object' &&
        'source' in binding &&
        'name' in binding
      ) {
        const b = binding as { source: string; name: string; path?: string };
        return `prop:${b.source}:${b.name}:${b.path || ''}`;
      }

      // DataBinding 형식: { type: 'collection', source: 'api', config: {...} }
      if (
        typeof binding === 'object' &&
        'type' in binding &&
        'config' in binding
      ) {
        return `data:${JSON.stringify(binding)}`;
      }

      return '';
    } catch {
      return '';
    }
  }

  /**
   * 캐시에서 데이터 조회
   *
   * @returns 캐시 데이터 또는 undefined (캐시 미스 또는 만료)
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      console.log(`💨 Cache MISS: ${key}`);
      return undefined;
    }

    // TTL 확인
    const now = Date.now();
    if (now - entry.createdAt > entry.ttl) {
      console.log(`⏰ Cache EXPIRED: ${key}`);
      this.cache.delete(key);
      return undefined;
    }

    // LRU: 마지막 접근 시간 업데이트
    entry.lastAccessedAt = now;
    console.log(`✅ Cache HIT: ${key}`);

    return entry.data as T;
  }

  /**
   * 캐시에 데이터 저장
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // 최대 항목 수 초과 시 LRU 정리
    if (this.cache.size >= this.maxEntries) {
      this.evictLRU();
    }

    const now = Date.now();
    this.cache.set(key, {
      data,
      createdAt: now,
      lastAccessedAt: now,
      ttl: ttl || this.ttl,
    });

    console.log(`📦 Cache SET: ${key} (TTL: ${ttl || this.ttl}ms)`);
  }

  /**
   * 특정 키의 캐시 무효화
   */
  invalidate(key: string): void {
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`🗑️ Cache INVALIDATED: ${key}`);
    }
  }

  /**
   * 패턴에 매칭되는 모든 캐시 무효화
   *
   * @param pattern 정규식 패턴 또는 prefix 문자열
   */
  invalidateMatching(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    console.log(`🗑️ Cache INVALIDATED ${count} entries matching: ${pattern}`);
  }

  /**
   * 모든 캐시 삭제
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🧹 Cache CLEARED: ${size} entries`);
  }

  /**
   * 캐시 통계
   */
  getStats(): { size: number; maxEntries: number; ttl: number } {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      ttl: this.ttl,
    };
  }

  /**
   * LRU(Least Recently Used) 정리
   *
   * 가장 오래된 항목부터 삭제
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessedAt < oldestTime) {
        oldestTime = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`♻️ Cache LRU EVICTED: ${oldestKey}`);
    }
  }
}

// 싱글톤 캐시 인스턴스
export const collectionDataCache = new CollectionDataCache({
  ttl: DEFAULT_TTL,
  maxEntries: DEFAULT_MAX_ENTRIES,
});

/**
 * 캐시 키 생성 헬퍼
 */
export const createCacheKey = CollectionDataCache.createKey;

export default CollectionDataCache;
