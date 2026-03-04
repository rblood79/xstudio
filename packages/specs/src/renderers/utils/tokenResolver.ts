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
  // '{color.primary}' → 'primary'
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
 * M3 색상 토큰 → 시맨틱 CSS 변수 매핑 (ADR-017)
 *
 * Spec 파일의 기존 M3 토큰 이름({color.primary} 등)을
 * 시맨틱 CSS 변수명(--highlight-background 등)으로 변환.
 * color-mix() 표현식은 hover/pressed 상태에 사용.
 */
const COLOR_TOKEN_TO_CSS: Record<string, string> = {
  // Primary → Highlight
  primary: "var(--highlight-background)",
  "primary-hover": "color-mix(in srgb, var(--highlight-background) 85%, black)",
  "primary-pressed": "var(--highlight-background-pressed)",
  "on-primary": "var(--highlight-foreground)",

  // Secondary → Button
  secondary: "var(--button-background)",
  "secondary-hover": "color-mix(in srgb, var(--button-background) 85%, black)",
  "secondary-pressed":
    "color-mix(in srgb, var(--button-background) 75%, black)",
  "on-secondary": "var(--color-white)",

  // Tertiary → Purple
  tertiary: "var(--color-purple-600)",
  "tertiary-hover": "color-mix(in srgb, var(--color-purple-600) 85%, black)",
  "tertiary-pressed": "color-mix(in srgb, var(--color-purple-600) 75%, black)",
  "on-tertiary": "var(--color-white)",

  // Error → Invalid
  error: "var(--invalid-color)",
  "error-hover": "color-mix(in srgb, var(--invalid-color) 85%, black)",
  "error-pressed": "color-mix(in srgb, var(--invalid-color) 75%, black)",
  "on-error": "var(--color-white)",

  // Container → Tailwind palette
  "primary-container": "var(--color-primary-100)",
  "on-primary-container": "var(--color-primary-900)",
  "secondary-container": "var(--color-neutral-100)",
  "on-secondary-container": "var(--color-neutral-900)",
  "tertiary-container": "var(--color-tertiary-100)",
  "on-tertiary-container": "var(--color-tertiary-900)",
  "error-container": "var(--color-error-100)",
  "on-error-container": "var(--color-error-900)",

  // Surface → Semantic
  surface: "var(--color-white)",
  "surface-container": "var(--field-background)",
  "surface-container-high": "var(--overlay-background)",
  "surface-container-highest": "var(--color-neutral-200)",
  "on-surface": "var(--text-color)",
  "on-surface-variant": "var(--text-color-placeholder)",

  // Outline → Border
  outline: "var(--border-color-hover)",
  "outline-variant": "var(--border-color)",

  // Special
  transparent: "transparent",
};

/**
 * CSS 변수명으로 변환
 */
export function tokenToCSSVar(ref: TokenRef): string {
  // '{color.primary}' → 'var(--highlight-background)'
  // '{spacing.md}' → 'var(--spacing-md)'
  const match = ref.match(/^\{(\w+)\.(.+)\}$/);
  if (!match) return ref;

  const [, category, name] = match;

  switch (category) {
    case "color": {
      const mapped = COLOR_TOKEN_TO_CSS[name];
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
