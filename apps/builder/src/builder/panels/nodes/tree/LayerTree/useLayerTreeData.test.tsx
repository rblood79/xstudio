import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { CompositionDocument } from "@composition/shared";
import type { Element } from "../../../../../types/core/store.types";
import { useStore } from "../../../../stores";
import { useCanonicalDocumentStore } from "../../../../stores/canonical/canonicalDocumentStore";
import { getEditingSemanticsRole } from "../../../../utils/editingSemantics";
import { useLayerTreeData } from "./useLayerTreeData";

function makeElement(id: string, overrides: Partial<Element> = {}): Element {
  return {
    id,
    type: "Box",
    parent_id: null,
    page_id: "page-1",
    order_num: 0,
    props: {},
    ...overrides,
  } as Element;
}

describe("useLayerTreeData", () => {
  beforeEach(() => {
    useStore.setState({
      elements: [],
      elementsMap: new Map(),
      childrenMap: new Map(),
      currentPageId: null,
    } as never);
    useCanonicalDocumentStore.setState({
      documents: new Map(),
      currentProjectId: null,
      documentVersion: 0,
    });
  });

  it("projects canonical ref instances as origin type with synthetic children", () => {
    const body = makeElement("body", {
      type: "body",
      parent_id: null,
      order_num: 0,
    });
    const origin = makeElement("origin", {
      type: "NumberField",
      reusable: true,
      parent_id: "body",
      order_num: 0,
      props: { label: "Amount" },
    } as never);
    const label = makeElement("label", {
      type: "Label",
      customId: "label",
      parent_id: "origin",
      order_num: 0,
      props: { text: "Amount" },
    });
    const input = makeElement("input", {
      type: "Input",
      customId: "input",
      parent_id: "origin",
      order_num: 1,
      props: { value: "0" },
    });
    const ref = makeElement("instance", {
      type: "ref",
      ref: "origin",
      parent_id: "body",
      order_num: 1,
      descendants: {
        label: { text: "Price" },
      },
    } as never);
    const elements = [body, origin, label, input, ref];

    useStore.setState({
      elements,
      elementsMap: new Map(elements.map((element) => [element.id, element])),
    } as never);

    const { result } = renderHook(() => useLayerTreeData(elements));
    const instanceNode = result.current.nodeMap.get("instance");

    expect(instanceNode).toMatchObject({
      id: "instance",
      name: "NumberField",
      type: "NumberField",
      hasChildren: true,
    });
    expect(instanceNode?.element).toBe(ref);
    expect(getEditingSemanticsRole(instanceNode?.element)).toBe("instance");
    expect(instanceNode?.children).toEqual([
      expect.objectContaining({
        id: "instance/label",
        name: "Label",
        isSyntheticRefChild: true,
      }),
      expect.objectContaining({
        id: "instance/input",
        name: "Input",
        isSyntheticRefChild: true,
      }),
    ]);
    expect(result.current.disabledKeys.has("instance/label")).toBe(false);
    expect(result.current.disabledKeys.has("instance/input")).toBe(false);
  });

  it("filters canonical layer source to the selected page", () => {
    const doc: CompositionDocument = {
      version: "composition-1.0",
      children: [
        {
          id: "page-1",
          type: "frame",
          metadata: { type: "legacy-page", pageId: "page-1" },
          children: [{ id: "body-1", type: "body", props: {} }],
        },
        {
          id: "page-2",
          type: "frame",
          metadata: { type: "legacy-page", pageId: "page-2" },
          children: [{ id: "body-2", type: "body", props: {} }],
        },
        {
          id: "page-3",
          type: "frame",
          metadata: { type: "legacy-page", pageId: "page-3" },
          children: [{ id: "body-3", type: "body", props: {} }],
        },
      ],
    };
    const pageTwoBody = makeElement("body-2", {
      type: "body",
      page_id: "page-2",
    });

    useStore.setState({
      currentPageId: "page-2",
      elements: [pageTwoBody],
      elementsMap: new Map([["body-2", pageTwoBody]]),
      pageElementsSnapshot: { "page-2": [pageTwoBody] },
    } as never);
    act(() => {
      const canonical = useCanonicalDocumentStore.getState();
      canonical.setDocument("project-1", doc);
      canonical.setCurrentProject("project-1");
    });

    const { result } = renderHook(() => useLayerTreeData([pageTwoBody]));

    expect(result.current.treeNodes.map((node) => node.id)).toEqual(["body-2"]);
  });
});
