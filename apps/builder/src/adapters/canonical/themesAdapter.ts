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
 * - `@composition/shared` 의 `ThemeSnapshot` 타입을 단일 소스로 사용
 * - per-element theme override 는 후속 ADR 에서 결정
 */

import type { CompositionDocument, ThemeSnapshot } from "@composition/shared";

// ThemeSnapshot 은 packages/shared 에서 정의됨 — re-export 로 기존 import 경로 유지
export type { ThemeSnapshot } from "@composition/shared";

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

  // ADR-910 Phase 1: CompositionDocument.themes 타입이 ThemeSnapshot 으로 전환됨
  // 필드 존재 여부만 확인 (타입 캐스팅 불필요)
  const t = doc.themes;
  if (
    typeof t.tint === "string" &&
    typeof t.darkMode === "string" &&
    typeof t.neutral === "string" &&
    typeof t.radiusScale === "string"
  ) {
    return t;
  }

  return undefined;
}
