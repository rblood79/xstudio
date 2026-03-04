/**
 * Neutral Preset → Skia 색상 동기화
 *
 * Tailwind v4 5종 gray 팔레트에서 S2 neutral 13개 토큰을
 * lightColors/darkColors에 직접 mutation하여 Skia 렌더링에 반영.
 *
 * @see App.css (Tailwind v4 oklch gray 팔레트 원본)
 * @see ADR-021 Phase B
 */

import { lightColors, darkColors } from "@xstudio/specs";

// ============================================================================
// Types
// ============================================================================

export type NeutralPreset = "slate" | "gray" | "zinc" | "neutral" | "stone";

// ============================================================================
// Tailwind v4 Gray 팔레트 (hex 하드코딩)
// ============================================================================

export const NEUTRAL_PALETTES: Record<NeutralPreset, Record<number, string>> = {
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
    950: "#020617",
  },
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
    950: "#030712",
  },
  zinc: {
    50: "#fafafa",
    100: "#f4f4f5",
    200: "#e4e4e7",
    300: "#d4d4d8",
    400: "#a1a1aa",
    500: "#71717a",
    600: "#52525b",
    700: "#3f3f46",
    800: "#27272a",
    900: "#18181b",
    950: "#09090b",
  },
  neutral: {
    50: "#fafafa",
    100: "#f5f5f5",
    200: "#e5e5e5",
    300: "#d4d4d4",
    400: "#a3a3a3",
    500: "#737373",
    600: "#525252",
    700: "#404040",
    800: "#262626",
    900: "#171717",
    950: "#0a0a0a",
  },
  stone: {
    50: "#fafaf9",
    100: "#f5f5f4",
    200: "#e7e5e4",
    300: "#d6d3d1",
    400: "#a8a29e",
    500: "#78716c",
    600: "#57534e",
    700: "#44403c",
    800: "#292524",
    900: "#1c1917",
    950: "#0c0a09",
  },
};

// ============================================================================
// S2 토큰 ↔ neutral step 매핑
// ============================================================================

/** Light mode: S2 토큰 → palette step (또는 고정 hex) */
const LIGHT_MAP: Record<string, number | string> = {
  neutral: 900,
  "neutral-subdued": 700,
  "neutral-subtle": 200,
  "neutral-hover": 300,
  "neutral-pressed": 400,
  base: "#ffffff",
  "layer-1": 50,
  "layer-2": 50,
  elevated: "#ffffff",
  disabled: 200,
  border: 300,
  "border-hover": 400,
  "border-disabled": 100,
};

/** Dark mode: S2 토큰 → palette step (또는 고정 hex) */
const DARK_MAP: Record<string, number | string> = {
  neutral: 100,
  "neutral-subdued": 400,
  "neutral-subtle": 700,
  "neutral-hover": 600,
  "neutral-pressed": 500,
  base: 900,
  "layer-1": 800,
  "layer-2": 800,
  elevated: 800,
  disabled: 700,
  border: 700,
  "border-hover": 500,
  "border-disabled": 800,
};

// ============================================================================
// 메인 함수
// ============================================================================

/**
 * Neutral 프리셋에 따라 lightColors/darkColors의 neutral 13개 토큰을 갱신.
 *
 * **Mutation 방식**: tintToSkiaColors와 동일 패턴.
 * Object.freeze() 미적용 → 직접 mutation하여 즉시 반영.
 */
export function neutralToSkiaColors(preset: NeutralPreset): void {
  const palette = NEUTRAL_PALETTES[preset];

  applyNeutralColors(lightColors, palette, LIGHT_MAP);
  applyNeutralColors(darkColors, palette, DARK_MAP);
}

function applyNeutralColors(
  colors: Record<string, string>,
  palette: Record<number, string>,
  map: Record<string, number | string>,
): void {
  for (const [token, stepOrHex] of Object.entries(map)) {
    if (typeof stepOrHex === "string") {
      colors[token] = stepOrHex;
    } else {
      colors[token] = palette[stepOrHex];
    }
  }
}
