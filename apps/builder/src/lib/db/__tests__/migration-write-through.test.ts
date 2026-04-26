// @vitest-environment jsdom

/**
 * ADR-903 P3-E E-6 — runLegacyToCanonicalMigration write-through 활성화
 *
 * E-3 단계는 dry-run 만 (DB write 0). E-6 에서 dryRun=false 옵션으로 실제
 * `elements.updateMany()` 와 `meta.set()` 호출 활성화. 실패 시
 * `_meta.schemaVersion = "legacy"` 자동 설정 + console.warn.
 *
 * 검증 시나리오:
 * - dryRun=false + status=success → elements.updateMany + meta.set composition-1.0
 * - dryRun=false + status=failure (orphan) → meta.set legacy + elements.updateMany 호출 0
 * - dryRun=true (default 보존) → write 호출 0 (E-3 호환)
 * - dryRun=false + skipped (이미 composition-1.0) → write 호출 0
 *
 * RED → GREEN 전략:
 * - RED: migration.ts 가 아직 dry-run 만 → assertion FAIL
 * - GREEN: migration.ts 에 write-through 분기 추가 후 ALL PASS
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { CompositionDocument } from "@composition/shared";
import type { Element } from "../../../types/core/store.types";
import type { Layout } from "../../../types/builder/layout.types";
import type { MetaRecord } from "../types";

// ─────────────────────────────────────────────
// Mock — createMigrationBackup
// ─────────────────────────────────────────────

vi.mock("../migrationBackup", () => ({
  createMigrationBackup: vi.fn(
    async (_adapter: unknown, projectId: string) =>
      `composition-migration-backup:${projectId}:1700000000000`,
  ),
}));

// ─────────────────────────────────────────────
// Mock adapter helper (E-3 패턴 재사용)
// ─────────────────────────────────────────────

type MockMetaRecord = MetaRecord | null;

interface MockAdapter {
  elements: {
    getAll: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  layouts: {
    getAll: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  meta: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
}

function buildMockAdapter(
  elements: Element[],
  layouts: Layout[],
  metaRecord: MockMetaRecord = null,
): MockAdapter {
  return {
    elements: {
      getAll: vi.fn(async () => elements),
      insert: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(async () => undefined),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    layouts: {
      getAll: vi.fn(async () => layouts),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    meta: {
      get: vi.fn(async () => metaRecord),
      set: vi.fn(async () => undefined),
      update: vi.fn(async () => undefined),
    },
  };
}

// ─────────────────────────────────────────────
// canonical document fixture builders (E-3 패턴)
// ─────────────────────────────────────────────

function buildPageNode(pageId: string) {
  return {
    id: pageId,
    type: "ref" as const,
    component: "page",
    children: [],
  };
}

function buildReusableFrameNode(frameId: string, name: string) {
  return {
    id: frameId,
    type: "frame" as const,
    reusable: true,
    name,
    children: [],
  };
}

function buildDoc(opts: {
  pageIds?: string[];
  reusableFrameIds?: string[];
}): CompositionDocument {
  const children = [
    ...(opts.pageIds ?? []).map(buildPageNode),
    ...(opts.reusableFrameIds ?? []).map((id) =>
      buildReusableFrameNode(id, id),
    ),
  ];
  return {
    version: "1.0",
    children,
    variables: {},
    themes: { active: null, themes: {} },
  } as unknown as CompositionDocument;
}

function buildElement(
  id: string,
  ownership: { page_id?: string | null; layout_id?: string | null },
  extras: Partial<Element> = {},
): Element {
  return {
    id,
    page_id: ownership.page_id ?? null,
    layout_id: ownership.layout_id ?? null,
    parent_id: null,
    tag: "Container",
    props: {},
    order_num: 0,
    ...extras,
  } as unknown as Element;
}

// ─────────────────────────────────────────────
// E-6 write-through tests
// ─────────────────────────────────────────────

describe("P3-E E-6: runLegacyToCanonicalMigration write-through", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("dryRun=false + status=success", () => {
    it("elements.updateMany 가 transformations 갯수만큼 호출되고 parent_id/layout_id payload 가 변환된다", async () => {
      const { runLegacyToCanonicalMigration } = await import("../migration");
      const elements = [
        buildElement("e1", { layout_id: "frame-A" }),
        buildElement("e2", { page_id: "p1" }),
      ];
      const adapter = buildMockAdapter(elements, []);
      const doc = buildDoc({
        pageIds: ["p1"],
        reusableFrameIds: ["layout-frame-A"],
      });
      const result = await runLegacyToCanonicalMigration(adapter, "proj-w1", {
        canonicalDoc: doc,
        dryRun: false,
      });
      expect(result.status).toBe("success");
      // updateMany 가 호출되어야 함 (1회 — 배치 처리)
      expect(adapter.elements.updateMany).toHaveBeenCalledTimes(1);
      const callArg = adapter.elements.updateMany.mock.calls[0]?.[0] as Array<{
        id: string;
        data: { parent_id: string | null; layout_id: null };
      }>;
      expect(callArg).toHaveLength(2);
      expect(callArg).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "e1",
            data: expect.objectContaining({
              parent_id: "layout-frame-A",
              layout_id: null,
            }),
          }),
          expect.objectContaining({
            id: "e2",
            data: expect.objectContaining({
              parent_id: "p1",
              layout_id: null,
            }),
          }),
        ]),
      );
    });

    it("meta.set 이 schemaVersion='composition-1.0' + backupKey + migratedAt 으로 호출된다", async () => {
      const { runLegacyToCanonicalMigration } = await import("../migration");
      const elements = [buildElement("e1", { page_id: "p1" })];
      const adapter = buildMockAdapter(elements, []);
      const doc = buildDoc({ pageIds: ["p1"] });
      await runLegacyToCanonicalMigration(adapter, "proj-w2", {
        canonicalDoc: doc,
        dryRun: false,
      });
      expect(adapter.meta.set).toHaveBeenCalledTimes(1);
      const setArg = adapter.meta.set.mock.calls[0]?.[0] as MetaRecord;
      expect(setArg).toMatchObject({
        projectId: "proj-w2",
        schemaVersion: "composition-1.0",
        backupKey: expect.stringMatching(
          /^composition-migration-backup:proj-w2:\d+$/,
        ),
        migratedAt: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        ),
      });
    });
  });

  describe("dryRun=false + status=failure (orphan/missing parent)", () => {
    it("elements.updateMany 는 호출되지 않고 meta.set 이 schemaVersion='legacy' 로 호출된다", async () => {
      const { runLegacyToCanonicalMigration } = await import("../migration");
      const elements = [buildElement("e1", {})]; // orphan
      const adapter = buildMockAdapter(elements, []);
      const doc = buildDoc({});
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await runLegacyToCanonicalMigration(adapter, "proj-w3", {
        canonicalDoc: doc,
        dryRun: false,
      });

      expect(result.status).toBe("failure");
      expect(adapter.elements.updateMany).not.toHaveBeenCalled();
      expect(adapter.meta.set).toHaveBeenCalledTimes(1);
      const setArg = adapter.meta.set.mock.calls[0]?.[0] as MetaRecord;
      expect(setArg).toMatchObject({
        projectId: "proj-w3",
        schemaVersion: "legacy",
        backupKey: expect.stringMatching(
          /^composition-migration-backup:proj-w3:\d+$/,
        ),
      });
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe("dryRun=true (E-3 보존) — write 호출 0", () => {
    it("dryRun=true 명시 시 updateMany / meta.set 모두 호출 안 됨", async () => {
      const { runLegacyToCanonicalMigration } = await import("../migration");
      const elements = [buildElement("e1", { layout_id: "frame-A" })];
      const adapter = buildMockAdapter(elements, []);
      const doc = buildDoc({ reusableFrameIds: ["layout-frame-A"] });
      await runLegacyToCanonicalMigration(adapter, "proj-w4", {
        canonicalDoc: doc,
        dryRun: true,
      });
      expect(adapter.elements.updateMany).not.toHaveBeenCalled();
      expect(adapter.meta.set).not.toHaveBeenCalled();
    });
  });

  describe("dryRun=false + 이미 composition-1.0 (skipped)", () => {
    it("elements.updateMany / meta.set 모두 호출 안 됨", async () => {
      const { runLegacyToCanonicalMigration } = await import("../migration");
      const adapter = buildMockAdapter([], [], {
        projectId: "proj-w5",
        schemaVersion: "composition-1.0",
        migratedAt: "2026-04-26T00:00:00.000Z",
      });
      const doc = buildDoc({});
      const result = await runLegacyToCanonicalMigration(adapter, "proj-w5", {
        canonicalDoc: doc,
        dryRun: false,
      });
      expect(result.status).toBe("skipped");
      expect(adapter.elements.updateMany).not.toHaveBeenCalled();
      expect(adapter.meta.set).not.toHaveBeenCalled();
    });
  });
});
