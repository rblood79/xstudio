// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTransformValue } from "./useTransformValue";
import { useStore } from "../../../stores";
import * as layout from "../../../workspace/canvas/layout/engines/fullTreeLayout";
import * as preset from "../utils/specPresetResolver";

describe("useTransformValue (width)", () => {
  beforeEach(() => {
    useStore.setState({
      elementsMap: new Map([
        [
          "el-1",
          {
            id: "el-1",
            tag: "Button",
            props: { size: "md", style: { width: "180px" } },
          } as any,
        ],
      ]),
    });
    vi.spyOn(layout, "getSharedLayoutMap").mockReturnValue(
      new Map([["el-1", { width: 120, height: 32, x: 0, y: 0 }]]) as any,
    );
    vi.spyOn(layout, "onLayoutPublished").mockReturnValue(() => {});
    vi.spyOn(preset, "resolveSpecPreset").mockReturnValue({
      width: 100,
      height: 32,
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it("returns 3-tier object for existing element", () => {
    const { result } = renderHook(() => useTransformValue("el-1", "width"));
    expect(result.current).toEqual({
      inline: "180px",
      effective: 120,
      specDefault: 100,
    });
  });

  it("returns undefined fields for unknown id", () => {
    const { result } = renderHook(() => useTransformValue("unknown", "width"));
    expect(result.current).toEqual({
      inline: undefined,
      effective: undefined,
      specDefault: undefined,
    });
  });

  it("returns null when id is null", () => {
    const { result } = renderHook(() => useTransformValue(null, "width"));
    expect(result.current).toBeNull();
  });
});
