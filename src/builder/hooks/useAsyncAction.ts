/**
 * useAsyncAction Hook
 *
 * React Query의 useMutation 스타일 훅
 * - 비동기 작업 실행
 * - 자동 재시도 (Exponential backoff)
 * - 로딩/에러 상태 자동 관리
 * - onSuccess/onError 콜백
 *
 * @example
 * const { execute, isLoading, error } = useAsyncAction({
 *   actionKey: 'save-element',
 *   action: async (element) => saveElement(element),
 *   onSuccess: (data) => console.log('Saved:', data),
 *   retry: 3,
 * });
 */

import { useCallback } from 'react';
import { useAsyncState } from '../stores/asyncState';

interface UseAsyncActionOptions<TData, TVariables> {
  /** 작업 식별 키 (asyncState에서 사용) */
  actionKey: string;

  /** 실행할 비동기 함수 */
  action: (variables: TVariables) => Promise<TData>;

  /** 성공 시 콜백 */
  onSuccess?: (data: TData) => void;

  /** 에러 시 콜백 */
  onError?: (error: Error) => void;

  /** 재시도 횟수 (기본: 3회) */
  retry?: number;

  /** 재시도 딜레이 (ms, 기본: 1000) */
  retryDelay?: number;

  /** 4xx 에러는 재시도하지 않음 (기본: true) */
  skipRetryOn4xx?: boolean;
}

interface UseAsyncActionResult<TData, TVariables> {
  /** 작업 실행 함수 */
  execute: (variables: TVariables) => Promise<TData | null>;

  /** 로딩 중 여부 */
  isLoading: boolean;

  /** 에러 객체 */
  error: Error | null;

  /** 에러 발생 여부 */
  isError: boolean;

  /** 상태 초기화 */
  reset: () => void;
}

export function useAsyncAction<TData, TVariables = void>({
  actionKey,
  action,
  onSuccess,
  onError,
  retry = 3,
  retryDelay = 1000,
  skipRetryOn4xx = true,
}: UseAsyncActionOptions<TData, TVariables>): UseAsyncActionResult<TData, TVariables> {
  const setLoading = useAsyncState((state) => state.setLoading);
  const setError = useAsyncState((state) => state.setError);
  const resetState = useAsyncState((state) => state.reset);

  const isLoading = useAsyncState((state) => state.loading[actionKey] || false);
  const error = useAsyncState((state) => state.errors[actionKey] || null);

  /**
   * 에러가 4xx 클라이언트 에러인지 확인
   */
  const is4xxError = (error: Error): boolean => {
    if ('status' in error && typeof (error as any).status === 'number') {
      const status = (error as any).status;
      return status >= 400 && status < 500;
    }
    return false;
  };

  /**
   * 작업 실행
   */
  const execute = useCallback(
    async (variables: TVariables): Promise<TData | null> => {
      setLoading(actionKey, true);
      setError(actionKey, null);

      // Retry 로직
      for (let attempt = 0; attempt <= retry; attempt++) {
        try {
          // 작업 실행
          const result = await action(variables);

          // 성공
          setLoading(actionKey, false);
          setError(actionKey, null);

          if (onSuccess) {
            onSuccess(result);
          }

          return result;
        } catch (err) {
          const error = err as Error;

          // 4xx 에러는 재시도하지 않음
          if (skipRetryOn4xx && is4xxError(error)) {
            console.warn(`[useAsyncAction] ${actionKey}: 4xx error, skipping retry`, error);
            setLoading(actionKey, false);
            setError(actionKey, error);

            if (onError) {
              onError(error);
            }

            return null;
          }

          // 마지막 시도 실패
          if (attempt === retry) {
            console.error(`[useAsyncAction] ${actionKey}: Max retries reached (${retry})`, error);
            setLoading(actionKey, false);
            setError(actionKey, error);

            if (onError) {
              onError(error);
            }

            return null;
          }

          // 재시도 대기 (Exponential backoff)
          const delay = retryDelay * Math.pow(2, attempt);
          console.warn(
            `[useAsyncAction] ${actionKey}: Retry ${attempt + 1}/${retry} after ${delay}ms`,
            error
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      // 이 코드에는 도달하지 않음 (TypeScript 타입 체크용)
      return null;
    },
    // setError and setLoading are stable functions from useState
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actionKey, action, onSuccess, onError, retry, retryDelay, skipRetryOn4xx]
  );

  /**
   * 상태 초기화
   */
  const reset = useCallback(() => {
    resetState(actionKey);
  }, [actionKey, resetState]);

  return {
    execute,
    isLoading,
    error,
    isError: error !== null,
    reset,
  };
}
