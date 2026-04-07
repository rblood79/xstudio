import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { TransitionManager } from "../transitionManager";

describe("TransitionManager", () => {
  let now: number;

  beforeEach(() => {
    now = 1000;
    vi.spyOn(performance, "now").mockReturnValue(now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("start → tick halfway → dirty contains element", () => {
    const tm = new TransitionManager();
    tm.start("el-1", "opacity", 0, 1, 300, "linear");

    vi.spyOn(performance, "now").mockReturnValue(now + 150);
    const dirty = tm.tick(now + 150);
    expect(dirty.has("el-1")).toBe(true);
  });

  test("getCurrentValue at halfway → ~0.5", () => {
    const tm = new TransitionManager();
    tm.start("el-1", "opacity", 0, 1, 300, "linear");

    vi.spyOn(performance, "now").mockReturnValue(now + 150);
    const value = tm.getCurrentValue("el-1", "opacity");
    expect(value).toBeCloseTo(0.5, 1);
  });

  test("after duration → done, end value", () => {
    const tm = new TransitionManager();
    tm.start("el-1", "opacity", 0, 1, 300, "linear");

    vi.spyOn(performance, "now").mockReturnValue(now + 400);
    const dirty = tm.tick(now + 400);
    expect(dirty.has("el-1")).toBe(true);

    const value = tm.getCurrentValue("el-1", "opacity");
    expect(value).toBeCloseTo(1, 2);
  });

  test("no transitions → empty dirty", () => {
    const tm = new TransitionManager();
    expect(tm.tick(now).size).toBe(0);
  });

  test("isActive true during transition", () => {
    const tm = new TransitionManager();
    tm.start("el-1", "width", 100, 200, 500, "ease");
    expect(tm.isActive()).toBe(true);
  });

  test("remove cleans up", () => {
    const tm = new TransitionManager();
    tm.start("el-1", "opacity", 0, 1, 300, "linear");
    tm.remove("el-1");
    expect(tm.isActive()).toBe(false);
  });

  test("multiple properties on same element", () => {
    const tm = new TransitionManager();
    tm.start("el-1", "opacity", 0, 1, 300, "linear");
    tm.start("el-1", "width", 100, 200, 300, "linear");

    vi.spyOn(performance, "now").mockReturnValue(now + 150);
    tm.tick(now + 150);
    expect(tm.getCurrentValue("el-1", "opacity")).toBeCloseTo(0.5, 1);
    expect(tm.getCurrentValue("el-1", "width")).toBeCloseTo(150, 0);
  });

  test("replacing same property starts new transition", () => {
    const tm = new TransitionManager();
    tm.start("el-1", "opacity", 0, 1, 300, "linear");

    vi.spyOn(performance, "now").mockReturnValue(now + 100);
    // 새 transition으로 대체
    tm.start("el-1", "opacity", 0.5, 0, 200, "linear");

    vi.spyOn(performance, "now").mockReturnValue(now + 200); // 100ms into new
    const value = tm.getCurrentValue("el-1", "opacity");
    expect(value).toBeCloseTo(0.25, 1); // 0.5 + (0 - 0.5) * 0.5
  });
});
