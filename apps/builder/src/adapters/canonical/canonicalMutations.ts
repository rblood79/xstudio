/**
 * @fileoverview ADR-916 Phase 3 G4 — Canonical mutation wrapper (mutation reverse 진정 진입점).
 *
 * caller 가 legacy `setElements` / `mergeElements` 직접 호출 대신 본 wrapper 를
 * 경유. design §8.6 grep gate 의 단일 SSOT 격리 (D18=A) 정합.
 *
 * **2026-05-02 direct cutover**:
 *
 * in-memory wrapper (merge/set) 가 항상 canonical primary 로 동작한다.
 * (1) 현재 legacy snapshot 과 입력 elements merge → (2) `legacyToCanonical()`
 * full doc 재구성 → (3) canonical store `setDocument` push →
 * (4) `exportLegacyDocument()` 결과를 legacy mirror 로 `setElements()` 호출.
 *   DB wrapper (create/update/createMultiple) 는 reverse 영향 없음 — DB persist
 *   자체는 elementsApi 그대로 사용 (D17=A 채택, schema 미변경).
 *
 * **무한 루프 방지**: canonical setDocument → legacy mirror → useStore.subscribe
 * 순서로 sync 가 재호출될 수 있으나, 같은 document 를 재계산해 canonical store 에
 * 반영하는 idempotent path 로 유지한다.
 *
 * **파일 위치 의도**: `apps/builder/src/adapters/canonical/` 안에 둠 → design
 * §8.6 grep gate 의 `apps/builder/src/adapters/**` exclude 패턴 안에 들어가서
 * grep gate 의 violation 카운트에서 자동 제외. caller 변환 1개당 baseline 1
 * 감소.
 *
 * **Circular dependency 해소 (DI pattern)**:
 * elements.ts → canonicalMutations.ts → stores/index → elements.ts 의 ESM
 * circular import chain 을 callback registration 으로 차단. BuilderCore mount
 * 시점에 `registerCanonicalMutationStoreActions` 로 store action 주입.
 * 테스트 환경에서는 `vi.mock` 또는 `registerCanonicalMutationStoreActions` 로
 * mock action 주입 가능.
 */

import type { Element } from "@/types/builder/unified.types";
import type { Page, Layout } from "@/types/builder/unified.types";
import { elementsApi } from "@/adapters/canonical/legacyElementsApiService";
import { exportLegacyDocument } from "./exportLegacyDocument";
import { legacyToCanonical } from "@/adapters/canonical";
import { convertComponentRole } from "@/adapters/canonical/componentRoleAdapter";
import { convertPageLayout } from "@/adapters/canonical/slotAndLayoutAdapter";
import { useCanonicalDocumentStore } from "@/builder/stores/canonical/canonicalDocumentStore";

// ─────────────────────────────────────────────
// Callback registration (DI pattern)
// ─────────────────────────────────────────────

/**
 * canonical primary reverse path 에 필요한 legacy snapshot 형태.
 */
export type LegacySnapshot = {
  elements: Element[];
  pages: Page[];
  layouts: Layout[];
};

/**
 * store action 타입 — wrapper 가 호출하는 최소 action 집합.
 * useStore 전체 타입 의존을 피해 circular import chain 차단.
 *
 * **2026-05-02 §8.7 확장**: canonical primary reverse path 용 3 callback 추가
 * (`getCurrentLegacySnapshot` / `getCurrentProjectId`).
 */
export type CanonicalMutationStoreActions = {
  mergeElements: (els: Element[]) => void;
  setElements: (els: Element[]) => void;
  /** canonical primary path: 현재 legacy state 전체 snapshot 조회 */
  getCurrentLegacySnapshot: () => LegacySnapshot;
  /** canonical primary path: 활성 projectId (canonical store setDocument target) */
  getCurrentProjectId: () => string | null;
};

let _registeredActions: CanonicalMutationStoreActions | null = null;

/**
 * BuilderCore (또는 테스트 setup) 에서 store action 을 주입한다.
 * mount useEffect 에서 1회 호출.
 *
 * @example
 * // BuilderCore.tsx
 * useEffect(() => {
 *   registerCanonicalMutationStoreActions({
 *     mergeElements: useStore.getState().mergeElements,
 *     setElements: useStore.getState().setElements,
 *     getCurrentLegacySnapshot: () => ({
 *       elements: Array.from(useStore.getState().elementsMap.values()),
 *       pages: useStore.getState().pages,
 *       layouts: useLayoutsStore.getState().layouts,
 *     }),
 *     getCurrentProjectId: () => projectId ?? null,
 *   });
 * }, [projectId]);
 */
export function registerCanonicalMutationStoreActions(
  actions: CanonicalMutationStoreActions,
): void {
  _registeredActions = actions;
}

/**
 * 테스트 / 모듈 재로드 후 등록된 action 을 초기화한다.
 * afterEach 에서 호출 가능 (선택적).
 */
export function resetCanonicalMutationStoreActions(): void {
  _registeredActions = null;
}

function getActions(): CanonicalMutationStoreActions {
  if (!_registeredActions) {
    throw new Error(
      "[canonicalMutations] store actions not registered. " +
        "Call registerCanonicalMutationStoreActions() before using mutation wrappers.",
    );
  }
  return _registeredActions;
}

// ─────────────────────────────────────────────
// Canonical primary reverse path (§8.7)
// ─────────────────────────────────────────────

/**
 * mergeElements 의 canonical primary 변형.
 *
 * 1. 현재 legacy snapshot + 입력 elements merge (동일 id 면 입력으로 덮어쓰기)
 * 2. `legacyToCanonical(merged)` full doc 재구성
 * 3. canonical store `setDocument` push
 * 4. `exportLegacyDocument(doc)` → legacy `setElements` mirror
 */
function applyCanonicalPrimaryMerge(elements: Element[]): void {
  const actions = getActions();
  const snapshot = actions.getCurrentLegacySnapshot();

  // merge: 기존 + 입력 (동일 id 면 입력으로 덮어쓰기)
  const mergedById = new Map<string, Element>();
  for (const el of snapshot.elements) {
    mergedById.set(el.id, el);
  }
  for (const el of elements) {
    mergedById.set(el.id, el);
  }
  const mergedElements = Array.from(mergedById.values());

  // canonical doc 생성 + canonical store push
  const doc = legacyToCanonical(
    {
      elements: mergedElements,
      pages: snapshot.pages,
      layouts: snapshot.layouts,
    },
    { convertComponentRole, convertPageLayout },
  );
  const projectId = actions.getCurrentProjectId();
  if (projectId) {
    useCanonicalDocumentStore.getState().setDocument(projectId, doc);
  }

  // legacy mirror — exportLegacyDocument round-trip 결과
  const legacyMirror = exportLegacyDocument(doc);
  actions.setElements(legacyMirror);
}

/**
 * setElements 의 canonical primary 변형.
 *
 * 1. 입력 elements + 기존 pages/layouts (snapshot) 으로 full doc 재구성
 * 2. canonical store `setDocument` push
 * 3. `exportLegacyDocument(doc)` → legacy `setElements` mirror
 */
function applyCanonicalPrimarySet(elements: Element[]): void {
  const actions = getActions();
  const snapshot = actions.getCurrentLegacySnapshot();

  const doc = legacyToCanonical(
    {
      elements,
      pages: snapshot.pages,
      layouts: snapshot.layouts,
    },
    { convertComponentRole, convertPageLayout },
  );
  const projectId = actions.getCurrentProjectId();
  if (projectId) {
    useCanonicalDocumentStore.getState().setDocument(projectId, doc);
  }

  const legacyMirror = exportLegacyDocument(doc);
  actions.setElements(legacyMirror);
}

// ─────────────────────────────────────────────
// In-memory store wrapper API
// ─────────────────────────────────────────────

/**
 * legacy `mergeElements` 의 canonical-aware wrapper.
 *
 * canonical store mutation 우선 + legacy mirror 자동.
 *
 * @param elements - 추가/병합할 legacy element 배열
 */
export function mergeElementsCanonicalPrimary(elements: Element[]): void {
  applyCanonicalPrimaryMerge(elements);
}

/**
 * legacy `setElements` 의 canonical-aware wrapper.
 *
 * canonical store mutation 우선 + legacy mirror 자동.
 *
 * @param elements - 전체 element 배열 (replace)
 */
export function setElementsCanonicalPrimary(elements: Element[]): void {
  applyCanonicalPrimarySet(elements);
}

// ─────────────────────────────────────────────
// DB persistence wrapper API
// ─────────────────────────────────────────────
//
// DB wrapper 3개는 §8.7 reverse 영향 없음 — D17=A 채택 (schema 미변경, DB row =
// legacy export 결과). DB persist 후 caller 가 반환 Element 받아서 in-memory
// wrapper (merge/set) 호출 → 그 시점에 canonical primary path 가동.

/**
 * legacy `elementsApi.createElement` 의 canonical-aware wrapper.
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
