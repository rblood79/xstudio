// @vitest-environment jsdom

/**
 * ADR-903 P3-E E-3 — runLegacyToCanonicalMigration (read-through dry-run)
 *
 * legacy ownership marker (page_id / layout_id) 를 canonical parent ID 로 변환
 * 계산하는 dry-run 함수. DB 무변경 — 실제 write 는 E-6 에서.
 *
 * 검증 시나리오:
 * - core contract: skip / dry-run / backup / transformations
 * - 50+ legacy fixture round-trip — layout / page / orphan / mixed
 *
 * RED → GREEN 전략:
 * - RED: production 파일 (`migration.ts`) 부재 시 import 실패로 모든 it FAIL
 * - GREEN: runLegacyToCanonicalMigration 구현 후 ALL PASS
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
// Mock adapter helper
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
      updateMany: vi.fn(),
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
      set: vi.fn(),
      update: vi.fn(),
    },
  };
}

// ─────────────────────────────────────────────
// canonical document fixture builders
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
    type: "Container",
    props: {},
    order_num: 0,
    ...extras,
  } as unknown as Element;
}

// ─────────────────────────────────────────────
// Core contract tests
// ─────────────────────────────────────────────

describe("P3-E E-3: runLegacyToCanonicalMigration (read-through dry-run)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("core contract", () => {
    it("runLegacyToCanonicalMigration 함수가 export 된다", async () => {
      const mod = await import("../migration");
      expect(typeof mod.runLegacyToCanonicalMigration).toBe("function");
    });

    it("이미 composition-1.0 schemaVersion 인 경우 status=skipped + transformations=[] + errors=[]", async () => {
      const { runLegacyToCanonicalMigration } = await import("../migration");
      const adapter = buildMockAdapter([], [], {
        projectId: "proj-x",
        schemaVersion: "composition-1.0",
        migratedAt: "2026-04-26T00:00:00.000Z",
      });
      const doc = buildDoc({ pageIds: [], reusableFrameIds: [] });
      const result = await runLegacyToCanonicalMigration(adapter, "proj-x", {
        canonicalDoc: doc,
      });
      expect(result.status).toBe("skipped");
      expect(result.transformations).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result.backupKey).toBeUndefined();
    });

    it("dry-run=true (default) — adapter write 메서드 호출 0건", async () => {
      const { runLegacyToCanonicalMigration } = await import("../migration");
      const elements: Element[] = [
        buildElement("e1", { layout_id: "frame-A" }),
        buildElement("e2", { page_id: "p1" }),
      ];
      const adapter = buildMockAdapter(elements, []);
      const doc = buildDoc({
        pageIds: ["p1"],
        reusableFrameIds: ["layout-frame-A"],
      });
      await runLegacyToCanonicalMigration(adapter, "proj-y", {
        canonicalDoc: doc,
      });
      expect(adapter.elements.insert).not.toHaveBeenCalled();
      expect(adapter.elements.update).not.toHaveBeenCalled();
      expect(adapter.elements.updateMany).not.toHaveBeenCalled();
      expect(adapter.elements.delete).not.toHaveBeenCalled();
      expect(adapter.elements.deleteMany).not.toHaveBeenCalled();
      expect(adapter.layouts.insert).not.toHaveBeenCalled();
      expect(adapter.layouts.update).not.toHaveBeenCalled();
      expect(adapter.layouts.delete).not.toHaveBeenCalled();
      expect(adapter.meta.set).not.toHaveBeenCalled();
      expect(adapter.meta.update).not.toHaveBeenCalled();
    });

    it("createMigrationBackup 호출되고 backupKey 가 반환 결과에 포함된다", async () => {
      const { runLegacyToCanonicalMigration } = await import("../migration");
      const { createMigrationBackup } = await import("../migrationBackup");
      const adapter = buildMockAdapter([], []);
      const doc = buildDoc({ pageIds: [], reusableFrameIds: [] });
      const result = await runLegacyToCanonicalMigration(adapter, "proj-z", {
        canonicalDoc: doc,
      });
      expect(createMigrationBackup).toHaveBeenCalledWith(adapter, "proj-z");
      expect(result.backupKey).toMatch(
        /^composition-migration-backup:proj-z:\d+$/,
      );
    });

    it("layout_id non-null element 는 transformations 에 canonical parent 와 함께 포함된다", async () => {
      const { runLegacyToCanonicalMigration } = await import("../migration");
      const elements = [buildElement("e1", { layout_id: "frame-A" })];
      const adapter = buildMockAdapter(elements, []);
      const doc = buildDoc({ reusableFrameIds: ["layout-frame-A"] });
      const result = await runLegacyToCanonicalMigration(adapter, "proj-1", {
        canonicalDoc: doc,
      });
      expect(result.transformations).toHaveLength(1);
      expect(result.transformations[0]).toMatchObject({
        elementId: "e1",
        page_id_was: null,
        layout_id_was: "frame-A",
        canonicalParentId: "layout-frame-A",
      });
    });

    it("page_id non-null element 는 transformations 에 page node ID 와 함께 포함된다", async () => {
      const { runLegacyToCanonicalMigration } = await import("../migration");
      const elements = [buildElement("e1", { page_id: "p1" })];
      const adapter = buildMockAdapter(elements, []);
      const doc = buildDoc({ pageIds: ["p1"] });
      const result = await runLegacyToCanonicalMigration(adapter, "proj-2", {
        canonicalDoc: doc,
      });
      expect(result.transformations).toHaveLength(1);
      expect(result.transformations[0]).toMatchObject({
        elementId: "e1",
        page_id_was: "p1",
        layout_id_was: null,
        canonicalParentId: "p1",
      });
    });

    it("orphan element (page_id=null, layout_id=null) 는 transformations 에 canonicalParentId=null 로 포함되고 errors 에 추가된다", async () => {
      const { runLegacyToCanonicalMigration } = await import("../migration");
      const elements = [buildElement("e1", {})];
      const adapter = buildMockAdapter(elements, []);
      const doc = buildDoc({});
      const result = await runLegacyToCanonicalMigration(adapter, "proj-3", {
        canonicalDoc: doc,
      });
      expect(result.transformations).toHaveLength(1);
      expect(result.transformations[0]?.canonicalParentId).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toMatch(/orphan/i);
    });

    it("dangling reference (layout_id=invalid) 는 graceful cleanup — errors 가 아닌 console.warn 으로 처리 (2026-04-27 보강)", async () => {
      const { runLegacyToCanonicalMigration } = await import("../migration");
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const elements = [buildElement("e1", { layout_id: "frame-MISSING" })];
      const adapter = buildMockAdapter(elements, []);
      const doc = buildDoc({ reusableFrameIds: ["layout-frame-A"] });
      const result = await runLegacyToCanonicalMigration(adapter, "proj-4", {
        canonicalDoc: doc,
      });
      // transformations 는 그대로 (canonicalParentId=null 기록)
      expect(result.transformations[0]?.canonicalParentId).toBeNull();
      // dangling 은 errors 에 안 추가 — graceful cleanup
      expect(result.errors).toEqual([]);
      // status=success (dangling 만 있을 때)
      expect(result.status).toBe("success");
      // console.warn 으로 보고
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("dangling reference cleanup"),
        expect.arrayContaining([expect.stringMatching(/dangling element e1/)]),
      );
      warnSpy.mockRestore();
    });

    it("status 는 errors 가 비었을 때 success, errors 가 있을 때 failure", async () => {
      const { runLegacyToCanonicalMigration } = await import("../migration");
      // success case
      const okAdapter = buildMockAdapter(
        [buildElement("e1", { page_id: "p1" })],
        [],
      );
      const okDoc = buildDoc({ pageIds: ["p1"] });
      const okResult = await runLegacyToCanonicalMigration(
        okAdapter,
        "proj-ok",
        {
          canonicalDoc: okDoc,
        },
      );
      expect(okResult.status).toBe("success");

      // failure case (orphan)
      const failAdapter = buildMockAdapter([buildElement("e2", {})], []);
      const failResult = await runLegacyToCanonicalMigration(
        failAdapter,
        "proj-fail",
        { canonicalDoc: buildDoc({}) },
      );
      expect(failResult.status).toBe("failure");
    });
  });

  // ─────────────────────────────────────────────
  // 50+ legacy fixture round-trip
  // ─────────────────────────────────────────────

  describe("50+ legacy fixture round-trip", () => {
    type Fixture = {
      name: string;
      ownership: { page_id?: string | null; layout_id?: string | null };
      docPages: string[];
      docFrames: string[];
      expectedCanonicalParentId: string | null;
      expectError: boolean;
      /**
       * dangling reference (canonical doc 에 매칭 parent 없음 + 실제 ownership
       * 은 비어있지 않음). 2026-04-27 보강: errors 가 아닌 graceful cleanup —
       * console.warn 으로 보고. expectError=false + expectDanglingCleanup=true.
       */
      expectDanglingCleanup?: boolean;
    };

    function makePageFixtures(): Fixture[] {
      const out: Fixture[] = [];
      for (let i = 1; i <= 15; i++) {
        out.push({
          name: `page element fixture #${i} — page_id=p${i}`,
          ownership: { page_id: `p${i}` },
          docPages: [`p${i}`],
          docFrames: [],
          expectedCanonicalParentId: `p${i}`,
          expectError: false,
        });
      }
      return out;
    }

    function makeLayoutFixtures(): Fixture[] {
      const out: Fixture[] = [];
      for (let i = 1; i <= 15; i++) {
        out.push({
          name: `layout element fixture #${i} — layout_id=frame-${i}`,
          ownership: { layout_id: `frame-${i}` },
          docPages: [],
          docFrames: [`layout-frame-${i}`],
          expectedCanonicalParentId: `layout-frame-${i}`,
          expectError: false,
        });
      }
      return out;
    }

    function makeOrphanFixtures(): Fixture[] {
      const out: Fixture[] = [];
      for (let i = 1; i <= 10; i++) {
        out.push({
          name: `orphan fixture #${i} — both null`,
          ownership: { page_id: null, layout_id: null },
          docPages: [`p${i}`],
          docFrames: [`layout-frame-${i}`],
          expectedCanonicalParentId: null,
          expectError: true,
        });
      }
      return out;
    }

    function makeMissingFrameFixtures(): Fixture[] {
      const out: Fixture[] = [];
      for (let i = 1; i <= 10; i++) {
        out.push({
          name: `missing frame fixture #${i} — layout_id=ghost-${i} (dangling cleanup)`,
          ownership: { layout_id: `ghost-${i}` },
          docPages: [],
          docFrames: ["layout-frame-A"],
          expectedCanonicalParentId: null,
          expectError: false, // 2026-04-27: dangling 은 graceful cleanup
          expectDanglingCleanup: true,
        });
      }
      return out;
    }

    const FIXTURES: Fixture[] = [
      ...makePageFixtures(),
      ...makeLayoutFixtures(),
      ...makeOrphanFixtures(),
      ...makeMissingFrameFixtures(),
    ];

    it(`fixture 합계가 50개를 초과한다 (현재: ${FIXTURES.length})`, () => {
      expect(FIXTURES.length).toBeGreaterThanOrEqual(50);
    });

    it.each(FIXTURES)("$name", async (fixture) => {
      const { runLegacyToCanonicalMigration } = await import("../migration");
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const elements = [buildElement("el-x", fixture.ownership)];
      const adapter = buildMockAdapter(elements, []);
      const doc = buildDoc({
        pageIds: fixture.docPages,
        reusableFrameIds: fixture.docFrames,
      });
      const result = await runLegacyToCanonicalMigration(
        adapter,
        "proj-fixture",
        { canonicalDoc: doc },
      );
      expect(result.transformations).toHaveLength(1);
      expect(result.transformations[0]?.canonicalParentId).toBe(
        fixture.expectedCanonicalParentId,
      );
      if (fixture.expectError) {
        expect(result.errors.length).toBeGreaterThan(0);
      } else if (fixture.expectDanglingCleanup) {
        // dangling cleanup: errors 0 + console.warn 으로 보고
        expect(result.errors).toEqual([]);
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining("dangling reference cleanup"),
          expect.any(Array),
        );
      }
      warnSpy.mockRestore();
    });
  });
});
