// @vitest-environment jsdom

/**
 * ADR-913 Phase 4 Step 4-2 — runTagTypeMigration (dry-run)
 *
 * legacy `tag` field → canonical `type` field rename migration.
 * Step 4-2 = read-only dry-run. Step 4-4 에서 write-through 활성화 (env flag 게이트).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Element } from "../../../types/core/store.types";
import type { Layout } from "../../../types/builder/layout.types";
import type { MetaRecord } from "../types";
import {
  runTagTypeMigration,
  transformElementTagToType,
} from "../migrationTagType";

// ─────────────────────────────────────────────
// Mock adapter
// ─────────────────────────────────────────────

type LegacyOrCanonicalElement = Element & { tag?: string };

type MockAdapter = {
  elements: {
    getAll: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    insert?: ReturnType<typeof vi.fn>;
    update?: ReturnType<typeof vi.fn>;
    delete?: ReturnType<typeof vi.fn>;
    deleteMany?: ReturnType<typeof vi.fn>;
  };
  layouts: {
    getAll: ReturnType<typeof vi.fn>;
    insert?: ReturnType<typeof vi.fn>;
    update?: ReturnType<typeof vi.fn>;
    delete?: ReturnType<typeof vi.fn>;
  };
  meta: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
  };
};

function buildMockAdapter(opts: {
  elements: LegacyOrCanonicalElement[];
  layouts?: Layout[];
  metaGet?: MetaRecord | null;
}): MockAdapter {
  return {
    elements: {
      getAll: vi.fn(async () => opts.elements),
      updateMany: vi.fn(async () => []),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    layouts: {
      getAll: vi.fn(async () => opts.layouts ?? []),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    meta: {
      get: vi.fn(async () => opts.metaGet ?? null),
      set: vi.fn(async (record: MetaRecord) => record),
    },
  };
}

function el(
  partial: Partial<LegacyOrCanonicalElement> & { id: string },
): LegacyOrCanonicalElement {
  return {
    page_id: null,
    layout_id: null,
    parent_id: null,
    props: {},
    order_num: 0,
    ...partial,
  } as LegacyOrCanonicalElement;
}

// ─────────────────────────────────────────────
// transformElementTagToType — pure function tests
// ─────────────────────────────────────────────
describe("transformElementTagToType (ADR-913 P4 pure transformer)", () => {
  it("TC-T1: tag only → type 으로 rename + changed=true", () => {
    const input = el({ id: "e1", tag: "Button" });
    const result = transformElementTagToType(input);
    expect(result).not.toBeNull();
    expect(result!.changed).toBe(true);
    expect(result!.transformed.type).toBe("Button");
    expect(
      (result!.transformed as LegacyOrCanonicalElement).tag,
    ).toBeUndefined();
  });

  it("TC-T2: type only (canonical) → 변경 없음 + changed=false", () => {
    const input = el({ id: "e2", type: "Container" });
    const result = transformElementTagToType(input);
    expect(result).not.toBeNull();
    expect(result!.changed).toBe(false);
    expect(result!.transformed.type).toBe("Container");
    expect(
      (result!.transformed as LegacyOrCanonicalElement).tag,
    ).toBeUndefined();
  });

  it("TC-T3: tag + type 둘 다 → type 우선 보존 + tag 제거 + changed=true", () => {
    const input = el({ id: "e3", tag: "OldName", type: "NewName" });
    const result = transformElementTagToType(input);
    expect(result).not.toBeNull();
    expect(result!.changed).toBe(true);
    expect(result!.transformed.type).toBe("NewName"); // type 우선
    expect(
      (result!.transformed as LegacyOrCanonicalElement).tag,
    ).toBeUndefined();
  });

  it("TC-T4: 둘 다 missing → null 반환", () => {
    const input = el({ id: "e4" });
    const result = transformElementTagToType(input);
    expect(result).toBeNull();
  });

  it("TC-T5: 다른 props 보존 (id / parent_id / props / order_num)", () => {
    const input = el({
      id: "e5",
      tag: "Text",
      parent_id: "parent-1",
      props: { children: "hello" },
      order_num: 5,
    });
    const result = transformElementTagToType(input);
    expect(result!.transformed.id).toBe("e5");
    expect(result!.transformed.parent_id).toBe("parent-1");
    expect(result!.transformed.props).toEqual({ children: "hello" });
    expect(result!.transformed.order_num).toBe(5);
    expect(result!.transformed.type).toBe("Text");
  });
});

// ─────────────────────────────────────────────
// runTagTypeMigration — integration tests
// ─────────────────────────────────────────────
describe("runTagTypeMigration (ADR-913 P4 Step 4-2 dry-run)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("TC-M1: 이미 composition-1.1 → status=skipped + DB 무변경", async () => {
    const adapter = buildMockAdapter({
      elements: [],
      metaGet: {
        projectId: "proj-1",
        schemaVersion: "composition-1.1",
      },
    });

    const result = await runTagTypeMigration(adapter, "proj-1");

    expect(result.status).toBe("skipped");
    expect(result.reason).toContain("composition-1.1");
    expect(adapter.elements.getAll).not.toHaveBeenCalled();
    expect(adapter.elements.updateMany).not.toHaveBeenCalled();
    expect(adapter.meta.set).not.toHaveBeenCalled();
  });

  it("TC-M2: composition-1.0 (legacy tag 0건) → success + transformedCount=0", async () => {
    const adapter = buildMockAdapter({
      elements: [
        el({ id: "e1", type: "Container" }),
        el({ id: "e2", type: "Text" }),
        el({ id: "e3", type: "Button" }),
      ],
      metaGet: {
        projectId: "proj-2",
        schemaVersion: "composition-1.0",
      },
    });

    const result = await runTagTypeMigration(adapter, "proj-2");

    expect(result.status).toBe("success");
    expect(result.transformedCount).toBe(0);
    expect(result.totalCount).toBe(3);
    expect(result.transformations).toHaveLength(3);
    expect(result.transformations.every((t) => !t.changed)).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.dryRun).toBe(true);
    // dry-run: write 메서드 호출 0건
    expect(adapter.elements.updateMany).not.toHaveBeenCalled();
    expect(adapter.meta.set).not.toHaveBeenCalled();
  });

  it("TC-M3: all legacy (tag만, type 없음) → success + transformedCount=N", async () => {
    const adapter = buildMockAdapter({
      elements: [
        el({ id: "e1", tag: "Container" }),
        el({ id: "e2", tag: "Text" }),
        el({ id: "e3", tag: "Button" }),
      ],
      metaGet: { projectId: "proj-3", schemaVersion: "legacy" },
    });

    const result = await runTagTypeMigration(adapter, "proj-3");

    expect(result.status).toBe("success");
    expect(result.transformedCount).toBe(3);
    expect(result.totalCount).toBe(3);
    expect(result.transformations.every((t) => t.changed)).toBe(true);
    expect(result.transformations.map((t) => t.type_after)).toEqual([
      "Container",
      "Text",
      "Button",
    ]);
    expect(result.errors).toHaveLength(0);
    // dry-run: 무변경
    expect(adapter.elements.updateMany).not.toHaveBeenCalled();
  });

  it("TC-M4: mixed (tag only + type only + 둘 다) → success + transformedCount 정확", async () => {
    const adapter = buildMockAdapter({
      elements: [
        el({ id: "e1", tag: "Container" }), // tag only — change
        el({ id: "e2", type: "Text" }), // type only — no change
        el({ id: "e3", tag: "Old", type: "Button" }), // 둘 다 — change (tag 제거)
      ],
      metaGet: null, // _meta 미존재 — 처음 진입
    });

    const result = await runTagTypeMigration(adapter, "proj-4");

    expect(result.status).toBe("success");
    expect(result.transformedCount).toBe(2); // e1 + e3
    expect(result.totalCount).toBe(3);
    expect(
      result.transformations.find((t) => t.elementId === "e1")?.changed,
    ).toBe(true);
    expect(
      result.transformations.find((t) => t.elementId === "e2")?.changed,
    ).toBe(false);
    expect(
      result.transformations.find((t) => t.elementId === "e3")?.changed,
    ).toBe(true);
    // type_after — e3 의 경우 type 우선 보존
    expect(
      result.transformations.find((t) => t.elementId === "e3")?.type_after,
    ).toBe("Button");
  });

  it("TC-M5: orphan element (tag + type 둘 다 missing) → status=failure + errors", async () => {
    const adapter = buildMockAdapter({
      elements: [
        el({ id: "e1", tag: "Container" }),
        el({ id: "e2" }), // orphan
      ],
      metaGet: null,
    });

    const result = await runTagTypeMigration(adapter, "proj-5");

    expect(result.status).toBe("failure");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("e2");
    expect(result.errors[0]).toContain("orphan");
    // dry-run — 변경 없음
    expect(adapter.elements.updateMany).not.toHaveBeenCalled();
    expect(adapter.meta.set).not.toHaveBeenCalled();
  });

  it("TC-M6: backupKey 반환 — localStorage 에 backup 저장됨 (dry-run 도 backup 생성)", async () => {
    const adapter = buildMockAdapter({
      elements: [el({ id: "e1", tag: "Container" })],
      metaGet: null,
    });

    const result = await runTagTypeMigration(adapter, "proj-6");

    expect(result.backupKey).toBeDefined();
    expect(result.backupKey).toMatch(
      /^composition-migration-backup:proj-6:\d+$/,
    );
    expect(localStorage.getItem(result.backupKey!)).not.toBeNull();
  });

  it("TC-M7: dryRun=false 호출 → throw (Step 4-4 미구현)", async () => {
    const adapter = buildMockAdapter({
      elements: [el({ id: "e1", tag: "Container" })],
      metaGet: null,
    });

    await expect(
      runTagTypeMigration(adapter, "proj-7", { dryRun: false }),
    ).rejects.toThrow(/write-through 미구현/);
  });

  it("TC-M8: read-only 보장 — adapter.elements.updateMany / meta.set 호출 0건", async () => {
    const adapter = buildMockAdapter({
      elements: [
        el({ id: "e1", tag: "Container" }),
        el({ id: "e2", type: "Text" }),
      ],
      metaGet: null,
    });

    await runTagTypeMigration(adapter, "proj-8");

    expect(adapter.elements.updateMany).not.toHaveBeenCalled();
    expect(adapter.meta.set).not.toHaveBeenCalled();
  });

  it("TC-M9: 50+ fixture round-trip — legacy elements 50개를 transform", async () => {
    const elements: LegacyOrCanonicalElement[] = [];
    for (let i = 0; i < 50; i++) {
      elements.push(
        el({ id: `e${i}`, tag: i % 2 === 0 ? "Container" : "Text" }),
      );
    }

    const adapter = buildMockAdapter({
      elements,
      metaGet: { projectId: "proj-9", schemaVersion: "legacy" },
    });

    const result = await runTagTypeMigration(adapter, "proj-9");

    expect(result.status).toBe("success");
    expect(result.transformedCount).toBe(50);
    expect(result.totalCount).toBe(50);
    expect(result.transformations).toHaveLength(50);
    expect(result.errors).toHaveLength(0);
    // 모두 changed=true
    expect(result.transformations.every((t) => t.changed)).toBe(true);
    // type_after 분포: Container 25 + Text 25
    const types = result.transformations.map((t) => t.type_after);
    expect(types.filter((t) => t === "Container")).toHaveLength(25);
    expect(types.filter((t) => t === "Text")).toHaveLength(25);
  });

  it("TC-M10: 빈 elements → success + transformedCount=0 + totalCount=0", async () => {
    const adapter = buildMockAdapter({
      elements: [],
      metaGet: null,
    });

    const result = await runTagTypeMigration(adapter, "proj-10");

    expect(result.status).toBe("success");
    expect(result.transformedCount).toBe(0);
    expect(result.totalCount).toBe(0);
    expect(result.transformations).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("TC-M11: transformations 순서 = elements.getAll 순서 보존", async () => {
    const adapter = buildMockAdapter({
      elements: [
        el({ id: "z-last", tag: "Container" }),
        el({ id: "a-first", tag: "Text" }),
        el({ id: "m-middle", tag: "Button" }),
      ],
      metaGet: null,
    });

    const result = await runTagTypeMigration(adapter, "proj-11");

    expect(result.transformations.map((t) => t.elementId)).toEqual([
      "z-last",
      "a-first",
      "m-middle",
    ]);
  });
});
