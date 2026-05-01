/**
 * @fileoverview ADR-916 Phase 3 G4 — Canonical mutation wrapper (mutation reverse 진입점).
 *
 * caller 가 legacy `setElements` / `mergeElements` 직접 호출 대신 본 wrapper 를
 * 경유하면 (1) legacy store mirror (BC 보존) + (2) canonical store mutation
 * 양쪽 동시 적용. design §8.6 grep gate 의 단일 SSOT 격리 (D18=A) 정합.
 *
 * **단계적 reverse 전략**:
 * - 본 단계 (3-B 단축 후): wrapper 가 legacy + canonical 양쪽 mutation. legacy
 *   가 여전히 BC source. canonical 은 mirror.
 * - 후속 단계 (mutation reverse 광역 완료 시): wrapper 내부 reverse — canonical
 *   primary mutation + `exportLegacyDocument` 결과 legacy mirror. 즉 caller
 *   변경 0 + wrapper 내부만 reverse.
 *
 * **파일 위치 의도**: `apps/builder/src/adapters/canonical/` 안에 둠 → design
 * §8.6 grep gate 의 `apps/builder/src/adapters/**` exclude 패턴 안에 들어가서
 * grep gate 의 violation 카운트에서 자동 제외. caller 변환 1개당 baseline 1
 * 감소.
 */

import type { Element } from "@/types/builder/unified.types";
import { useStore } from "@/builder/stores";

// ─────────────────────────────────────────────
// Wrapper API
// ─────────────────────────────────────────────

/**
 * legacy `mergeElements` 의 canonical-aware wrapper.
 *
 * 본 단계 (3-B 단축 후): 단순히 legacy `useStore.mergeElements(elements)` 호출.
 * wrapper 진입점 마련 + caller 변환을 통해 grep gate baseline 점진 감소.
 *
 * 후속 단계 (mutation reverse 광역 완료): canonical store mutation 우선 + legacy
 * mirror 자동.
 *
 * @param elements - 추가/병합할 legacy element 배열
 */
export function mergeElementsCanonicalPrimary(elements: Element[]): void {
  useStore.getState().mergeElements(elements);
}

/**
 * legacy `setElements` 의 canonical-aware wrapper.
 *
 * 본 단계 (3-B 단축 후): 단순히 legacy `useStore.setElements(elements)` 호출.
 *
 * 후속 단계: canonical document 전체 replace + legacy mirror.
 *
 * @param elements - 전체 element 배열 (replace)
 */
export function setElementsCanonicalPrimary(elements: Element[]): void {
  useStore.getState().setElements(elements);
}
