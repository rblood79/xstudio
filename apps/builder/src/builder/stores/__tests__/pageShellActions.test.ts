import { describe, expect, it } from "vitest";
import { createStore } from "zustand/vanilla";
import type { Element } from "../../../types/core/store.types";
import type { Page } from "../../../types/builder/unified.types";
import { createElementsSlice, type ElementsState } from "../elements";

function createPage(overrides: Partial<Page>): Page {
  return {
    id: overrides.id ?? "page-1",
    project_id: overrides.project_id ?? "project-1",
    title: overrides.title ?? "Page 1",
    slug: overrides.slug ?? "/page-1",
    parent_id: overrides.parent_id ?? null,
    order_num: overrides.order_num ?? 0,
    created_at: overrides.created_at ?? new Date().toISOString(),
    updated_at: overrides.updated_at ?? new Date().toISOString(),
    ...overrides,
  };
}

function createElement(overrides: Partial<Element>): Element {
  return {
    id: overrides.id ?? "body-1",
    tag: overrides.tag ?? "body",
    props: overrides.props ?? {},
    parent_id: overrides.parent_id ?? null,
    page_id: overrides.page_id ?? "page-1",
    order_num: overrides.order_num ?? 0,
    created_at: overrides.created_at ?? new Date().toISOString(),
    updated_at: overrides.updated_at ?? new Date().toISOString(),
    ...overrides,
  };
}

describe("page shell actions", () => {
  it("appendPageShell은 페이지, body, position을 한 번에 추가한다", () => {
    const store = createStore<ElementsState>()(createElementsSlice);
    const page = createPage({ id: "page-a", title: "Page A", slug: "/a" });
    const body = createElement({ id: "body-a", page_id: "page-a" });

    store.getState().appendPageShell(page, body, { x: 1200, y: 0 });

    const state = store.getState();
    expect(state.pages.map((entry) => entry.id)).toEqual(["page-a"]);
    expect(state.currentPageId).toBe("page-a");
    expect(state.elementsMap.get("body-a")?.page_id).toBe("page-a");
    expect(state.pagePositions["page-a"]).toEqual({ x: 1200, y: 0 });
    expect(state.pageIndex.elementsByPage.get("page-a")).toEqual(
      new Set(["body-a"]),
    );
  });

  it("removePageLocal은 페이지 요소와 위치를 함께 제거한다", () => {
    const store = createStore<ElementsState>()(createElementsSlice);
    const pageA = createPage({ id: "page-a", title: "Page A", slug: "/a" });
    const bodyA = createElement({ id: "body-a", page_id: "page-a" });
    const pageB = createPage({
      id: "page-b",
      title: "Page B",
      slug: "/b",
      order_num: 1,
    });
    const bodyB = createElement({ id: "body-b", page_id: "page-b" });

    store.getState().appendPageShell(pageA, bodyA, { x: 0, y: 0 });
    store.getState().appendPageShell(pageB, bodyB, { x: 1200, y: 0 });

    store.getState().removePageLocal("page-b");

    const state = store.getState();
    expect(state.pages.map((entry) => entry.id)).toEqual(["page-a"]);
    expect(state.elementsMap.has("body-b")).toBe(false);
    expect(state.pagePositions["page-b"]).toBeUndefined();
    expect(state.pageIndex.elementsByPage.has("page-b")).toBe(false);
  });
});
