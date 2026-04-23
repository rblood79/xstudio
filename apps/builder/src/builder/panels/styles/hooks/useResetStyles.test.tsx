// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("../../../../services/save", () => ({
  saveService: {
    savePropertyChange: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../../../../env/supabase.client", () => ({
  supabase: {},
}));

import { useStore } from "../../../stores";
import { useLayoutValues } from "./useLayoutValues";
import { useTransformValues } from "./useTransformValues";
import { useHasDirtyStyles, useResetStyles } from "./useResetStyles";
import * as preset from "../utils/specPresetResolver";
import { getDefaultProps } from "../../../../types/builder/unified.types";
import type { Element } from "../../../../types/core/store.types";

const LAYOUT_DIRTY_PROPS = ["display", "flexDirection", "gap"];
const TRANSFORM_DIRTY_PROPS = ["width", "height", "minWidth", "maxWidth"];

function makeElement(
  id: string,
  props: Record<string, unknown>,
): Element {
  return {
    id,
    tag: "TagGroup",
    props,
  };
}

function makeTaggedElement(
  id: string,
  tag: string,
  props: Record<string, unknown>,
): Element {
  return {
    id,
    tag,
    props,
  };
}

describe("useResetStyles — spec preset dirty regression", () => {
  const originalState = useStore.getState();

  beforeEach(() => {
    vi.spyOn(preset, "resolveLayoutSpecPreset").mockReturnValue({
      display: "flex",
      flexDirection: "column",
      gap: 2,
    });

    Object.defineProperty(window, "requestIdleCallback", {
      configurable: true,
      writable: true,
      value: vi.fn((callback: IdleRequestCallback) => {
        callback({
          didTimeout: false,
          timeRemaining: () => 50,
        } as IdleDeadline);
        return 1;
      }),
    });

    Object.defineProperty(window, "cancelIdleCallback", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });

    const element = makeElement("taggroup-1", {
      size: "md",
      labelPosition: "top",
    });

    useStore.setState({
      selectedElementId: "taggroup-1",
      selectedElementProps: element.props,
      currentPageId: null,
      elements: [element],
      elementsMap: new Map([["taggroup-1", element]]),
      childrenMap: new Map(),
      dirtyElementIds: new Set(),
      layoutVersion: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    useStore.setState(originalState, true);
  });

  it("신규 TagGroup(style 없음) 은 Layout dirty=false 이고 spec fallback 값을 보여준다", () => {
    const { result: dirty } = renderHook(() =>
      useHasDirtyStyles(LAYOUT_DIRTY_PROPS),
    );
    const { result: layout } = renderHook(() => useLayoutValues("taggroup-1"));
    const { result: transformDirty } = renderHook(() =>
      useHasDirtyStyles(TRANSFORM_DIRTY_PROPS),
    );
    const { result: transform } = renderHook(() =>
      useTransformValues("taggroup-1"),
    );

    expect(dirty.current).toBe(false);
    expect(transformDirty.current).toBe(false);
    expect(layout.current?.display).toBe("flex");
    expect(layout.current?.flexDirection).toBe("column");
    expect(layout.current?.gap).toBe("2px");
    expect(transform.current?.width.inline).toBeUndefined();
  });

  it("inline override 후에는 Layout dirty=true 로 전환된다", () => {
    const { result: dirty } = renderHook(() =>
      useHasDirtyStyles(LAYOUT_DIRTY_PROPS),
    );

    act(() => {
      useStore.getState().updateSelectedStyles({ gap: "12px" });
    });

    expect(dirty.current).toBe(true);
    expect(
      (useStore.getState().elementsMap.get("taggroup-1")?.props?.style as {
        gap?: number;
      })?.gap,
    ).toBe(12);
  });

  it("reset 후 inline override 를 제거하고 spec fallback 으로 복귀한다", () => {
    const { result: dirty } = renderHook(() =>
      useHasDirtyStyles(LAYOUT_DIRTY_PROPS),
    );
    const { result: layout } = renderHook(() => useLayoutValues("taggroup-1"));
    const { result: resetStyles } = renderHook(() => useResetStyles());

    act(() => {
      useStore.getState().updateSelectedStyles({ gap: "12px" });
    });

    expect(dirty.current).toBe(true);

    act(() => {
      resetStyles.current(["gap"]);
    });

    const style = useStore.getState().elementsMap.get("taggroup-1")?.props?.style as
      | Record<string, unknown>
      | undefined;

    expect(style?.gap).toBeUndefined();
    expect(dirty.current).toBe(false);
    expect(layout.current?.display).toBe("flex");
    expect(layout.current?.flexDirection).toBe("column");
    expect(layout.current?.gap).toBe("2px");
  });
});

describe("useResetStyles — default props false dirty audit", () => {
  const originalState = useStore.getState();

  const cases = [
    { tag: "Checkbox", properties: ["display", "flexDirection"] },
    { tag: "Radio", properties: ["display", "flexDirection"] },
    { tag: "Slider", properties: ["height", "width", "maxWidth"] },
    { tag: "Switch", properties: ["display", "flexDirection"] },
    { tag: "Card", properties: ["gap", "padding", "borderWidth"] },
    { tag: "Label", properties: ["height", "fontSize", "fontWeight", "width"] },
    { tag: "Form", properties: ["display", "flexDirection", "gap"] },
    { tag: "NumberField", properties: ["display"] },
    { tag: "ColorPicker", properties: ["display", "flexDirection", "gap"] },
    { tag: "ColorSwatch", properties: ["display", "borderWidth"] },
    {
      tag: "DropZone",
      properties: [
        "display",
        "flexDirection",
        "alignItems",
        "justifyContent",
        "borderWidth",
      ],
    },
    { tag: "MaskedFrame", properties: ["height", "width", "borderRadius"] },
    { tag: "Skeleton", properties: ["width", "height", "borderRadius"] },
  ] as const;

  beforeEach(() => {
    useStore.setState({
      selectedElementId: null,
      selectedElementProps: null,
      currentPageId: null,
      elements: [],
      elementsMap: new Map(),
      childrenMap: new Map(),
      dirtyElementIds: new Set(),
      layoutVersion: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    useStore.setState(originalState, true);
  });

  it.each(cases)(
    "신규 $tag 는 기본 props baseline 에서 dirty=false 여야 한다",
    ({ tag, properties }) => {
      const element = makeTaggedElement(
        `${tag.toLowerCase()}-1`,
        tag,
        getDefaultProps(tag),
      );

      useStore.setState({
        selectedElementId: element.id,
        selectedElementProps: element.props,
        currentPageId: null,
        elements: [element],
        elementsMap: new Map([[element.id, element]]),
        childrenMap: new Map(),
        dirtyElementIds: new Set(),
        layoutVersion: 0,
      });

      const { result: dirty } = renderHook(() => useHasDirtyStyles(properties));
      expect(dirty.current).toBe(false);
    },
  );
});
