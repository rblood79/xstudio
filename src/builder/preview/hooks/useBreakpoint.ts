/**
 * useBreakpoint Hook
 *
 * 현재 뷰포트 Breakpoint를 감지하고 반응형 값을 관리하는 훅.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BreakpointName,
  BREAKPOINTS,
  BREAKPOINT_ORDER,
  ResponsiveValue,
  getResponsiveValueWithCascade,
} from "../../../types/builder/responsive.types";

interface UseBreakpointOptions {
  /** 강제 Breakpoint (테스트용) */
  forcedBreakpoint?: BreakpointName | null;
  /** 디바운스 딜레이 (ms) */
  debounceDelay?: number;
}

interface UseBreakpointReturn {
  /** 현재 활성 Breakpoint */
  currentBreakpoint: BreakpointName;
  /** 현재 뷰포트 너비 */
  viewportWidth: number;
  /** 강제 Breakpoint 설정 */
  forcedBreakpoint: BreakpointName | null;
  /** 강제 Breakpoint 설정 함수 */
  setForcedBreakpoint: (breakpoint: BreakpointName | null) => void;
  /** Breakpoint 활성 상태 확인 */
  isBreakpointActive: (breakpoint: BreakpointName) => boolean;
  /** Responsive 값에서 현재 Breakpoint 값 가져오기 */
  getResponsiveValue: <T>(value: ResponsiveValue<T> | undefined, defaultValue: T) => T;
  /** 모든 Breakpoint 설정 */
  breakpoints: typeof BREAKPOINTS;
  /** Breakpoint 순서 */
  breakpointOrder: typeof BREAKPOINT_ORDER;
}

/**
 * 뷰포트 너비에서 Breakpoint 이름 계산
 */
function getBreakpointFromWidth(width: number): BreakpointName {
  if (width >= BREAKPOINTS.desktop.minWidth) {
    return "desktop";
  }
  if (width >= BREAKPOINTS.tablet.minWidth) {
    return "tablet";
  }
  return "mobile";
}

/**
 * useBreakpoint Hook
 */
export function useBreakpoint(options: UseBreakpointOptions = {}): UseBreakpointReturn {
  const { forcedBreakpoint: initialForcedBreakpoint = null, debounceDelay = 100 } = options;

  // 뷰포트 너비 상태
  const [viewportWidth, setViewportWidth] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth;
    }
    return 1280; // SSR 기본값
  });

  // 강제 Breakpoint 상태
  const [forcedBreakpoint, setForcedBreakpoint] = useState<BreakpointName | null>(
    initialForcedBreakpoint
  );

  // 뷰포트 리사이즈 감지
  useEffect(() => {
    if (typeof window === "undefined") return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setViewportWidth(window.innerWidth);
      }, debounceDelay);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, [debounceDelay]);

  // 현재 Breakpoint 계산 (강제 Breakpoint 우선)
  const currentBreakpoint = useMemo(() => {
    if (forcedBreakpoint) {
      return forcedBreakpoint;
    }
    return getBreakpointFromWidth(viewportWidth);
  }, [forcedBreakpoint, viewportWidth]);

  // Breakpoint 활성 상태 확인
  const isBreakpointActive = useCallback(
    (breakpoint: BreakpointName): boolean => {
      return currentBreakpoint === breakpoint;
    },
    [currentBreakpoint]
  );

  // Responsive 값에서 현재 Breakpoint 값 가져오기
  const getResponsiveValue = useCallback(
    <T>(value: ResponsiveValue<T> | undefined, defaultValue: T): T => {
      return getResponsiveValueWithCascade(value, currentBreakpoint, defaultValue);
    },
    [currentBreakpoint]
  );

  return {
    currentBreakpoint,
    viewportWidth,
    forcedBreakpoint,
    setForcedBreakpoint,
    isBreakpointActive,
    getResponsiveValue,
    breakpoints: BREAKPOINTS,
    breakpointOrder: BREAKPOINT_ORDER,
  };
}

export default useBreakpoint;
