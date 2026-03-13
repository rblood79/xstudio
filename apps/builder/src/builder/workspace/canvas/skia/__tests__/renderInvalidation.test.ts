import { afterEach, describe, expect, it } from "vitest";
import {
  countRecentInvalidations,
  getInvalidationHistory,
  recordInvalidation,
  resetInvalidationHistory,
} from "../renderInvalidation";

describe("renderInvalidation", () => {
  afterEach(() => {
    resetInvalidationHistory();
  });

  it("무효화 reason과 source를 최근 이력에 기록한다", () => {
    recordInvalidation("content", "pageSwitch");
    recordInvalidation("overlay", "selection");

    expect(getInvalidationHistory()).toEqual([
      expect.objectContaining({
        reason: "content",
        source: "pageSwitch",
      }),
      expect.objectContaining({
        reason: "overlay",
        source: "selection",
      }),
    ]);
    expect(countRecentInvalidations("content", 1000)).toBe(1);
    expect(countRecentInvalidations("overlay", 1000)).toBe(1);
  });

  it("최근 이력은 100개까지만 유지한다", () => {
    for (let i = 0; i < 120; i += 1) {
      recordInvalidation("content", `source-${i}`);
    }

    const history = getInvalidationHistory();
    expect(history).toHaveLength(100);
    expect(history[0]).toEqual(
      expect.objectContaining({
        source: "source-20",
      }),
    );
    expect(history.at(-1)).toEqual(
      expect.objectContaining({
        source: "source-119",
      }),
    );
  });
});
