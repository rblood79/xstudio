import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CanonicalNode, CompositionDocument } from "@composition/shared";
import type { Element, Page } from "@/types/builder/unified.types";
import type { Layout } from "@/types/builder/layout.types";
import { useCanonicalDocumentStore } from "@/builder/stores/canonical/canonicalDocumentStore";
import { applyPageFrameBindingCanonicalPrimary } from "../pageFrameBinding";

const mocks = vi.hoisted(() => ({
  db: {
    pages: {
      getById: vi.fn(),
      update: vi.fn(),
      insert: vi.fn(),
    },
  },
  getDB: vi.fn(),
  enqueuePagePersistence: vi.fn(),
  loadFrameElements: vi.fn(),
  mergeElementsCanonicalPrimary: vi.fn(),
  selectCanonicalDocument: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getDB: mocks.getDB,
}));

vi.mock("@/builder/utils/pagePersistenceQueue", () => ({
  enqueuePagePersistence: mocks.enqueuePagePersistence,
}));

vi.mock("../frameElementLoader", () => ({
  loadFrameElements: mocks.loadFrameElements,
}));

vi.mock("../canonicalMutations", () => ({
  mergeElementsCanonicalPrimary: mocks.mergeElementsCanonicalPrimary,
}));

vi.mock("@/builder/stores/elements", () => ({
  selectCanonicalDocument: mocks.selectCanonicalDocument,
}));

function makePage(id = "page-1", layoutId: string | null = null): Page {
  return {
    id,
    title: id,
    project_id: "project-1",
    slug: `/${id}`,
    layout_id: layoutId,
    order_num: 0,
  } as Page;
}

function makeLayout(id = "frame-1"): Layout {
  return {
    id,
    name: "Frame",
    project_id: "project-1",
  };
}

function makeElement(id = "frame-body"): Element {
  return {
    id,
    type: "body",
    props: {},
    parent_id: null,
    page_id: null,
    layout_id: "frame-1",
    order_num: 0,
  } as Element;
}

function makeDoc(children: CanonicalNode[] = []): CompositionDocument {
  return {
    version: "composition-1.0",
    children,
  };
}

describe("pageFrameBinding canonical primary helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDB.mockResolvedValue(mocks.db);
    mocks.enqueuePagePersistence.mockImplementation(
      async (task: () => Promise<void>) => {
        await task();
      },
    );
    mocks.loadFrameElements.mockResolvedValue([makeElement()]);
    mocks.selectCanonicalDocument.mockReturnValue(makeDoc());
    useCanonicalDocumentStore.setState({
      documents: new Map(),
      currentProjectId: null,
      documentVersion: 0,
    });
  });

  it("hydrates selected frame elements, updates canonical document, then mirrors page binding", async () => {
    const page = makePage();
    const state = {
      pages: [page],
      elementsMap: new Map<string, Element>(),
    } as Parameters<typeof applyPageFrameBindingCanonicalPrimary>[0] extends {
      getElementsState: () => infer S;
    }
      ? S
      : never;
    const setPages = vi.fn();
    mocks.db.pages.getById.mockResolvedValue(page);

    await applyPageFrameBindingCanonicalPrimary({
      pageId: page.id,
      frameId: "frame-1",
      layouts: [makeLayout()],
      getElementsState: () => state,
      setPages,
    });

    expect(mocks.loadFrameElements).toHaveBeenCalledWith(mocks.db, "frame-1");
    expect(mocks.mergeElementsCanonicalPrimary).toHaveBeenCalledWith([
      expect.objectContaining({ id: "frame-body" }),
    ]);
    expect(mocks.selectCanonicalDocument).toHaveBeenCalledWith(
      state,
      [expect.objectContaining({ id: "page-1", layout_id: "frame-1" })],
      [expect.objectContaining({ id: "frame-1" })],
    );
    expect(
      useCanonicalDocumentStore.getState().getDocument("project-1"),
    ).toEqual(makeDoc());
    expect(setPages).toHaveBeenCalledWith([
      expect.objectContaining({ id: "page-1", layout_id: "frame-1" }),
    ]);
    expect(mocks.db.pages.update).toHaveBeenCalledWith("page-1", {
      layout_id: "frame-1",
    });
  });

  it("clears frame binding without loading frame elements and inserts missing page mirror", async () => {
    const page = makePage("page-2", "frame-1");
    const state = {
      pages: [page],
      elementsMap: new Map<string, Element>(),
    } as Parameters<typeof applyPageFrameBindingCanonicalPrimary>[0] extends {
      getElementsState: () => infer S;
    }
      ? S
      : never;
    const setPages = vi.fn();
    mocks.db.pages.getById.mockResolvedValue(null);

    await applyPageFrameBindingCanonicalPrimary({
      pageId: page.id,
      frameId: null,
      layouts: [makeLayout()],
      getElementsState: () => state,
      setPages,
    });

    expect(mocks.loadFrameElements).not.toHaveBeenCalled();
    expect(setPages).toHaveBeenCalledWith([
      expect.objectContaining({ id: "page-2", layout_id: null }),
    ]);
    expect(mocks.db.pages.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "page-2",
        layout_id: null,
        updated_at: expect.any(String),
      }),
    );
  });
});
