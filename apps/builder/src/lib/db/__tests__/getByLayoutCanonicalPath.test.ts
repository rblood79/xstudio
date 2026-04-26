/**
 * ADR-903 P3-E E-6 — getByLayout canonical path 강제
 *
 * E-6 write-through 진입 후, `_meta._meta.schemaVersion === "composition-1.0"`
 * 프로젝트가 1개라도 존재하면 `getByLayout()` 은 빈 배열을 반환한다 (legacy
 * `layout_id` 컬럼 read-only). caller 들이 canonical parent 기반 조회로
 * 마이그레이션을 강제하기 위함.
 *
 * 검증:
 * - source-pattern 검증 — `getByLayout` 본문 안에 schemaVersion === "composition-1.0"
 *   분기 + return [] 분기가 존재
 * - source-pattern 검증 — legacy fallback (`getAllByIndex("elements", "layout_id", ...)`)
 *   는 분기 안에서만 도달 가능 (composition-1.0 미감지 시)
 */

import { describe, it, expect } from "vitest";

describe("P3-E E-6: getByLayout canonical path 강제", () => {
  it("getByLayout 본문에 schemaVersion === composition-1.0 분기 + return [] 가 존재", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.resolve(__dirname, "../indexedDB/adapter.ts");
    const source = await fs.readFile(filePath, "utf-8");
    const match = source.match(/getByLayout:\s*async[\s\S]+?^\s+\},\n/m);
    expect(
      match,
      "getByLayout 메서드 추출 실패 — 시그니처 변경 시 본 test regex 동기화 필요",
    ).not.toBeNull();
    const body = match![0];
    // composition-1.0 schema 감지 분기 존재
    expect(body).toMatch(/schemaVersion\s*===\s*["']composition-1\.0["']/);
    // return []; 분기 존재 (early return)
    expect(body).toMatch(/return\s+\[\]\s*;/);
  });

  it("getByLayout 본문에 _meta store 조회 (getAllFromStore<MetaRecord>) 가 존재", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.resolve(__dirname, "../indexedDB/adapter.ts");
    const source = await fs.readFile(filePath, "utf-8");
    const match = source.match(/getByLayout:\s*async[\s\S]+?^\s+\},\n/m);
    expect(match).not.toBeNull();
    const body = match![0];
    // _meta store 의 record 들을 읽어 composition-1.0 여부 검사
    expect(body).toMatch(/getAllFromStore<MetaRecord>\(\s*["']_meta["']\s*\)/);
  });
});
