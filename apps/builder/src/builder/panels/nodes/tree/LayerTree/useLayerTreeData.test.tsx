import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { Element } from "../../../../../types/core/store.types";
import { useStore } from "../../../../stores";
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
    } as never);
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
});
