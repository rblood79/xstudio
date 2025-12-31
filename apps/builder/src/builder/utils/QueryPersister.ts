/**
 * Query Persister
 *
 * 🚀 Phase 6: IndexedDB 기반 캐시 영속화
 *
 * 기능:
 * - API 응답 캐시를 IndexedDB에 저장
 * - 새로고침 후에도 캐시 유지
 * - TTL 기반 만료 처리
 * - 자동 정리 (GC)
 *
 * @since 2025-12-11 Phase 6 Network Optimization
 */

// ============================================
// Types
// ============================================

export interface CachedQuery {
  /** 캐시 키 */
  key: string;
  /** 캐시 데이터 (직렬화됨) */
  data: string;
  /** 생성 시간 */
  createdAt: number;
  /** 만료 시간 */
  expiresAt: number;
  /** 마지막 접근 시간 */
  lastAccessedAt: number;
  /** 데이터 크기 (bytes) */
  size: number;
}

export interface PersisterOptions {
  /** 데이터베이스 이름 */
  dbName?: string;
  /** 스토어 이름 */
  storeName?: string;
  /** 기본 TTL (ms, 기본: 1시간) */
  defaultTTL?: number;
  /** 최대 캐시 크기 (bytes, 기본: 50MB) */
  maxSize?: number;
  /** GC 간격 (ms, 기본: 5분) */
  gcInterval?: number;
}

// ============================================
// Constants
// ============================================

const DEFAULT_DB_NAME = 'xstudio-query-cache';
const DEFAULT_STORE_NAME = 'queries';
const DEFAULT_TTL = 60 * 60 * 1000; // 1시간
const DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50MB
const DEFAULT_GC_INTERVAL = 5 * 60 * 1000; // 5분

// ============================================
// Query Persister Class
// ============================================

/**
 * IndexedDB 기반 쿼리 캐시 영속화
 *
 * @example
 * ```typescript
 * const persister = new QueryPersister();
 *
 * // 캐시 저장
 * await persister.set('users-list', userData, { ttl: 30 * 60 * 1000 });
 *
 * // 캐시 조회
 * const cached = await persister.get('users-list');
 * if (cached) {
 *   return cached; // 캐시 히트
 * }
 * ```
 */
class QueryPersister {
  private dbName: string;
  private storeName: string;
  private defaultTTL: number;
  private maxSize: number;
  private db: IDBDatabase | null = null;
  private gcIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(options: PersisterOptions = {}) {
    this.dbName = options.dbName || DEFAULT_DB_NAME;
    this.storeName = options.storeName || DEFAULT_STORE_NAME;
    this.defaultTTL = options.defaultTTL || DEFAULT_TTL;
    this.maxSize = options.maxSize || DEFAULT_MAX_SIZE;

    // GC 시작
    if (typeof window !== 'undefined') {
      this.startGC(options.gcInterval || DEFAULT_GC_INTERVAL);
    }
  }

  // ============================================
  // Public Methods
  // ============================================

  /**
   * DB 초기화
   */
  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        console.error('[QueryPersister] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 스토어 생성
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('expiresAt', 'expiresAt', { unique: false });
          store.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
        }
      };
    });
  }

  /**
   * 캐시 조회
   */
  async get<T>(key: string): Promise<T | null> {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const cached = request.result as CachedQuery | undefined;

        if (!cached) {
          resolve(null);
          return;
        }

        // 만료 확인
        const now = Date.now();
        if (now > cached.expiresAt) {
          // 만료된 캐시 삭제
          store.delete(key);
          resolve(null);
          return;
        }

        // 마지막 접근 시간 업데이트
        cached.lastAccessedAt = now;
        store.put(cached);

        try {
          const data = JSON.parse(cached.data) as T;
          resolve(data);
        } catch {
          resolve(null);
        }
      };
    });
  }

  /**
   * 캐시 저장
   */
  async set<T>(
    key: string,
    data: T,
    options?: { ttl?: number }
  ): Promise<void> {
    await this.init();
    if (!this.db) return;

    const ttl = options?.ttl || this.defaultTTL;
    const now = Date.now();
    const serialized = JSON.stringify(data);

    const cached: CachedQuery = {
      key,
      data: serialized,
      createdAt: now,
      expiresAt: now + ttl,
      lastAccessedAt: now,
      size: new Blob([serialized]).size,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(cached);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * 캐시 삭제
   */
  async delete(key: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * 패턴 매칭 삭제
   */
  async deleteMatching(pattern: string | RegExp): Promise<number> {
    await this.init();
    if (!this.db) return 0;

    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.openCursor();

      request.onerror = () => reject(request.error);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (cursor) {
          if (regex.test(cursor.key as string)) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };
    });
  }

  /**
   * 모든 캐시 삭제
   */
  async clear(): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  /**
   * 캐시 통계 조회
   */
  async getStats(): Promise<{
    count: number;
    totalSize: number;
    oldestEntry: number | null;
  }> {
    await this.init();
    if (!this.db) {
      return { count: 0, totalSize: 0, oldestEntry: null };
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.openCursor();

      let count = 0;
      let totalSize = 0;
      let oldestEntry: number | null = null;

      request.onerror = () => reject(request.error);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (cursor) {
          const cached = cursor.value as CachedQuery;
          count++;
          totalSize += cached.size;

          if (oldestEntry === null || cached.createdAt < oldestEntry) {
            oldestEntry = cached.createdAt;
          }

          cursor.continue();
        } else {
          resolve({ count, totalSize, oldestEntry });
        }
      };
    });
  }

  /**
   * 리소스 정리
   */
  destroy(): void {
    if (this.gcIntervalId) {
      clearInterval(this.gcIntervalId);
      this.gcIntervalId = null;
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * GC 시작
   */
  private startGC(interval: number): void {
    this.gcIntervalId = setInterval(() => {
      this.runGC();
    }, interval);
  }

  /**
   * GC 실행 (만료된 항목 + 크기 초과 시 LRU 정리)
   */
  private async runGC(): Promise<void> {
    await this.init();
    if (!this.db) return;

    const now = Date.now();

    // 1. 만료된 항목 삭제
    await this.deleteExpired(now);

    // 2. 크기 초과 시 LRU 정리
    const stats = await this.getStats();
    if (stats.totalSize > this.maxSize) {
      await this.evictLRU(stats.totalSize - this.maxSize);
    }
  }

  /**
   * 만료된 항목 삭제
   */
  private async deleteExpired(now: number): Promise<number> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('expiresAt');
      const range = IDBKeyRange.upperBound(now);
      const request = index.openCursor(range);

      let deletedCount = 0;

      request.onerror = () => reject(request.error);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          if (deletedCount > 0 && process.env.NODE_ENV === 'development') {
            console.log(`🧹 [QueryPersister] GC: Deleted ${deletedCount} expired entries`);
          }
          resolve(deletedCount);
        }
      };
    });
  }

  /**
   * LRU 정리 (크기 기준)
   */
  private async evictLRU(bytesToFree: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('lastAccessedAt');
      const request = index.openCursor();

      let freedBytes = 0;
      let deletedCount = 0;

      request.onerror = () => reject(request.error);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

        if (cursor && freedBytes < bytesToFree) {
          const cached = cursor.value as CachedQuery;
          freedBytes += cached.size;
          deletedCount++;
          cursor.delete();
          cursor.continue();
        } else {
          if (deletedCount > 0 && process.env.NODE_ENV === 'development') {
            console.log(
              `🧹 [QueryPersister] LRU: Evicted ${deletedCount} entries (${(freedBytes / 1024).toFixed(1)}KB)`
            );
          }
          resolve();
        }
      };
    });
  }
}

// ============================================
// Singleton Instance
// ============================================

/**
 * 전역 쿼리 영속화 인스턴스
 */
export const queryPersister = new QueryPersister();

// ============================================
// React Hook
// ============================================

import { useEffect, useCallback } from 'react';

/**
 * 영속 캐시 훅
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { getCache, setCache, clearCache } = useQueryPersister();
 *
 *   useEffect(() => {
 *     const loadData = async () => {
 *       const cached = await getCache('my-data');
 *       if (cached) {
 *         setData(cached);
 *         return;
 *       }
 *
 *       const fresh = await fetchData();
 *       await setCache('my-data', fresh);
 *       setData(fresh);
 *     };
 *
 *     loadData();
 *   }, []);
 * }
 * ```
 */
export function useQueryPersister(): {
  getCache: <T>(key: string) => Promise<T | null>;
  setCache: <T>(key: string, data: T, ttl?: number) => Promise<void>;
  clearCache: (key: string) => Promise<void>;
  clearAll: () => Promise<void>;
} {
  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    queryPersister.init();
  }, []);

  const getCache = useCallback(<T,>(key: string) => {
    return queryPersister.get<T>(key);
  }, []);

  const setCache = useCallback(<T,>(key: string, data: T, ttl?: number) => {
    return queryPersister.set(key, data, { ttl });
  }, []);

  const clearCache = useCallback((key: string) => {
    return queryPersister.delete(key);
  }, []);

  const clearAll = useCallback(() => {
    return queryPersister.clear();
  }, []);

  return {
    getCache,
    setCache,
    clearCache,
    clearAll,
  };
}

export default QueryPersister;
