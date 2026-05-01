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
        /const initializeProject[\s\S]+?(?=\n\n {2}const |\n\n {2}return |\n {2}\};\n)/,
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
        /const initializeProject[\s\S]+?(?=\n\n {2}const |\n\n {2}return |\n {2}\};\n)/,
      );
      expect(initFnMatch).not.toBeNull();
      const initFnSource = initFnMatch![0];
      // projectPages.map((p) => (p as { layout_id?: ... }).layout_id) 패턴
      expect(initFnSource).not.toMatch(
        /projectPages[\s\S]{0,80}layout_id\?:\s*string \| null/,
      );
    });

    // ADR-916 projection 제거: initializeProject 는 legacy snapshot 을
    // CompositionDocument 로 재구성하지 않고 project layouts snapshot 으로
    // reusable frame id set 을 만든다.
    it("projection rebuild 없이 project layouts snapshot 으로 frame id set 을 구성한다", async () => {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const filePath = path.resolve(__dirname, "../usePageManager.ts");
      const rawSource = await fs.readFile(filePath, "utf-8");
      // 라인 코멘트 제거 — TODO 코멘트의 "selectCanonicalReusableFrames()"
      // false-positive 매칭 차단
      const source = rawSource.replace(/\/\/.*$/gm, "");
      const initFnMatch = source.match(
        /const initializeProject[\s\S]+?(?=\n\n {2}const |\n\n {2}return |\n {2}\};\n)/,
      );
      expect(initFnMatch).not.toBeNull();
      const initFnSource = initFnMatch![0];
      expect(initFnSource).not.toMatch(
        /selectCanonicalDocument\(|selectCanonicalReusableFrames\(/,
      );
      expect(initFnSource).toMatch(/getProjectLayoutsForCanonical\(/);
      expect(initFnSource).toMatch(
        /canonicalLayouts\.map\(\(layout\) => layout\.id\)/,
      );
    });
  });

  // ─────────────────────────────────────────────
  // Phase C GREEN 정합화 검증 (P3-D-4 Phase C 4-step plan)
  // ─────────────────────────────────────────────
  describe("initializeProject — Phase C GREEN 정합화 contract", () => {
    // ADR-916 projection 제거: selectCanonicalReusableFrames 가 다시 caller 로
    // 올라오는 회귀를 차단한다.
    it("selectCanonicalReusableFrames caller 호출이 없다", async () => {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const filePath = path.resolve(__dirname, "../usePageManager.ts");
      const rawSource = await fs.readFile(filePath, "utf-8");
      const source = rawSource.replace(/\/\/.*$/gm, "");
      const initFnMatch = source.match(
        /const initializeProject[\s\S]+?(?=\n\n {2}const |\n\n {2}return |\n {2}\};\n)/,
      );
      expect(initFnMatch).not.toBeNull();
      const initFnSource = initFnMatch![0];
      expect(initFnSource).not.toMatch(/selectCanonicalReusableFrames\(/);
    });

    // layoutIdSet 이 project layouts snapshot 의 id 를 기준으로 구성됨을 확증.
    it("layoutIdSet 이 project layout id snapshot 으로 구성된다", async () => {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const filePath = path.resolve(__dirname, "../usePageManager.ts");
      const rawSource = await fs.readFile(filePath, "utf-8");
      const source = rawSource.replace(/\/\/.*$/gm, "");
      const initFnMatch = source.match(
        /const initializeProject[\s\S]+?(?=\n\n {2}const |\n\n {2}return |\n {2}\};\n)/,
      );
      expect(initFnMatch).not.toBeNull();
      const initFnSource = initFnMatch![0];
      expect(initFnSource).toMatch(
        /new Set\([\s\S]{0,120}canonicalLayouts\.map\(\(layout\) => layout\.id\)/,
      );
      expect(source).not.toContain("getReusableFrameMirrorId");
    });

    it("새로고침 hydrate 는 store 가 아니라 DB/project layouts snapshot 을 사용한다", async () => {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const filePath = path.resolve(__dirname, "../usePageManager.ts");
      const rawSource = await fs.readFile(filePath, "utf-8");
      const source = rawSource.replace(/\/\/.*$/gm, "");
      const initFnMatch = source.match(
        /const initializeProject[\s\S]+?(?=\n\n {2}const |\n\n {2}return |\n {2}\};\n)/,
      );
      expect(initFnMatch).not.toBeNull();
      const initFnSource = initFnMatch![0];
      expect(initFnSource).toMatch(
        /getProjectLayoutsForCanonical\(\s*db,\s*projectId/,
      );
      expect(initFnSource).toMatch(/canonicalLayouts/);
      expect(initFnSource).not.toMatch(/selectCanonicalDocument\(/);
    });

    // layoutElements 가 allElements.filter 로 frame mirror binding 매칭 추출됨을 확증.
    // Spec A-3: minimal stub 의 'const layoutElements: Element[] = []' 패턴 부활 차단.
    // 동시에 db.elements.getByLayout 추가 호출 0 (이미 로드된 allElements 재사용) 보장.
    it("layoutElements 가 allElements.filter(helper 매칭) 으로 채워진다", async () => {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const filePath = path.resolve(__dirname, "../usePageManager.ts");
      const rawSource = await fs.readFile(filePath, "utf-8");
      const source = rawSource.replace(/\/\/.*$/gm, "");
      const initFnMatch = source.match(
        /const initializeProject[\s\S]+?(?=\n\n {2}const |\n\n {2}return |\n {2}\};\n)/,
      );
      expect(initFnMatch).not.toBeNull();
      const initFnSource = initFnMatch![0];
      // allElements.filter( ... getFrameElementMirrorId ... layoutIdSet.has ... )
      expect(initFnSource).toMatch(
        /allElements\.filter\([\s\S]{0,250}getFrameElementMirrorId[\s\S]{0,160}layoutIdSet\.has/,
      );
      // minimal stub 패턴 부활 차단 — const layoutElements: Element[] = []
      expect(initFnSource).not.toMatch(
        /const\s+layoutElements\s*:\s*Element\[\]\s*=\s*\[\s*\]/,
      );
    });

    it("page/frame mirror field access 는 frameMirror adapter 를 경유한다", async () => {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const filePath = path.resolve(__dirname, "../usePageManager.ts");
      const source = await fs.readFile(filePath, "utf-8");

      expect(source).not.toContain("legacyElementFields");
      expect(source).toContain('from "../../adapters/canonical/frameMirror"');
      expect(source).toContain("getNullablePageFrameBindingId");
      expect(source).toContain("withPageFrameBinding");
      expect(source).toContain("getFrameElementMirrorId");
    });
  });

  // ─────────────────────────────────────────────
  // Direct cutover — runtime migration 제거
  // ─────────────────────────────────────────────
  describe("initializeProject — direct cutover contract", () => {
    it("usePageManager.ts 가 runtime DB migration helper 를 import 하지 않는다", async () => {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const filePath = path.resolve(__dirname, "../usePageManager.ts");
      const source = await fs.readFile(filePath, "utf-8");
      const legacyMigrationName = [
        "run",
        "LegacyToCanonical",
        "Migration",
      ].join("");
      const tagMigrationName = ["run", "TagType", "Migration"].join("");
      expect(source).not.toContain(legacyMigrationName);
      expect(source).not.toContain(tagMigrationName);
    });

    it("initializeProject 안에서 migration dry-run 호출이 없다", async () => {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const filePath = path.resolve(__dirname, "../usePageManager.ts");
      const rawSource = await fs.readFile(filePath, "utf-8");
      const source = rawSource.replace(/\/\/.*$/gm, "");
      const initFnMatch = source.match(
        /const initializeProject[\s\S]+?(?=\n\n {2}const |\n\n {2}return |\n {2}\};\n)/,
      );
      expect(initFnMatch).not.toBeNull();
      const initFnSource = initFnMatch![0];
      const legacyMigrationCall = new RegExp(
        `${["run", "LegacyToCanonical", "Migration"].join("")}\\s*\\(`,
      );
      const tagMigrationCall = new RegExp(
        `${["run", "TagType", "Migration"].join("")}\\s*\\(`,
      );
      expect(initFnSource).not.toMatch(legacyMigrationCall);
      expect(initFnSource).not.toMatch(tagMigrationCall);
      expect(initFnSource).not.toMatch(/\bmeta\.get\(/);
      expect(initFnSource).not.toMatch(/schemaVersion/);
    });
  });
});
