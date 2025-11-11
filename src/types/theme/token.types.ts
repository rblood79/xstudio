/**
 * @deprecated This file is deprecated. Use types/theme/index.ts instead.
 * This file will be removed in v2.0
 *
 * Token Type Definitions
 * 기존 DB 스키마 100% 호환
 */

import { z } from 'zod';

// ===== 기존 DesignToken 인터페이스 (DB 스키마 호환) =====
export interface DesignToken {
  id: string;
  project_id: string;
  theme_id: string;
  name: string;  // "color.brand.primary" (점으로 구분된 계층 구조)
  type: string;  // "color", "typography", "spacing", "shadow", "border", "radius", "motion"
  value: unknown;    // JSONB (유연한 타입)
  scope: 'raw' | 'semantic';
  alias_of?: string | null;
  css_variable?: string;
  created_at: string;
  updated_at: string;
}

// ===== 파싱된 토큰 정보 (클라이언트 사이드) =====
export interface ParsedTokenName {
  category: string;      // "color"
  group?: string;        // "brand"
  tokenName?: string;    // "primary"
  fullName: string;      // "color.brand.primary"
}

export interface ParsedToken extends DesignToken {
  parsed: ParsedTokenName;
}

// ===== 상속 해석된 토큰 (RPC 결과) =====
export interface ResolvedToken extends DesignToken {
  source_theme_id: string;
  is_inherited: boolean;
  inheritance_depth: number;
}

// ===== 토큰 필터 옵션 =====
export interface TokenFilter {
  category?: string;
  group?: string;
  scope?: 'raw' | 'semantic';
  search?: string;
  showInherited?: boolean;
}

// ===== 토큰 정렬 옵션 =====
export type TokenSortBy = 'name' | 'type' | 'updated_at' | 'category';
export type TokenSortOrder = 'asc' | 'desc';

export interface TokenSortOptions {
  sortBy: TokenSortBy;
  order: TokenSortOrder;
}

// ===== 토큰 그룹 (UI 표시용) =====
export interface TokenGroup {
  category: string;
  groups: {
    [groupName: string]: ParsedToken[];
  };
}

// ===== 토큰 생성 입력 =====
export type CreateTokenInput = Omit<DesignToken, 'id' | 'created_at' | 'updated_at'>;

// ===== 토큰 업데이트 입력 =====
export type UpdateTokenInput = Partial<Omit<DesignToken, 'id' | 'project_id' | 'theme_id' | 'created_at'>>;

// ===== 토큰 컬렉션 (특수 토큰으로 저장) =====
export interface TokenCollection {
  id: string;
  name: string;
  description?: string;
  component_type?: string;
  tokens: string[];  // token IDs
  presets: TokenPreset[];
}

export interface TokenPreset {
  id: string;
  name: string;
  description?: string;
  values: Record<string, unknown>;  // token_id → value
}

// ===== Figma 호환 타입 =====
export interface FigmaToken {
  $type: string;
  $value: unknown;
  $description?: string;
  $extensions?: {
    'com.figma'?: {
      hiddenFromPublishing?: boolean;
      scopes?: string[];
      codeSyntax?: Record<string, string>;
    };
  };
}

export interface FigmaTokenCollection {
  [key: string]: FigmaToken | FigmaTokenCollection;
}

// ===== W3C Design Token 형식 =====
export interface W3CToken {
  $type: string;
  $value: unknown;
  $description?: string;
}

export interface W3CTokenCollection {
  [key: string]: W3CToken | W3CTokenCollection;
}

// ===== 색상 값 타입 =====
export interface ColorValueHSL {
  h: number;  // 0-360
  s: number;  // 0-100
  l: number;  // 0-100
  a: number;  // 0-1
}

export interface ColorValueRGB {
  r: number;  // 0-255
  g: number;  // 0-255
  b: number;  // 0-255
  a: number;  // 0-1
}

export type ColorValue = ColorValueHSL | ColorValueRGB | string;  // HEX string

// ===== 타이포그래피 값 타입 =====
export interface TypographyValue {
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing?: string;
}

// ===== 그림자 값 타입 =====
export interface ShadowValue {
  offsetX: string;
  offsetY: string;
  blur: string;
  spread: string;
  color: string | ColorValue;
}

// ===== 테두리 값 타입 =====
export interface BorderValue {
  width: string;
  style: 'solid' | 'dashed' | 'dotted' | 'double' | 'none';
  color: string | ColorValue;
}

// ===== 모션 값 타입 =====
export interface MotionValue {
  duration: string;
  easing: string;
  delay?: string;
}

// ===== Zod 검증 스키마 =====
export const ColorValueSchema = z.union([
  z.object({
    h: z.number().min(0).max(360),
    s: z.number().min(0).max(100),
    l: z.number().min(0).max(100),
    a: z.number().min(0).max(1),
  }),
  z.object({
    r: z.number().min(0).max(255),
    g: z.number().min(0).max(255),
    b: z.number().min(0).max(255),
    a: z.number().min(0).max(1),
  }),
  z.string().regex(/^#[0-9A-Fa-f]{6}$/),
]);

export const TypographyValueSchema = z.object({
  fontFamily: z.string(),
  fontSize: z.string(),
  fontWeight: z.number().min(100).max(900),
  lineHeight: z.number().positive(),
  letterSpacing: z.string().optional(),
});

export const TokenFilterSchema = z.object({
  category: z.string().optional(),
  group: z.string().optional(),
  scope: z.enum(['raw', 'semantic']).optional(),
  search: z.string().optional(),
  showInherited: z.boolean().optional(),
});

// ===== 타입 가드 =====
export function isColorValueHSL(value: unknown): value is ColorValueHSL {
  return value !== null && value !== undefined && typeof value === 'object' && 'h' in value && 's' in value && 'l' in value;
}

export function isColorValueRGB(value: unknown): value is ColorValueRGB {
  return value !== null && value !== undefined && typeof value === 'object' && 'r' in value && 'g' in value && 'b' in value;
}

export function isTypographyValue(value: unknown): value is TypographyValue {
  return value !== null && value !== undefined && typeof value === 'object' && 'fontFamily' in value && 'fontSize' in value;
}

export function isResolvedToken(token: DesignToken | ResolvedToken): token is ResolvedToken {
  return 'is_inherited' in token && 'source_theme_id' in token;
}

// ===== 토큰 카테고리 상수 =====
export const TOKEN_CATEGORIES = [
  'color',
  'typography',
  'spacing',
  'shadow',
  'border',
  'radius',
  'motion',
  'other',
] as const;

export type TokenCategory = (typeof TOKEN_CATEGORIES)[number];

// ===== 토큰 타입 메타데이터 =====
export interface TokenTypeMeta {
  icon: string;
  label: string;
  description: string;
}

export const TOKEN_TYPE_META: Record<string, TokenTypeMeta> = {
  color: {
    icon: '🎨',
    label: 'Color',
    description: '색상 토큰',
  },
  typography: {
    icon: '📝',
    label: 'Typography',
    description: '타이포그래피 토큰',
  },
  spacing: {
    icon: '📏',
    label: 'Spacing',
    description: '간격 토큰',
  },
  shadow: {
    icon: '🌑',
    label: 'Shadow',
    description: '그림자 토큰',
  },
  border: {
    icon: '🔲',
    label: 'Border',
    description: '테두리 토큰',
  },
  radius: {
    icon: '⚪',
    label: 'Radius',
    description: '모서리 반경 토큰',
  },
  motion: {
    icon: '⚡',
    label: 'Motion',
    description: '모션/애니메이션 토큰',
  },
  other: {
    icon: '📦',
    label: 'Other',
    description: '기타 토큰',
  },
};
