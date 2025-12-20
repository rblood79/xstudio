/**
 * useFrameCallback - 프레임 동기화 기반 콜백 훅
 *
 * setTimeout 기반 디바운스 대신 requestAnimationFrame/requestIdleCallback 사용
 * - RAF: 렌더링 사이클에 동기화 (드래그, 슬라이더)
 * - Idle: 유휴 시간에 실행 (타이핑, 무거운 연산)
 *
 * @example
 * const { rafCallback, idleCallback } = useFrameCallback(updateStyle);
 *
 * // 드래그 중에는 RAF 사용
 * <Slider onChange={rafCallback} />
 *
 * // 타이핑 중에는 Idle 사용
 * <Input onChange={idleCallback} />
 *
 * @since 2025-12-20 Phase 1 - Quick Wins
 */

import { useRef, useCallback, useEffect, useMemo } from 'react';

// ============================================
// Types
// ============================================

type AnyFunction = (...args: unknown[]) => void;

interface UseFrameCallbackResult<T extends AnyFunction> {
  /** requestAnimationFrame 기반 스로틀 콜백 */
  rafCallback: T;
  /** requestIdleCallback 기반 지연 콜백 */
  idleCallback: T;
  /** 즉시 실행 (blur, enter 등) */
  immediateCallback: T;
  /** 보류 중인 콜백 취소 */
  cancel: () => void;
}

// ============================================
// requestIdleCallback Polyfill
// ============================================

const requestIdleCallbackPolyfill =
  typeof requestIdleCallback !== 'undefined'
    ? requestIdleCallback
    : (cb: IdleRequestCallback, options?: IdleRequestOptions): number => {
        const start = Date.now();
        return window.setTimeout(() => {
          cb({
            didTimeout: false,
            timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
          });
        }, options?.timeout ?? 1) as unknown as number;
      };

const cancelIdleCallbackPolyfill =
  typeof cancelIdleCallback !== 'undefined'
    ? cancelIdleCallback
    : (id: number): void => {
        clearTimeout(id);
      };

// ============================================
// useFrameCallback Hook
// ============================================

/**
 * 프레임 동기화 기반 콜백 훅
 *
 * @param callback - 실행할 콜백 함수
 * @param idleTimeout - idle callback 최대 대기 시간 (ms), 기본 100ms
 */
export function useFrameCallback<T extends AnyFunction>(
  callback: T,
  idleTimeout: number = 100
): UseFrameCallbackResult<T> {
  const rafIdRef = useRef<number | null>(null);
  const idleIdRef = useRef<number | null>(null);
  const lastArgsRef = useRef<Parameters<T> | null>(null);
  const callbackRef = useRef(callback);

  // 콜백 레퍼런스 업데이트 (리렌더링 시에도 최신 콜백 사용)
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // 정리
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (idleIdRef.current !== null) {
        cancelIdleCallbackPolyfill(idleIdRef.current);
      }
    };
  }, []);

  /**
   * 보류 중인 콜백 취소
   */
  const cancel = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (idleIdRef.current !== null) {
      cancelIdleCallbackPolyfill(idleIdRef.current);
      idleIdRef.current = null;
    }
    lastArgsRef.current = null;
  }, []);

  /**
   * requestAnimationFrame 기반 스로틀
   * - 프레임당 1회만 실행
   * - 드래그, 슬라이더 등 연속 입력에 적합
   */
  const rafCallback = useMemo<T>(() => {
    const fn = (...args: Parameters<T>) => {
      lastArgsRef.current = args;

      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          if (lastArgsRef.current) {
            callbackRef.current(...lastArgsRef.current);
          }
          rafIdRef.current = null;
        });
      }
    };
    return fn as T;
  }, []);

  /**
   * requestIdleCallback 기반 지연 실행
   * - 메인 스레드 유휴 시 실행
   * - 타이핑 등 빈번한 입력에 적합
   */
  const idleCallback = useMemo<T>(() => {
    const fn = (...args: Parameters<T>) => {
      lastArgsRef.current = args;

      // 기존 예약 취소
      if (idleIdRef.current !== null) {
        cancelIdleCallbackPolyfill(idleIdRef.current);
      }

      idleIdRef.current = requestIdleCallbackPolyfill(
        () => {
          if (lastArgsRef.current) {
            callbackRef.current(...lastArgsRef.current);
          }
          idleIdRef.current = null;
        },
        { timeout: idleTimeout }
      );
    };
    return fn as T;
  }, [idleTimeout]);

  /**
   * 즉시 실행
   * - blur, enter 등 즉각적인 응답이 필요한 경우
   */
  const immediateCallback = useMemo<T>(() => {
    const fn = (...args: Parameters<T>) => {
      // 보류 중인 콜백 취소
      cancel();
      // 즉시 실행
      callbackRef.current(...args);
    };
    return fn as T;
  }, [cancel]);

  return {
    rafCallback,
    idleCallback,
    immediateCallback,
    cancel,
  };
}

// ============================================
// Specialized Hooks
// ============================================

/**
 * 스타일 업데이트에 최적화된 프레임 콜백
 */
export function useStyleUpdateCallback(
  updateFn: (property: string, value: string) => void
) {
  return useFrameCallback(updateFn, 100);
}

/**
 * 단일 값에 대한 프레임 콜백 (타입 안전)
 */
export function useValueCallback<T>(
  callback: (value: T) => void,
  idleTimeout: number = 100
) {
  return useFrameCallback(callback, idleTimeout);
}
