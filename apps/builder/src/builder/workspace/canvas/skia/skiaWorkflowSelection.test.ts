import { describe, expect, it } from "vitest";
import type { Element } from "../../../../types/core/store.types";
import { resolveCanonicalRefElementsMap } from "../../../utils/canonicalRefResolution";
import type { RendererSelectionInvalidation } from "../renderers";
import { buildSelectionRenderData } from "./skiaWorkflowSelection";

function makeElement(id: string, overrides: Partial<Element> = {}): Element {
  return {
    id,
    type: "Button",
    page_id: "page-1",
    parent_id: "body-1",
    order_num: 1,
    props: {},
    ...overrides,
  } as Element;
}

function makeSelection(
  selectedElementIds: string[],
): RendererSelectionInvalidation {
  return {
    currentPageId: "page-1",
    editingContextId: null,
    editingSignature: "editing",
    selectedElementId: selectedElementIds[0] ?? null,
    selectedElementIds,
    selectionSignature: selectedElementIds.join("|"),
  };
}

describe("buildSelectionRenderData editing semantics", () => {
  it("single selected reusable element exposes origin semantic role", () => {
    const result = buildSelectionRenderData(
      0,
      0,
      1,
      new Map([["origin", { x: 10, y: 20, width: 100, height: 40 }]]),
      makeSelection(["origin"]),
      new Map([["origin", makeElement("origin", { reusable: true })]]),
    );

    expect(result.semanticRole).toBe("origin");
    expect(result.bounds).toEqual({ x: 10, y: 20, width: 100, height: 40 });
    expect(result.showHandles).toBe(true);
  });

  it("single selected ref element exposes instance semantic role", () => {
    const result = buildSelectionRenderData(
      0,
      0,
      1,
      new Map([["instance", { x: 0, y: 0, width: 80, height: 32 }]]),
      makeSelection(["instance"]),
      new Map([["instance", makeElement("instance", { type: "ref" })]]),
    );

    expect(result.semanticRole).toBe("instance");
  });

  it("keeps instance semantic role after canonical ref projection", () => {
    const origin = makeElement("origin", {
      type: "NumberField",
      reusable: true,
      parent_id: null,
      props: { label: "Amount" },
    });
    const instance = makeElement("instance", {
      type: "ref",
      ref: "origin",
      props: { style: { left: "120px" } },
    } as never);
    const resolvedMap = resolveCanonicalRefElementsMap(
      new Map([
        ["origin", origin],
        ["instance", instance],
      ]),
    );

    const result = buildSelectionRenderData(
      0,
      0,
      1,
      new Map([["instance", { x: 0, y: 0, width: 80, height: 32 }]]),
      makeSelection(["instance"]),
      resolvedMap,
    );

    expect(resolvedMap.get("instance")).toMatchObject({
      id: "instance",
      type: "NumberField",
      ref: "origin",
    });
    expect(result.semanticRole).toBe("instance");
  });

  it("multi-selection suppresses semantic role marker", () => {
    const result = buildSelectionRenderData(
      0,
      0,
      1,
      new Map([
        ["origin", { x: 0, y: 0, width: 80, height: 32 }],
        ["plain", { x: 100, y: 0, width: 80, height: 32 }],
      ]),
      makeSelection(["origin", "plain"]),
      new Map([
        ["origin", makeElement("origin", { reusable: true })],
        ["plain", makeElement("plain")],
      ]),
    );

    expect(result.semanticRole).toBeNull();
    expect(result.showHandles).toBe(false);
  });
});
