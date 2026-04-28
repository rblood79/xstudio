// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { Element } from "../../types/core/store.types";
import { useSelectedElementData, useStore } from "./index";

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

describe("useSelectedElementData", () => {
  beforeEach(() => {
    useStore.setState({
      elements: [],
      elementsMap: new Map(),
      selectedElementId: null,
      selectedElementProps: {},
    } as never);
  });

  it("presents canonical ref instances as their origin component in properties panel data", () => {
    const origin = makeElement("origin", {
      type: "NumberField",
      reusable: true,
      props: { label: "Amount", minValue: 0, style: { width: "100%" } },
    });
    const instance = makeElement("instance", {
      type: "ref",
      ref: "origin",
      props: { maxValue: 10 },
    } as never);

    useStore.setState({
      elements: [origin, instance],
      elementsMap: new Map([
        [origin.id, origin],
        [instance.id, instance],
      ]),
      selectedElementId: "instance",
      selectedElementProps: {},
    } as never);

    const { result } = renderHook(() => useSelectedElementData());

    expect(result.current).toMatchObject({
      id: "instance",
      type: "NumberField",
      properties: {
        label: "Amount",
        minValue: 0,
        maxValue: 10,
      },
      style: { width: "100%" },
    });
  });
});
