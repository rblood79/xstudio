/**
 * SmartCache - LRU Cache with TTL support
 *
 * React Query 스타일 캐싱을 위한 경량 LRU 캐시 구현
 * - LRU (Least Recently Used) 알고리즘
 * - TTL (Time To Live) 지원
 * - Max size 제한
 * - 메모리 효율적 (Map 기반)
 *
 * @example
 * const cache = new SmartCache<string, any>({
 *   max: 100,           // 최대 100개 항목
 *   ttl: 5 * 60 * 1000, // 5분 TTL
 * });
 *
 * cache.set('key', data);
 * const data = cache.get('key'); // 있으면 반환, 없으면 undefined
 */

export interface SmartCacheOptions {
  /** 최대 캐시 항목 수 (기본: 100) */
  max?: number;

  /** TTL (밀리초) - 0이면 무제한 (기본: 0) */
  ttl?: number;
}

interface CacheItem<V> {
  /** 캐시된 값 */
  value: V;

  /** 저장 시각 (밀리초 타임스탬프) */
  timestamp: number;
}

export class SmartCache<K, V> {
  private cache: Map<K, CacheItem<V>>;
  private maxSize: number;
  private ttl: number;

  constructor(options: SmartCacheOptions = {}) {
    this.cache = new Map();
    this.maxSize = options.max ?? 100;
    this.ttl = options.ttl ?? 0;
  }

  /**
   * 캐시에서 값 조회
   *
   * LRU 동작: 조회한 항목을 맨 뒤로 이동 (최신으로 표시)
   * TTL 체크: 만료된 항목은 자동 삭제
   *
   * @param key - 캐시 키
   * @returns 캐시된 값 (없거나 만료 시 undefined)
   */
  get(key: K): V | undefined {
    const item = this.cache.get(key);

    if (!item) {
      return undefined;
    }

    // TTL 체크 (0이면 무제한)
    if (this.ttl > 0) {
      const age = Date.now() - item.timestamp;
      if (age > this.ttl) {
        // 만료된 항목 삭제
        this.cache.delete(key);
        return undefined;
      }
    }

    // LRU: 접근한 항목을 맨 뒤로 이동
    // Map의 순서는 삽입 순서이므로, delete + set으로 순서 변경
    this.cache.delete(key);
    this.cache.set(key, item);

    return item.value;
  }

  /**
   * 캐시에 값 저장
   *
   * 크기 초과 시: 가장 오래된 항목(맨 앞) 자동 삭제
   * 이미 존재 시: 값 업데이트 + 순서 갱신
   *
   * @param key - 캐시 키
   * @param value - 저장할 값
   */
  set(key: K, value: V): void {
    // 이미 존재하면 삭제 (재삽입으로 순서 갱신)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 크기 초과 시 가장 오래된 항목 제거 (LRU)
    if (this.cache.size >= this.maxSize) {
      // Map.keys()는 삽입 순서대로 반환
      // 첫 번째 항목 = 가장 오래된 항목
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    // 새 항목 추가 (맨 뒤)
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  /**
   * 특정 키 삭제
   *
   * @param key - 삭제할 키
   * @returns 삭제 성공 여부
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * 전체 캐시 초기화
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 특정 키 존재 여부 확인 (TTL 체크 포함)
   *
   * @param key - 확인할 키
   * @returns 존재 여부 (만료 시 false)
   */
  has(key: K): boolean {
    if (!this.cache.has(key)) {
      return false;
    }

    // TTL 체크
    if (this.ttl > 0) {
      const item = this.cache.get(key)!;
      const age = Date.now() - item.timestamp;

      if (age > this.ttl) {
        // 만료된 항목 삭제
        this.cache.delete(key);
        return false;
      }
    }

    return true;
  }

  /**
   * 현재 캐시 크기 (항목 수)
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 모든 키 반환 (Iterator)
   */
  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  /**
   * 모든 값 반환 (Iterator)
   */
  values(): IterableIterator<CacheItem<V>> {
    return this.cache.values();
  }

  /**
   * 만료된 항목 정리
   *
   * TTL이 있는 경우, 모든 항목을 순회하며 만료된 항목 삭제
   * 메모리 최적화용 (주기적 호출 권장)
   *
   * @returns 삭제된 항목 수
   */
  cleanup(): number {
    if (this.ttl === 0) {
      return 0; // TTL 없으면 정리할 게 없음
    }

    let deletedCount = 0;
    const now = Date.now();

    // 모든 항목 순회하며 만료 체크
    for (const [key, item] of this.cache.entries()) {
      const age = now - item.timestamp;

      if (age > this.ttl) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * 캐시 통계 조회 (디버깅용)
   */
  getStats(): {
    size: number;
    maxSize: number;
    ttl: number;
    oldestItemAge: number | null;
  } {
    let oldestItemAge: number | null = null;

    if (this.cache.size > 0) {
      // 첫 번째 항목 = 가장 오래된 항목
      const firstItem = this.cache.values().next().value;
      if (firstItem) {
        oldestItemAge = Date.now() - firstItem.timestamp;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
      oldestItemAge,
    };
  }
}

/**
 * 전역 캐시 인스턴스 (useAsyncData용)
 *
 * 기본 설정:
 * - max: 100개 (프로젝트 예상 쿼리 수)
 * - ttl: 5분 (일반적인 staleTime)
 */
export const globalQueryCache = new SmartCache<string, { data: unknown; timestamp: number }>({
  max: 100,
  ttl: 5 * 60 * 1000, // 5분
});
