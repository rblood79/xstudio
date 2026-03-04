/**
 * Token Resolver
 *
 * 토큰 참조를 실제 값으로 변환하는 유틸리티
 *
 * @packageDocumentation
 */

import type { TokenRef } from "../../types/token.types";
import type { ColorValue } from "../../types/shape.types";
import type { ShadowTokenRef } from "../../types/token.types";
import { lightColors, darkColors } from "../../primitives/colors";
import { spacing } from "../../primitives/spacing";
import { typography } from "../../primitives/typography";
import { radius } from "../../primitives/radius";
import { shadows } from "../../primitives/shadows";

/**
 * 토큰 참조를 실제 값으로 변환
 */
export function resolveToken(
  ref: TokenRef,
  theme: "light" | "dark" = "light",
): string | number {
  // '{color.accent}' → 'accent'
  const match = ref.match(/^\{(\w+)\.(.+)\}$/);
  if (!match) {
    console.warn(`Invalid token reference: ${ref}`);
    return ref;
  }

  const [, category, name] = match;

  switch (category) {
    case "color":
      return theme === "dark"
        ? darkColors[name as keyof typeof darkColors]
        : lightColors[name as keyof typeof lightColors];
    case "spacing":
      return spacing[name as keyof typeof spacing];
    case "typography":
      return typography[name as keyof typeof typography];
    case "radius":
      return radius[name as keyof typeof radius];
    case "shadow":
      return shadows[name as keyof typeof shadows];
    default:
      console.warn(`Unknown token category: ${category}`);
      return ref;
  }
}

/**
 * ColorValue를 실제 색상으로 변환
 */
export function resolveColor(
  value: ColorValue,
  theme: "light" | "dark" = "light",
): string | number {
  if (typeof value === "string" && value.startsWith("{")) {
    return resolveToken(value as TokenRef, theme);
  }
  return value;
}

/**
 * S2 색상 토큰 → 시맨틱 CSS 변수 매핑 (ADR-022)
 *
 * Spec 파일의 S2 토큰 이름({color.accent} 등)을
 * 시맨틱 CSS 변수명(--highlight-background 등)으로 변환.
 */
const COLOR_TOKEN_TO_CSS: Record<string, string> = {
  // --- Accent ---
  accent: "var(--highlight-background)",
  "accent-hover": "color-mix(in srgb, var(--highlight-background) 85%, black)",
  "accent-pressed":
    "color-mix(in srgb, var(--highlight-background) 75%, black)",
  "on-accent": "var(--highlight-foreground)",
  "accent-subtle": "var(--color-primary-100)",

  // --- Neutral ---
  neutral: "var(--text-color)",
  "neutral-subdued": "var(--text-color-placeholder)",
  "neutral-subtle": "var(--color-neutral-200)",
  "neutral-hover": "color-mix(in srgb, var(--color-neutral-200) 85%, black)",
  "neutral-pressed": "color-mix(in srgb, var(--color-neutral-200) 75%, black)",

  // --- Negative ---
  negative: "var(--invalid-color)",
  "negative-hover": "color-mix(in srgb, var(--invalid-color) 85%, black)",
  "negative-pressed": "color-mix(in srgb, var(--invalid-color) 75%, black)",
  "on-negative": "var(--color-white)",
  "negative-subtle": "var(--color-error-100)",

  // --- Informative / Positive / Notice ---
  informative: "var(--color-info-600)",
  "informative-subtle": "var(--color-info-100)",
  positive: "var(--color-green-600)",
  "positive-subtle": "var(--color-green-100)",
  notice: "var(--color-warning-600)",
  "notice-subtle": "var(--color-warning-100)",

  // --- Surface / Layer ---
  base: "var(--background-color)",
  "layer-1": "var(--overlay-background)",
  "layer-2": "var(--field-background)",
  elevated: "var(--color-white)",
  disabled: "var(--color-neutral-200)",

  // --- Border ---
  border: "var(--border-color)",
  "border-hover": "var(--border-color-hover)",
  "border-disabled": "var(--border-color-disabled)",

  // --- Special ---
  transparent: "transparent",
  white: "var(--color-white)",
  black: "var(--color-black)",
};

/**
 * Named color → CSS 변수 매핑 (ADR-022)
 * S2에 글로벌 시맨틱이 없는 named color 처리 (기존 tertiary 등)
 */
const NAMED_COLOR_TO_CSS: Record<string, string> = {
  purple: "var(--color-purple-600)",
  "purple-hover": "color-mix(in srgb, var(--color-purple-600) 85%, black)",
  "purple-pressed": "color-mix(in srgb, var(--color-purple-600) 75%, black)",
  "purple-subtle": "var(--color-purple-100)",
};

/**
 * CSS 변수명으로 변환
 */
export function tokenToCSSVar(ref: TokenRef): string {
  // '{color.accent}' → 'var(--highlight-background)'
  // '{spacing.md}' → 'var(--spacing-md)'
  const match = ref.match(/^\{(\w+)\.(.+)\}$/);
  if (!match) return ref;

  const [, category, name] = match;

  switch (category) {
    case "color": {
      const mapped = COLOR_TOKEN_TO_CSS[name] ?? NAMED_COLOR_TO_CSS[name];
      return mapped ?? `var(--${name})`;
    }
    case "spacing":
      return `var(--spacing-${name})`;
    case "typography":
      return `var(--${name})`;
    case "radius":
      return `var(--radius-${name})`;
    case "shadow":
      return `var(--shadow-${name})`;
    default:
      return `var(--${name})`;
  }
}

/**
 * 그림자 토큰 참조를 실제 값으로 변환
 */
export function resolveBoxShadow(
  value: string | ShadowTokenRef,
  theme: "light" | "dark" = "light",
): string {
  // 토큰 참조인 경우 (예: '{shadow.md}')
  if (typeof value === "string" && value.startsWith("{shadow.")) {
    return resolveToken(value as TokenRef, theme) as string;
  }
  // 직접 값인 경우
  return value;
}

/**
 * hex 문자열을 숫자로 변환
 */
export function hexStringToNumber(hex: string): number {
  if (hex.startsWith("#")) {
    return parseInt(hex.slice(1), 16);
  }
  if (hex.startsWith("0x")) {
    return parseInt(hex, 16);
  }
  // rgb() 등 다른 형식은 colord로 처리 필요
  return 0x000000;
}
