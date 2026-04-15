// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLayoutValues } from "./useLayoutValues";
import { useStore } from "../../../stores";
import * as preset from "../utils/specPresetResolver";

describe("useLayoutValues", () => {
  beforeEach(() => {
    useStore.setState({
      elementsMap: new Map([
        [
          "el-1",
          {
            id: "el-1",
            tag: "Button",
            props: {
              size: "md",
              style: {
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                paddingLeft: "8px",
              },
            },
          } as any,
        ],
      ]),
    });
    vi.spyOn(preset, "resolveLayoutSpecPreset").mockReturnValue({
      gap: 4,
      paddingTop: 6,
      paddingRight: 10,
      paddingBottom: 6,
      paddingLeft: 10,
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it("returns inline values when present", () => {
    const { result } = renderHook(() => useLayoutValues("el-1"));
    expect(result.current?.display).toBe("flex");
    expect(result.current?.flexDirection).toBe("column");
    expect(result.current?.gap).toBe("12px"); // inline wins
    expect(result.current?.paddingLeft).toBe("8px"); // inline wins
  });

  it("falls back to spec preset (as px) when inline absent", () => {
    const { result } = renderHook(() => useLayoutValues("el-1"));
    expect(result.current?.paddingTop).toBe("6px"); // spec
    expect(result.current?.paddingRight).toBe("10px"); // spec
  });

  it("falls back to default string when neither inline nor spec", () => {
    const { result } = renderHook(() => useLayoutValues("el-1"));
    expect(result.current?.marginTop).toBe("0px");
    expect(result.current?.justifyContent).toBe("");
    expect(result.current?.flexWrap).toBe("nowrap");
  });

  it("returns null when id is null", () => {
    const { result } = renderHook(() => useLayoutValues(null));
    expect(result.current).toBeNull();
  });

  it("returns default-valued bundle for unknown id", () => {
    const { result } = renderHook(() => useLayoutValues("unknown"));
    expect(result.current?.display).toBe("block");
    expect(result.current?.padding).toBe("0px");
  });
});
