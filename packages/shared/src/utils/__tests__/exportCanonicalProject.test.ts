import { describe, expect, it } from "vitest";

import type { CompositionDocument } from "../../types/composition-document.types";
import type { Element, Page } from "../../types/element.types";
import { parseProjectData, serializeProjectData } from "../export.utils";

const projectId = "00000000-0000-0000-0000-000000000916";

const pages: Page[] = [
  {
    id: "page-home",
    title: "Home",
    slug: "/",
    project_id: projectId,
    parent_id: null,
    order_num: 0,
  },
];

const elements: Element[] = [
  {
    id: "heading-1",
    type: "Heading",
    props: { children: "Canonical export" },
    parent_id: null,
    page_id: "page-home",
    order_num: 0,
  },
];

const document: CompositionDocument = {
  version: "composition-1.0",
  children: [
    {
      id: "page-home",
      type: "frame",
      name: "Home",
      children: [
        {
          id: "heading-1",
          type: "Heading",
          props: { children: "Canonical export" },
        },
      ],
    },
  ],
};

describe("project export canonical CompositionDocument payload", () => {
  it("serializes CompositionDocument as the primary project payload", () => {
    const json = serializeProjectData(
      projectId,
      "Canonical Project",
      pages,
      elements,
      "page-home",
      document,
    );

    const parsed = JSON.parse(json) as {
      document?: CompositionDocument;
      pages?: Page[];
      elements?: Element[];
    };

    expect(parsed.document).toEqual(document);
    expect(parsed.pages).toEqual(pages);
    expect(parsed.elements).toEqual(elements);
  });

  it("parses canonical-first project payload and keeps legacy mirror data", () => {
    const json = serializeProjectData(
      projectId,
      "Canonical Project",
      pages,
      elements,
      "page-home",
      document,
    );

    const result = parseProjectData(json);

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.document).toEqual(document);
    expect(result.data.pages).toEqual(pages);
    expect(result.data.elements).toEqual(elements);
  });

  it("rejects legacy-only project payload without CompositionDocument", () => {
    const legacyOnly = {
      version: "1.0.0",
      exportedAt: "2026-05-02T00:00:00.000Z",
      project: { id: projectId, name: "Legacy Only" },
      pages,
      elements,
      currentPageId: "page-home",
    };

    const result = parseProjectData(JSON.stringify(legacyOnly));

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.field).toBe("document");
  });
});
