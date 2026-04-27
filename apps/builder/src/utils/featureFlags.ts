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

export type RenderMode = "skia";

export interface FeatureFlags {
  /** 디버그 로그 활성화 */
  enableDebugLogs: boolean;
  /** 캔버스 비교 모드 (iframe + PixiJS 동시 표시) */
  canvasCompareMode: boolean;
  /** WASM SpatialIndex 활성화 (Phase 1) */
  wasmSpatialIndex: boolean;
  /** WASM Layout Engine 활성화 (Phase 2) */
  wasmLayoutEngine: boolean;
  /** 렌더 모드 (skia 고정) */
  renderMode: RenderMode;
  /** React Query Devtools 활성화 */
  enableReactQueryDevtools: boolean;
  /** FramesTab canonical-native 모드 (ADR-911 P2) */
  framesTabCanonical: boolean;
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
function parseBoolean(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (value === undefined || value === "") {
    return defaultValue;
  }
  return value.toLowerCase() === "true" || value === "1";
}

/**
 * WebGL Canvas 사용 여부
 *
 * @returns true if WebGL Canvas should be used
 *
 * @example
 * ```typescript
 * if (isWebGLCanvas()) {
 *   return <WebGLCanvas />;
 * } else {
 *   return <IframeCanvas />;
 * }
 * ```
 */
export function isWebGLCanvas(): boolean {
  return parseBoolean(import.meta.env.VITE_USE_WEBGL_CANVAS, true);
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
 * 캔버스 비교 모드 활성화 여부
 *
 * iframe과 PixiJS 캔버스를 동시에 표시하여 교차검증
 *
 * @returns true if compare mode should be enabled
 *
 * @example
 * ```typescript
 * if (isCanvasCompareMode()) {
 *   return <SplitView left={<IframeCanvas />} right={<WebGLCanvas />} />;
 * }
 * ```
 */
export function isCanvasCompareMode(): boolean {
  return parseBoolean(import.meta.env.VITE_CANVAS_COMPARE_MODE, false);
}

// ============================================
// WASM Feature Flags (Phase 0+)
// ============================================

/**
 * WASM SpatialIndex 활성화 여부 (Phase 1)
 *
 * O(n) 뷰포트 컬링/라쏘 선택을 공간 인덱스 쿼리로 대체
 */
export function isWasmSpatialIndex(): boolean {
  return true;
}

/**
 * WASM Layout Engine 활성화 여부 (Phase 2)
 *
 * 레이아웃 배치 계산을 WASM으로 가속
 */
export function isWasmLayoutEngine(): boolean {
  return true;
}

/**
 * 렌더 모드 조회 (skia 고정)
 */
export function getRenderMode(): RenderMode {
  return "skia";
}

/**
 * CanvasKit 렌더러 활성화 여부 (항상 true)
 */
export function isCanvasKitEnabled(): boolean {
  return true;
}

/**
 * React Query Devtools 활성화 여부
 *
 * @returns true if React Query Devtools should be displayed
 *
 * @example
 * ```typescript
 * if (isReactQueryDevtoolsEnabled()) {
 *   return <ReactQueryDevtools />;
 * }
 * ```
 */
export function isReactQueryDevtoolsEnabled(): boolean {
  return parseBoolean(import.meta.env.VITE_ENABLE_REACT_QUERY_DEVTOOLS, false);
}

/**
 * FramesTab canonical-native 모드 활성화 여부 (ADR-911 P2).
 *
 * `true` 일 때 FramesTab 의 frame 목록 read 가 `selectCanonicalDocument` 기반
 * canonical projection 으로 동작. `false` 일 때 legacy `useLayoutsStore.layouts[]`
 * direct read 유지 (PR-A baseline 보호).
 *
 * 기본값 `false` — PR-B (FramesTab read path 전환) 진입 시 dual-mode 운영 후
 * 1주 issue 0 확인 시 true 로 전환 (P2-d).
 *
 * @returns true if FramesTab canonical-native read 활성화
 */
export function isFramesTabCanonical(): boolean {
  return parseBoolean(import.meta.env.VITE_FRAMES_TAB_CANONICAL, false);
}

/**
 * 모든 Feature Flags 조회
 *
 * @returns 현재 Feature Flags 상태
 *
 */
export function getFeatureFlags(): FeatureFlags {
  return {
    enableDebugLogs: parseBoolean(
      import.meta.env.VITE_ENABLE_DEBUG_LOGS,
      false,
    ),
    canvasCompareMode: parseBoolean(
      import.meta.env.VITE_CANVAS_COMPARE_MODE,
      false,
    ),
    wasmSpatialIndex: true,
    wasmLayoutEngine: true,
    renderMode: "skia" as RenderMode,
    enableReactQueryDevtools: parseBoolean(
      import.meta.env.VITE_ENABLE_REACT_QUERY_DEVTOOLS,
      false,
    ),
    framesTabCanonical: parseBoolean(
      import.meta.env.VITE_FRAMES_TAB_CANONICAL,
      false,
    ),
  };
}

/**
 * 개발 환경에서 Feature Flags 로그 출력
 */
export function logFeatureFlags(): void {
  // no-op: flags available via getFeatureFlags()
}

// 개발 환경에서 자동 로그
if (import.meta.env.DEV && typeof window !== "undefined") {
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
