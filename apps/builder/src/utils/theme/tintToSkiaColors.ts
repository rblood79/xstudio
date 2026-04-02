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
// srgb color-mix 유틸 (CSS color-mix(in srgb, color P%, black) 정합)
// ============================================================================

/**
 * CSS `color-mix(in srgb, hexColor P%, black)` 과 동일한 결과를 반환.
 * srgb 채널별 선형 혼합: result = color × (percent/100)
 * (black = 0,0,0 이므로 두 번째 항은 0)
 */
function mixWithBlackSrgb(hex: string, percent: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const p = percent / 100;
  const mr = Math.max(0, Math.min(255, Math.round(r * p)));
  const mg = Math.max(0, Math.min(255, Math.round(g * p)));
  const mb = Math.max(0, Math.min(255, Math.round(b * p)));
  return `#${mr.toString(16).padStart(2, "0")}${mg.toString(16).padStart(2, "0")}${mb.toString(16).padStart(2, "0")}`;
}

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
  const accentHex = oklchToHex(ls.highlight, c, h);
  colors.accent = accentHex;

  // accent-hover: color-mix(in srgb, accent 85%, black) — CSS 정합
  colors["accent-hover"] = mixWithBlackSrgb(accentHex, 85);

  // accent-pressed: color-mix(in srgb, accent 75%, black) — CSS 정합
  colors["accent-pressed"] = mixWithBlackSrgb(accentHex, 75);

  // on-accent: 항상 대비색 (light → white, dark → near-black)
  colors["on-accent"] = mode === "light" ? "#ffffff" : "#171717";

  // accent-subtle: 연한 배경 (낮은 chroma, 높은 lightness)
  const subtleL = mode === "light" ? 0.95 : 0.25;
  const subtleC = c * 0.3;
  colors["accent-subtle"] = oklchToHex(subtleL, subtleC, h);
}

// ============================================================================
// Per-element accent override (ADR-021 Phase E)
// ============================================================================

/** accent 5개 토큰 스냅샷 */
interface AccentSnapshot {
  accent: string;
  "accent-hover": string;
  "accent-pressed": string;
  "on-accent": string;
  "accent-subtle": string;
}

const ACCENT_KEYS: (keyof AccentSnapshot)[] = [
  "accent",
  "accent-hover",
  "accent-pressed",
  "on-accent",
  "accent-subtle",
];

/** 현재 accent 토큰을 스냅샷 */
function snapshotAccent(colors: typeof lightColors): AccentSnapshot {
  return {
    accent: colors.accent,
    "accent-hover": colors["accent-hover"],
    "accent-pressed": colors["accent-pressed"],
    "on-accent": colors["on-accent"],
    "accent-subtle": colors["accent-subtle"],
  };
}

/** 스냅샷에서 accent 토큰 복원 */
function restoreAccent(
  colors: typeof lightColors,
  snapshot: AccentSnapshot,
): void {
  for (const key of ACCENT_KEYS) {
    (colors as unknown as Record<string, string>)[key] = snapshot[key];
  }
}

/**
 * 요소별 accent 오버라이드를 적용한 상태에서 콜백을 실행하고 원래 상태로 복원.
 * Skia 렌더링은 동기적이므로 mutation → 실행 → 복원이 안전.
 *
 * @param accentTint - 오버라이드할 Tint 프리셋 (없으면 콜백만 실행)
 * @param fn - accent가 적용된 상태에서 실행할 함수
 * @returns fn의 반환값
 */
export function withAccentOverride<T>(
  accentTint: TintPreset | undefined,
  fn: () => T,
): T {
  if (!accentTint || !(accentTint in TINT_PRESETS)) {
    return fn();
  }

  const lightSnapshot = snapshotAccent(lightColors);
  const darkSnapshot = snapshotAccent(darkColors);

  try {
    const { h, c } = TINT_PRESETS[accentTint];
    applyAccentColors(lightColors, c, h, "light");
    applyAccentColors(darkColors, c, h, "dark");
    return fn();
  } finally {
    restoreAccent(lightColors, lightSnapshot);
    restoreAccent(darkColors, darkSnapshot);
  }
}
