/**
 * @fileoverview ADR-916 Phase 3 G4 — 3-A-stub 시그니처 검증
 *
 * 필수 API 3개 stub 의 타입 시그니처 + return 값 검증. 3-A-impl 진입 시점에
 * 본 test 가 실 동작 검증으로 확장. codex 1차 review 의 prerequisite (API
 * 시그니처 lock-in 확인용).
 */

import { describe, expect, it } from "vitest";
import type { CompositionDocument } from "@composition/shared";
import type { Element } from "@/types/builder/unified.types";

import { exportLegacyDocument } from "../exportLegacyDocument";
import {
  diffLegacyRoundtrip,
  type RoundtripDiff,
} from "../diffLegacyRoundtrip";
import { restoreFromLegacyBackup } from "../restoreFromLegacyBackup";

// ─────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────

function makeDoc(): CompositionDocument {
  return {
    schemaVersion: "1.0",
    children: [],
  };
}

function makeElement(id: string): Element {
  return {
    id,
    type: "Box",
    props: {},
    parent_id: null,
    order_num: 0,
    page_id: null,
    layout_id: null,
  };
}

// ─────────────────────────────────────────────
// A. exportLegacyDocument — 3-A-stub
// ─────────────────────────────────────────────

describe("exportLegacyDocument (3-A-stub)", () => {
  it("CompositionDocument 인자 → Element[] 반환", () => {
    const doc = makeDoc();
    const result = exportLegacyDocument(doc);
    expect(Array.isArray(result)).toBe(true);
  });

  it("3-A-stub: 빈 배열 반환 (no-op fallback)", () => {
    const doc = makeDoc();
    expect(exportLegacyDocument(doc)).toEqual([]);
  });
});

// ─────────────────────────────────────────────
// B. diffLegacyRoundtrip — 3-A-stub
// ─────────────────────────────────────────────

describe("diffLegacyRoundtrip (3-A-stub)", () => {
  it("Element[] 2개 → RoundtripDiff 반환 (3 카테고리)", () => {
    const before = [makeElement("a")];
    const after = [makeElement("a")];
    const result = diffLegacyRoundtrip(before, after);
    expect(result).toHaveProperty("destructive");
    expect(result).toHaveProperty("reorder");
    expect(result).toHaveProperty("cosmetic");
  });

  it("3-A-stub: 모든 카테고리 빈 배열", () => {
    const before = [makeElement("a")];
    const after = [makeElement("b")]; // 다른 id 인데도 stub 은 빈 결과
    const result: RoundtripDiff = diffLegacyRoundtrip(before, after);
    expect(result.destructive).toEqual([]);
    expect(result.reorder).toEqual([]);
    expect(result.cosmetic).toEqual([]);
  });
});

// ─────────────────────────────────────────────
// C. restoreFromLegacyBackup — 3-A-stub
// ─────────────────────────────────────────────

describe("restoreFromLegacyBackup (3-A-stub)", () => {
  it("projectId 인자 → Promise<boolean> 반환", async () => {
    const result = restoreFromLegacyBackup("test-project");
    expect(result).toBeInstanceOf(Promise);
    const resolved = await result;
    expect(typeof resolved).toBe("boolean");
  });

  it("3-A-stub: 항상 false 반환 (rollback 미지원 fallback)", async () => {
    expect(await restoreFromLegacyBackup("any-id")).toBe(false);
  });
});
