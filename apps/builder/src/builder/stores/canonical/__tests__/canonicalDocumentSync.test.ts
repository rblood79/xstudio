/**
 * @fileoverview canonicalDocumentSync unit tests — ADR-916 Phase 2 G3 Sub-Phase B
 *
 * caller-driven sync 검증 (post Step 1b dev-fix):
 * 1. lifecycle — start(projectId) / stop, initial schedule + setCurrentProject
 * 2. 미호출 시 sync 0
 * 3. propagation — elementsMap / pages / layouts 변경 → canonical store update
 * 4. microtask coalesce — 동일 macrotask 내 다중 mutation → 1번 sync
 * 5. cleanup 시 canonical store currentProjectId reset
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useLayoutsStore } from "../../layouts";
import { useStore } from "../..";
import { useCanonicalDocumentStore } from "../canonicalDocumentStore";
import {
  isSyncScheduled,
  resetSyncScheduler,
  setSyncScheduler,
  startCanonicalDocumentSync,
} from "../canonicalDocumentSync";

// ─────────────────────────────────────────────
// Test setup
// ─────────────────────────────────────────────

let stopSync: (() => void) | null = null;

function resetCanonicalStore(): void {
  useCanonicalDocumentStore.setState({
    documents: new Map(),
    currentProjectId: null,
    documentVersion: 0,
  });
}

function resetLegacyStores(): void {
  useStore.setState({
    elementsMap: new Map(),
    pages: [],
  });
  useLayoutsStore.setState({ layouts: [] });
}

beforeEach(() => {
  resetCanonicalStore();
  resetLegacyStores();
  // immediate scheduler — microtask flush 대기 없이 결과 검증.
  setSyncScheduler((cb) => cb());
});

afterEach(() => {
  if (stopSync) {
    stopSync();
    stopSync = null;
  }
  resetSyncScheduler();
  resetCanonicalStore();
  resetLegacyStores();
});

// ─────────────────────────────────────────────
// A. Lifecycle
// ─────────────────────────────────────────────

describe("startCanonicalDocumentSync(projectId) — lifecycle", () => {
  it("start 시 projectId 즉시 set + initial sync", () => {
    stopSync = startCanonicalDocumentSync("proj-a");

    const canonical = useCanonicalDocumentStore.getState();
    expect(canonical.currentProjectId).toBe("proj-a");
    expect(canonical.documents.has("proj-a")).toBe(true);
  });

  it("이미 같은 projectId 면 setCurrentProject 호출 skip (불필요한 reference 변경 방지)", () => {
    useCanonicalDocumentStore.getState().setCurrentProject("proj-a");
    const versionBefore = useCanonicalDocumentStore.getState().documentVersion;

    stopSync = startCanonicalDocumentSync("proj-a");

    const canonical = useCanonicalDocumentStore.getState();
    // setDocument 는 호출 (initial sync) 됐지만 setCurrentProject 추가 호출 없음.
    expect(canonical.currentProjectId).toBe("proj-a");
    // documentVersion 은 setDocument 한 번만 = +1 보장.
    expect(canonical.documentVersion).toBe(versionBefore + 1);
  });

  it("stop 후 mutation 발생해도 canonical store 변경 안 됨", () => {
    const stop = startCanonicalDocumentSync("proj-a");
    stop();

    const versionBefore = useCanonicalDocumentStore.getState().documentVersion;
    useStore.setState({ pages: [{ id: "p1", title: "P1" } as never] });

    const versionAfter = useCanonicalDocumentStore.getState().documentVersion;
    expect(versionAfter).toBe(versionBefore);
  });

  it("stop 시 canonical store currentProjectId reset (null)", () => {
    const stop = startCanonicalDocumentSync("proj-a");
    expect(useCanonicalDocumentStore.getState().currentProjectId).toBe(
      "proj-a",
    );

    stop();
    expect(useCanonicalDocumentStore.getState().currentProjectId).toBeNull();
  });

  it("isSyncScheduled — immediate scheduler 로 schedule 즉시 false", () => {
    stopSync = startCanonicalDocumentSync("proj-a");
    expect(isSyncScheduled()).toBe(false);
  });
});

// ─────────────────────────────────────────────
// B. start 미호출 시 mutation 무시
// ─────────────────────────────────────────────

describe("start 미호출 시", () => {
  it("legacy mutation 발생해도 canonical store 변경 0", () => {
    // start 호출 안 함.
    useStore.setState({ elementsMap: new Map() });
    useLayoutsStore.setState({ layouts: [] });

    const canonical = useCanonicalDocumentStore.getState();
    expect(canonical.documents.size).toBe(0);
    expect(canonical.documentVersion).toBe(0);
  });
});

// ─────────────────────────────────────────────
// C. Mutation propagation
// ─────────────────────────────────────────────

describe("mutation propagation", () => {
  it("elementsMap 변경 → canonical store re-sync", () => {
    stopSync = startCanonicalDocumentSync("proj-a");
    const v0 = useCanonicalDocumentStore.getState().documentVersion;

    useStore.setState({ elementsMap: new Map() });

    const v1 = useCanonicalDocumentStore.getState().documentVersion;
    expect(v1).toBeGreaterThan(v0);
  });

  it("pages 변경 → canonical store re-sync", () => {
    stopSync = startCanonicalDocumentSync("proj-a");
    const v0 = useCanonicalDocumentStore.getState().documentVersion;

    useStore.setState({ pages: [] });

    const v1 = useCanonicalDocumentStore.getState().documentVersion;
    expect(v1).toBeGreaterThan(v0);
  });

  it("layouts 변경 → canonical store re-sync", () => {
    stopSync = startCanonicalDocumentSync("proj-a");
    const v0 = useCanonicalDocumentStore.getState().documentVersion;

    useLayoutsStore.setState({ layouts: [] });

    const v1 = useCanonicalDocumentStore.getState().documentVersion;
    expect(v1).toBeGreaterThan(v0);
  });

  it("동일 ref 변경 (no actual change) → sync skip", () => {
    stopSync = startCanonicalDocumentSync("proj-a");
    const v0 = useCanonicalDocumentStore.getState().documentVersion;

    const sameMap = useStore.getState().elementsMap;
    useStore.setState({ elementsMap: sameMap });

    const v1 = useCanonicalDocumentStore.getState().documentVersion;
    expect(v1).toBe(v0);
  });
});

// ─────────────────────────────────────────────
// D. Microtask coalesce
// ─────────────────────────────────────────────

describe("microtask coalesce", () => {
  it("default queueMicrotask scheduler 로 다중 mutation → 1번 sync", async () => {
    resetSyncScheduler();
    stopSync = startCanonicalDocumentSync("proj-a");

    // initial sync 가 microtask 에 schedule 됨 — flush.
    await Promise.resolve();
    const v0 = useCanonicalDocumentStore.getState().documentVersion;

    // 동일 macrotask 안에서 3번 변경.
    useStore.setState({ elementsMap: new Map() });
    useStore.setState({ pages: [{ id: "p1", title: "P1" } as never] });
    useLayoutsStore.setState({ layouts: [] });

    expect(isSyncScheduled()).toBe(true);

    await Promise.resolve();

    expect(isSyncScheduled()).toBe(false);
    const v1 = useCanonicalDocumentStore.getState().documentVersion;
    expect(v1 - v0).toBe(1);
  });
});
