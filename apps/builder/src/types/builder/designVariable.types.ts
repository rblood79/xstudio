/**
 * G.2 Design Variable Reference Types
 *
 * $-- 접두사 변수 참조 해석 관련 타입.
 * DesignVariable 자체는 theme/index.ts에 정의.
 *
 * @see docs/WASM_DOC_IMPACT_ANALYSIS.md §G.2
 */

/** 변수 해석 결과 */
export interface ResolvedVariable {
  /** 해석된 최종 값 */
  value: string | number;
  /** 원본 참조 문자열 (e.g., '$--primary') */
  ref: string;
  /** 값의 출처 */
  source: 'theme-specific' | 'default' | 'token-alias' | 'fallback';
  /** 적용된 테마 ID (null이면 기본값) */
  themeId: string | null;
}

/** 변수 해석 컨텍스트 */
export interface VariableResolveContext {
  /** 현재 활성 테마 ID */
  activeThemeId: string | null;
  /** 해석 실패 시 폴백 값 */
  fallback?: string | number;
}

/** 변수 사용처 정보 (UI 표시용) */
export interface VariableUsageInfo {
  variableName: string;
  usedByElements: string[];
  usedInProps: string[];
}
