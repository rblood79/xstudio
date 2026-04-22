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

describe("useLayoutValues — ADR-082 P3 spec fallback (display/flex keys)", () => {
  beforeEach(() => {
    useStore.setState({
      elementsMap: new Map([
        [
          "el-spec-only",
          {
            id: "el-spec-only",
            tag: "ListBox",
            props: { size: "md", style: {} },
          } as any,
        ],
        [
          "el-inline-wins",
          {
            id: "el-inline-wins",
            tag: "ListBox",
            props: {
              size: "md",
              style: { display: "grid", alignItems: "center" },
            },
          } as any,
        ],
      ]),
    });
    vi.spyOn(preset, "resolveLayoutSpecPreset").mockReturnValue({
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      justifyContent: "center",
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it("spec preset supplies display/flexDirection/alignItems/justifyContent when inline absent", () => {
    const { result } = renderHook(() => useLayoutValues("el-spec-only"));
    expect(result.current?.display).toBe("flex");
    expect(result.current?.flexDirection).toBe("column");
    expect(result.current?.alignItems).toBe("flex-start");
    expect(result.current?.justifyContent).toBe("center");
  });

  it("inline value wins over spec preset (회귀 0 보장)", () => {
    const { result } = renderHook(() => useLayoutValues("el-inline-wins"));
    expect(result.current?.display).toBe("grid"); // inline
    expect(result.current?.alignItems).toBe("center"); // inline
    expect(result.current?.flexDirection).toBe("column"); // spec fallback
    expect(result.current?.justifyContent).toBe("center"); // spec fallback
  });
});

// ADR-082 P1-2: padding/margin shorthand 4-way uniform fallback
// Spec 이 4 방향 동일한 값을 공급하면 collapsed shorthand 입력에도 그 값이 노출되어야
// 사용자가 Panel 첫 진입에서 실제 적용된 padding/margin 을 인지 가능.
describe("useLayoutValues — ADR-082 P1-2 padding/margin shorthand 4-way uniform fallback", () => {
  beforeEach(() => {
    useStore.setState({
      elementsMap: new Map([
        [
          "el-uniform",
          {
            id: "el-uniform",
            tag: "ListBox",
            props: { size: "md", style: {} },
          } as any,
        ],
        [
          "el-nonuniform",
          {
            id: "el-nonuniform",
            tag: "Menu",
            props: { size: "md", style: {} },
          } as any,
        ],
        [
          "el-inline-pad",
          {
            id: "el-inline-pad",
            tag: "ListBox",
            props: { size: "md", style: { padding: "16px" } },
          } as any,
        ],
      ]),
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it("4-way uniform spec padding → shorthand 에 그 값 표시 (ListBox paddingX/Y=4)", () => {
    vi.spyOn(preset, "resolveLayoutSpecPreset").mockReturnValue({
      paddingTop: 4,
      paddingRight: 4,
      paddingBottom: 4,
      paddingLeft: 4,
    });
    const { result } = renderHook(() => useLayoutValues("el-uniform"));
    expect(result.current?.padding).toBe("4px");
  });

  it("4-way 비균일 → shorthand 는 '0px' 기본값 유지 (회귀 방지)", () => {
    vi.spyOn(preset, "resolveLayoutSpecPreset").mockReturnValue({
      paddingTop: 4,
      paddingRight: 8,
      paddingBottom: 4,
      paddingLeft: 8,
    });
    const { result } = renderHook(() => useLayoutValues("el-nonuniform"));
    expect(result.current?.padding).toBe("0px");
  });

  it("inline s.padding 은 여전히 최우선 (4-way 무시)", () => {
    vi.spyOn(preset, "resolveLayoutSpecPreset").mockReturnValue({
      paddingTop: 4,
      paddingRight: 4,
      paddingBottom: 4,
      paddingLeft: 4,
    });
    const { result } = renderHook(() => useLayoutValues("el-inline-pad"));
    expect(result.current?.padding).toBe("16px"); // inline
  });

  it("margin 도 동일 — 4-way uniform 이면 shorthand 에 반영", () => {
    vi.spyOn(preset, "resolveLayoutSpecPreset").mockReturnValue({
      marginTop: 8,
      marginRight: 8,
      marginBottom: 8,
      marginLeft: 8,
    });
    const { result } = renderHook(() => useLayoutValues("el-uniform"));
    expect(result.current?.margin).toBe("8px");
  });

  it("4-way 중 일부만 정의되고 나머지 undefined → shorthand 는 기본값", () => {
    vi.spyOn(preset, "resolveLayoutSpecPreset").mockReturnValue({
      paddingTop: 4,
      paddingRight: 4,
      // paddingBottom, paddingLeft 미정의
    });
    const { result } = renderHook(() => useLayoutValues("el-uniform"));
    expect(result.current?.padding).toBe("0px");
  });
});
