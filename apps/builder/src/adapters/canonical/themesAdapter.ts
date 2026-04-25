/**
 * @fileoverview ADR-910 Phase 1 — Themes Read-Only Snapshot Adapter
 *
 * ADR-021 themeConfigStore 의 현재 상태를 canonical document `themes` 필드로
 * 투영하는 read-only snapshot adapter.
 *
 * **Read-only 원칙**:
 * - canonical document → themeConfigStore 쓰기 금지 (Phase 2 write-through 에서 구현)
 * - 런타임 테마 변경은 여전히 themeConfigStore 가 SSOT
 * - `snapshotThemesFromConfig()` 는 call-time 직렬화 — subscribe 기반 아님
 *   (ADR-910 R4 대응: stale snapshot 방지)
 *
 * **ThemeSnapshot 설계 (ADR-910 R2)**:
 * - `tint`, `darkMode`, `customTokens` 슬롯 예약으로 확장 가능
 * - per-element theme override 는 후속 ADR 에서 결정
 */

import type { CompositionDocument } from "@composition/shared";

// ─────────────────────────────────────────────
// ThemeSnapshot — 확장 가능한 테마 스냅샷 타입
// ─────────────────────────────────────────────

/**
 * canonical document `themes` 필드의 구체화된 snapshot 타입.
 *
 * ADR-910 R2 대응: `Record<string, string[]>` stub 대신 확장 가능한 구조체.
 * - `tint`: 현재 Tint 프리셋 이름 (ADR-021 TintPreset)
 * - `darkMode`: 현재 Dark mode 설정 ("light" | "dark" | "system")
 * - `neutral`: 현재 Neutral 프리셋 이름 (ADR-021 NeutralPreset)
 * - `radiusScale`: 현재 Border radius 스케일 ("none" | "sm" | "md" | "lg" | "xl")
 * - `customTokens`: 향후 per-element override 확장용 슬롯 (현재 미사용)
 */
export interface ThemeSnapshot {
  /** ADR-021 Tint 프리셋 ("blue" | "indigo" | "purple" | ...) */
  tint: string;
  /** ADR-021 Dark mode 설정 ("light" | "dark" | "system") */
  darkMode: string;
  /** ADR-021 Neutral 프리셋 */
  neutral: string;
  /** Border radius 스케일 */
  radiusScale: string;
  /** 향후 확장: per-element theme override, custom token map 등 */
  customTokens?: Record<string, string>;
}

// ─────────────────────────────────────────────
// ThemeConfig 최소 타입 (adapter DI 계약)
// ─────────────────────────────────────────────

/**
 * adapter 가 필요로 하는 themeConfigStore 최소 인터페이스.
 *
 * 실제 `ThemeConfigState` (themeConfigStore.ts) 는 이 인터페이스의 슈퍼셋.
 * 어댑터는 actions/themeVersion 등 런타임 전용 필드를 참조하지 않는다.
 */
export interface ThemeConfigInput {
  tint: string;
  darkMode: string;
  neutral: string;
  radiusScale: string;
}

// ─────────────────────────────────────────────
// Core adapter functions
// ─────────────────────────────────────────────

/**
 * themeConfigStore 현재 상태 → `ThemeSnapshot` 직렬화.
 *
 * call-time 직렬화 (subscribe 기반 아님) — stale snapshot 방지 (ADR-910 R4).
 * `legacyToCanonical()` 호출 시 전달된 `getThemeConfig()` 콜백에서 호출됨.
 *
 * @param themeConfig - themeConfigStore 현재 상태 (ThemeConfigInput 최소 계약)
 * @returns ThemeSnapshot — canonical document themes 필드에 주입할 snapshot
 */
export function snapshotThemesFromConfig(
  themeConfig: ThemeConfigInput,
): ThemeSnapshot {
  return {
    tint: themeConfig.tint,
    darkMode: themeConfig.darkMode,
    neutral: themeConfig.neutral,
    radiusScale: themeConfig.radiusScale,
  };
}

/**
 * canonical document 에서 `themes` 필드를 `ThemeSnapshot` 으로 읽기.
 *
 * Phase 2 write-through 이전: read-only accessor.
 * `themes` 필드가 없거나 ThemeSnapshot 구조가 아니면 `undefined` 반환.
 *
 * @param doc - canonical CompositionDocument
 * @returns ThemeSnapshot 또는 undefined (themes 필드 없음)
 */
export function readCanonicalThemes(
  doc: CompositionDocument,
): ThemeSnapshot | undefined {
  if (!doc.themes) return undefined;

  // CompositionDocument.themes 현재 타입: Record<string, string[]> (stub)
  // ThemeSnapshot 필드 존재 여부 확인 후 캐스팅
  const raw = doc.themes as Record<string, unknown>;
  if (
    typeof raw["tint"] === "string" &&
    typeof raw["darkMode"] === "string" &&
    typeof raw["neutral"] === "string" &&
    typeof raw["radiusScale"] === "string"
  ) {
    return {
      tint: raw["tint"],
      darkMode: raw["darkMode"],
      neutral: raw["neutral"],
      radiusScale: raw["radiusScale"],
      ...(raw["customTokens"] &&
      typeof raw["customTokens"] === "object" &&
      raw["customTokens"] !== null
        ? {
            customTokens: raw["customTokens"] as Record<string, string>,
          }
        : {}),
    };
  }

  return undefined;
}
