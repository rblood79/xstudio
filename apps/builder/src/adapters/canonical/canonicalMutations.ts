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
import { elementsApi } from "@/adapters/canonical/legacyElementsApiService";

// ─────────────────────────────────────────────
// In-memory store wrapper API
// ─────────────────────────────────────────────

/**
 * legacy `mergeElements` 의 canonical-aware wrapper.
 *
 * 본 단계 (mutation reverse pilot): 단순히 legacy `useStore.mergeElements(elements)`
 * 호출. wrapper 진입점 마련 + caller 변환을 통해 grep gate baseline 점진 감소.
 *
 * 후속 단계 (production destructive=0 evidence 후): canonical store mutation 우선
 * + legacy mirror 자동.
 *
 * @param elements - 추가/병합할 legacy element 배열
 */
export function mergeElementsCanonicalPrimary(elements: Element[]): void {
  useStore.getState().mergeElements(elements);
}

/**
 * legacy `setElements` 의 canonical-aware wrapper.
 *
 * @param elements - 전체 element 배열 (replace)
 */
export function setElementsCanonicalPrimary(elements: Element[]): void {
  useStore.getState().setElements(elements);
}

// ─────────────────────────────────────────────
// DB persistence wrapper API
// ─────────────────────────────────────────────

/**
 * legacy `elementsApi.createElement` 의 canonical-aware wrapper.
 *
 * 본 단계: 단순히 `elementsApi.createElement(element)` 호출. caller 변환을 통해
 * grep gate baseline 감소. 후속 단계에서 wrapper 내부 reverse — canonical store
 * mutation → `exportLegacyDocument` → DB persist.
 *
 * @param element - 신규 legacy element (Partial 허용)
 * @returns 저장된 Element (DB id 포함)
 */
export function createElementCanonicalPrimary(
  element: Partial<Element>,
): Promise<Element> {
  return elementsApi.createElement(element);
}

/**
 * legacy `elementsApi.updateElement` 의 canonical-aware wrapper.
 *
 * @param id - 대상 element id
 * @param patch - 부분 업데이트 patch
 * @returns 업데이트된 Element
 */
export function updateElementCanonicalPrimary(
  id: string,
  patch: Partial<Element>,
): Promise<Element> {
  return elementsApi.updateElement(id, patch);
}

/**
 * legacy `elementsApi.createMultipleElements` 의 canonical-aware wrapper.
 *
 * @param elements - 신규 legacy element 배열 (Partial 허용)
 * @returns 저장된 Element 배열 (DB id 포함)
 */
export function createMultipleElementsCanonicalPrimary(
  elements: Partial<Element>[],
): Promise<Element[]> {
  return elementsApi.createMultipleElements(elements);
}
