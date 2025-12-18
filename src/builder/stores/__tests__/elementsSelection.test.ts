import { describe, expect, it, vi } from "vitest";
import { create } from "zustand";
import type { Element } from "../../../types/core/store.types";
import { createElementsSlice, type ElementsState } from "../elements";
import { createCompleteProps } from "../utils/elementHelpers";

function createTestStore() {
  return create<ElementsState>(createElementsSlice);
}

describe("ElementsState selection actions", () => {
  it("setSelectedElement는 selectedElementIds를 동기화하고 selectedElementProps를 채운다", () => {
    vi.useFakeTimers();
    try {
      const store = createTestStore();
      const element: Element = {
        id: "el-1",
        tag: "Button",
        props: { label: "Click" },
        parent_id: null,
        page_id: "page-1",
        order_num: 0,
      };

      store.getState().setElements([element]);
      store.getState().setSelectedElement(element.id);

      const state = store.getState();
      expect(state.selectedElementId).toBe(element.id);
      expect(state.selectedElementIds).toEqual([element.id]);
      expect(state.multiSelectMode).toBe(false);
      expect(state.selectedElementProps).toEqual({});

      // WebGL Canvas 선택 경로에서는 selectedElementProps를 다음 tick에 채움
      vi.runOnlyPendingTimers();
      expect(store.getState().selectedElementProps).toEqual(createCompleteProps(element));
    } finally {
      vi.useRealTimers();
    }
  });

  it("setSelectedElement는 style/computedStyle을 병합한다", () => {
    const store = createTestStore();
    const element: Element = {
      id: "el-1",
      tag: "Box",
      props: { title: "T" },
      parent_id: null,
      page_id: "page-1",
      order_num: 0,
    };

    store.getState().setElements([element]);
    store
      .getState()
      .setSelectedElement(element.id, undefined, { left: 10 }, { top: 20 });

    expect(store.getState().selectedElementProps).toEqual({
      ...createCompleteProps(element),
      style: { left: 10 },
      computedStyle: { top: 20 },
    });
  });

  it("setSelectedElements는 첫 번째 요소를 primary로 설정한다", () => {
    const store = createTestStore();
    const a: Element = {
      id: "el-a",
      tag: "Box",
      props: { a: 1 },
      parent_id: null,
      page_id: "page-1",
      order_num: 0,
    };
    const b: Element = {
      id: "el-b",
      tag: "Text",
      props: { b: 2 },
      parent_id: null,
      page_id: "page-1",
      order_num: 1,
    };

    store.getState().setElements([a, b]);
    store.getState().setSelectedElements([a.id, b.id]);

    const state = store.getState();
    expect(state.selectedElementIds).toEqual([a.id, b.id]);
    expect(state.selectedElementId).toBe(a.id);
    expect(state.selectedElementProps).toEqual(createCompleteProps(a));
    expect(state.multiSelectMode).toBe(true);
  });

  it("toggleElementInSelection은 기존 동작(multiSelectMode 유지)을 보장한다", () => {
    const store = createTestStore();
    const a: Element = {
      id: "el-a",
      tag: "Box",
      props: { a: 1 },
      parent_id: null,
      page_id: "page-1",
      order_num: 0,
    };
    const b: Element = {
      id: "el-b",
      tag: "Text",
      props: { b: 2 },
      parent_id: null,
      page_id: "page-1",
      order_num: 1,
    };

    store.getState().setElements([a, b]);

    // 첫 선택: multiSelectMode=true (현재 구현)
    store.getState().toggleElementInSelection(a.id);
    expect(store.getState().selectedElementIds).toEqual([a.id]);
    expect(store.getState().selectedElementId).toBe(a.id);
    expect(store.getState().selectedElementProps).toEqual(createCompleteProps(a));
    expect(store.getState().multiSelectMode).toBe(true);

    // 두 번째 추가
    store.getState().toggleElementInSelection(b.id);
    expect(store.getState().selectedElementIds).toEqual([a.id, b.id]);
    expect(store.getState().selectedElementId).toBe(a.id);
    expect(store.getState().multiSelectMode).toBe(true);

    // 두 번째 제거: (기존 구현) multiSelectMode는 false로 재계산하지 않고 유지됨
    store.getState().toggleElementInSelection(b.id);
    expect(store.getState().selectedElementIds).toEqual([a.id]);
    expect(store.getState().selectedElementId).toBe(a.id);
    expect(store.getState().multiSelectMode).toBe(true);

    // 마지막 제거: 선택 비움 + multiSelectMode=false
    store.getState().toggleElementInSelection(a.id);
    expect(store.getState().selectedElementIds).toEqual([]);
    expect(store.getState().selectedElementId).toBe(null);
    expect(store.getState().selectedElementProps).toEqual({});
    expect(store.getState().multiSelectMode).toBe(false);
  });
});
