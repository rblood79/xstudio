/**
 * tagRename.ts 단위 테스트 — ADR-903 P1 Stage 2
 *
 * 검증 대상:
 *   - tagToType: legacy tag 문자열 → ComponentTag cast
 *   - isLegacySlotTag: Slot 특수 분기 판정
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { tagToType, isLegacySlotTag } from "../tagRename";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("tagToType", () => {
  it("Button tag → 값 보존 그대로 반환", () => {
    // Arrange + Act + Assert
    expect(tagToType("Button")).toBe("Button");
  });

  it("Card tag → 값 보존 그대로 반환", () => {
    expect(tagToType("Card")).toBe("Card");
  });

  it("Slot tag → caller가 분기 처리 책임이므로 'Slot' 그대로 반환", () => {
    // slotAndLayoutAdapter가 isLegacySlotTag로 먼저 분기하므로
    // tagToType 자체는 그냥 cast 반환
    expect(tagToType("Slot")).toBe("Slot");
  });

  it("빈 문자열 → console.warn 호출 + 'frame' fallback 반환", () => {
    // Arrange
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Act
    const result = tagToType("");

    // Assert
    expect(result).toBe("frame");
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("empty type"));
  });
});

describe("isLegacySlotTag", () => {
  it("'Slot' 문자열 → true 반환", () => {
    expect(isLegacySlotTag("Slot")).toBe(true);
  });

  it("일반 컴포넌트 태그 → false 반환", () => {
    expect(isLegacySlotTag("Button")).toBe(false);
  });

  it("빈 문자열 → false 반환", () => {
    expect(isLegacySlotTag("")).toBe(false);
  });
});
