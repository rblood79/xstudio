/**
 * @fileoverview ADR-910 Phase 1 — Variables Read-Only Snapshot Adapter
 *
 * ADR-022 TokenRef/CSS 변수 체계의 현재 상태를 canonical document `variables` 필드로
 * 투영하는 read-only snapshot adapter.
 *
 * **Read-only 원칙 (ADR-910 대안 B)**:
 * - canonical document → tokenResolver 쓰기 금지 (Phase 2 write-through 에서 구현)
 * - 런타임 변수 resolve 는 여전히 `tokenResolver.ts` 가 SSOT
 * - `snapshotVariablesFromTokens()` 는 call-time 직렬화 — subscribe 기반 아님
 *   (ADR-910 R4 대응: stale snapshot 방지)
 *
 * **VariablesSnapshot 설계 (ADR-910 R3)**:
 * - `source: "spec-token" | "user-defined"` 구분자로 출처 명시
 * - user-defined variable authoring UI 는 후속 Phase 로 이관
 *
 * **Phase 2 예고**:
 * - `resolveCanonicalVariable(ref, document)` 함수가 추가되어
 *   `tokenResolver.ts` 결과와 동일 값 반환 검증 (Gate G-B 조건)
 */

import type {
  CompositionDocument,
  VariablesSnapshot,
  VariablesSnapshotEntry,
} from "@composition/shared";

// Re-export for convenience (adapter 소비자가 별도 import 불필요)
export type {
  VariablesSnapshot,
  VariablesSnapshotEntry,
} from "@composition/shared";

// ─────────────────────────────────────────────
// ResolvedTokenMap — adapter DI 계약
// ─────────────────────────────────────────────

/**
 * adapter 가 필요로 하는 resolved token 최소 인터페이스.
 *
 * `tokenResolver.ts` 의 resolve 결과를 평탄화한 map.
 * 키: token 이름 (예: "color.accent", "color.base" 등)
 * 값: resolved 결과 (string = 색상값, number = 수치)
 *
 * 실제 `tokenResolver.ts` 의 resolve 파이프라인은 변경하지 않는다 (ADR-021/022 비파괴).
 */
export type ResolvedTokenMap = Record<string, string | number | boolean>;

// ─────────────────────────────────────────────
// Core adapter functions
// ─────────────────────────────────────────────

/**
 * Spec TokenRef resolve 결과 → `VariablesSnapshot` 직렬화.
 *
 * call-time 직렬화 (subscribe 기반 아님) — stale snapshot 방지 (ADR-910 R4).
 * `legacyToCanonical()` 호출 시 전달된 `getVariables()` 콜백에서 호출됨.
 *
 * @param resolvedTokens - tokenResolver.ts 의 resolve 결과 평탄화 map
 * @returns VariablesSnapshot — canonical document variables 필드에 주입할 snapshot
 */
export function snapshotVariablesFromTokens(
  resolvedTokens: ResolvedTokenMap,
): VariablesSnapshot {
  const snapshot: VariablesSnapshot = {};

  for (const [key, value] of Object.entries(resolvedTokens)) {
    let type: VariablesSnapshotEntry["type"];

    if (typeof value === "string") {
      type = "color"; // Spec TokenRef resolve 결과는 기본적으로 색상값
    } else if (typeof value === "number") {
      type = "number";
    } else if (typeof value === "boolean") {
      type = "boolean";
    } else {
      // 예외 케이스: 직렬화 불가 값은 스킵
      continue;
    }

    snapshot[key] = {
      type,
      value,
      source: "spec-token", // ADR-910 R3: Spec TokenRef 출처 명시
    };
  }

  return snapshot;
}

/**
 * 사용자 정의 변수 map → `VariablesSnapshot` 직렬화.
 *
 * Phase 1: user-defined variable authoring UI 미구현. 향후 사용 예약.
 * 이미 `VariableDefinition` 형태로 저장된 사용자 변수를 `VariablesSnapshot` 으로 변환.
 *
 * @param userVars - 사용자 정의 변수 map (`VariableDefinition` 구조와 동일)
 * @returns VariablesSnapshot (source: "user-defined" 로 마킹)
 */
export function snapshotUserDefinedVariables(
  userVars: Record<
    string,
    {
      type: "color" | "number" | "string" | "boolean";
      value: string | number | boolean;
    }
  >,
): VariablesSnapshot {
  const snapshot: VariablesSnapshot = {};

  for (const [key, def] of Object.entries(userVars)) {
    snapshot[key] = {
      type: def.type,
      value: def.value,
      source: "user-defined", // ADR-910 R3: 사용자 정의 변수 출처 명시
    };
  }

  return snapshot;
}

/**
 * canonical document 에서 `variables` 필드를 `VariablesSnapshot` 으로 읽기.
 *
 * Phase 2 write-through 이전: read-only accessor.
 * `variables` 필드가 없으면 `undefined` 반환.
 *
 * Phase 2 에서는 `resolveCanonicalVariable(ref, document)` 함수가 추가되어
 * `tokenResolver.ts` 결과와 동일 값 반환 검증이 가능해진다 (Gate G-B 조건).
 *
 * @param doc - canonical CompositionDocument
 * @returns VariablesSnapshot 또는 undefined (variables 필드 없음)
 */
export function readCanonicalVariables(
  doc: CompositionDocument,
): VariablesSnapshot | undefined {
  return doc.variables ?? undefined;
}
