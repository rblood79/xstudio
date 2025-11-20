/**
 * Async State Store
 *
 * 비동기 작업 상태 중앙 관리
 * - 로딩 상태 (loading)
 * - 에러 상태 (errors)
 * - 진행률 (progress) - 대용량 업로드 등에 사용
 *
 * React Query의 isLoading, error 패턴 모방
 */

import { create } from 'zustand';

interface AsyncState {
  // 로딩 상태: key → boolean
  loading: Record<string, boolean>;

  // 에러 상태: key → Error | null
  errors: Record<string, Error | null>;

  // 진행률: key → 0-100
  progress: Record<string, number>;

  // Actions
  setLoading: (key: string, isLoading: boolean) => void;
  setError: (key: string, error: Error | null) => void;
  setProgress: (key: string, progress: number) => void;
  reset: (key: string) => void;
  resetAll: () => void;
}

export const useAsyncState = create<AsyncState>((set) => ({
  loading: {},
  errors: {},
  progress: {},

  /**
   * 로딩 상태 설정
   * @param key - 작업 식별 키 (예: 'load-elements', 'save-project')
   * @param isLoading - 로딩 중 여부
   */
  setLoading: (key: string, isLoading: boolean) =>
    set((state) => ({
      loading: { ...state.loading, [key]: isLoading },
    })),

  /**
   * 에러 설정
   * @param key - 작업 식별 키
   * @param error - Error 객체 또는 null
   */
  setError: (key: string, error: Error | null) =>
    set((state) => ({
      errors: { ...state.errors, [key]: error },
    })),

  /**
   * 진행률 설정 (0-100)
   * @param key - 작업 식별 키
   * @param progress - 진행률 (0-100)
   */
  setProgress: (key: string, progress: number) =>
    set((state) => ({
      progress: { ...state.progress, [key]: Math.min(100, Math.max(0, progress)) },
    })),

  /**
   * 특정 키의 상태 초기화
   * @param key - 작업 식별 키
   */
  reset: (key: string) =>
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [key]: _removed1, ...restLoading } = state.loading;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [key]: _removed2, ...restErrors } = state.errors;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [key]: _removed3, ...restProgress } = state.progress;

      return {
        loading: restLoading,
        errors: restErrors,
        progress: restProgress,
      };
    }),

  /**
   * 모든 상태 초기화
   */
  resetAll: () =>
    set({
      loading: {},
      errors: {},
      progress: {},
    }),
}));

/**
 * Helper: 특정 키의 로딩 상태 가져오기
 */
export function useIsLoading(key: string): boolean {
  return useAsyncState((state) => state.loading[key] || false);
}

/**
 * Helper: 특정 키의 에러 가져오기
 */
export function useError(key: string): Error | null {
  return useAsyncState((state) => state.errors[key] || null);
}

/**
 * Helper: 특정 키의 진행률 가져오기
 */
export function useProgress(key: string): number {
  return useAsyncState((state) => state.progress[key] || 0);
}

/**
 * Helper: 특정 키의 전체 상태 가져오기
 */
export function useAsyncStatus(key: string) {
  const isLoading = useIsLoading(key);
  const error = useError(key);
  const progress = useProgress(key);

  return {
    isLoading,
    error,
    progress,
    isError: error !== null,
    isSuccess: !isLoading && !error,
  };
}
