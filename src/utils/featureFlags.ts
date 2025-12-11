/**
 * Feature Flags
 *
 * 🚀 Phase 10: Feature Flag 시스템
 *
 * 기능:
 * - 환경변수 기반 Feature Flag 관리
 * - 타입 안전한 Flag 접근
 * - 기본값 지원
 *
 * @since 2025-12-11 Phase 10 B0.2
 */

// ============================================
// Types
// ============================================

export interface FeatureFlags {
  /** WebGL Canvas 사용 여부 (Phase 10) */
  useWebGLCanvas: boolean;
  /** 디버그 로그 활성화 */
  enableDebugLogs: boolean;
}

// ============================================
// Feature Flag Getters
// ============================================

/**
 * 환경변수를 boolean으로 파싱
 *
 * @param value - 환경변수 값
 * @param defaultValue - 기본값
 * @returns boolean
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * WebGL Canvas 사용 여부
 *
 * @returns true if WebGL Canvas should be used
 *
 * @example
 * ```typescript
 * if (useWebGLCanvas()) {
 *   return <WebGLCanvas />;
 * } else {
 *   return <IframeCanvas />;
 * }
 * ```
 */
export function useWebGLCanvas(): boolean {
  return parseBoolean(import.meta.env.VITE_USE_WEBGL_CANVAS, false);
}

/**
 * 디버그 로그 활성화 여부
 *
 * @returns true if debug logs should be enabled
 */
export function enableDebugLogs(): boolean {
  return parseBoolean(import.meta.env.VITE_ENABLE_DEBUG_LOGS, false);
}

/**
 * 모든 Feature Flags 조회
 *
 * @returns 현재 Feature Flags 상태
 *
 * @example
 * ```typescript
 * const flags = getFeatureFlags();
 * console.log('Feature Flags:', flags);
 * // { useWebGLCanvas: false, enableDebugLogs: true }
 * ```
 */
export function getFeatureFlags(): FeatureFlags {
  return {
    useWebGLCanvas: parseBoolean(import.meta.env.VITE_USE_WEBGL_CANVAS, false),
    enableDebugLogs: parseBoolean(import.meta.env.VITE_ENABLE_DEBUG_LOGS, false),
  };
}

/**
 * 개발 환경에서 Feature Flags 로그 출력
 */
export function logFeatureFlags(): void {
  if (import.meta.env.DEV) {
    const flags = getFeatureFlags();
    console.log('🚩 Feature Flags:', flags);
  }
}

// 개발 환경에서 자동 로그
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // 페이지 로드 시 1회만 출력
  if (!window.__featureFlagsLogged) {
    window.__featureFlagsLogged = true;
    setTimeout(() => logFeatureFlags(), 100);
  }
}

// ============================================
// Window augmentation (for dev logging)
// ============================================

declare global {
  interface Window {
    __featureFlagsLogged?: boolean;
  }
}
