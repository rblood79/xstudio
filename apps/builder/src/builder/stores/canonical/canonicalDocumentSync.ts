/**
 * @fileoverview Legacy → Canonical write-through sync — ADR-916 Phase 2 G3 Sub-Phase B
 *
 * caller-driven sync. caller (BuilderCore) 가 `startCanonicalDocumentSync(projectId)`
 * 로 sync 를 시작하면, legacy `useStore` / `useLayoutsStore` mutation 을 감지하여
 * `selectCanonicalDocument()` 결과를 `useCanonicalDocumentStore.setDocument()` 로
 * 자동 push.
 *
 * **caller-driven 전환 사유 (Step 1b dev 검증)**:
 * - 초기 design 은 `useDataStore.currentProjectId` subscribe 로 trigger 했으나,
 *   사용자 dev 환경에서 `useDataStore.isInitialized === false` (init useEffect 가
 *   sequential await 중 stuck 또는 condition skip) 로 인해 currentProjectId 가
 *   영구 null. dataStore 의존 자체가 fragile.
 * - caller (BuilderCore) 는 `useParams<{ projectId }>()` 로 routing 시점에 즉시
 *   projectId 를 알고 있음 → caller 가 명시 전달이 robust.
 *
 * **microtask coalesce**:
 * - rapid mutation (예: batchUpdateElementOrders 의 단일 set() 안에서 다중 변경)
 *   에서 매번 sync 실행하면 cost. queueMicrotask 로 1 macrotask 안의 모든 변경
 *   을 1번 sync 로 collapse.
 *
 * **2 store subscribe 만 유지**:
 * - useStore (elementsMap / pages) — native subscribe
 * - useLayoutsStore (layouts) — native subscribe (persist middleware native fallback OK)
 * - useDataStore subscribe 제거 — caller 가 projectId 명시 전달
 */

import { useStore } from "..";
import { useLayoutsStore } from "../layouts";
import { selectCanonicalDocument } from "../elements";
import { useCanonicalDocumentStore } from "./canonicalDocumentStore";

// ─────────────────────────────────────────────
// Sync state
// ─────────────────────────────────────────────

let syncScheduled = false;
let scheduler: (cb: () => void) => void = queueMicrotask;

function performSync(): void {
  syncScheduled = false;

  const canonical = useCanonicalDocumentStore.getState();
  const projectId = canonical.currentProjectId;
  if (!projectId) {
    // sync 가 stop 된 상태 (caller 가 cleanup 후 listener 가 늦게 fire).
    return;
  }

  const elementsState = useStore.getState();
  const layouts = useLayoutsStore.getState().layouts;

  const doc = selectCanonicalDocument(
    elementsState,
    elementsState.pages,
    layouts,
  );

  canonical.setDocument(projectId, doc);
}

function scheduleSync(): void {
  if (syncScheduled) return;
  syncScheduled = true;
  scheduler(performSync);
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * legacy → canonical write-through sync 시작.
 *
 * @param projectId — 활성 project id. caller (BuilderCore) 가 useParams 로
 *   가져온 routing 값을 명시 전달.
 * @returns unsubscribe 함수. 호출 시 listener 해제 + canonical store
 *   currentProjectId 를 null 로 reset (다른 project sync 시작 시 충돌 방지).
 *
 * **순서**:
 * 1. canonical store 의 currentProjectId 를 projectId 로 set.
 * 2. initial sync schedule — store hydration.
 * 3. useStore + useLayoutsStore subscribe 등록.
 *
 * @example
 *   const stop = startCanonicalDocumentSync(projectId);
 *   // ... Builder 작업
 *   stop(); // cleanup (route 이탈 시)
 */
export function startCanonicalDocumentSync(projectId: string): () => void {
  // 1. canonical store 의 active project 를 caller 가 직접 set.
  const canonical = useCanonicalDocumentStore.getState();
  if (canonical.currentProjectId !== projectId) {
    canonical.setCurrentProject(projectId);
  }

  // 2. initial sync — projectId 가 set 된 직후 즉시 hydration.
  scheduleSync();

  // 3. legacy 2 store subscribe (dataStore 제외).
  const unsubElements = useStore.subscribe((state, prev) => {
    if (state.elementsMap === prev.elementsMap && state.pages === prev.pages) {
      return;
    }
    scheduleSync();
  });

  const unsubLayouts = useLayoutsStore.subscribe((state, prev) => {
    if (state.layouts === prev.layouts) return;
    scheduleSync();
  });

  return () => {
    unsubElements();
    unsubLayouts();
    // canonical store 의 currentProjectId 를 null 로 reset — 다른 project sync
    // 시작 시 stale 데이터 노출 방지.
    useCanonicalDocumentStore.getState().setCurrentProject(null);
  };
}

// ─────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────

/**
 * scheduler override — vitest 에서 `(cb) => cb()` 로 즉시 실행하여
 * microtask flush 대기 없이 결과 검증.
 *
 * @internal — production 코드는 default `queueMicrotask` 의존.
 */
export function setSyncScheduler(fn: (cb: () => void) => void): void {
  scheduler = fn;
}

/** scheduler 를 default `queueMicrotask` 로 복원. */
export function resetSyncScheduler(): void {
  scheduler = queueMicrotask;
}

/** test 전용 — 현재 schedule 대기 상태 노출. */
export function isSyncScheduled(): boolean {
  return syncScheduled;
}
