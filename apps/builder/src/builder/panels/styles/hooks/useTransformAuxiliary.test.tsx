// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  useWidthSizeMode,
  useHeightSizeMode,
  useParentDisplay,
  useParentFlexDirection,
  useSelfAlignmentKeys,
} from "./useTransformAuxiliary";
import { useStore } from "../../../stores";

describe("useTransformAuxiliary", () => {
  beforeEach(() => {
    useStore.setState({
      elementsMap: new Map([
        [
          "el-1",
          {
            id: "el-1",
            tag: "Button",
            parent_id: "p-1",
            props: {
              style: {
                width: "180px",
                alignSelf: "center",
                justifySelf: "center",
              },
            },
          } as any,
        ],
        [
          "p-1",
          {
            id: "p-1",
            tag: "Frame",
            props: { style: { display: "flex", flexDirection: "row" } },
          } as any,
        ],
      ]),
    });
  });

  it("useParentDisplay returns parent display", () => {
    const { result } = renderHook(() => useParentDisplay("el-1"));
    expect(result.current).toBe("flex");
  });

  it("useParentFlexDirection returns parent flex-direction", () => {
    const { result } = renderHook(() => useParentFlexDirection("el-1"));
    expect(result.current).toBe("row");
  });

  it("useParentDisplay returns 'block' when no parent", () => {
    const { result } = renderHook(() => useParentDisplay("p-1"));
    expect(result.current).toBe("block");
  });

  it("useWidthSizeMode infers from style + parent context", () => {
    const { result } = renderHook(() => useWidthSizeMode("el-1"));
    // 180px 명시 값 → "fixed"
    expect(result.current).toBe("fixed");
  });

  it("useSelfAlignmentKeys returns ['centerCenter'] for center/center", () => {
    const { result } = renderHook(() => useSelfAlignmentKeys("el-1"));
    expect(result.current).toEqual(["centerCenter"]);
  });

  it("useSelfAlignmentKeys returns [] for block parent", () => {
    useStore.setState((s: any) => {
      const map = new Map(s.elementsMap);
      map.set("p-1", {
        ...map.get("p-1"),
        props: { style: { display: "block" } },
      });
      return { elementsMap: map };
    });
    const { result } = renderHook(() => useSelfAlignmentKeys("el-1"));
    expect(result.current).toEqual([]);
  });
});
