import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompositionDocument, FrameNode } from "@composition/shared";
import type { Element, Page } from "../../../../types/builder/unified.types";
import type { Layout } from "../../../../types/builder/layout.types";
import { useCanonicalDocumentStore } from "../../canonical/canonicalDocumentStore";
import {
  registerCanonicalMutationStoreActions,
  resetCanonicalMutationStoreActions,
} from "../../../../adapters/canonical/canonicalMutations";
import { createInspectorActionsSlice } from "../../inspectorActions";
import { createRemoveElementsAction } from "../elementRemoval";
import { createUpdateElementPropsAction } from "../elementUpdate";

const mocks = vi.hoisted(() => ({
  db: {
    elements: {
      deleteMany: vi.fn(async () => {}),
      insertMany: vi.fn(async () => {}),
      update: vi.fn(async () => {}),
    },
    documents: {
      put: vi.fn(async () => {}),
    },
  },
}));

vi.mock("../../../../lib/db", () => ({
  getDB: vi.fn(async () => mocks.db),
}));

vi.mock("../../history", () => ({
  historyManager: {
    addEntry: vi.fn(),
  },
}));

vi.mock("../../../../services/save", () => ({
  saveService: {
    savePropertyChange: vi.fn(async () => {}),
  },
}));

type MockState = {
  elements: Element[];
  elementsMap: Map<string, Element>;
  childrenMap: Map<string, Element[]>;
  currentPageId: string | null;
  pages: Page[];
  selectedElementId: string | null;
  selectedElementIds: string[];
  selectedElementIdsSet: Set<string>;
  selectedElementProps: Record<string, unknown>;
  editingContextId: string | null;
  dirtyElementIds: Set<string>;
  layoutVersion: number;
  batchUpdateElementOrders: ReturnType<typeof vi.fn>;
  _cancelHydrateSelectedProps: ReturnType<typeof vi.fn>;
  updateElement: ReturnType<typeof vi.fn>;
  batchUpdateElementProps: ReturnType<typeof vi.fn>;
};

function makeElement(
  id: string,
  type: string,
  patch: Partial<Element> & Record<string, unknown> = {},
): Element {
  return {
    id,
    type,
    props: {},
    parent_id: null,
    page_id: null,
    order_num: 0,
    ...patch,
  } as Element;
}

function makeLayout(id: string): Layout {
  return {
    id,
    name: id,
    project_id: "project-1",
  };
}

function makeState(elements: Element[]): MockState {
  const elementsMap = new Map(elements.map((element) => [element.id, element]));
  const childrenMap = new Map<string, Element[]>();
  for (const element of elements) {
    const parentId = element.parent_id ?? "root";
    childrenMap.set(parentId, [...(childrenMap.get(parentId) ?? []), element]);
  }
  return {
    elements,
    elementsMap,
    childrenMap,
    currentPageId: null,
    pages: [],
    selectedElementId: null,
    selectedElementIds: [],
    selectedElementIdsSet: new Set(),
    selectedElementProps: {},
    editingContextId: null,
    dirtyElementIds: new Set(),
    layoutVersion: 0,
    batchUpdateElementOrders: vi.fn(),
    _cancelHydrateSelectedProps: vi.fn(),
    updateElement: vi.fn(),
    batchUpdateElementProps: vi.fn(),
  };
}

function replaceStateElements(state: MockState, elements: Element[]): void {
  const next = makeState(elements);
  state.elements = next.elements;
  state.elementsMap = next.elementsMap;
  state.childrenMap = next.childrenMap;
}

function createSetMock(state: MockState) {
  return vi.fn(
    (
      patch: Partial<MockState> | ((current: MockState) => Partial<MockState>),
    ) => {
      const nextPatch = typeof patch === "function" ? patch(state) : patch;
      Object.assign(state, nextPatch);
    },
  );
}

function registerCanonicalActions(
  state: MockState,
  layouts: Layout[] = [makeLayout("frame-1")],
): void {
  registerCanonicalMutationStoreActions({
    mergeElements: vi.fn(),
    setElements: (elements) => replaceStateElements(state, elements),
    getCurrentLegacySnapshot: () => ({
      elements: state.elements,
      pages: state.pages,
      layouts,
    }),
    getCurrentProjectId: () => "project-1",
  });
}

function makeFrameDocument(
  children: FrameNode["children"],
): CompositionDocument {
  return {
    version: "composition-1.0",
    children: [
      {
        id: "layout-frame-1",
        type: "frame",
        reusable: true,
        metadata: { type: "legacy-layout", layoutId: "frame-1" },
        children,
      } satisfies FrameNode,
    ],
  };
}

describe("element mutations keep canonical document primary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCanonicalMutationStoreActions();
    useCanonicalDocumentStore.setState({
      documents: new Map(),
      currentProjectId: "project-1",
      documentVersion: 0,
    });
    (globalThis as { indexedDB?: unknown }).indexedDB = {};
  });

  it("removeElements removes frame slots from active canonical document before the next preset insert", async () => {
    const body = makeElement("frame-body", "body", {
      layout_id: "frame-1",
      props: { style: { display: "flex" } },
    });
    const header = makeElement("slot-header", "Slot", {
      parent_id: "frame-body",
      layout_id: "frame-1",
      props: { name: "header" },
      slot_name: "header",
    });
    const content = makeElement("slot-content", "Slot", {
      parent_id: "frame-body",
      layout_id: "frame-1",
      props: { name: "content" },
      slot_name: "content",
    });
    const state = makeState([body, header, content]);
    registerCanonicalActions(state);
    useCanonicalDocumentStore.getState().setDocument(
      "project-1",
      makeFrameDocument([
        {
          id: "frame-body",
          type: "body",
          props: body.props as Record<string, unknown>,
          children: [
            {
              id: "slot-header",
              type: "frame",
              placeholder: true,
              props: { name: "header" },
              metadata: {
                type: "legacy-slot-hoisted",
                slotName: "header",
              },
              children: [],
            },
            {
              id: "slot-content",
              type: "frame",
              placeholder: true,
              props: { name: "content" },
              metadata: {
                type: "legacy-slot-hoisted",
                slotName: "content",
              },
              children: [],
            },
          ],
        },
      ]),
    );

    await createRemoveElementsAction(
      createSetMock(state),
      () => state as never,
    )(["slot-header", "slot-content"]);

    const frame = useCanonicalDocumentStore.getState().getDocument("project-1")
      ?.children[0] as FrameNode;
    const frameBody = frame.children?.find((node) => node.id === "frame-body");
    expect(frameBody?.children ?? []).toEqual([]);
    expect(state.elements.map((element) => element.id)).toEqual(["frame-body"]);
  });

  it("updateElementProps merges body preset props into active canonical document", async () => {
    const body = makeElement("frame-body", "body", {
      layout_id: "frame-1",
      props: { style: { display: "flex" } },
    });
    const state = makeState([body]);
    registerCanonicalActions(state);
    useCanonicalDocumentStore.getState().setDocument(
      "project-1",
      makeFrameDocument([
        {
          id: "frame-body",
          type: "body",
          props: body.props as Record<string, unknown>,
          children: [],
        },
      ]),
    );

    await createUpdateElementPropsAction(
      createSetMock(state),
      () => state as never,
    )("frame-body", {
      style: { display: "grid", gridTemplateRows: "auto 1fr" },
      appliedPreset: "vertical-2",
    });

    const frame = useCanonicalDocumentStore.getState().getDocument("project-1")
      ?.children[0] as FrameNode;
    const frameBody = frame.children?.find((node) => node.id === "frame-body");
    expect(frameBody?.props).toEqual({
      style: { display: "grid", gridTemplateRows: "auto 1fr" },
      appliedPreset: "vertical-2",
    });
    expect(state.elementsMap.get("frame-body")?.props).toEqual({
      style: { display: "grid", gridTemplateRows: "auto 1fr" },
      appliedPreset: "vertical-2",
    });
  });

  it("style panel layout edits merge frame body and slot style into active canonical document", () => {
    const body = makeElement("frame-body", "body", {
      layout_id: "frame-1",
      props: { style: { display: "block" } },
    });
    const slot = makeElement("slot-content", "Slot", {
      parent_id: "frame-body",
      layout_id: "frame-1",
      props: { name: "content", style: { display: "block" } },
      slot_name: "content",
    });
    const state = makeState([body, slot]);
    state.selectedElementId = "frame-body";
    state.selectedElementIds = ["frame-body"];
    state.selectedElementIdsSet = new Set(["frame-body"]);
    state.selectedElementProps = body.props as Record<string, unknown>;
    registerCanonicalActions(state);
    useCanonicalDocumentStore.getState().setDocument(
      "project-1",
      makeFrameDocument([
        {
          id: "frame-body",
          type: "body",
          props: body.props as Record<string, unknown>,
          children: [
            {
              id: "slot-content",
              type: "frame",
              placeholder: true,
              props: slot.props as Record<string, unknown>,
              metadata: {
                type: "legacy-slot-hoisted",
                slotName: "content",
              },
              children: [],
            },
          ],
        },
      ]),
    );

    const inspectorActions = createInspectorActionsSlice(
      createSetMock(state) as never,
      () => state as never,
      {} as never,
    );

    inspectorActions.updateSelectedStyles({
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    });

    const frame = useCanonicalDocumentStore.getState().getDocument("project-1")
      ?.children[0] as FrameNode;
    const frameBody = frame.children?.find((node) => node.id === "frame-body");
    expect(frameBody?.props?.style).toMatchObject({
      display: "flex",
      flexDirection: "column",
      rowGap: 12,
      columnGap: 12,
    });
    expect(frameBody?.props?.style).not.toHaveProperty("gap");
    expect(state.elementsMap.get("frame-body")?.props.style).toMatchObject({
      display: "flex",
      flexDirection: "column",
      rowGap: 12,
      columnGap: 12,
    });

    state.selectedElementId = "slot-content";
    state.selectedElementIds = ["slot-content"];
    state.selectedElementIdsSet = new Set(["slot-content"]);
    state.selectedElementProps = slot.props as Record<string, unknown>;
    inspectorActions.updateSelectedStyle("padding", "8px");

    const updatedFrame = useCanonicalDocumentStore
      .getState()
      .getDocument("project-1")?.children[0] as FrameNode;
    const updatedFrameBody = updatedFrame.children?.find(
      (node) => node.id === "frame-body",
    );
    const slotNode = updatedFrameBody?.children?.find(
      (node) => node.id === "slot-content",
    );
    expect(slotNode?.props?.style).toMatchObject({
      display: "block",
      paddingTop: 8,
      paddingRight: 8,
      paddingBottom: 8,
      paddingLeft: 8,
    });
    expect(state.elementsMap.get("slot-content")?.props.style).toMatchObject({
      display: "block",
      paddingTop: 8,
      paddingRight: 8,
      paddingBottom: 8,
      paddingLeft: 8,
    });
  });
});
