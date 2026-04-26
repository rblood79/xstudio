/**
 * ADR-903 P3-E E-5 — getByLayout dev warning + utils/ TODO 주석
 *
 * legacy column (`element.layout_id`) read-only 선언 단계. write 차단은 E-6
 * 에서. 본 단계는:
 * - `adapter.ts:getByLayout` 에 dev mode console.warn 추가 (deprecated 사용 추적)
 * - `utils/urlGenerator.ts:219` 및 `utils/element/elementUtils.ts:44` 의
 *   `layout_id` 참조에 `TODO(P3-E)` 주석 추가
 *
 * 회귀 위험 0 — 모두 source-pattern 검증 (실제 동작 변경 없음).
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

  // Test 3: urlGenerator.ts L219 근처의 layout_id 참조에 TODO(P3-E) 주석
  it("urlGenerator.ts 의 layout_id 참조 직전 또는 인접 라인에 TODO(P3-E) 주석이 있다", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.resolve(__dirname, "../../../utils/urlGenerator.ts");
    const source = await fs.readFile(filePath, "utf-8");
    // TODO(P3-E)... canonical 키워드 + 그 다음 200자 안에 page.layout_id 등장
    expect(source).toMatch(/TODO\(P3-E\)[\s\S]{0,200}page\.layout_id/);
  });

  // Test 4: elementUtils.ts L44 근처의 layout_id 참조에 TODO(P3-E) 주석
  it("elementUtils.ts 의 layout_id 참조 직전 또는 인접 라인에 TODO(P3-E) 주석이 있다", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.resolve(
      __dirname,
      "../../../utils/element/elementUtils.ts",
    );
    const source = await fs.readFile(filePath, "utf-8");
    // TODO(P3-E)... + 그 다음 200자 안에 el.layout_id 등장
    expect(source).toMatch(/TODO\(P3-E\)[\s\S]{0,200}el\.layout_id/);
  });
});
