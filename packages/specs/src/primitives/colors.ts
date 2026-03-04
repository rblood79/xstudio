/**
 * Color Tokens
 *
 * 시맨틱 토큰 기반 색상 값 (ADR-017)
 * M3 토큰 이름을 유지하되, 실제 값은 시맨틱/Tailwind 색상으로 변환.
 * tokenToCSSVar()의 매핑 테이블과 함께 사용됨.
 *
 * @packageDocumentation
 */

import type { ColorTokens } from "../types/token.types";

/**
 * Light 모드 색상 토큰
 * 시맨틱 토큰 CSS 변수의 fallback 값 기준 (Tailwind hex)
 */
export const lightColors: ColorTokens = {
  // Primary → --highlight-background (blue-600)
  primary: "#2563eb",
  "primary-hover": "#1f54c8",
  "primary-pressed": "#1d4ed8",
  "on-primary": "#ffffff",

  // Secondary → --button-background (neutral-50)
  secondary: "#fafafa",
  "secondary-hover": "#d5d5d5",
  "secondary-pressed": "#bcbcbc",
  "on-secondary": "#ffffff",

  // Tertiary → --color-purple-600
  tertiary: "#9333ea",
  "tertiary-hover": "#7d2bc7",
  "tertiary-pressed": "#6e26a6",
  "on-tertiary": "#ffffff",

  // Error → --invalid-color (error-400)
  error: "#ef4444",
  "error-hover": "#cb3a3a",
  "error-pressed": "#b33333",
  "on-error": "#ffffff",

  // Container → Tailwind palette direct
  "primary-container": "#dbeafe",
  "on-primary-container": "#1e3a8a",
  "secondary-container": "#f5f5f5",
  "on-secondary-container": "#171717",
  "tertiary-container": "#f3e8ff",
  "on-tertiary-container": "#581c87",
  "error-container": "#fee2e2",
  "on-error-container": "#7f1d1d",

  // Surface → Semantic
  surface: "#ffffff",
  "surface-container": "#fafafa",
  "surface-container-high": "#fafafa",
  "surface-container-highest": "#e5e5e5",
  "on-surface": "#171717",
  "on-surface-variant": "#404040",

  // Outline → Border
  outline: "#a3a3a3",
  "outline-variant": "#d4d4d4",

  // Special
  transparent: "transparent",
};

/**
 * Dark 모드 색상 토큰
 * 시맨틱 토큰 dark mode fallback 값 기준
 */
export const darkColors: ColorTokens = {
  // Primary → --highlight-background dark (blue-500)
  primary: "#3b82f6",
  "primary-hover": "#3270d1",
  "primary-pressed": "#60a5fa",
  "on-primary": "#171717",

  // Secondary → --button-background dark (neutral-800)
  secondary: "#262626",
  "secondary-hover": "#202020",
  "secondary-pressed": "#1c1c1c",
  "on-secondary": "#ffffff",

  // Tertiary → purple-600 (same in dark)
  tertiary: "#9333ea",
  "tertiary-hover": "#7d2bc7",
  "tertiary-pressed": "#6e26a6",
  "on-tertiary": "#ffffff",

  // Error → --invalid-color dark (error-400 equivalent)
  error: "#f87171",
  "error-hover": "#d36060",
  "error-pressed": "#ba5555",
  "on-error": "#ffffff",

  // Container
  "primary-container": "#1e3a8a",
  "on-primary-container": "#dbeafe",
  "secondary-container": "#262626",
  "on-secondary-container": "#f5f5f5",
  "tertiary-container": "#581c87",
  "on-tertiary-container": "#f3e8ff",
  "error-container": "#7f1d1d",
  "on-error-container": "#fee2e2",

  // Surface
  surface: "#171717",
  "surface-container": "#262626",
  "surface-container-high": "#262626",
  "surface-container-highest": "#404040",
  "on-surface": "#f5f5f5",
  "on-surface-variant": "#a3a3a3",

  // Outline
  outline: "#737373",
  "outline-variant": "#404040",

  // Special
  transparent: "transparent",
};

/**
 * 현재 테마에 따른 색상 반환
 */
export function getColorToken(
  name: keyof ColorTokens,
  theme: "light" | "dark" = "light",
): string {
  return theme === "dark" ? darkColors[name] : lightColors[name];
}

/**
 * 테마별 색상 객체 반환
 */
export function getColorTokens(theme: "light" | "dark" = "light"): ColorTokens {
  return theme === "dark" ? darkColors : lightColors;
}
