/**
 * Request Deduplication
 *
 * 동일한 요청이 동시에 여러 번 발생할 때, 실제로는 1번만 실행하고
 * 나머지는 같은 Promise를 공유하여 결과를 기다림
 *
 * @example
 * // 3개 컴포넌트가 동시에 같은 queryKey로 호출
 * const dedup = new RequestDeduplicator();
 *
 * // 컴포넌트 1
 * const data1 = await dedup.deduplicate('user-profile', () => fetchUser());
 *
 * // 컴포넌트 2 (동시에)
 * const data2 = await dedup.deduplicate('user-profile', () => fetchUser());
 * // ✅ 실제 fetch는 1번만 실행, data1 === data2
 *
 * // 컴포넌트 3 (동시에)
 * const data3 = await dedup.deduplicate('user-profile', () => fetchUser());
 * // ✅ 같은 Promise 공유, data1 === data2 === data3
 */

export class RequestDeduplicator {
  // 진행 중인 요청 Map: queryKey → Promise
  private pendingRequests: Map<string, Promise<unknown>>;

  constructor() {
    this.pendingRequests = new Map();
  }

  /**
   * 요청 중복 제거
   *
   * @param key - 요청 식별 키 (같은 키면 중복으로 간주)
   * @param fn - 실제 fetch 함수
   * @returns 요청 결과 Promise
   */
  async deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // 이미 진행 중인 요청이 있으면 그 Promise 반환
    if (this.pendingRequests.has(key)) {
      console.log(`🔄 [Dedup] Reusing pending request: ${key}`);
      return this.pendingRequests.get(key)!;
    }

    // 새 요청 생성
    console.log(`🚀 [Dedup] Starting new request: ${key}`);

    const promise = fn()
      .then((result) => {
        // 성공 시 Map에서 제거
        this.pendingRequests.delete(key);
        console.log(`✅ [Dedup] Request completed: ${key}`);
        return result;
      })
      .catch((error) => {
        // 실패 시에도 Map에서 제거 (재시도 가능하게)
        this.pendingRequests.delete(key);
        console.error(`❌ [Dedup] Request failed: ${key}`, error);
        throw error;
      });

    // Map에 저장 (진행 중 표시)
    this.pendingRequests.set(key, promise);

    return promise;
  }

  /**
   * 특정 키의 진행 중인 요청 취소
   *
   * @param key - 취소할 요청 키
   * @returns 취소 성공 여부
   */
  cancel(key: string): boolean {
    if (this.pendingRequests.has(key)) {
      this.pendingRequests.delete(key);
      console.log(`🚫 [Dedup] Request cancelled: ${key}`);
      return true;
    }
    return false;
  }

  /**
   * 모든 진행 중인 요청 취소
   */
  cancelAll(): void {
    const count = this.pendingRequests.size;
    this.pendingRequests.clear();
    console.log(`🚫 [Dedup] All requests cancelled (${count})`);
  }

  /**
   * 진행 중인 요청 수
   */
  get pendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * 특정 키의 요청이 진행 중인지 확인
   *
   * @param key - 확인할 요청 키
   * @returns 진행 중 여부
   */
  isPending(key: string): boolean {
    return this.pendingRequests.has(key);
  }

  /**
   * 진행 중인 모든 요청 키 목록
   */
  getPendingKeys(): string[] {
    return Array.from(this.pendingRequests.keys());
  }

  /**
   * 통계 조회 (디버깅용)
   */
  getStats(): {
    pendingCount: number;
    pendingKeys: string[];
  } {
    return {
      pendingCount: this.pendingCount,
      pendingKeys: this.getPendingKeys(),
    };
  }
}

/**
 * 전역 Request Deduplicator 인스턴스
 *
 * useAsyncData/useAsyncAction에서 사용
 */
export const globalRequestDeduplicator = new RequestDeduplicator();
