/**
 * @fileoverview canonicalDocumentSync unit tests — ADR-916 Phase 2 G3 Sub-Phase B Step 1a
 *
 * 검증 영역:
 * 1. lifecycle — start / stop, initial schedule
 * 2. null projectId no-op
 * 3. propagation — elementsMap / pages / layouts / currentProjectId 변경 → canonical store update
 * 4. microtask coalesce — 동일 macrotask 내 다중 mutation → 1번 sync
 *
 * **scheduler override 패턴**: production 의 `queueMicrotask` 는 microtask
 * tick 대기. test 에서는 `setSyncScheduler((cb) => cb())` 로 즉시 실행 모드 사용.
 * coalesce 검증만 default scheduler 로 별도 진행.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useDataStore } from "../../data";
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
  useDataStore.setState({ currentProjectId: null });
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

describe("startCanonicalDocumentSync — lifecycle", () => {
  it("start 시 initial sync schedule", () => {
    useDataStore.setState({ currentProjectId: "proj-a" });
    stopSync = startCanonicalDocumentSync();

    // immediate scheduler 로 인해 setDocument 즉시 실행됨.
    const canonical = useCanonicalDocumentStore.getState();
    expect(canonical.documents.has("proj-a")).toBe(true);
    expect(canonical.currentProjectId).toBe("proj-a");
  });

  it("stop 후 mutation 발생해도 canonical store 변경 안 됨", () => {
    useDataStore.setState({ currentProjectId: "proj-a" });
    const stop = startCanonicalDocumentSync();
    stop();

    const versionBefore = useCanonicalDocumentStore.getState().documentVersion;
    useStore.setState({ pages: [{ id: "p1", title: "P1" } as never] });

    const versionAfter = useCanonicalDocumentStore.getState().documentVersion;
    expect(versionAfter).toBe(versionBefore);
  });

  it("isSyncScheduled — schedule 후 실행 전 true, 실행 후 false", () => {
    // immediate scheduler 로 schedule 호출 즉시 false 복귀.
    useDataStore.setState({ currentProjectId: "proj-a" });
    stopSync = startCanonicalDocumentSync();
    // initial sync 가 immediate 로 실행되었으므로 false.
    expect(isSyncScheduled()).toBe(false);
  });
});

// ─────────────────────────────────────────────
// B. null projectId no-op
// ─────────────────────────────────────────────

describe("currentProjectId null → no-op", () => {
  it("currentProjectId 가 null 이면 setDocument 호출 안 됨", () => {
    // currentProjectId = null (default)
    stopSync = startCanonicalDocumentSync();

    const canonical = useCanonicalDocumentStore.getState();
    expect(canonical.documents.size).toBe(0);
    expect(canonical.documentVersion).toBe(0);
  });

  it("null 이었다가 setCurrentProjectId 후 sync 재개", () => {
    stopSync = startCanonicalDocumentSync();
    expect(useCanonicalDocumentStore.getState().documents.size).toBe(0);

    useDataStore.setState({ currentProjectId: "proj-late" });

    expect(
      useCanonicalDocumentStore.getState().documents.has("proj-late"),
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────
// C. Mutation propagation
// ─────────────────────────────────────────────

describe("mutation propagation", () => {
  beforeEach(() => {
    useDataStore.setState({ currentProjectId: "proj-a" });
  });

  it("elementsMap 변경 → canonical store re-sync", () => {
    stopSync = startCanonicalDocumentSync();
    const v0 = useCanonicalDocumentStore.getState().documentVersion;

    useStore.setState({ elementsMap: new Map() });

    const v1 = useCanonicalDocumentStore.getState().documentVersion;
    expect(v1).toBeGreaterThan(v0);
  });

  it("pages 변경 → canonical store re-sync", () => {
    stopSync = startCanonicalDocumentSync();
    const v0 = useCanonicalDocumentStore.getState().documentVersion;

    useStore.setState({ pages: [] });

    const v1 = useCanonicalDocumentStore.getState().documentVersion;
    expect(v1).toBeGreaterThan(v0);
  });

  it("layouts 변경 → canonical store re-sync", () => {
    stopSync = startCanonicalDocumentSync();
    const v0 = useCanonicalDocumentStore.getState().documentVersion;

    useLayoutsStore.setState({ layouts: [] });

    const v1 = useCanonicalDocumentStore.getState().documentVersion;
    expect(v1).toBeGreaterThan(v0);
  });

  it("currentProjectId 변경 → canonical store currentProjectId 추종", () => {
    stopSync = startCanonicalDocumentSync();
    expect(useCanonicalDocumentStore.getState().currentProjectId).toBe(
      "proj-a",
    );

    useDataStore.setState({ currentProjectId: "proj-b" });

    expect(useCanonicalDocumentStore.getState().currentProjectId).toBe(
      "proj-b",
    );
    expect(useCanonicalDocumentStore.getState().documents.has("proj-b")).toBe(
      true,
    );
  });

  it("동일 ref 변경 (no actual change) → sync skip", () => {
    stopSync = startCanonicalDocumentSync();
    const v0 = useCanonicalDocumentStore.getState().documentVersion;

    // 동일 ref 로 setState — listener 호출되지만 ref 비교에서 skip.
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
  beforeEach(() => {
    useDataStore.setState({ currentProjectId: "proj-a" });
  });

  it("default queueMicrotask scheduler 로 다중 mutation → 1번 sync", async () => {
    // default scheduler 복원 (queueMicrotask)
    resetSyncScheduler();
    stopSync = startCanonicalDocumentSync();

    // initial sync 가 microtask 에 schedule 됨 — flush.
    await Promise.resolve();
    const v0 = useCanonicalDocumentStore.getState().documentVersion;

    // 동일 macrotask 안에서 3번 변경.
    useStore.setState({ elementsMap: new Map() });
    useStore.setState({ pages: [{ id: "p1", title: "P1" } as never] });
    useLayoutsStore.setState({ layouts: [] });

    expect(isSyncScheduled()).toBe(true);

    // microtask flush.
    await Promise.resolve();

    expect(isSyncScheduled()).toBe(false);
    const v1 = useCanonicalDocumentStore.getState().documentVersion;
    // 3번 mutation 이 1번 sync 로 collapse — version 정확히 1 증가.
    expect(v1 - v0).toBe(1);
  });
});
