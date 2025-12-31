import { useAsyncList } from "react-stately";
// useCallback removed - not needed after reset function removal
import type { AsyncListLoadOptions } from "../../types/builder/stately.types";

/**
 * useAsyncQuery - 범용 API 데이터 로딩 훅
 *
 * React Stately의 useAsyncList를 사용하여 모든 종류의 API 호출을 처리합니다.
 * Loading/Error 상태 자동 관리, AbortController cleanup, 재시도 기능을 제공합니다.
 *
 * @example
 * ```tsx
 * // 단일 객체 로딩
 * const projectQuery = useAsyncQuery(
 *   async ({ signal }) => {
 *     const response = await fetch(`/api/projects/${projectId}`, { signal });
 *     return response.json();
 *   },
 *   { enabled: !!projectId }
 * );
 *
 * // 배열 데이터 로딩
 * const elementsQuery = useAsyncQuery(
 *   async ({ signal }) => {
 *     const response = await fetch(`/api/elements?page=${pageId}`, { signal });
 *     return response.json();
 *   }
 * );
 * ```
 */

export interface UseAsyncQueryOptions<T> {
  /**
   * 쿼리 활성화 여부 (기본값: true)
   * false일 경우 자동으로 데이터를 로드하지 않음
   */
  enabled?: boolean;

  /**
   * 초기 데이터 (로딩 전 표시할 데이터)
   */
  initialData?: T[];

  /**
   * 에러 발생 시 재시도 횟수 (기본값: 0)
   */
  retryCount?: number;

  /**
   * 재시도 간격 (ms, 기본값: 1000)
   */
  retryDelay?: number;
}

export interface UseAsyncQueryResult<T> {
  /**
   * 로딩된 데이터 배열
   */
  data: T[];

  /**
   * 로딩 중 여부
   */
  isLoading: boolean;

  /**
   * 에러 객체 (없으면 null)
   */
  error: Error | null;

  /**
   * 데이터를 다시 로드합니다
   */
  reload: () => void;

  /**
   * 로딩 상태를 재설정합니다 (초기 상태로)
   * NOTE: AsyncListData에 setLoadingState가 없어서 제거됨
   */
  // reset: () => void; // Removed - not available
}

/**
 * useAsyncQuery - 범용 API 데이터 로딩 훅
 *
 * @param queryFn - 데이터를 로드하는 비동기 함수
 * @param options - 쿼리 옵션
 * @returns UseAsyncQueryResult
 */
export function useAsyncQuery<T extends { id?: string | number }>(
  queryFn: (options: AsyncListLoadOptions) => Promise<T | T[]>,
  options: UseAsyncQueryOptions<T> = {}
): UseAsyncQueryResult<T> {
  const {
    enabled = true,
    initialData = [],
    retryCount = 0,
    retryDelay = 1000,
  } = options;

  const list = useAsyncList<T>({
    initialSelectedKeys: [],
    async load({ signal }: AsyncListLoadOptions) {
      // enabled가 false면 초기 데이터 반환
      if (!enabled) {
        return { items: initialData };
      }

      let lastError: Error | null = null;
      let attempts = 0;

      // 재시도 로직
      while (attempts <= retryCount) {
        try {
          const result = await queryFn({ signal });

          // 단일 객체를 배열로 변환
          const items = Array.isArray(result) ? result : [result];

          console.log(`✅ useAsyncQuery 데이터 로드 성공:`, items.length, "items");
          return { items };
        } catch (error) {
          lastError = error as Error;

          // AbortError는 재시도하지 않고 즉시 반환
          if (lastError.name === "AbortError") {
            console.log("🚫 useAsyncQuery 요청이 취소되었습니다");
            return { items: initialData };
          }

          attempts++;

          // 마지막 시도가 아니면 재시도 대기
          if (attempts <= retryCount) {
            console.warn(
              `⚠️ useAsyncQuery 로드 실패 (${attempts}/${retryCount + 1}), ${retryDelay}ms 후 재시도...`
            );
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
        }
      }

      // 모든 재시도 실패
      console.error(`❌ useAsyncQuery 로드 실패 (${attempts}번 시도):`, lastError);
      throw lastError;
    },
    getKey: (item) => String(item.id || Math.random()),
  });

  // reset 함수: AsyncListData에는 setLoadingState가 없어서 제거됨
  // const reset = useCallback(() => {
  //   list.setLoadingState("idle");
  // }, [list]);

  return {
    data: list.items,
    isLoading: list.isLoading,
    error: list.error || null,
    reload: list.reload,
    // reset 제거: AsyncListData에 setLoadingState 없음
  };
}

/**
 * useAsyncQuery의 반환 타입
 * NOTE: Use UseAsyncQueryResult<T> directly instead
 */
export type UseAsyncQueryResultType<T extends { id?: string | number }> = ReturnType<typeof useAsyncQuery<T>>;
