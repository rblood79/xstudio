// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  useFlexDirectionKeys,
  useFlexAlignmentKeys,
  useJustifyContentSpacingKeys,
  useFlexWrapKeys,
} from "./useLayoutAuxiliary";
import { useStore } from "../../../stores";

function setElement(id: string, style: Record<string, unknown>) {
  useStore.setState({
    elementsMap: new Map([[id, { id, tag: "Div", props: { style } } as any]]),
  });
}

describe("useFlexDirectionKeys", () => {
  beforeEach(() => setElement("e", {}));

  it("returns ['block'] when display is not flex", () => {
    setElement("e", { display: "block" });
    const { result } = renderHook(() => useFlexDirectionKeys("e"));
    expect(result.current).toEqual(["block"]);
  });

  it("returns ['row'] when flex + row", () => {
    setElement("e", { display: "flex", flexDirection: "row" });
    const { result } = renderHook(() => useFlexDirectionKeys("e"));
    expect(result.current).toEqual(["row"]);
  });

  it("returns ['column'] when flex + column", () => {
    setElement("e", { display: "flex", flexDirection: "column" });
    const { result } = renderHook(() => useFlexDirectionKeys("e"));
    expect(result.current).toEqual(["column"]);
  });
});

describe("useFlexAlignmentKeys", () => {
  it("returns [] when not flex", () => {
    setElement("e", { display: "block" });
    const { result } = renderHook(() => useFlexAlignmentKeys("e"));
    expect(result.current).toEqual([]);
  });

  it("row + alignItems=center + justifyContent=flex-start → 'leftCenter'", () => {
    setElement("e", {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
    });
    const { result } = renderHook(() => useFlexAlignmentKeys("e"));
    expect(result.current).toEqual(["leftCenter"]);
  });

  it("column + justifyContent=center + alignItems=flex-end → 'rightCenter'", () => {
    setElement("e", {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "flex-end",
    });
    const { result } = renderHook(() => useFlexAlignmentKeys("e"));
    expect(result.current).toEqual(["rightCenter"]);
  });
});

describe("useJustifyContentSpacingKeys", () => {
  it("returns space-between when set", () => {
    setElement("e", { justifyContent: "space-between" });
    const { result } = renderHook(() => useJustifyContentSpacingKeys("e"));
    expect(result.current).toEqual(["space-between"]);
  });

  it("returns [] for non-spacing value", () => {
    setElement("e", { justifyContent: "center" });
    const { result } = renderHook(() => useJustifyContentSpacingKeys("e"));
    expect(result.current).toEqual([]);
  });
});

describe("useFlexWrapKeys", () => {
  it("defaults to nowrap", () => {
    setElement("e", {});
    const { result } = renderHook(() => useFlexWrapKeys("e"));
    expect(result.current).toEqual(["nowrap"]);
  });

  it("returns wrap when set", () => {
    setElement("e", { flexWrap: "wrap" });
    const { result } = renderHook(() => useFlexWrapKeys("e"));
    expect(result.current).toEqual(["wrap"]);
  });
});
