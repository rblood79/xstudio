/**
 * 테마 생성 타입 정의
 * AI 기반 테마 생성을 위한 입력/출력 타입
 */

import type { ColorValueHSL, DesignToken } from './token.types';

// ===== 테마 생성 요청 타입 =====

/**
 * 색상 팔레트 생성 요청
 */
export interface ColorPaletteRequest {
  baseColor: string | ColorValueHSL; // 기준 색상 (HEX 또는 HSL)
  style?: 'vibrant' | 'muted' | 'pastel' | 'dark' | 'light'; // 팔레트 스타일
  accessibility?: boolean; // WCAG 준수 여부
  numShades?: number; // 각 색상당 shade 개수 (기본 10)
}

/**
 * 타이포그래피 스케일 생성 요청
 */
export interface TypographyScaleRequest {
  baseSize?: number; // 기본 폰트 크기 (기본 16px)
  scale?: 'minor-second' | 'major-second' | 'minor-third' | 'major-third' | 'perfect-fourth' | 'perfect-fifth' | 'golden'; // 스케일 비율
  numSteps?: number; // 스케일 단계 수 (기본 9)
  fontFamily?: string; // 폰트 패밀리
}

/**
 * 간격 스케일 생성 요청
 */
export interface SpacingScaleRequest {
  baseUnit?: number; // 기본 단위 (기본 8px)
  scale?: 'linear' | 'geometric' | 'fibonacci'; // 스케일 타입
  numSteps?: number; // 단계 수 (기본 12)
}

/**
 * 전체 테마 생성 요청
 */
export interface ThemeGenerationRequest {
  projectId: string;
  themeName: string;
  description?: string; // 테마 설명 (예: "현대적이고 미니멀한 SaaS 제품용 테마")
  brandColor?: string | ColorValueHSL; // 브랜드 색상
  style?: 'modern' | 'classic' | 'playful' | 'professional' | 'minimal'; // 테마 스타일
  colorPalette?: ColorPaletteRequest;
  typography?: TypographyScaleRequest;
  spacing?: SpacingScaleRequest;
  includeSemanticTokens?: boolean; // Semantic 토큰 생성 여부 (기본 true)
}

// ===== 테마 생성 응답 타입 =====

/**
 * 색상 팔레트 응답
 */
export interface ColorPaletteResponse {
  primary: ColorShades;
  secondary?: ColorShades;
  surface?: ColorShades;  // tertiary → surface로 변경
  accent?: ColorShades;
  neutral: ColorShades;
  success: ColorShades;
  warning: ColorShades;
  error: ColorShades;
  info: ColorShades;
}

/**
 * 색상 shade 세트
 */
export interface ColorShades {
  50: ColorValueHSL;
  100: ColorValueHSL;
  200: ColorValueHSL;
  300: ColorValueHSL;
  400: ColorValueHSL;
  500: ColorValueHSL; // 기본 색상
  600: ColorValueHSL;
  700: ColorValueHSL;
  800: ColorValueHSL;
  900: ColorValueHSL;
}

/**
 * 타이포그래피 스케일 응답
 */
export interface TypographyScaleResponse {
  fontFamily: {
    sans: string;
    serif: string;
    mono: string;
  };
  fontSize: {
    '2xs': string;
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
    '5xl': string;
  };
  fontWeight: {
    thin: number;
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
    extrabold: number;
  };
  lineHeight: {
    tight: number;
    snug: number;
    normal: number;
    relaxed: number;
    loose: number;
  };
  letterSpacing: {
    tighter: string;
    tight: string;
    normal: string;
    wide: string;
    wider: string;
  };
}

/**
 * 간격 스케일 응답 (시맨틱 네이밍)
 */
export interface SpacingScaleResponse {
  0: string;       // "0"
  '2xs': string;   // "0.125rem" (2px)
  xs: string;      // "0.25rem" (4px) - base
  sm: string;      // "0.5rem" (8px)
  md: string;      // "0.75rem" (12px)
  lg: string;      // "1rem" (16px)
  xl: string;      // "1.5rem" (24px)
  '2xl': string;   // "2rem" (32px)
  '3xl': string;   // "2.5rem" (40px)
}

/**
 * Border radius 스케일 응답
 */
export interface RadiusScaleResponse {
  xs: string;      // "0.125rem" (2px)
  sm: string;      // "0.25rem" (4px)
  md: string;      // "0.375rem" (6px)
  lg: string;      // "0.5rem" (8px)
  xl: string;      // "0.75rem" (12px)
  '2xl': string;   // "1rem" (16px)
  '3xl': string;   // "1.5rem" (24px)
  '4xl': string;   // "2rem" (32px)
}

/**
 * Shadow 스케일 응답 (최소 5개만)
 */
export interface ShadowScaleResponse {
  boxShadow: {
    sm: string;    // "0 1px 2px 0 rgb(0 0 0 / 0.05)"
    md: string;    // "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"
  };
  insetShadow: {
    sm: string;    // "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)"
  };
  dropShadow: {
    sm: string;    // "0 1px 1px rgb(0 0 0 / 0.05)"
    md: string;    // "0 4px 3px rgb(0 0 0 / 0.07), 0 2px 2px rgb(0 0 0 / 0.06)"
  };
}

/**
 * 전체 테마 생성 응답
 */
export interface ThemeGenerationResponse {
  themeId: string;
  themeName: string;
  description?: string;
  tokens: DesignToken[];
  colorPalette: ColorPaletteResponse;
  typography: TypographyScaleResponse;
  spacing: SpacingScaleResponse;
  metadata: {
    generatedAt: string;
    aiModel: string;
    tokenCount: number;
  };
}

// ===== AI 스트리밍 타입 =====

/**
 * 테마 생성 진행 상태
 */
export type ThemeGenerationStage =
  | 'analyzing' // 요청 분석 중
  | 'colors' // 색상 팔레트 생성 중
  | 'typography' // 타이포그래피 생성 중
  | 'spacing' // 간격 생성 중
  | 'radius' // Border radius 생성 중
  | 'shadows' // Shadow 생성 중
  | 'semantic' // Semantic 토큰 생성 중
  | 'finalizing' // 마무리 중
  | 'complete'; // 완료

/**
 * 테마 생성 진행 이벤트
 */
export interface ThemeGenerationProgress {
  stage: ThemeGenerationStage;
  progress: number; // 0-100
  message: string;
  data?: Partial<ThemeGenerationResponse>;
}

/**
 * AI 토큰 네이밍 제안
 */
export interface TokenNamingSuggestion {
  original: string;
  suggested: string;
  reason: string;
  category: string;
}

// ===== 색상 조화 생성 =====

/**
 * 색상 조화 타입
 */
export type ColorHarmonyType =
  | 'complementary' // 보색
  | 'triadic' // 3색 조화
  | 'split-complementary' // 분할 보색
  | 'analogous' // 유사색
  | 'monochromatic'; // 단색

/**
 * 색상 조화 생성 요청
 */
export interface ColorHarmonyRequest {
  baseColor: string | ColorValueHSL;
  harmonyType: ColorHarmonyType;
  includeShades?: boolean; // shade 포함 여부
}

/**
 * 색상 조화 응답
 */
export interface ColorHarmonyResponse {
  harmonyType: ColorHarmonyType;
  colors: ColorValueHSL[];
  shades?: ColorShades[];
}

// ===== 타입 스케일 비율 상수 =====

export const TYPE_SCALE_RATIOS = {
  'minor-second': 1.067,
  'major-second': 1.125,
  'minor-third': 1.2,
  'major-third': 1.25,
  'perfect-fourth': 1.333,
  'perfect-fifth': 1.5,
  golden: 1.618,
} as const;

export type TypeScaleRatio = keyof typeof TYPE_SCALE_RATIOS;

// ===== AI 프롬프트 컨텍스트 =====

/**
 * 테마 생성 AI 컨텍스트
 */
export interface ThemeGenerationContext {
  projectId: string;
  existingThemes?: string[]; // 기존 테마 이름 목록
  existingTokens?: DesignToken[]; // 기존 토큰 (참고용)
  targetPlatform?: 'web' | 'mobile' | 'desktop'; // 타겟 플랫폼
  darkModeRequired?: boolean; // 다크모드 필요 여부
}

// ===== 에러 타입 =====

/**
 * 테마 생성 에러
 */
export interface ThemeGenerationError {
  stage: ThemeGenerationStage;
  message: string;
  details?: string;
  recoverable: boolean; // 재시도 가능 여부
}
