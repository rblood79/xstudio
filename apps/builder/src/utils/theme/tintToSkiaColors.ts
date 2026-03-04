/**
 * Tint → Skia 색상 동기화
 *
 * Tint 프리셋 변경 시 lightColors/darkColors의 accent 토큰을
 * 해당 tint의 oklch 값에서 파생된 hex 값으로 갱신한다.
 *
 * preview-system.css의 oklch 값과 동일한 소스를 사용하여
 * CSS Preview ↔ Skia Canvas 색상 일치를 보장.
 *
 * @see preview-system.css (oklch 프리셋 원본)
 * @see ADR-021 Phase A
 */

import { lightColors, darkColors } from "@xstudio/specs";

import { oklchToHex } from "./oklchToHex";

// ============================================================================
// Tint 프리셋 정의 (preview-system.css 기준)
// ============================================================================

export type TintPreset =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "turquoise"
  | "cyan"
  | "blue"
  | "indigo"
  | "purple"
  | "pink";

interface TintValue {
  /** oklch hue (0~360) */
  h: number;
  /** oklch chroma (0~0.4) */
  c: number;
}

/** oklch(L C H) — preview-system.css와 동일한 값 */
export const TINT_PRESETS: Record<TintPreset, TintValue> = {
  red: { h: 27.0726, c: 0.181447 },
  orange: { h: 54, c: 0.150492 },
  yellow: { h: 73.8032, c: 0.128516 },
  green: { h: 155.372, c: 0.121276 },
  turquoise: { h: 205.114, c: 0.081146 },
  cyan: { h: 243.926, c: 0.142107 },
  blue: { h: 266.315, c: 0.22049 },
  indigo: { h: 284.23, c: 0.25049 },
  purple: { h: 302, c: 0.223324 },
  pink: { h: 347.813, c: 0.177717 },
};

// ============================================================================
// Lightness 스케일 (preview-system.css 기준)
// ============================================================================

/**
 * preview-system.css의 --tint-900 ~ --tint-1200 lightness 값.
 * highlight-background는 항상 55% 고정.
 */
const LIGHTNESS = {
  light: {
    highlight: 0.55, // --highlight-background: oklch(from var(--tint) 55% c h)
    900: 0.579699,
    1000: 0.519076,
    1100: 0.469058,
    1200: 0.410821,
  },
  dark: {
    highlight: 0.55,
    900: 0.623039,
    1000: 0.670121,
    1100: 0.723297,
    1200: 0.791773,
  },
};

// ============================================================================
// 메인 함수
// ============================================================================

/**
 * Tint 프리셋에 따라 lightColors/darkColors의 accent 5개 토큰을 갱신.
 *
 * **Mutation 방식**: lightColors/darkColors는 Object.freeze() 미적용이므로
 * 직접 mutation하여 다음 resolveToken() 호출에 즉시 반영.
 *
 * @param tint - 선택된 Tint 프리셋
 */
export function tintToSkiaColors(tint: TintPreset): void {
  const { h, c } = TINT_PRESETS[tint];

  // Light mode accent
  applyAccentColors(lightColors, c, h, "light");

  // Dark mode accent
  applyAccentColors(darkColors, c, h, "dark");
}

/**
 * accent 5개 토큰을 oklch 파생 hex로 갱신
 */
function applyAccentColors(
  colors: typeof lightColors,
  c: number,
  h: number,
  mode: "light" | "dark",
): void {
  const ls = LIGHTNESS[mode];

  // accent: highlight-background (55% lightness 고정)
  colors.accent = oklchToHex(ls.highlight, c, h);

  // accent-hover: color-mix(in srgb, accent 85%, black)
  // → lightness를 약간 낮춤 (light) 또는 높임 (dark)
  const hoverL = mode === "light" ? ls.highlight * 0.85 : ls.highlight * 1.15;
  colors["accent-hover"] = oklchToHex(Math.min(1, hoverL), c, h);

  // accent-pressed: color-mix(in srgb, accent 75%, black)
  const pressedL = mode === "light" ? ls.highlight * 0.75 : ls.highlight * 1.25;
  colors["accent-pressed"] = oklchToHex(Math.min(1, pressedL), c, h);

  // on-accent: 항상 대비색 (light → white, dark → near-black)
  colors["on-accent"] = mode === "light" ? "#ffffff" : "#171717";

  // accent-subtle: 연한 배경 (낮은 chroma, 높은 lightness)
  const subtleL = mode === "light" ? 0.95 : 0.25;
  const subtleC = c * 0.3;
  colors["accent-subtle"] = oklchToHex(subtleL, subtleC, h);
}
