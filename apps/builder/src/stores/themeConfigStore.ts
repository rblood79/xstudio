/**
 * Theme Config Store
 *
 * Builder 내 인라인 테마 설정 상태 관리 (ADR-021 Phase A+B+C).
 * Tint/Neutral 프리셋 변경 시 CSS Preview + Skia Canvas 동시 반영.
 * Phase C: localStorage 영속화 — 프로젝트별 키로 새로고침 후 복원.
 *
 * - tint 변경 → tintToSkiaColors() → lightColors/darkColors mutation
 * - neutral 변경 → neutralToSkiaColors() → lightColors/darkColors mutation
 * - themeVersion 증가 → ElementSprite 재렌더 → Skia 캐시 무효화
 *
 * @see ADR-021
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
  tintToSkiaColors,
  type TintPreset,
} from "../utils/theme/tintToSkiaColors";
import {
  neutralToSkiaColors,
  type NeutralPreset,
} from "../utils/theme/neutralToSkiaColors";
import { radiusScaleToSkia } from "../utils/theme/radiusScaleToSkia";
import { notifyLayoutChange } from "../builder/workspace/canvas/skia/useSkiaNode";

// ============================================================================
// Types
// ============================================================================

export type DarkModePreference = "light" | "dark" | "system";

export type RadiusScale = "none" | "sm" | "md" | "lg" | "xl";

/** localStorage에 저장되는 직렬화 가능한 설정 */
interface PersistedThemeConfig {
  tint: TintPreset;
  darkMode: DarkModePreference;
  neutral: NeutralPreset;
  radiusScale: RadiusScale;
}

interface ThemeConfigState extends PersistedThemeConfig {
  /**
   * Skia 재렌더 트리거용 버전 카운터.
   * ElementSprite가 이 값을 구독하여 tint/neutral 변경 시 SkiaNodeData 재생성.
   */
  themeVersion: number;

  /** Tint 프리셋 변경 */
  setTint: (tint: TintPreset) => void;

  /** 다크 모드 변경 */
  setDarkMode: (mode: DarkModePreference) => void;

  /** Neutral 프리셋 변경 */
  setNeutral: (neutral: NeutralPreset) => void;

  /** Border Radius 스케일 변경 */
  setRadiusScale: (scale: RadiusScale) => void;

  /** 프로젝트 초기화 시 localStorage에서 설정 복원 */
  initThemeConfig: (projectId: string) => void;
}

// ============================================================================
// localStorage Helpers
// ============================================================================

const STORAGE_KEY_PREFIX = "xstudio-theme-config-";

/** 현재 프로젝트 ID (persist 시 사용) */
let currentProjectId: string | null = null;

function getStorageKey(projectId: string): string {
  return `${STORAGE_KEY_PREFIX}${projectId}`;
}

function loadPersistedConfig(
  projectId: string,
): Partial<PersistedThemeConfig> | null {
  try {
    const raw = localStorage.getItem(getStorageKey(projectId));
    if (!raw) return null;
    return JSON.parse(raw) as Partial<PersistedThemeConfig>;
  } catch {
    return null;
  }
}

function persistConfig(projectId: string, state: PersistedThemeConfig): void {
  try {
    localStorage.setItem(
      getStorageKey(projectId),
      JSON.stringify({
        tint: state.tint,
        darkMode: state.darkMode,
        neutral: state.neutral,
        radiusScale: state.radiusScale,
      }),
    );
  } catch {
    // localStorage full — 무시
  }
}

/** 현재 프로젝트에 설정 영속화 (set 액션 내부에서 호출) */
function persistCurrentConfig(): void {
  if (!currentProjectId) return;
  const { tint, darkMode, neutral, radiusScale } =
    useThemeConfigStore.getState();
  persistConfig(currentProjectId, { tint, darkMode, neutral, radiusScale });
}

// ============================================================================
// Store
// ============================================================================

export const useThemeConfigStore = create<ThemeConfigState>()(
  devtools(
    (set) => ({
      tint: "blue",
      darkMode: "light",
      neutral: "neutral",
      radiusScale: "md",
      themeVersion: 0,

      setTint: (tint: TintPreset) => {
        // 1. lightColors/darkColors mutation (즉시 반영)
        tintToSkiaColors(tint);

        // 2. themeVersion 증가 → ElementSprite 재렌더 트리거
        set(
          (state) => ({
            tint,
            themeVersion: state.themeVersion + 1,
          }),
          undefined,
          "setTint",
        );

        // 3. registryVersion 증가 → Skia 트리 캐시 무효화
        notifyLayoutChange();

        // 4. localStorage 영속화
        persistCurrentConfig();
      },

      setDarkMode: (darkMode: DarkModePreference) => {
        set(
          (state) => ({
            darkMode,
            themeVersion: state.themeVersion + 1,
          }),
          undefined,
          "setDarkMode",
        );

        // Skia 캐시 무효화 → 모든 ElementSprite 재렌더
        notifyLayoutChange();

        // localStorage 영속화
        persistCurrentConfig();
      },

      setNeutral: (neutral: NeutralPreset) => {
        // 1. lightColors/darkColors neutral 토큰 mutation
        neutralToSkiaColors(neutral);

        // 2. themeVersion 증가 → ElementSprite 재렌더 트리거
        set(
          (state) => ({
            neutral,
            themeVersion: state.themeVersion + 1,
          }),
          undefined,
          "setNeutral",
        );

        // 3. registryVersion 증가 → Skia 트리 캐시 무효화
        notifyLayoutChange();

        // 4. localStorage 영속화
        persistCurrentConfig();
      },

      setRadiusScale: (radiusScale: RadiusScale) => {
        // 1. radius 토큰 mutation (즉시 반영)
        radiusScaleToSkia(radiusScale);

        // 2. themeVersion 증가 → ElementSprite 재렌더 트리거
        set(
          (state) => ({
            radiusScale,
            themeVersion: state.themeVersion + 1,
          }),
          undefined,
          "setRadiusScale",
        );

        // 3. registryVersion 증가 → Skia 트리 캐시 무효화
        notifyLayoutChange();

        // 4. localStorage 영속화
        persistCurrentConfig();
      },

      initThemeConfig: (projectId: string) => {
        currentProjectId = projectId;

        const persisted = loadPersistedConfig(projectId);
        if (!persisted) return;

        // Skia 색상/토큰 동기화
        if (persisted.tint) tintToSkiaColors(persisted.tint);
        if (persisted.neutral) neutralToSkiaColors(persisted.neutral);
        if (persisted.radiusScale) radiusScaleToSkia(persisted.radiusScale);

        // 상태 복원 + themeVersion 증가
        set(
          (state) => ({
            ...(persisted.tint && { tint: persisted.tint }),
            ...(persisted.darkMode && { darkMode: persisted.darkMode }),
            ...(persisted.neutral && { neutral: persisted.neutral }),
            ...(persisted.radiusScale && {
              radiusScale: persisted.radiusScale,
            }),
            themeVersion: state.themeVersion + 1,
          }),
          undefined,
          "initThemeConfig",
        );

        // Skia 캐시 무효화
        notifyLayoutChange();
      },
    }),
    { name: "ThemeConfigStore" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const useThemeConfigTint = () => useThemeConfigStore((s) => s.tint);

export const useThemeConfigVersion = () =>
  useThemeConfigStore((s) => s.themeVersion);

export const useThemeConfigDarkMode = () =>
  useThemeConfigStore((s) => s.darkMode);

export const useThemeConfigNeutral = () =>
  useThemeConfigStore((s) => s.neutral);

export const useThemeConfigRadiusScale = () =>
  useThemeConfigStore((s) => s.radiusScale);

/**
 * DarkModePreference → 실제 "light" | "dark" 해석.
 * "system"이면 OS 미디어 쿼리 기준. Skia theme 파라미터로 사용.
 */
export function resolveSkiaTheme(pref: DarkModePreference): "light" | "dark" {
  if (pref === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return pref;
}

export const useResolvedSkiaTheme = () =>
  useThemeConfigStore((s) => resolveSkiaTheme(s.darkMode));
