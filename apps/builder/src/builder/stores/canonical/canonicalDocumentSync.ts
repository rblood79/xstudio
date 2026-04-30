/**
 * @fileoverview Legacy → Canonical write-through sync — ADR-916 Phase 2 G3 Sub-Phase B Step 1a
 *
 * Phase 2 hot path cutover 의 prerequisite. legacy 3 store
 * (`useStore` / `useLayoutsStore` / `useDataStore`) 의 mutation 을 감지하여
 * `selectCanonicalDocument()` 결과를 `useCanonicalDocumentStore.setDocument()`
 * 로 자동 push.
 *
 * **D7=A 채택 근거**:
 * - design §6-E "legacy elementsMap 양방향 sync — Phase 2 hot path cutover (G3)
 *   와 함께" 의 정통 경로.
 * - canonical store 가 진정한 mirror 가 됨 (단방향 sync 우선, mutation 경로
 *   양방향 sync 는 Phase 3 G4).
 * - 한 번 변환 → 모든 hot path 동일 reference (`useSyncExternalStore` snapshot
 *   stability 보장).
 *
 * **D9=i 채택 근거**:
 * - Zustand v5 native `subscribe` API + ref 비교 selector — middleware 추가
 *   없이 legacy store 무수정.
 * - `subscribeWithSelector` middleware 미사용 → store 의 subscribe listener
 *   가 store 전체 변경마다 호출 + ref 비교를 listener 안에서 처리.
 *
 * **microtask coalesce**:
 * - rapid mutation (예: batchUpdateElementOrders 의 단일 set() 안에서 다중 변경)
 *   에서 매번 sync 실행하면 cost. queueMicrotask 로 1 macrotask 안의 모든 변경
 *   을 1번 sync 로 collapse.
 * - 첫 변경 감지 → schedule → microtask flush 시 actual sync. 추가 변경이
 *   같은 macrotask 안에서 발생하면 schedule no-op.
 *
 * **Sub-Phase B Step 1b 진입 prerequisite**:
 * - 본 모듈 land 후 LayerTree pilot 의 `useActiveCanonicalDocument()` 가
 *   실제 데이터를 수신 — pilot 진입 가능.
 * - 5 hot path 모두 본 모듈 의존.
 */

import { useStore } from "..";
import { useLayoutsStore } from "../layouts";
import { useDataStore } from "../data";
import { selectCanonicalDocument } from "../elements";
import { useCanonicalDocumentStore } from "./canonicalDocumentStore";

// ─────────────────────────────────────────────
// Sync state
// ─────────────────────────────────────────────

let syncScheduled = false;

/**
 * coalesced sync 실행. 호출 시 microtask 가 이미 예약되어 있으면 no-op.
 *
 * `scheduler` 는 default `queueMicrotask` 이고, test 가 즉시 실행 mode 로
 * override 가능 (`setSyncScheduler(fn)`).
 */
let scheduler: (cb: () => void) => void = queueMicrotask;

function performSync(): void {
  syncScheduled = false;

  const projectId = useDataStore.getState().currentProjectId;
  // [ADR-916] 임시 진단 — Step 1b 검증 후 제거
  console.log("[ADR-916] performSync", {
    projectId,
    elementsMapSize: useStore.getState().elementsMap.size,
  });
  if (!projectId) {
    return;
  }

  const elementsState = useStore.getState();
  const layouts = useLayoutsStore.getState().layouts;

  const doc = selectCanonicalDocument(
    elementsState,
    elementsState.pages,
    layouts,
  );

  const canonical = useCanonicalDocumentStore.getState();
  canonical.setDocument(projectId, doc);
  if (canonical.currentProjectId !== projectId) {
    canonical.setCurrentProject(projectId);
  }
  console.log("[ADR-916] performSync done", {
    docChildren: doc.children.length,
    canonicalVersion: useCanonicalDocumentStore.getState().documentVersion,
  });
}

function scheduleSync(): void {
  if (syncScheduled) {
    console.log("[ADR-916] scheduleSync — already scheduled, skip");
    return;
  }
  syncScheduled = true;
  console.log("[ADR-916] scheduleSync — queued");
  scheduler(performSync);
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * legacy → canonical write-through sync 시작. 반환값 = unsubscribe 함수.
 *
 * **호출 site**: builder 부트스트랩 (`apps/builder/src/main.tsx` 또는
 * project init effect). Sub-Phase B Step 1a 단계에서는 본 함수가 land 만
 * 되고, 실제 호출 site 추가는 Step 1b 진입 시점 (LayerTree pilot 과 함께).
 *
 * - 시작 시 1회 즉시 schedule (canonical store 초기 hydration).
 * - 3 store mutation 감지 시 schedule.
 * - 같은 macrotask 안의 다중 변경은 1번 sync 로 coalesce.
 * - 호출자가 unsubscribe 하면 sync 중단.
 *
 * @example
 *   const stop = startCanonicalDocumentSync();
 *   // ... 앱 실행
 *   stop(); // cleanup
 */
export function startCanonicalDocumentSync(): () => void {
  console.log("[ADR-916] startCanonicalDocumentSync — register listeners");
  // initial sync — canonical store 가 처음 hydration 됨.
  scheduleSync();

  const unsubElements = useStore.subscribe((state, prev) => {
    // ref 비교 — elementsMap 또는 pages 변경 시만 sync.
    if (state.elementsMap === prev.elementsMap && state.pages === prev.pages) {
      return;
    }
    console.log("[ADR-916] elements listener fired", {
      sizeBefore: prev.elementsMap.size,
      sizeAfter: state.elementsMap.size,
    });
    scheduleSync();
  });

  const unsubLayouts = useLayoutsStore.subscribe((state, prev) => {
    if (state.layouts === prev.layouts) return;
    console.log("[ADR-916] layouts listener fired");
    scheduleSync();
  });

  const unsubData = useDataStore.subscribe((state, prev) => {
    console.log("[ADR-916] dataStore listener fired", {
      curr: state.currentProjectId,
      prev: prev.currentProjectId,
    });
    if (state.currentProjectId === prev.currentProjectId) return;
    scheduleSync();
  });

  return () => {
    unsubElements();
    unsubLayouts();
    unsubData();
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
