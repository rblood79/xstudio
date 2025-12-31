/**
 * Unified Theme Type Definitions
 *
 * This file is the Single Source of Truth (SSoT) for all theme-related types.
 * It combines and supersedes:
 * - types/theme.ts (will be deprecated)
 * - types/theme/token.types.ts (will be deprecated)
 *
 * Design Principles:
 * - 100% compatible with existing database schema
 * - Strong typing with Zod validation
 * - Type guards for runtime safety
 * - Supports Figma and W3C token formats
 */

import { z } from 'zod';

// ===== Core Token Types (DB Schema Compatible) =====
export type TokenType = 'color' | 'typography' | 'spacing' | 'shadow' | 'border' | 'radius' | 'font' | 'size' | 'motion' | 'other';
export type DesignTokenScope = 'raw' | 'semantic';

// ===== Color Value Types =====
export interface ColorValueHSL {
  h: number;  // hue: 0-360
  s: number;  // saturation: 0-100
  l: number;  // lightness: 0-100
  a: number;  // alpha: 0-1
}

export interface ColorValueRGB {
  r: number;  // red: 0-255
  g: number;  // green: 0-255
  b: number;  // blue: 0-255
  a: number;  // alpha: 0-1
}

export type ColorValue = ColorValueHSL | ColorValueRGB | string;  // HEX string like "#ff0000"

// ===== Typography Value Type =====
export interface TypographyValue {
  fontFamily: string;
  fontSize: string;
  fontWeight: number;         // 100-900
  lineHeight: number;         // positive number
  letterSpacing?: string;
}

// ===== Shadow Value Type =====
export interface ShadowValue {
  offsetX: string;
  offsetY: string;
  blur: string;
  spread: string;
  color: string | ColorValue;
}

// ===== Border Value Type =====
export interface BorderValue {
  width: string;
  style: 'solid' | 'dashed' | 'dotted' | 'double' | 'none';
  color: string | ColorValue;
}

// ===== Motion Value Type =====
export interface MotionValue {
  duration: string;
  easing: string;
  delay?: string;
}

// ===== Union of All Value Types =====
export type TokenValue = ColorValue | TypographyValue | ShadowValue | BorderValue | MotionValue | string | number;

// ===== Design Token Interface (DB Schema) =====
export interface DesignToken {
  id: string;
  project_id: string;
  theme_id: string;
  name: string;               // "color.brand.primary" (dot-separated hierarchy)
  type: TokenType;
  value: TokenValue;          // JSONB - strong typed union
  scope: DesignTokenScope;
  alias_of?: string | null;
  css_variable?: string;      // CSS variable name (optional)
  created_at?: string;
  updated_at?: string;
}

// ===== Parsed Token Info (Client-Side) =====
export interface ParsedTokenName {
  category: string;           // "color"
  group?: string;             // "brand"
  tokenName?: string;         // "primary"
  fullName: string;           // "color.brand.primary"
}

export interface ParsedToken extends DesignToken {
  parsed: ParsedTokenName;
}

// ===== Resolved Token (RPC Result with Inheritance) =====
export interface ResolvedToken extends DesignToken {
  source_theme_id: string;
  is_inherited: boolean;
  inheritance_depth: number;
}

// ===== Design Theme Interface =====
export interface DesignTheme {
  id: string;
  project_id: string;
  name: string;
  status: 'active' | 'draft' | 'archived';
  version: number;
  parent_theme_id?: string | null;
  supports_dark_mode?: boolean;   // Default: true
  created_at: string;
  updated_at: string;
}

// ===== Token CRUD Input Types =====
export type CreateTokenInput = Omit<DesignToken, 'id' | 'created_at' | 'updated_at'>;
export type UpdateTokenInput = Partial<Omit<DesignToken, 'id' | 'project_id' | 'theme_id' | 'created_at'>>;

// ===== Token Filter Options =====
export interface TokenFilter {
  category?: string;
  group?: string;
  scope?: 'raw' | 'semantic';
  search?: string;
  showInherited?: boolean;
}

// ===== Token Sort Options =====
export type TokenSortBy = 'name' | 'type' | 'updated_at' | 'category';
export type TokenSortOrder = 'asc' | 'desc';

export interface TokenSortOptions {
  sortBy: TokenSortBy;
  order: TokenSortOrder;
}

// ===== Token Group (For UI Display) =====
export interface TokenGroup {
  category: string;
  groups: {
    [groupName: string]: ParsedToken[];
  };
}

// ===== Token Collection (Special Token) =====
export interface TokenCollection {
  id: string;
  name: string;
  description?: string;
  component_type?: string;
  tokens: string[];               // token IDs
  presets: TokenPreset[];
}

export interface TokenPreset {
  id: string;
  name: string;
  description?: string;
  values: Record<string, unknown>;  // token_id → value
}

// ===== Figma Token Format =====
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

// ===== W3C Design Token Format =====
export interface W3CToken {
  $type: string;
  $value: unknown;
  $description?: string;
}

export interface W3CTokenCollection {
  [key: string]: W3CToken | W3CTokenCollection;
}

// ===== Tailwind Color Integration =====
export type TailwindColorName =
  | 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone'
  | 'red' | 'orange' | 'amber' | 'yellow' | 'lime'
  | 'green' | 'emerald' | 'teal' | 'cyan' | 'sky'
  | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia'
  | 'pink' | 'rose';

export type NeutralColorName = 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone';

export type ThemeColor =
  | { type: 'tailwind'; color: TailwindColorName }
  | { type: 'custom'; color: ColorValue };

export type ScaleStep = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;

export interface ColorScaleMap {
  [key: number]: ColorValue;
}

export interface ColorUsage {
  [key: number]: string;
}

// ===== Constants =====
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

// ===== Token Type Metadata =====
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

// ===== Zod Validation Schemas =====
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

// ===== Type Guards =====
export function isColorValueHSL(value: unknown): value is ColorValueHSL {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === 'object' &&
    'h' in value &&
    's' in value &&
    'l' in value
  );
}

export function isColorValueRGB(value: unknown): value is ColorValueRGB {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === 'object' &&
    'r' in value &&
    'g' in value &&
    'b' in value
  );
}

export function isTypographyValue(value: unknown): value is TypographyValue {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === 'object' &&
    'fontFamily' in value &&
    'fontSize' in value
  );
}

export function isShadowValue(value: unknown): value is ShadowValue {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === 'object' &&
    'offsetX' in value &&
    'offsetY' in value &&
    'blur' in value
  );
}

export function isBorderValue(value: unknown): value is BorderValue {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === 'object' &&
    'width' in value &&
    'style' in value &&
    'color' in value
  );
}

export function isMotionValue(value: unknown): value is MotionValue {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === 'object' &&
    'duration' in value &&
    'easing' in value
  );
}

export function isResolvedToken(token: DesignToken | ResolvedToken): token is ResolvedToken {
  return 'is_inherited' in token && 'source_theme_id' in token;
}

// ===== Legacy Type Aliases (For Backward Compatibility) =====
// These will be removed in v2.0
// NewTokenInput: TokenForm에서 project_id/theme_id 없이 토큰 정보 수집용
export type NewTokenInput = Omit<CreateTokenInput, 'project_id' | 'theme_id'>;
