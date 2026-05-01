/**
 * ADR-903 P3-D-3 — layoutActions canonical document 전환 단위 테스트
 *
 * RED → GREEN 사이클:
 *  1. createGetLayoutSlotsAction: elementsMap.forEach 제거 + canonical FrameNode.slot 직접 조회
 *  2. createDeleteLayoutAction cascade: layout_id 기반 elements 제거 → selectCanonicalDocument 경유
 *  3. edge: 빈 layout, nested slot, cascade 정확성
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// canonical adapter / resolver mocks
import * as elementsStoreModule from "../../elements";

const canonicalMutationMocks = vi.hoisted(() => ({
  mergeElementsCanonicalPrimary: vi.fn(),
}));

import {
  createFetchLayoutsAction,
  createGetLayoutSlotsAction,
  createDeleteLayoutAction,
  createDuplicateLayoutAction,
} from "../layoutActions";
import type { Element, Page } from "../../../../types/builder/unified.types";
import type { Layout } from "../../../../types/builder/layout.types";
import type { CompositionDocument } from "@composition/shared";

const mockGetActiveCanonicalDocument = vi.hoisted(() => vi.fn());

vi.mock("@/builder/stores/canonical/canonicalElementsBridge", () => ({
  getActiveCanonicalDocument: () => mockGetActiveCanonicalDocument(),
}));

// ─── helpers ────────────────────────────────────────────────────────────────

function makeLayout(id: string, name = "Layout"): Layout {
  return {
    id,
    name,
    project_id: "proj-1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function makeElement(
  id: string,
  type: string,
  opts: Partial<Element> = {},
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
    ...opts,
  } as Element;
}

function makePage(id: string, opts: Partial<Page> = {}): Page {
  return {
    id,
    title: id,
    project_id: "proj-1",
    slug: `/${id}`,
    order_num: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...opts,
  };
}

function makeFrameDoc(
  layoutId: string,
  slot: string[] | false = [],
): CompositionDocument {
  return {
    version: "composition-1.0",
    children: [
      {
        id: `layout-${layoutId}`,
        type: "frame",
        reusable: true,
        name: layoutId,
        slot,
        metadata: { layoutId },
        children: [],
      },
    ],
  } as CompositionDocument;
}

async function mockElementsState(elements: Element[] = [], pages: Page[] = []) {
  const snapshot = {
    elementsMap: new Map(elements.map((element) => [element.id, element])),
    pages,
    removeElements: vi.fn(),
    setElements: vi.fn(),
    setPages: vi.fn(),
    mergeElements: vi.fn(),
  };
  vi.mocked(elementsStoreModule.useStore).getState = vi.fn(() => snapshot);

  const actualElementsModule =
    await vi.importActual<typeof import("../../elements")>("../../elements");
  actualElementsModule.useStore.setState(
    snapshot as Partial<
      ReturnType<typeof actualElementsModule.useStore.getState>
    >,
  );

  return snapshot;
}

// ─── mock 공통 설정 ─────────────────────────────────────────────────────────

// useStore mock (elements read 용)
vi.mock("../../elements", async (importOriginal) => {
  const actual = await importOriginal<typeof elementsStoreModule>();
  return {
    ...actual,
    useStore: {
      getState: vi.fn(() => ({
        elementsMap: new Map<string, Element>(),
        pages: [] as Page[],
        removeElements: vi.fn(),
        setElements: vi.fn(),
        setPages: vi.fn(),
        mergeElements: vi.fn(),
      })),
    },
    selectCanonicalDocument: vi.fn(),
  };
});

// getDB mock — mockDb 단일 인스턴스를 모든 호출이 공유해야 test 가 설정한
// mockResolvedValue 가 함수 내부의 await getDB() 호출에 그대로 반영된다.
vi.mock("../../../../lib/db", () => {
  const mockDb = {
    pages: {
      getAll: vi.fn(async () => [] as Page[]),
      update: vi.fn(async () => ({})),
    },
    elements: {
      getAll: vi.fn(async () => [] as Element[]),
      delete: vi.fn(async () => {}),
      insert: vi.fn(async (el: Element) => el),
      insertMany: vi.fn(async () => {}),
    },
    layouts: {
      getByProject: vi.fn(async () => [] as Layout[]),
      insert: vi.fn(async (l: Layout) => l),
      update: vi.fn(async () => ({})),
      delete: vi.fn(async () => {}),
    },
  };
  return { getDB: vi.fn(async () => mockDb) };
});

vi.mock("../../../../adapters/canonical/canonicalMutations", () => ({
  mergeElementsCanonicalPrimary:
    canonicalMutationMocks.mergeElementsCanonicalPrimary,
}));

// ─── test suite ─────────────────────────────────────────────────────────────

describe("P3-D-3: createFetchLayoutsAction pending mutation guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  type LayoutFetchState = {
    layouts: Layout[];
    selectedReusableFrameId: string | null;
    isLoading: boolean;
    error: Error | null;
  };

  function createFetchHarness(initialState: LayoutFetchState) {
    let state = initialState;
    const mockSet = vi.fn((partial: Partial<LayoutFetchState>) => {
      state = { ...state, ...partial };
    });
    const mockGet = vi.fn(() => state);
    const fetchLayouts = createFetchLayoutsAction(
      mockSet as unknown as Parameters<typeof createFetchLayoutsAction>[0],
      mockGet as unknown as Parameters<typeof createFetchLayoutsAction>[1],
    );

    return {
      fetchLayouts,
      get state() {
        return state;
      },
      setState(nextState: LayoutFetchState) {
        state = nextState;
      },
    };
  }

  it("fetch 중 생성된 frame layout을 stale fetch 결과로 drop하지 않는다", async () => {
    const newLayout = makeLayout("new-frame", "Frame 1");
    const harness = createFetchHarness({
      layouts: [],
      selectedReusableFrameId: null,
      isLoading: false,
      error: null,
    });

    const { getDB } = await import("../../../../lib/db");
    const db = await (getDB as ReturnType<typeof vi.fn>)();
    db.layouts.getByProject.mockImplementationOnce(async () => {
      harness.setState({
        ...harness.state,
        layouts: [newLayout],
        selectedReusableFrameId: newLayout.id,
      });
      return [];
    });

    await harness.fetchLayouts("proj-1");

    expect(harness.state.layouts.map((layout) => layout.id)).toEqual([
      "new-frame",
    ]);
    expect(harness.state.selectedReusableFrameId).toBe("new-frame");
  });

  it("fetch 중 삭제된 frame layout을 stale fetch 결과로 되살리지 않는다", async () => {
    const oldLayout = makeLayout("old-frame", "Old Frame");
    const harness = createFetchHarness({
      layouts: [oldLayout],
      selectedReusableFrameId: oldLayout.id,
      isLoading: false,
      error: null,
    });

    const { getDB } = await import("../../../../lib/db");
    const db = await (getDB as ReturnType<typeof vi.fn>)();
    db.layouts.getByProject.mockImplementationOnce(async () => {
      harness.setState({
        ...harness.state,
        layouts: [],
        selectedReusableFrameId: null,
      });
      return [oldLayout];
    });

    await harness.fetchLayouts("proj-1");

    expect(harness.state.layouts).toEqual([]);
    expect(harness.state.selectedReusableFrameId).toBeNull();
  });
});

describe("P3-D-3: createGetLayoutSlotsAction (canonical document 기반)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await mockElementsState();
    mockGetActiveCanonicalDocument.mockReturnValue(null);
  });

  it("FrameNode.slot 배열에서 SlotInfo 목록을 올바르게 추출한다", async () => {
    const layoutId = "layout-1";
    const body = makeElement("body-1", "body", { layout_id: layoutId });
    const header = makeElement("slot-header", "Slot", {
      layout_id: layoutId,
      parent_id: body.id,
      order_num: 1,
      props: { name: "header" },
    });
    const content = makeElement("slot-content", "Slot", {
      layout_id: layoutId,
      parent_id: body.id,
      order_num: 2,
      props: { name: "content" },
    });
    const footer = makeElement("slot-footer", "Slot", {
      layout_id: layoutId,
      parent_id: body.id,
      order_num: 3,
      props: { name: "footer" },
    });
    await mockElementsState([body, header, content, footer]);
    mockGetActiveCanonicalDocument.mockReturnValue(
      makeFrameDoc(layoutId, ["header", "content", "footer"]),
    );

    const mockGet = vi.fn(() => ({
      layouts: [makeLayout(layoutId)],
      selectedReusableFrameId: layoutId,
    })) as unknown as Parameters<typeof createGetLayoutSlotsAction>[0];

    const getElements = vi.fn(() => [] as Element[]);
    const getSlots = createGetLayoutSlotsAction(mockGet, getElements);
    const slots = getSlots(layoutId);

    expect(slots).toHaveLength(3);
    expect(slots.map((s) => s.name)).toEqual(["header", "content", "footer"]);
    expect(slots.every((s) => s.elementId === "")).toBe(true); // canonical 경로는 elementId 없음
  });

  it("FrameNode.slot === false 이면 빈 배열을 반환한다", () => {
    const layoutId = "layout-2";
    mockGetActiveCanonicalDocument.mockReturnValue(
      makeFrameDoc(layoutId, false),
    );

    const mockGet = vi.fn(() => ({
      layouts: [makeLayout(layoutId)],
      selectedReusableFrameId: layoutId,
    })) as unknown as Parameters<typeof createGetLayoutSlotsAction>[0];

    const getElements = vi.fn(() => [] as Element[]);
    const getSlots = createGetLayoutSlotsAction(mockGet, getElements);
    const slots = getSlots(layoutId);

    expect(slots).toHaveLength(0);
  });

  it("canonical document 에 해당 frame 이 없으면 빈 배열을 반환한다", () => {
    const layoutId = "layout-absent";
    mockGetActiveCanonicalDocument.mockReturnValue({
      version: "composition-1.0",
      children: [],
    } satisfies CompositionDocument);

    const mockGet = vi.fn(() => ({
      layouts: [],
      selectedReusableFrameId: layoutId,
    })) as unknown as Parameters<typeof createGetLayoutSlotsAction>[0];

    const getElements = vi.fn(() => [] as Element[]);
    const getSlots = createGetLayoutSlotsAction(mockGet, getElements);
    const slots = getSlots(layoutId);

    expect(slots).toHaveLength(0);
  });

  it("선택된 레이아웃이 없을 때도 layoutId 파라미터로 frame 을 찾는다", async () => {
    const layoutId = "layout-3";
    const body = makeElement("body-3", "body", { layout_id: layoutId });
    const mainSlot = makeElement("slot-main", "Slot", {
      layout_id: layoutId,
      parent_id: body.id,
      props: { name: "main" },
    });
    await mockElementsState([body, mainSlot]);
    mockGetActiveCanonicalDocument.mockReturnValue(
      makeFrameDoc(layoutId, ["main"]),
    );

    // selectedReusableFrameId 가 다른 frame 을 가리키는 경우
    const mockGet = vi.fn(() => ({
      layouts: [makeLayout(layoutId)],
      selectedReusableFrameId: "other-frame",
    })) as unknown as Parameters<typeof createGetLayoutSlotsAction>[0];

    const getElements = vi.fn(() => [] as Element[]);
    const getSlots = createGetLayoutSlotsAction(mockGet, getElements);
    const slots = getSlots(layoutId);

    // layoutId 파라미터 기준으로 직접 찾아야 함
    expect(slots).toHaveLength(1);
    expect(slots[0].name).toBe("main");
  });
});

describe("P3-D-3: createDeleteLayoutAction cascade (canonical document 기반)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await mockElementsState();
  });

  it("canonical document 에 없는 layout 삭제 시 elements 는 제거하지 않고 page ref 는 해제한다", async () => {
    const layoutId = "layout-del-1";
    vi.mocked(elementsStoreModule.selectCanonicalDocument).mockReturnValue({
      version: "composition-1.0",
      children: [],
    } satisfies CompositionDocument);

    const removeElements = vi.fn(async () => {});
    const setPages = vi.fn();
    const pageUsingLayout = makePage("page-1", { layout_id: layoutId });
    const pageWithoutLayout = makePage("page-2", { layout_id: null });
    const pages = [pageUsingLayout, pageWithoutLayout];

    vi.mocked(elementsStoreModule.useStore).getState = vi.fn(() => ({
      elementsMap: new Map<string, Element>(),
      pages,
      removeElements,
      setElements: vi.fn(),
      setPages,
      mergeElements: vi.fn(),
    }));
    const actualElementsModule =
      await vi.importActual<typeof import("../../elements")>("../../elements");
    actualElementsModule.useStore.setState({
      elementsMap: new Map<string, Element>(),
      pages,
      removeElements,
      setElements: vi.fn(),
      setPages,
      mergeElements: vi.fn(),
    } as Partial<ReturnType<typeof actualElementsModule.useStore.getState>>);

    const { getDB } = await import("../../../../lib/db");
    const db = await (getDB as ReturnType<typeof vi.fn>)();
    db.pages.getAll.mockResolvedValue(pages);

    const mockSet = vi.fn();
    const mockGet = vi.fn(() => ({
      layouts: [makeLayout(layoutId)],
      selectedReusableFrameId: null,
    })) as unknown as Parameters<typeof createDeleteLayoutAction>[0];

    const deleteLayout = createDeleteLayoutAction(mockSet, mockGet);
    await deleteLayout(layoutId);

    // elements 제거 호출이 없어야 함 (cascade 대상 없음)
    expect(removeElements).not.toHaveBeenCalled();
    expect(db.pages.update).toHaveBeenCalledWith("page-1", {
      layout_id: null,
    });
    expect(setPages).toHaveBeenCalledWith([
      expect.objectContaining({ id: "page-1", layout_id: null }),
      expect.objectContaining({ id: "page-2", layout_id: null }),
    ]);
  });

  it("canonical document mirror 로 frame subtree 를 제거하고 DB mirror 를 삭제한다", async () => {
    const layoutId = "layout-del-2";
    vi.mocked(elementsStoreModule.selectCanonicalDocument)
      .mockReturnValueOnce(makeFrameDoc(layoutId))
      .mockReturnValueOnce({
        version: "composition-1.0",
        children: [],
      } satisfies CompositionDocument);

    const layoutEl1 = makeElement("el-1", "body", { layout_id: layoutId });
    const layoutEl2 = makeElement("el-2", "Slot", { layout_id: layoutId });

    const { getDB } = await import("../../../../lib/db");
    const db = await (getDB as ReturnType<typeof vi.fn>)();
    db.elements.getAll.mockResolvedValue([layoutEl1, layoutEl2]);
    db.pages.getAll.mockResolvedValue([]);

    const removeElements = vi.fn(async () => {});
    const setElements = vi.fn();
    vi.mocked(elementsStoreModule.useStore).getState = vi.fn(() => ({
      elementsMap: new Map<string, Element>([
        ["el-1", layoutEl1],
        ["el-2", layoutEl2],
      ]),
      pages: [] as Page[],
      removeElements,
      setElements,
      setPages: vi.fn(),
      mergeElements: vi.fn(),
    }));
    const actualElementsModule =
      await vi.importActual<typeof import("../../elements")>("../../elements");
    actualElementsModule.useStore.setState({
      elementsMap: new Map<string, Element>([
        ["el-1", layoutEl1],
        ["el-2", layoutEl2],
      ]),
      pages: [] as Page[],
      removeElements,
      setElements,
      setPages: vi.fn(),
      mergeElements: vi.fn(),
    } as Partial<ReturnType<typeof actualElementsModule.useStore.getState>>);

    const mockSet = vi.fn();
    const mockGet = vi.fn(() => ({
      layouts: [makeLayout(layoutId)],
      selectedReusableFrameId: null,
    })) as unknown as Parameters<typeof createDeleteLayoutAction>[0];

    const deleteLayout = createDeleteLayoutAction(mockSet, mockGet);
    await deleteLayout(layoutId);

    expect(removeElements).not.toHaveBeenCalled();
    expect(setElements).toHaveBeenCalledWith([]);
    expect(db.elements.delete).toHaveBeenCalledWith("el-1");
    expect(db.elements.delete).toHaveBeenCalledWith("el-2");
  });
});

describe("P3-D-3: createDuplicateLayoutAction cascade", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await mockElementsState();
  });

  it("복제한 layout element subtree 를 새 layout_id/parent_id 로 remap 하고 store 에 즉시 merge 한다", async () => {
    const layoutId = "layout-source";
    const sourceLayout = makeLayout(layoutId, "Source Frame");
    const sourceBody = makeElement("body-source", "body", {
      layout_id: layoutId,
      order_num: 0,
    });
    const sourceSlot = makeElement("slot-source", "Slot", {
      layout_id: layoutId,
      parent_id: sourceBody.id,
      order_num: 1,
      props: { name: "content" },
    });
    const sourceText = makeElement("text-source", "Text", {
      layout_id: layoutId,
      parent_id: sourceSlot.id,
      order_num: 2,
      page_id: null,
      props: { text: "Default" },
    });

    const randomUuid = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValueOnce("layout-copy")
      .mockReturnValueOnce("body-copy")
      .mockReturnValueOnce("slot-copy")
      .mockReturnValueOnce("text-copy");

    const { getDB } = await import("../../../../lib/db");
    const db = await (getDB as ReturnType<typeof vi.fn>)();
    db.elements.getAll.mockResolvedValue([sourceBody, sourceSlot, sourceText]);

    const mergeElements = vi.fn();
    const elementsSnapshot = {
      elementsMap: new Map<string, Element>([
        [sourceBody.id, sourceBody],
        [sourceSlot.id, sourceSlot],
        [sourceText.id, sourceText],
      ]),
      pages: [] as Page[],
      removeElements: vi.fn(),
      setElements: vi.fn(),
      setPages: vi.fn(),
      mergeElements,
    };
    vi.mocked(elementsStoreModule.useStore).getState = vi.fn(
      () => elementsSnapshot,
    );
    const actualElementsModule =
      await vi.importActual<typeof import("../../elements")>("../../elements");
    actualElementsModule.useStore.setState(
      elementsSnapshot as Partial<
        ReturnType<typeof actualElementsModule.useStore.getState>
      >,
    );

    let state = {
      layouts: [sourceLayout],
      selectedReusableFrameId: sourceLayout.id,
      isLoading: false,
      error: null,
    };
    const mockSet = vi.fn((partial: Partial<typeof state>) => {
      state = { ...state, ...partial };
    });
    const mockGet = vi.fn(() => state);

    const duplicateLayout = createDuplicateLayoutAction(
      mockSet as unknown as Parameters<typeof createDuplicateLayoutAction>[0],
      mockGet as unknown as Parameters<typeof createDuplicateLayoutAction>[1],
    );

    const newLayout = await duplicateLayout(layoutId);

    expect(newLayout).toMatchObject({
      id: "layout-copy",
      name: "Source Frame (Copy)",
      project_id: "proj-1",
    });
    expect(db.elements.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "body-copy",
        layout_id: "layout-copy",
        page_id: null,
        parent_id: null,
      }),
      expect.objectContaining({
        id: "slot-copy",
        layout_id: "layout-copy",
        page_id: null,
        parent_id: "body-copy",
      }),
      expect.objectContaining({
        id: "text-copy",
        layout_id: "layout-copy",
        page_id: null,
        parent_id: "slot-copy",
      }),
    ]);
    expect(
      canonicalMutationMocks.mergeElementsCanonicalPrimary,
    ).toHaveBeenCalledWith([
      expect.objectContaining({ id: "body-copy" }),
      expect.objectContaining({ id: "slot-copy", parent_id: "body-copy" }),
      expect.objectContaining({ id: "text-copy", parent_id: "slot-copy" }),
    ]);
    expect(state.layouts.map((layout) => layout.id)).toEqual([
      "layout-source",
      "layout-copy",
    ]);

    randomUuid.mockRestore();
  });
});
