/**
 * LRU Page Cache
 *
 * 🚀 Phase 5: 페이지별 메모리 관리를 위한 LRU 캐시
 *
 * 성능 비교:
 * - Before: 50페이지 × 100요소 = ~100MB 메모리
 * - After: 최대 5페이지 = ~10MB 메모리 (90% 절감)
 *
 * @since 2025-12-10 Phase 5 Lazy Loading + LRU Cache
 */

export interface LRUCacheStats {
  /** 현재 캐시된 페이지 수 */
  size: number;
  /** 최대 페이지 수 */
  maxPages: number;
  /** 캐시 히트 횟수 */
  hits: number;
  /** 캐시 미스 횟수 */
  misses: number;
  /** 제거된 페이지 수 */
  evictions: number;
  /** 히트율 (%) */
  hitRate: number;
}

/**
 * LRU (Least Recently Used) 페이지 캐시
 *
 * 가장 최근에 사용된 페이지를 메모리에 유지하고,
 * 오래된 페이지는 자동으로 언로드합니다.
 *
 * @example
 * ```ts
 * const cache = new LRUPageCache(5);
 *
 * // 페이지 접근
 * const evictedPageId = cache.access('page-1');
 * if (evictedPageId) {
 *   unloadPage(evictedPageId);
 * }
 *
 * // 캐시에 있는지 확인
 * if (cache.has('page-1')) {
 *   // 캐시 히트
 * }
 * ```
 */
export class LRUPageCache {
  private maxPages: number;
  private accessOrder: string[] = [];

  // 통계
  private _hits = 0;
  private _misses = 0;
  private _evictions = 0;

  /**
   * LRU 캐시 생성
   * @param maxPages 최대 캐시 페이지 수 (기본: 5)
   */
  constructor(maxPages = 5) {
    this.maxPages = Math.max(1, maxPages);
  }

  /**
   * 페이지 접근 기록
   *
   * @param pageId 접근한 페이지 ID
   * @returns 언로드할 페이지 ID (초과 시), 없으면 null
   *
   * @example
   * ```ts
   * const evicted = cache.access('page-1');
   * if (evicted) {
   *   console.log(`Evicting page: ${evicted}`);
   * }
   * ```
   */
  access(pageId: string): string | null {
    // 이미 캐시에 있는지 확인
    const existingIndex = this.accessOrder.indexOf(pageId);
    const isHit = existingIndex !== -1;

    if (isHit) {
      this._hits++;
      // 기존 위치에서 제거
      this.accessOrder.splice(existingIndex, 1);
    } else {
      this._misses++;
    }

    // 맨 앞에 추가 (가장 최근 접근)
    this.accessOrder.unshift(pageId);

    // 초과 시 가장 오래된 페이지 반환
    if (this.accessOrder.length > this.maxPages) {
      const evicted = this.accessOrder.pop() ?? null;
      if (evicted) {
        this._evictions++;
        if (process.env.NODE_ENV === 'development') {
          console.log(`📤 [LRU] Evicting page: ${evicted}`);
        }
      }
      return evicted;
    }

    return null;
  }

  /**
   * 페이지가 캐시에 있는지 확인
   */
  has(pageId: string): boolean {
    return this.accessOrder.includes(pageId);
  }

  /**
   * 특정 페이지를 캐시에서 제거
   */
  remove(pageId: string): boolean {
    const index = this.accessOrder.indexOf(pageId);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 캐시 초기화
   */
  clear(): void {
    this.accessOrder = [];
    this._hits = 0;
    this._misses = 0;
    this._evictions = 0;
  }

  /**
   * 현재 캐시된 페이지 ID 목록 (최근 순서)
   */
  getPageIds(): string[] {
    return [...this.accessOrder];
  }

  /**
   * 현재 캐시된 페이지 수
   */
  get size(): number {
    return this.accessOrder.length;
  }

  /**
   * 최대 캐시 크기
   */
  get capacity(): number {
    return this.maxPages;
  }

  /**
   * 최대 캐시 크기 설정
   */
  setMaxPages(maxPages: number): string[] {
    this.maxPages = Math.max(1, maxPages);

    // 초과분 제거
    const evicted: string[] = [];
    while (this.accessOrder.length > this.maxPages) {
      const pageId = this.accessOrder.pop();
      if (pageId) {
        evicted.push(pageId);
        this._evictions++;
      }
    }

    return evicted;
  }

  /**
   * 캐시 통계
   */
  getStats(): LRUCacheStats {
    const total = this._hits + this._misses;
    return {
      size: this.size,
      maxPages: this.maxPages,
      hits: this._hits,
      misses: this._misses,
      evictions: this._evictions,
      hitRate: total > 0 ? (this._hits / total) * 100 : 0,
    };
  }

  /**
   * 가장 최근 접근된 페이지 ID
   */
  getMostRecent(): string | null {
    return this.accessOrder[0] ?? null;
  }

  /**
   * 가장 오래된 페이지 ID (제거 후보)
   */
  getLeastRecent(): string | null {
    return this.accessOrder[this.accessOrder.length - 1] ?? null;
  }

  /**
   * 특정 페이지를 최근 접근으로 이동 (제거 방지)
   */
  touch(pageId: string): boolean {
    const index = this.accessOrder.indexOf(pageId);
    if (index === -1) return false;

    // 맨 앞으로 이동
    this.accessOrder.splice(index, 1);
    this.accessOrder.unshift(pageId);
    return true;
  }

  /**
   * 페이지 접근 순서 덤프 (디버깅용)
   */
  dump(): void {
    console.log('📋 [LRU] Cache state:');
    console.log(`  Size: ${this.size}/${this.maxPages}`);
    console.log(`  Order: [${this.accessOrder.join(' → ')}]`);
    console.log(`  Stats:`, this.getStats());
  }
}

// ============================================
// Singleton Instance
// ============================================

/**
 * 전역 LRU 페이지 캐시
 *
 * @example
 * ```ts
 * import { pageCache } from './utils/LRUPageCache';
 *
 * // 페이지 접근
 * const evicted = pageCache.access(pageId);
 *
 * // 통계 확인
 * console.log(pageCache.getStats());
 * ```
 */
export const pageCache = new LRUPageCache(5);
