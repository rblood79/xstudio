/**
 * ADR-903 P3-E E-5/E-6 — getByLayout dev warning + utils/ canonical 전환
 *
 * E-5: `adapter.ts:getByLayout` 에 dev console.warn 추가 + utils/ TODO 주석.
 * E-6: utils/ 의 `layout_id` 참조 자체가 제거됨 → TODO 주석 검증 → 부재 검증으로 전환.
 *
 * 회귀 위험 0 — 모두 source-pattern 검증.
 */

import { describe, it, expect } from "vitest";

describe("P3-E E-5: getByLayout dev warning + utils TODO", () => {
  // Test 1: getByLayout 메서드 본문에 console.warn 호출이 존재
  it("adapter.ts 의 getByLayout 본문에 console.warn 호출이 존재한다", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.resolve(__dirname, "../indexedDB/adapter.ts");
    const source = await fs.readFile(filePath, "utf-8");
    // getByLayout: async ... => { ... console.warn ... } 패턴
    // getByLayout 시작부터 다음 메서드 (} ,\n)까지 캡처
    const match = source.match(/getByLayout:\s*async[\s\S]+?^\s+\},\n/m);
    expect(
      match,
      "getByLayout 메서드 추출 실패 — 시그니처 변경 시 본 test regex 동기화 필요",
    ).not.toBeNull();
    expect(match![0]).toMatch(/console\.warn/);
  });

  // Test 2: getByLayout 의 dev warning 이 dev/development 환경 분기 안에 존재
  it("getByLayout dev warning 이 development 환경 분기 안에서만 활성화된다", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.resolve(__dirname, "../indexedDB/adapter.ts");
    const source = await fs.readFile(filePath, "utf-8");
    const match = source.match(/getByLayout:\s*async[\s\S]+?^\s+\},\n/m);
    expect(match).not.toBeNull();
    // process.env.NODE_ENV !== "production" 또는 === "development" 둘 다 OK
    expect(match![0]).toMatch(
      /process\.env\.NODE_ENV\s*(?:!==\s*["']production["']|===\s*["']development["'])/,
    );
  });

  // Test 3: urlGenerator.ts 에 page.layout_id 직접 참조가 더 이상 없다 (E-6 negative assertion)
  it("urlGenerator.ts 에 page.layout_id 직접 참조가 더 이상 존재하지 않는다 (E-6 후)", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.resolve(__dirname, "../../../utils/urlGenerator.ts");
    const source = await fs.readFile(filePath, "utf-8");
    expect(source).not.toMatch(/page\.layout_id/);
  });

  // Test 4: elementUtils.ts 에 el.layout_id 직접 참조가 더 이상 없다 (E-6 negative assertion)
  it("elementUtils.ts 에 el.layout_id 직접 참조가 더 이상 존재하지 않는다 (E-6 후)", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.resolve(
      __dirname,
      "../../../utils/element/elementUtils.ts",
    );
    const source = await fs.readFile(filePath, "utf-8");
    expect(source).not.toMatch(/el\.layout_id/);
  });
});
