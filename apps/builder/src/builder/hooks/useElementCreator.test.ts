import { describe, expect, it } from "vitest";
import type { CompositionDocument } from "@composition/shared";

import { resolveCreationParentId } from "./useElementCreator";
import type { Element } from "../../types/builder/unified.types";

function makeElement(
  id: string,
  type: string,
  overrides: Partial<Element> = {},
): Element {
  return {
    id,
    type,
    parent_id: null,
    page_id: null,
    layout_id: null,
    order_num: 0,
    props: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  } as Element;
}

const emptyDoc = {
  version: "composition-1.0",
  children: [],
} as CompositionDocument;

describe("resolveCreationParentId", () => {
  it("page id selection falls back to the page body element", () => {
    const pageId = "page-1";
    const body = makeElement("body-1", "body", { page_id: pageId });
    const elements = [body];

    expect(
      resolveCreationParentId({
        selectedElementId: pageId,
        elements,
        currentPageId: pageId,
        layoutId: null,
        doc: emptyDoc,
      }),
    ).toBe(body.id);
  });

  it("valid element selection remains the creation parent", () => {
    const pageId = "page-1";
    const body = makeElement("body-1", "body", { page_id: pageId });
    const card = makeElement("card-1", "Card", {
      page_id: pageId,
      parent_id: body.id,
    });
    const elements = [body, card];

    expect(
      resolveCreationParentId({
        selectedElementId: card.id,
        elements,
        currentPageId: pageId,
        layoutId: null,
        doc: emptyDoc,
      }),
    ).toBe(card.id);
  });

  it("empty selection uses the page body element", () => {
    const pageId = "page-1";
    const body = makeElement("body-1", "body", { page_id: pageId });
    const elements = [body];

    expect(
      resolveCreationParentId({
        selectedElementId: null,
        elements,
        currentPageId: pageId,
        layoutId: null,
        doc: emptyDoc,
      }),
    ).toBe(body.id);
  });
});
