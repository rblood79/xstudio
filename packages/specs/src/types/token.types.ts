/**
 * Token Types
 *
 * 토큰 참조 타입 및 토큰 카테고리 정의
 * Component Spec에서 사용하는 디자인 토큰 시스템
 *
 * @packageDocumentation
 */

/**
 * 토큰 참조 문자열
 * 예: '{color.primary}', '{spacing.md}', '{radius.lg}'
 */
export type TokenRef = `{${string}}`;

/**
 * 타입 안전한 토큰 참조 (권장)
 * 컴파일 타임에 유효한 토큰만 허용
 */
export type ColorTokenRef = `{color.${keyof ColorTokens}}`;
export type SpacingTokenRef = `{spacing.${keyof SpacingTokens}}`;
export type TypographyTokenRef = `{typography.${keyof TypographyTokens}}`;
export type RadiusTokenRef = `{radius.${keyof RadiusTokens}}`;
export type ShadowTokenRef = `{shadow.${keyof ShadowTokens}}`;

/**
 * 모든 유효한 토큰 참조 유니온
 */
export type StrictTokenRef =
  | ColorTokenRef
  | SpacingTokenRef
  | TypographyTokenRef
  | RadiusTokenRef
  | ShadowTokenRef;

/**
 * 토큰 참조 유효성 검사 유틸리티
 */
export function isValidTokenRef(ref: string): ref is TokenRef {
  const pattern = /^\{(color|spacing|typography|radius|shadow)\.[a-zA-Z0-9-]+\}$/;
  return pattern.test(ref);
}

/**
 * 토큰 카테고리
 */
export interface TokenCategories {
  color: ColorTokens;
  spacing: SpacingTokens;
  typography: TypographyTokens;
  radius: RadiusTokens;
  shadow: ShadowTokens;
}

/**
 * 색상 토큰
 */
export interface ColorTokens {
  // Primary
  primary: string;
  'primary-hover': string;
  'primary-pressed': string;
  'on-primary': string;

  // Secondary
  secondary: string;
  'secondary-hover': string;
  'secondary-pressed': string;
  'on-secondary': string;

  // Tertiary
  tertiary: string;
  'tertiary-hover': string;
  'tertiary-pressed': string;
  'on-tertiary': string;

  // Error
  error: string;
  'error-hover': string;
  'error-pressed': string;
  'on-error': string;

  // Surface
  surface: string;
  'surface-container': string;
  'surface-container-high': string;
  'surface-container-highest': string;
  'on-surface': string;

  // Outline
  outline: string;
  'outline-variant': string;
}

/**
 * 간격 토큰
 */
export interface SpacingTokens {
  xs: number;    // 4
  sm: number;    // 8
  md: number;    // 16
  lg: number;    // 24
  xl: number;    // 32
  '2xl': number; // 48
}

/**
 * 타이포그래피 토큰
 */
export interface TypographyTokens {
  'text-xs': number;   // 12
  'text-sm': number;   // 14
  'text-md': number;   // 16
  'text-lg': number;   // 18
  'text-xl': number;   // 20
  'text-2xl': number;  // 24
}

/**
 * 둥근 모서리 토큰
 */
export interface RadiusTokens {
  none: number;  // 0
  sm: number;    // 4
  md: number;    // 8
  lg: number;    // 12
  xl: number;    // 16
  full: number;  // 9999
}

/**
 * 그림자 토큰
 */
export interface ShadowTokens {
  /** 그림자 없음 */
  none: string;

  /** 작은 그림자 (elevation 1) */
  sm: string;

  /** 중간 그림자 (elevation 2) */
  md: string;

  /** 큰 그림자 (elevation 3) */
  lg: string;

  /** 매우 큰 그림자 (elevation 4) */
  xl: string;

  /** 내부 그림자 (inset) */
  inset: string;

  /** 포커스 링 */
  'focus-ring': string;
}
