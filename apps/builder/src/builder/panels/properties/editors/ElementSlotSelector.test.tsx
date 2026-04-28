// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Element, Page } from "../../../../types/core/store.types";
import { useStore } from "../../../stores";
import { ElementSlotSelector } from "./ElementSlotSelector";

function makeElement(id: string, overrides: Partial<Element> = {}): Element {
  return {
    id,
    type: "Text",
    parent_id: null,
    page_id: "page-1",
    order_num: 0,
    props: {},
    ...overrides,
  } as Element;
}

function makePage(overrides: Partial<Page> = {}): Page {
  return {
    id: "page-1",
    title: "Page",
    project_id: "project-1",
    slug: "/",
    layout_id: "frame-1",
    ...overrides,
  };
}

describe("ElementSlotSelector", () => {
  beforeEach(() => {
    useStore.setState({
      currentPageId: "page-1",
      elements: [],
      elementsMap: new Map(),
      pages: [],
      selectedElementId: null,
      selectedElementProps: {},
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it("shows layout slots immediately from legacy layout_id after preset apply", () => {
    const page = makePage();
    const element = makeElement("headline", {
      props: { slot_name: "header" },
    });
    const headerSlot = makeElement("slot-header", {
      type: "Slot",
      layout_id: "frame-1",
      page_id: null,
      order_num: 2,
      props: { name: "header", required: true },
    });
    const contentSlot = makeElement("slot-content", {
      type: "Slot",
      layout_id: "frame-1",
      page_id: null,
      order_num: 1,
      props: { name: "content" },
    });
    const otherFrameSlot = makeElement("slot-other", {
      type: "Slot",
      layout_id: "frame-2",
      page_id: null,
      props: { name: "footer" },
    });

    useStore.setState({
      pages: [page],
      elements: [element, headerSlot, contentSlot, otherFrameSlot],
      elementsMap: new Map([
        ["headline", element],
        ["slot-header", headerSlot],
        ["slot-content", contentSlot],
        ["slot-other", otherFrameSlot],
      ]),
    });

    render(
      <ElementSlotSelector
        elementId="headline"
        currentSlotName="header"
        onSlotChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Slot Assignment")).toBeTruthy();
    expect(screen.getAllByText("header *").length).toBeGreaterThan(0);
    expect(screen.queryByText("footer")).toBeNull();
  });
});
