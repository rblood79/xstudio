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
  accent: "var(--accent)",
  "accent-hover": "color-mix(in srgb, var(--accent) 85%, black)",
  "accent-pressed": "color-mix(in srgb, var(--accent) 75%, black)",
  "on-accent": "var(--fg-on-accent)",
  "accent-subtle": "var(--accent-subtle)",

  // --- Neutral ---
  neutral: "var(--fg)",
  "neutral-subdued": "var(--fg-muted)",
  "neutral-subtle": "var(--bg-muted)",
  "neutral-hover": "color-mix(in srgb, var(--bg-muted) 85%, black)",
  "neutral-pressed": "color-mix(in srgb, var(--bg-muted) 75%, black)",

  // --- Negative ---
  negative: "var(--negative)",
  "negative-hover": "color-mix(in srgb, var(--negative) 85%, black)",
  "negative-pressed": "color-mix(in srgb, var(--negative) 75%, black)",
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
  base: "var(--bg)",
  "layer-1": "var(--bg-overlay)",
  "layer-2": "var(--bg-inset)",
  elevated: "var(--color-white)",
  disabled: "var(--color-neutral-200)",

  // --- Border ---
  border: "var(--border)",
  "border-hover": "var(--border-hover)",
  "border-disabled": "var(--border-disabled)",

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
  // Purple
  purple: "var(--color-purple-600)",
  "purple-hover": "color-mix(in srgb, var(--color-purple-600) 85%, black)",
  "purple-pressed": "color-mix(in srgb, var(--color-purple-600) 75%, black)",
  "purple-subtle": "var(--color-purple-100)",
  // Gray
  gray: "var(--color-neutral-500)",
  "gray-subtle": "var(--color-neutral-200)",
  // Red
  red: "var(--color-red-600)",
  "red-subtle": "var(--color-red-100)",
  // Orange
  orange: "var(--color-orange-600)",
  "orange-subtle": "var(--color-orange-100)",
  // Yellow
  yellow: "var(--color-yellow-500)",
  "yellow-subtle": "var(--color-yellow-100)",
  // Green (named, not semantic positive)
  "green-named": "var(--color-green-600)",
  "green-named-subtle": "var(--color-green-100)",
  // Blue
  blue: "var(--color-blue-600)",
  "blue-subtle": "var(--color-blue-100)",
  // Indigo
  indigo: "oklch(0.45 0.2 284)",
  "indigo-subtle": "oklch(0.93 0.04 284)",
  // Cyan
  cyan: "oklch(0.5 0.14 220)",
  "cyan-subtle": "oklch(0.93 0.03 220)",
  // Pink
  pink: "oklch(0.6 0.18 348)",
  "pink-subtle": "oklch(0.93 0.04 348)",
  // Turquoise
  turquoise: "oklch(0.55 0.1 195)",
  "turquoise-subtle": "oklch(0.93 0.02 195)",
  // Fuchsia
  fuchsia: "oklch(0.55 0.22 320)",
  "fuchsia-subtle": "oklch(0.93 0.04 320)",
  // Magenta
  magenta: "oklch(0.55 0.2 335)",
  "magenta-subtle": "oklch(0.93 0.04 335)",
  // Celery
  celery: "oklch(0.62 0.16 130)",
  "celery-subtle": "oklch(0.93 0.04 130)",
  // Chartreuse
  chartreuse: "oklch(0.65 0.18 115)",
  "chartreuse-subtle": "oklch(0.93 0.04 115)",
};

/**
 * CSS 변수명으로 변환
 */
export function tokenToCSSVar(ref: TokenRef): string {
  // '{color.accent}' → 'var(--accent)'
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
