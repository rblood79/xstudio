/**
 * ADR-903 P3-D-4 — useIframeMessenger UPDATE_ELEMENTS schema canonical 전환 검증
 *
 * 본 test 는 RED phase: GREEN 변환 (postMessage schema 의 layoutId →
 * reusableFrameId + version: "composition-1.0" bump) 전까지 의도적으로 FAIL.
 *
 * 변환 목표:
 * - message.version: "legacy-1.0" → "composition-1.0"
 * - pageInfo.layoutId 필드 제거 또는 reusableFrameId 와 alias 병기
 * - Preview 측 messageHandler.ts 가 신규 schema 수신 가능
 *
 * 참조:
 * - docs/adr/design/903-phase3d-runtime-breakdown.md §4.4
 * - 변환 위치: apps/builder/src/builder/hooks/useIframeMessenger.ts L196~235
 */

import { describe, it, expect } from "vitest";

describe("P3-D-4: useIframeMessenger UPDATE_ELEMENTS schema 전환 (RED phase)", () => {
  describe("postMessage version bump", () => {
    // [RED] current: version: "legacy-1.0" 고정
    // GREEN: version: "composition-1.0" 으로 bump
    it("UPDATE_ELEMENTS message 의 version 이 'composition-1.0' 으로 bump 된다", async () => {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const filePath = path.resolve(__dirname, "../useIframeMessenger.ts");
      const source = await fs.readFile(filePath, "utf-8");
      // composition-1.0 등장이 확인되어야 함
      expect(source).toMatch(/version:\s*"composition-1\.0"/);
      // legacy-1.0 의 leftover 가 없어야 함 (UPDATE_ELEMENTS 메시지 한정)
      const updateElementsBlock = source.match(
        /const message = \{[\s\S]{0,300}type: "UPDATE_ELEMENTS"[\s\S]{0,300}\};/,
      );
      expect(
        updateElementsBlock,
        "UPDATE_ELEMENTS message 객체 추출 실패 — 시그니처 변경 시 regex 동기화",
      ).not.toBeNull();
      expect(updateElementsBlock![0]).not.toMatch(/version:\s*"legacy-1\.0"/);
    });
  });

  describe("pageInfo schema canonical 전환", () => {
    // [RED] current: pageInfo.layoutId 만 사용
    // GREEN: pageInfo.reusableFrameId 추가 (또는 layoutId → reusableFrameId rename)
    it("pageInfo 에 reusableFrameId 필드가 등장한다", async () => {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const filePath = path.resolve(__dirname, "../useIframeMessenger.ts");
      const source = await fs.readFile(filePath, "utf-8");
      // reusableFrameId 식별자 등장
      expect(source).toMatch(/reusableFrameId/);
    });
  });
});
