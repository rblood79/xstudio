/**
 * Request Manager
 *
 * 🚀 Phase 6: 네트워크 요청 최적화
 *
 * 기능:
 * - 요청 중복 방지 (동일 URL + params 요청 병합)
 * - AbortController 통합 관리
 * - 패널별 요청 그룹화 및 취소
 * - 요청 통계 추적
 *
 * @since 2025-12-11 Phase 6 Network Optimization
 */

// ============================================
// Types
// ============================================

export interface RequestConfig {
  /** 요청 URL */
  url: string;
  /** HTTP 메서드 (기본: GET) */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** 요청 헤더 */
  headers?: Record<string, string>;
  /** 요청 바디 */
  body?: unknown;
  /** 요청 파라미터 (GET 쿼리 스트링) */
  params?: Record<string, unknown>;
  /** 패널/컴포넌트 ID (그룹화용) */
  groupId?: string;
  /** 타임아웃 (ms, 기본: 30000) */
  timeout?: number;
  /** 중복 요청 허용 (기본: false) */
  allowDuplicate?: boolean;
}

export interface PendingRequest<T = unknown> {
  /** 요청 키 (deduplication용) */
  key: string;
  /** AbortController */
  controller: AbortController;
  /** Promise */
  promise: Promise<T>;
  /** 요청 시작 시간 */
  startTime: number;
  /** 그룹 ID */
  groupId?: string;
}

export interface RequestStats {
  /** 총 요청 수 */
  totalRequests: number;
  /** 캐시 히트 (중복 요청 병합) */
  deduplicatedRequests: number;
  /** 취소된 요청 수 */
  cancelledRequests: number;
  /** 실패한 요청 수 */
  failedRequests: number;
  /** 평균 응답 시간 (ms) */
  avgResponseTime: number;
}

// ============================================
// Request Manager Class
// ============================================

/**
 * 전역 요청 관리자
 *
 * @example
 * ```typescript
 * // 단일 요청
 * const data = await requestManager.fetch({
 *   url: '/api/users',
 *   groupId: 'properties-panel'
 * });
 *
 * // 패널 비활성화 시 요청 취소
 * requestManager.cancelGroup('properties-panel');
 * ```
 */
class RequestManager {
  private pendingRequests = new Map<string, PendingRequest>();
  private stats: RequestStats = {
    totalRequests: 0,
    deduplicatedRequests: 0,
    cancelledRequests: 0,
    failedRequests: 0,
    avgResponseTime: 0,
  };
  private responseTimes: number[] = [];
  private maxResponseTimeSamples = 100;

  // ============================================
  // Public Methods
  // ============================================

  /**
   * 요청 실행
   *
   * 동일한 요청이 진행 중이면 기존 Promise를 반환 (deduplication)
   */
  async fetch<T = unknown>(config: RequestConfig): Promise<T> {
    const key = this.createRequestKey(config);

    // 중복 요청 체크 (allowDuplicate가 false일 때만)
    if (!config.allowDuplicate) {
      const existing = this.pendingRequests.get(key);
      if (existing) {
        this.stats.deduplicatedRequests++;
        if (process.env.NODE_ENV === 'development') {
          console.log(`📦 [RequestManager] Dedup: ${config.url}`);
        }
        return existing.promise as Promise<T>;
      }
    }

    // 새 요청 생성
    const controller = new AbortController();
    const startTime = Date.now();

    // 타임아웃 설정
    const timeout = config.timeout || 30000;
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    const promise = this.executeRequest<T>(config, controller.signal)
      .then((result) => {
        // 응답 시간 기록
        const responseTime = Date.now() - startTime;
        this.recordResponseTime(responseTime);

        return result;
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          this.stats.cancelledRequests++;
        } else {
          this.stats.failedRequests++;
        }
        throw error;
      })
      .finally(() => {
        clearTimeout(timeoutId);
        this.pendingRequests.delete(key);
      });

    // 진행 중인 요청 등록
    const pendingRequest: PendingRequest<T> = {
      key,
      controller,
      promise,
      startTime,
      groupId: config.groupId,
    };

    this.pendingRequests.set(key, pendingRequest as PendingRequest);
    this.stats.totalRequests++;

    return promise;
  }

  /**
   * 특정 그룹의 모든 요청 취소
   *
   * 패널 비활성화 시 해당 패널의 요청을 모두 취소
   */
  cancelGroup(groupId: string): number {
    let cancelledCount = 0;

    for (const [key, request] of this.pendingRequests.entries()) {
      if (request.groupId === groupId) {
        request.controller.abort();
        this.pendingRequests.delete(key);
        cancelledCount++;
      }
    }

    if (cancelledCount > 0 && process.env.NODE_ENV === 'development') {
      console.log(`🚫 [RequestManager] Cancelled ${cancelledCount} requests for group: ${groupId}`);
    }

    return cancelledCount;
  }

  /**
   * 특정 URL의 요청 취소
   */
  cancelByUrl(url: string): boolean {
    for (const [key, request] of this.pendingRequests.entries()) {
      if (key.includes(url)) {
        request.controller.abort();
        this.pendingRequests.delete(key);
        return true;
      }
    }
    return false;
  }

  /**
   * 모든 요청 취소
   */
  cancelAll(): number {
    const count = this.pendingRequests.size;

    for (const request of this.pendingRequests.values()) {
      request.controller.abort();
    }

    this.pendingRequests.clear();

    if (count > 0 && process.env.NODE_ENV === 'development') {
      console.log(`🚫 [RequestManager] Cancelled all ${count} requests`);
    }

    return count;
  }

  /**
   * 진행 중인 요청 수 조회
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * 그룹별 진행 중인 요청 수 조회
   */
  getGroupPendingCount(groupId: string): number {
    let count = 0;
    for (const request of this.pendingRequests.values()) {
      if (request.groupId === groupId) {
        count++;
      }
    }
    return count;
  }

  /**
   * 요청 통계 조회
   */
  getStats(): RequestStats {
    return { ...this.stats };
  }

  /**
   * 통계 리셋
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      deduplicatedRequests: 0,
      cancelledRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
    };
    this.responseTimes = [];
  }

  /**
   * AbortSignal 생성 (컴포넌트용)
   *
   * 컴포넌트에서 직접 fetch 호출 시 사용
   */
  createSignal(groupId?: string): { signal: AbortSignal; abort: () => void } {
    const controller = new AbortController();
    const key = `signal-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const pendingRequest: PendingRequest = {
      key,
      controller,
      promise: Promise.resolve(), // placeholder
      startTime: Date.now(),
      groupId,
    };

    this.pendingRequests.set(key, pendingRequest);

    return {
      signal: controller.signal,
      abort: () => {
        controller.abort();
        this.pendingRequests.delete(key);
      },
    };
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * 요청 키 생성 (deduplication용)
   */
  private createRequestKey(config: RequestConfig): string {
    const { url, method = 'GET', params, body } = config;

    const parts = [method, url];

    if (params) {
      parts.push(JSON.stringify(params));
    }

    if (body) {
      parts.push(JSON.stringify(body));
    }

    return parts.join(':');
  }

  /**
   * 실제 요청 실행
   */
  private async executeRequest<T>(
    config: RequestConfig,
    signal: AbortSignal
  ): Promise<T> {
    const { url, method = 'GET', headers = {}, params, body } = config;

    // URL 생성 (params 포함)
    let fullUrl = url;
    if (params && method === 'GET') {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        searchParams.append(key, String(value));
      }
      fullUrl = `${url}?${searchParams.toString()}`;
    }

    // Fetch 옵션
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal,
    };

    // Body 추가 (GET 제외)
    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    // 요청 실행
    const response = await fetch(fullUrl, fetchOptions);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // JSON 파싱
    const data = await response.json();
    return data as T;
  }

  /**
   * 응답 시간 기록
   */
  private recordResponseTime(ms: number): void {
    this.responseTimes.push(ms);

    if (this.responseTimes.length > this.maxResponseTimeSamples) {
      this.responseTimes.shift();
    }

    // 평균 계산
    const sum = this.responseTimes.reduce((a, b) => a + b, 0);
    this.stats.avgResponseTime = sum / this.responseTimes.length;
  }
}

// ============================================
// Singleton Instance
// ============================================

/**
 * 전역 요청 관리자 인스턴스
 */
export const requestManager = new RequestManager();

// ============================================
// React Hook
// ============================================

import { useEffect, useRef, useCallback } from 'react';

/**
 * 패널/컴포넌트용 요청 관리 훅
 *
 * 컴포넌트 언마운트 시 해당 그룹의 요청을 자동으로 취소합니다.
 *
 * @example
 * ```tsx
 * function MyPanel() {
 *   const { fetch, cancelAll } = useRequestManager('my-panel');
 *
 *   useEffect(() => {
 *     fetch({ url: '/api/data' });
 *   }, []);
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useRequestManager(groupId: string): {
  fetch: <T = unknown>(config: Omit<RequestConfig, 'groupId'>) => Promise<T>;
  cancelAll: () => void;
  getPendingCount: () => number;
  createSignal: () => { signal: AbortSignal; abort: () => void };
} {
  const groupIdRef = useRef(groupId);

  // 언마운트 시 요청 취소
  useEffect(() => {
    return () => {
      requestManager.cancelGroup(groupIdRef.current);
    };
  }, []);

  // fetch with groupId
  const fetch = useCallback(
    <T = unknown>(config: Omit<RequestConfig, 'groupId'>): Promise<T> => {
      return requestManager.fetch<T>({ ...config, groupId: groupIdRef.current });
    },
    []
  );

  // 그룹 요청 취소
  const cancelAll = useCallback(() => {
    requestManager.cancelGroup(groupIdRef.current);
  }, []);

  // 진행 중인 요청 수
  const getPendingCount = useCallback(() => {
    return requestManager.getGroupPendingCount(groupIdRef.current);
  }, []);

  // AbortSignal 생성
  const createSignal = useCallback(() => {
    return requestManager.createSignal(groupIdRef.current);
  }, []);

  return {
    fetch,
    cancelAll,
    getPendingCount,
    createSignal,
  };
}

export default RequestManager;
