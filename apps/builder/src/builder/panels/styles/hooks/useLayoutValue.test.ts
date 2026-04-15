// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLayoutValue } from "./useLayoutValue";
import * as layout from "../../../workspace/canvas/layout/engines/fullTreeLayout";

describe("useLayoutValue", () => {
  let listeners: Array<() => void> = [];
  let currentMap: Map<
    string,
    { width: number; height: number; x: number; y: number }
  > | null = null;

  beforeEach(() => {
    listeners = [];
    currentMap = new Map([["el-1", { width: 120, height: 32, x: 10, y: 20 }]]);
    vi.spyOn(layout, "getSharedLayoutMap").mockImplementation(
      () => currentMap as ReturnType<typeof layout.getSharedLayoutMap>,
    );
    vi.spyOn(layout, "onLayoutPublished").mockImplementation(
      (cb: () => void) => {
        listeners.push(cb);
        return () => {
          listeners = listeners.filter((l) => l !== cb);
        };
      },
    );
  });

  afterEach(() => vi.restoreAllMocks());

  it("returns width for existing id", () => {
    const { result } = renderHook(() => useLayoutValue("el-1", "width"));
    expect(result.current).toBe(120);
  });

  it("returns undefined for unknown id", () => {
    const { result } = renderHook(() => useLayoutValue("el-unknown", "width"));
    expect(result.current).toBeUndefined();
  });

  it("updates when layout is re-published", () => {
    const { result } = renderHook(() => useLayoutValue("el-1", "width"));
    expect(result.current).toBe(120);
    act(() => {
      currentMap = new Map([
        ["el-1", { width: 200, height: 32, x: 10, y: 20 }],
      ]);
      listeners.forEach((l) => l());
    });
    expect(result.current).toBe(200);
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useLayoutValue("el-1", "width"));
    expect(listeners.length).toBe(1);
    unmount();
    expect(listeners.length).toBe(0);
  });
});
