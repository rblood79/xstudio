import { describe, expect, it } from "vitest";
import type { Element } from "../../../../types/core/store.types";
import { buildHoverHighlightTargets } from "./skiaOverlayHelpers";

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

describe("buildHoverHighlightTargets editing semantics", () => {
  it("marks origin and instance hover targets with semantic roles", () => {
    const targets = buildHoverHighlightTargets(
      new Map([
        ["origin", { x: 0, y: 0, width: 100, height: 40 }],
        ["instance", { x: 120, y: 0, width: 100, height: 40 }],
      ]),
      "origin",
      ["instance"],
      true,
      new Map([
        ["origin", makeElement("origin", { reusable: true })],
        ["instance", makeElement("instance", { type: "ref", ref: "origin" })],
      ]),
    );

    expect(targets).toEqual([
      expect.objectContaining({ dashed: false, semanticRole: "origin" }),
      expect.objectContaining({ dashed: true, semanticRole: "instance" }),
    ]);
  });

  it("keeps default hover role for plain elements", () => {
    const targets = buildHoverHighlightTargets(
      new Map([["plain", { x: 0, y: 0, width: 100, height: 40 }]]),
      "plain",
      [],
      false,
      new Map([["plain", makeElement("plain")]]),
    );

    expect(targets).toEqual([
      expect.objectContaining({ dashed: false, semanticRole: null }),
    ]);
  });
});
