/**
 * BreakpointProvider
 *
 * Breakpoint Context를 제공하는 Provider 컴포넌트.
 * Preview 내에서 반응형 값을 관리하는 데 사용.
 */

import React, { createContext, useContext, useMemo } from "react";
import { useBreakpoint } from "../hooks/useBreakpoint";
import type {
  BreakpointName,
  BreakpointContext as BreakpointContextType,
  ResponsiveValue,
} from "../../../types/builder/responsive.types";
import { BREAKPOINTS } from "../../../types/builder/responsive.types";

// Context 생성
const BreakpointContext = createContext<BreakpointContextType | null>(null);

interface BreakpointProviderProps {
  children: React.ReactNode;
  /** 초기 강제 Breakpoint (테스트용) */
  initialForcedBreakpoint?: BreakpointName | null;
}

/**
 * BreakpointProvider Component
 */
export function BreakpointProvider({
  children,
  initialForcedBreakpoint = null,
}: BreakpointProviderProps) {
  const {
    currentBreakpoint,
    viewportWidth,
    forcedBreakpoint,
    setForcedBreakpoint,
    isBreakpointActive,
    getResponsiveValue,
  } = useBreakpoint({ forcedBreakpoint: initialForcedBreakpoint });

  // Context 값 메모이제이션
  const contextValue = useMemo<BreakpointContextType>(
    () => ({
      // State
      currentBreakpoint,
      forcedBreakpoint,
      viewportWidth,
      breakpoints: BREAKPOINTS,
      // Actions
      setForcedBreakpoint,
      isBreakpointActive,
      getResponsiveValue: <T,>(value: ResponsiveValue<T> | undefined, defaultValue: T): T =>
        getResponsiveValue(value, defaultValue),
    }),
    [
      currentBreakpoint,
      forcedBreakpoint,
      viewportWidth,
      setForcedBreakpoint,
      isBreakpointActive,
      getResponsiveValue,
    ]
  );

  return (
    <BreakpointContext.Provider value={contextValue}>
      {children}
    </BreakpointContext.Provider>
  );
}

/**
 * useBreakpointContext Hook
 * BreakpointProvider 내에서 Breakpoint 정보에 접근하는 훅
 */
export function useBreakpointContext(): BreakpointContextType {
  const context = useContext(BreakpointContext);

  if (!context) {
    throw new Error("useBreakpointContext must be used within a BreakpointProvider");
  }

  return context;
}

/**
 * withBreakpoint HOC
 * 클래스 컴포넌트에서 Breakpoint 정보에 접근할 때 사용
 */
export function withBreakpoint<P extends object>(
  WrappedComponent: React.ComponentType<P & { breakpoint: BreakpointContextType }>
) {
  return function WithBreakpointComponent(props: P) {
    const breakpoint = useBreakpointContext();
    return <WrappedComponent {...props} breakpoint={breakpoint} />;
  };
}

export default BreakpointProvider;
