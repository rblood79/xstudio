import { describe, expect, it } from "vitest";
import type { Element } from "../../types/core/store.types";
import {
  isCanonicalRefElement,
  resolveCanonicalRefElement,
  resolveCanonicalRefElementsMap,
  resolveCanonicalRefTree,
} from "./canonicalRefResolution";

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

describe("canonicalRefResolution", () => {
  it("resolves a canonical ref root as the origin type with merged props", () => {
    const origin = makeElement("origin", {
      type: "Text",
      reusable: true,
      fills: [{ id: "fill-1", type: "solid", color: "#ff0000" }],
      props: {
        text: "Origin text",
        style: { color: "red", left: "10px", top: "20px" },
      },
    });
    const ref = makeElement("instance", {
      type: "ref",
      ref: "origin",
      parent_id: "body",
      fills: [{ id: "fill-2", type: "solid", color: "#0000ff" }],
      props: { style: { left: "30px" } },
    } as never);

    const resolved = resolveCanonicalRefElement(ref, [origin, ref]);

    expect(isCanonicalRefElement(ref)).toBe(true);
    expect(resolved).toMatchObject({
      id: "instance",
      type: "Text",
      parent_id: "body",
      props: {
        text: "Origin text",
        style: { color: "red", left: "30px", top: "20px" },
      },
      ref: "origin",
      fills: [{ id: "fill-2", type: "solid", color: "#0000ff" }],
      reusable: undefined,
    });
  });

  it("resolves refs inside an elements map while preserving ids", () => {
    const origin = makeElement("origin", {
      type: "Text",
      reusable: true,
      props: { text: "Origin text" },
    });
    const ref = makeElement("instance", {
      type: "ref",
      ref: "origin",
    } as never);

    const resolvedMap = resolveCanonicalRefElementsMap(
      new Map([
        ["origin", origin],
        ["instance", ref],
      ]),
    );

    expect(resolvedMap.get("origin")).toBe(origin);
    expect(resolvedMap.get("instance")).toMatchObject({
      id: "instance",
      type: "Text",
      ref: "origin",
      props: { text: "Origin text" },
    });
  });

  it("replicates component descendants under a canonical ref instance", () => {
    const origin = makeElement("origin", {
      type: "TextField",
      reusable: true,
      props: { label: "Name" },
    });
    const label = makeElement("label", {
      type: "Label",
      customId: "label",
      parent_id: "origin",
      props: { text: "Name" },
    });
    const input = makeElement("input", {
      type: "Input",
      customId: "input",
      parent_id: "origin",
      props: { value: "" },
    });
    const ref = makeElement("instance", {
      type: "ref",
      ref: "origin",
      descendants: {
        label: { text: "Email" },
      },
    } as never);

    const tree = resolveCanonicalRefTree({
      elements: [origin, label, input, ref],
      elementsMap: new Map([
        ["origin", origin],
        ["label", label],
        ["input", input],
        ["instance", ref],
      ]),
    });

    expect(tree.elementsMap.get("instance")).toMatchObject({
      id: "instance",
      type: "TextField",
    });
    expect(tree.childrenMap.get("instance")).toEqual([
      expect.objectContaining({
        id: "instance/label",
        type: "Label",
        parent_id: "instance",
        props: { text: "Email" },
      }),
      expect.objectContaining({
        id: "instance/input",
        type: "Input",
        parent_id: "instance",
        props: { value: "" },
      }),
    ]);
    expect(tree.elementsMap.get("instance/label")).toMatchObject({
      props: { text: "Email" },
    });
  });
});
