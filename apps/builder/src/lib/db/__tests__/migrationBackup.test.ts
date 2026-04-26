// @vitest-environment jsdom

/**
 * ADR-903 P3-E E-2 — createMigrationBackup
 *
 * read-only backup 함수: legacy schema (DB_VERSION 8 이전 또는 "legacy") 의
 * 전체 elements + layouts 를 localStorage 에 dump. migration script (E-3) 의
 * 사전 안전망. backup 후 DB 무변경.
 *
 * RED → GREEN 전략:
 * - RED: production 파일 (`migrationBackup.ts`) 부재 시 5/5 FAIL
 * - GREEN: createMigrationBackup 구현 후 5/5 PASS
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Element } from "../../../types/core/store.types";
import type { Layout } from "../../../types/builder/layout.types";

// Mock adapter — elements/layouts.getAll() 만 호출됨
type MinimalAdapter = {
  elements: {
    getAll: () => Promise<Element[]>;
    insert?: ReturnType<typeof vi.fn>;
    update?: ReturnType<typeof vi.fn>;
    updateMany?: ReturnType<typeof vi.fn>;
    delete?: ReturnType<typeof vi.fn>;
    deleteMany?: ReturnType<typeof vi.fn>;
  };
  layouts: {
    getAll: () => Promise<Layout[]>;
    insert?: ReturnType<typeof vi.fn>;
    update?: ReturnType<typeof vi.fn>;
    delete?: ReturnType<typeof vi.fn>;
  };
};

function buildMockAdapter(
  elements: Element[],
  layouts: Layout[],
): MinimalAdapter {
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
  };
}

const fixtureElements: Element[] = [
  {
    id: "el-1",
    page_id: "p1",
    layout_id: null,
    parent_id: null,
    tag: "Container",
    props: {},
    order_num: 0,
  },
  {
    id: "el-2",
    page_id: null,
    layout_id: "frame-A",
    parent_id: null,
    tag: "Text",
    props: { children: "hello" },
    order_num: 0,
  },
] as unknown as Element[];

const fixtureLayouts: Layout[] = [
  { id: "frame-A", name: "Header" },
] as unknown as Layout[];

describe("P3-E E-2: createMigrationBackup (read-only)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("createMigrationBackup 함수가 export 된다", async () => {
    const mod = await import("../migrationBackup");
    expect(typeof mod.createMigrationBackup).toBe("function");
  });

  it("backup key 가 'composition-migration-backup:<projectId>:<timestamp>' 형식으로 반환된다", async () => {
    const { createMigrationBackup } = await import("../migrationBackup");
    const adapter = buildMockAdapter(fixtureElements, fixtureLayouts);
    const backupKey = await createMigrationBackup(adapter, "proj-123");
    expect(backupKey).toMatch(/^composition-migration-backup:proj-123:\d+$/);
  });

  it("localStorage 에 저장된 backup JSON 이 elements + layouts + backupVersion: 'legacy' 구조를 가진다", async () => {
    const { createMigrationBackup } = await import("../migrationBackup");
    const adapter = buildMockAdapter(fixtureElements, fixtureLayouts);
    const backupKey = await createMigrationBackup(adapter, "proj-456");
    const stored = localStorage.getItem(backupKey);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.projectId).toBe("proj-456");
    expect(parsed.backupVersion).toBe("legacy");
    expect(parsed.elements).toEqual(fixtureElements);
    expect(parsed.layouts).toEqual(fixtureLayouts);
    expect(typeof parsed.timestamp).toBe("string");
  });

  it("같은 projectId 의 이전 backup 은 새 backup 생성 시 정리된다 (1 project = 1 backup)", async () => {
    const { createMigrationBackup } = await import("../migrationBackup");
    const adapter = buildMockAdapter(fixtureElements, fixtureLayouts);

    // 1차 backup
    const firstKey = await createMigrationBackup(adapter, "proj-789");
    expect(localStorage.getItem(firstKey)).not.toBeNull();

    // 2차 backup — 시간 차이 보장
    await new Promise((resolve) => setTimeout(resolve, 5));
    const secondKey = await createMigrationBackup(adapter, "proj-789");

    // 1차 backup 은 제거, 2차 backup 만 잔존
    expect(firstKey).not.toBe(secondKey);
    expect(localStorage.getItem(firstKey)).toBeNull();
    expect(localStorage.getItem(secondKey)).not.toBeNull();
  });

  it("read-only 보장: adapter 의 write 메서드 (insert/update/updateMany/delete/deleteMany) 호출 0건", async () => {
    const { createMigrationBackup } = await import("../migrationBackup");
    const adapter = buildMockAdapter(fixtureElements, fixtureLayouts);
    await createMigrationBackup(adapter, "proj-readonly");

    expect(adapter.elements.insert).not.toHaveBeenCalled();
    expect(adapter.elements.update).not.toHaveBeenCalled();
    expect(adapter.elements.updateMany).not.toHaveBeenCalled();
    expect(adapter.elements.delete).not.toHaveBeenCalled();
    expect(adapter.elements.deleteMany).not.toHaveBeenCalled();
    expect(adapter.layouts.insert).not.toHaveBeenCalled();
    expect(adapter.layouts.update).not.toHaveBeenCalled();
    expect(adapter.layouts.delete).not.toHaveBeenCalled();
  });
});
