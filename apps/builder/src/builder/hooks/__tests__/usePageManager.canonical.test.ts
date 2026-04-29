/**
 * ADR-903 P3-D-4 — usePageManager.initializeProject canonical document 전환 검증
 *
 * 본 test 는 RED phase: GREEN 변환 (initializeProject 의 layout loading 을
 * canonical reusable FrameNode 순회로 교체) 전까지 의도적으로 FAIL.
 *
 * 변환 목표:
 * - `db.elements.getByLayout(layoutId)` 호출 제거
 * - `pages.layout_id` 기반 layoutIds 수집 제거
 * - canonical document 의 reusable FrameNode 들에서 element 로드
 *
 * 참조:
 * - docs/adr/design/903-phase3d-runtime-breakdown.md §4.4
 * - 변환 위치: apps/builder/src/builder/hooks/usePageManager.ts:473~535
 *
 * RED → GREEN 전략 (Phase B/C):
 * - Phase B: useIframeMessenger postMessage schema 변환
 * - Phase C: usePageManager initializeProject canonical lookup
 */

import { describe, it, expect } from "vitest";

describe("P3-D-4: usePageManager.initializeProject canonical 전환 (RED phase)", () => {
  describe("initializeProject — canonical document load", () => {
    // [RED] current: db.elements.getByLayout(layoutId) 사용 → ownership marker 의존
    // GREEN: canonical reusable FrameNode 순회로 element 로드
    it("getByLayout(layoutId) 호출이 제거된다 — canonical reusable FrameNode 순회로 대체", async () => {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const filePath = path.resolve(__dirname, "../usePageManager.ts");
      const rawSource = await fs.readFile(filePath, "utf-8");
      // 라인 코멘트 제거 — TODO 코멘트 false-positive 차단
      const source = rawSource.replace(/\/\/.*$/gm, "");
      // initializeProject 함수 안에서 db.elements.getByLayout 호출이 0건이어야 함
      // (다른 함수의 getByLayout 호출은 제거 대상 아님)
      const initFnMatch = source.match(
        /const initializeProject[\s\S]+?(?=\n\n  const |\n\n  return |\n  \};\n)/,
      );
      expect(
        initFnMatch,
        "initializeProject 함수 추출 실패 — 시그니처 변경 시 본 test 의 regex 도 동기화 필요",
      ).not.toBeNull();
      const initFnSource = initFnMatch![0];
      expect(initFnSource).not.toMatch(/db\.elements\.getByLayout/);
    });

    // [RED] current: pages.layout_id 기반 layoutIds 수집 → ownership marker
    // GREEN: canonical doc 에서 reusable FrameNode id 직접 추출
    it("pages.layout_id 기반 layoutIds 수집 패턴이 제거된다", async () => {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const filePath = path.resolve(__dirname, "../usePageManager.ts");
      const rawSource = await fs.readFile(filePath, "utf-8");
      const source = rawSource.replace(/\/\/.*$/gm, "");
      const initFnMatch = source.match(
        /const initializeProject[\s\S]+?(?=\n\n  const |\n\n  return |\n  \};\n)/,
      );
      expect(initFnMatch).not.toBeNull();
      const initFnSource = initFnMatch![0];
      // projectPages.map((p) => (p as { layout_id?: ... }).layout_id) 패턴
      expect(initFnSource).not.toMatch(
        /projectPages[\s\S]{0,80}layout_id\?:\s*string \| null/,
      );
    });

    // [RED] current: canonical resolver 미사용 (코멘트 TODO 만 존재)
    // GREEN: selectCanonicalDocument(...) 또는 selectCanonicalReusableFrames(...)
    // 실제 호출 (괄호 포함) 등장 — 코멘트 제거 후 검사
    it("canonical resolver (selectCanonicalDocument 또는 selectCanonicalReusableFrames) 가 호출된다", async () => {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const filePath = path.resolve(__dirname, "../usePageManager.ts");
      const rawSource = await fs.readFile(filePath, "utf-8");
      // 라인 코멘트 제거 — TODO 코멘트의 "selectCanonicalReusableFrames()"
      // false-positive 매칭 차단
      const source = rawSource.replace(/\/\/.*$/gm, "");
      const initFnMatch = source.match(
        /const initializeProject[\s\S]+?(?=\n\n  const |\n\n  return |\n  \};\n)/,
      );
      expect(initFnMatch).not.toBeNull();
      const initFnSource = initFnMatch![0];
      // 호출 형태 (괄호) 만 매칭
      expect(initFnSource).toMatch(
        /selectCanonicalDocument\(|selectCanonicalReusableFrames\(/,
      );
    });
  });

  // ─────────────────────────────────────────────
  // Phase C GREEN 정합화 검증 (P3-D-4 Phase C 4-step plan)
  // ─────────────────────────────────────────────
  describe("initializeProject — Phase C GREEN 정합화 contract", () => {
    // selectCanonicalReusableFrames 호출이 등장하여 reusable FrameNode 가 추출됨을 확증.
    // Spec A-2: minimal stub 의 'void canonicalDoc' 패턴이 다시 부활하는 회귀 차단.
    it("selectCanonicalReusableFrames 가 호출되어 reusable FrameNode 가 추출된다", async () => {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const filePath = path.resolve(__dirname, "../usePageManager.ts");
      const rawSource = await fs.readFile(filePath, "utf-8");
      const source = rawSource.replace(/\/\/.*$/gm, "");
      const initFnMatch = source.match(
        /const initializeProject[\s\S]+?(?=\n\n  const |\n\n  return |\n  \};\n)/,
      );
      expect(initFnMatch).not.toBeNull();
      const initFnSource = initFnMatch![0];
      expect(initFnSource).toMatch(/selectCanonicalReusableFrames\(/);
    });

    // layoutIdSet 이 canonical FrameNode.id 를 legacy layout id 로 정규화함을 확증.
    // Spec A-4 후속: canonical frame id("layout-<id>") 와 element.layout_id("<id>")
    // 저장 포맷이 다르므로 hydrate 시 매칭 키는 legacy layout id 여야 한다.
    it("layoutIdSet 이 reusable frame id 를 legacy layout id 로 정규화해 구성된다", async () => {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const filePath = path.resolve(__dirname, "../usePageManager.ts");
      const rawSource = await fs.readFile(filePath, "utf-8");
      const source = rawSource.replace(/\/\/.*$/gm, "");
      const initFnMatch = source.match(
        /const initializeProject[\s\S]+?(?=\n\n  const |\n\n  return |\n  \};\n)/,
      );
      expect(initFnMatch).not.toBeNull();
      const initFnSource = initFnMatch![0];
      expect(initFnSource).toMatch(
        /new Set\([\s\S]{0,120}reusableFrames\.map\(getLegacyLayoutIdFromReusableFrame\)/,
      );
      expect(source).toMatch(/rawId\.startsWith\("layout-"\)/);
      expect(source).toMatch(/rawId\.slice\("layout-"\.length\)/);
    });

    it("새로고침 hydrate 는 store 가 아니라 DB snapshot layouts/elements 로 canonical doc 을 만든다", async () => {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const filePath = path.resolve(__dirname, "../usePageManager.ts");
      const rawSource = await fs.readFile(filePath, "utf-8");
      const source = rawSource.replace(/\/\/.*$/gm, "");
      const initFnMatch = source.match(
        /const initializeProject[\s\S]+?(?=\n\n  const |\n\n  return |\n  \};\n)/,
      );
      expect(initFnMatch).not.toBeNull();
      const initFnSource = initFnMatch![0];
      expect(initFnSource).toMatch(/getProjectLayoutsForCanonical\(\s*db,\s*projectId/);
      expect(initFnSource).toMatch(/elements:\s*allElements/);
      expect(initFnSource).toMatch(
        /elementsMap:\s*new Map\(allElements\.map\(\(el\) => \[el\.id, el\]\)\)/,
      );
      expect(initFnSource).toMatch(/canonicalLayouts/);
    });

    // layoutElements 가 allElements.filter 로 layout_id 매칭 추출됨을 확증.
    // Spec A-3: minimal stub 의 'const layoutElements: Element[] = []' 패턴 부활 차단.
    // 동시에 db.elements.getByLayout 추가 호출 0 (이미 로드된 allElements 재사용) 보장.
    it("layoutElements 가 allElements.filter(layout_id 매칭) 으로 채워진다", async () => {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const filePath = path.resolve(__dirname, "../usePageManager.ts");
      const rawSource = await fs.readFile(filePath, "utf-8");
      const source = rawSource.replace(/\/\/.*$/gm, "");
      const initFnMatch = source.match(
        /const initializeProject[\s\S]+?(?=\n\n  const |\n\n  return |\n  \};\n)/,
      );
      expect(initFnMatch).not.toBeNull();
      const initFnSource = initFnMatch![0];
      // allElements.filter( ... layout_id ... layoutIdSet.has ... )
      expect(initFnSource).toMatch(
        /allElements\.filter\([\s\S]{0,200}layout_id[\s\S]{0,100}layoutIdSet\.has/,
      );
      // minimal stub 패턴 부활 차단 — const layoutElements: Element[] = []
      expect(initFnSource).not.toMatch(
        /const\s+layoutElements\s*:\s*Element\[\]\s*=\s*\[\s*\]/,
      );
    });
  });

  // ─────────────────────────────────────────────
  // P3-E E-4 — migration 진입 조건 연결 (read-through dry-run 호출)
  // ─────────────────────────────────────────────
  describe("initializeProject — P3-E E-4 migration entry contract", () => {
    // E-4 의도: usePageManager.ts 가 migration script 모듈을 import 하고,
    // initializeProject 안에서 dry-run 으로 호출. legacy → canonical 변환 결과를
    // dev mode 에서 console.log 로 보고. 실제 DB write 는 E-6.
    it("usePageManager.ts 가 runLegacyToCanonicalMigration 을 import 한다", async () => {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const filePath = path.resolve(__dirname, "../usePageManager.ts");
      const source = await fs.readFile(filePath, "utf-8");
      // import { runLegacyToCanonicalMigration } from "..." 패턴 매칭
      expect(source).toMatch(
        /import\s*\{[\s\S]*?runLegacyToCanonicalMigration[\s\S]*?\}\s*from/,
      );
    });

    it("initializeProject 안에서 runLegacyToCanonicalMigration 호출이 등장한다", async () => {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const filePath = path.resolve(__dirname, "../usePageManager.ts");
      const rawSource = await fs.readFile(filePath, "utf-8");
      const source = rawSource.replace(/\/\/.*$/gm, "");
      const initFnMatch = source.match(
        /const initializeProject[\s\S]+?(?=\n\n  const |\n\n  return |\n  \};\n)/,
      );
      expect(initFnMatch).not.toBeNull();
      const initFnSource = initFnMatch![0];
      expect(initFnSource).toMatch(/runLegacyToCanonicalMigration\(/);
    });

    it("initializeProject 안에서 db.meta.get 호출로 schemaVersion 진입 조건을 검사한다", async () => {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const filePath = path.resolve(__dirname, "../usePageManager.ts");
      const rawSource = await fs.readFile(filePath, "utf-8");
      const source = rawSource.replace(/\/\/.*$/gm, "");
      const initFnMatch = source.match(
        /const initializeProject[\s\S]+?(?=\n\n  const |\n\n  return |\n  \};\n)/,
      );
      expect(initFnMatch).not.toBeNull();
      const initFnSource = initFnMatch![0];
      // db.meta.get(...) 또는 adapter.meta.get(...) 호출 + schemaVersion 검사
      expect(initFnSource).toMatch(/\bmeta\.get\(/);
      expect(initFnSource).toMatch(/schemaVersion/);
    });
  });
});
