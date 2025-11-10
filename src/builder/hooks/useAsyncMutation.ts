import { useState, useCallback } from "react";

/**
 * useAsyncMutation - 범용 Mutation(생성/수정/삭제) 훅
 *
 * React Query의 useMutation과 유사한 패턴으로, mutation 액션에 특화된 훅입니다.
 * Loading/Error/Data 상태 자동 관리, 콜백 지원을 제공합니다.
 *
 * @example
 * ```tsx
 * // 테마 생성
 * const createThemeMutation = useAsyncMutation(
 *   async (request: ThemeRequest) => {
 *     const response = await api.createTheme(request);
 *     return response;
 *   },
 *   {
 *     onSuccess: (data) => {
 *       console.log('테마 생성 완료:', data);
 *     },
 *     onError: (error) => {
 *       console.error('테마 생성 실패:', error);
 *     }
 *   }
 * );
 *
 * // 사용
 * <Button onPress={() => createThemeMutation.execute(request)}>
 *   {createThemeMutation.isLoading ? 'Loading...' : 'Create Theme'}
 * </Button>
 * ```
 */

export interface UseAsyncMutationOptions<TData, TVariables> {
  /**
   * 성공 시 콜백
   */
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;

  /**
   * 에러 발생 시 콜백
   */
  onError?: (error: Error, variables: TVariables) => void | Promise<void>;

  /**
   * Mutation 완료 시 콜백 (성공/실패 관계없이)
   */
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void | Promise<void>;
}

export interface UseAsyncMutationResult<TData, TVariables> {
  /**
   * Mutation 결과 데이터
   */
  data: TData | null;

  /**
   * 실행 중 여부
   */
  isLoading: boolean;

  /**
   * 성공 여부
   */
  isSuccess: boolean;

  /**
   * 에러 여부
   */
  isError: boolean;

  /**
   * 에러 객체 (없으면 null)
   */
  error: Error | null;

  /**
   * Mutation을 실행합니다
   */
  execute: (variables: TVariables) => Promise<TData>;

  /**
   * 상태를 재설정합니다 (초기 상태로)
   */
  reset: () => void;
}

/**
 * useAsyncMutation - 범용 Mutation 훅
 *
 * @param mutationFn - Mutation을 수행하는 비동기 함수
 * @param options - Mutation 옵션 (콜백 등)
 * @returns UseAsyncMutationResult
 */
export function useAsyncMutation<TData = unknown, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseAsyncMutationOptions<TData, TVariables> = {}
): UseAsyncMutationResult<TData, TVariables> {
  const { onSuccess, onError, onSettled } = options;

  const [data, setData] = useState<TData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await mutationFn(variables);
        setData(result);

        console.log(`✅ useAsyncMutation 성공`);

        // onSuccess 콜백 실행
        if (onSuccess) {
          await onSuccess(result, variables);
        }

        // onSettled 콜백 실행
        if (onSettled) {
          await onSettled(result, null, variables);
        }

        return result;
      } catch (err) {
        const errorObj = err as Error;
        setError(errorObj);

        console.error(`❌ useAsyncMutation 실패:`, errorObj);

        // onError 콜백 실행
        if (onError) {
          await onError(errorObj, variables);
        }

        // onSettled 콜백 실행
        if (onSettled) {
          await onSettled(undefined, errorObj, variables);
        }

        throw errorObj;
      } finally {
        setIsLoading(false);
      }
    },
    [mutationFn, onSuccess, onError, onSettled]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    data,
    isLoading,
    isSuccess: data !== null && error === null,
    isError: error !== null,
    error,
    execute,
    reset,
  };
}

/**
 * useAsyncMutation의 반환 타입
 */
export type UseAsyncMutationResultType<TData, TVariables> = ReturnType<
  typeof useAsyncMutation<TData, TVariables>
>;
