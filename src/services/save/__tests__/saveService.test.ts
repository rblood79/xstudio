import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveService } from "../saveService";

type PendingChange = Record<string, unknown>;
type PendingChangesMap = Map<string, PendingChange>;

const pendingChanges: PendingChangesMap = new Map();

const addPendingChangeMock = vi.fn<(key: string, value: PendingChange) => void>(
  (key: string, value: PendingChange) => {
    const existing = pendingChanges.get(key) ?? {};
    pendingChanges.set(key, { ...existing, ...value });
  }
);

const clearPendingChangesMock = vi.fn<() => void>(() => {
  pendingChanges.clear();
});

const getPendingChangesMock = vi.fn<() => PendingChangesMap>(
  () => pendingChanges
);

interface MockStoreState {
  isRealtimeMode: boolean;
  pendingChanges: PendingChangesMap;
  addPendingChange: typeof addPendingChangeMock;
  clearPendingChanges: typeof clearPendingChangesMock;
  getPendingChanges: typeof getPendingChangesMock;
}

const storeState: MockStoreState = {
  isRealtimeMode: true,
  pendingChanges,
  addPendingChange: addPendingChangeMock,
  clearPendingChanges: clearPendingChangesMock,
  getPendingChanges: getPendingChangesMock,
};

type SupabaseEqFn = (column: string, value: string) => Promise<{ error: null }>;
type SupabaseUpdateBuilder = { eq: SupabaseEqFn };
type SupabaseUpdateFn = (data: PendingChange) => SupabaseUpdateBuilder;
type SupabaseFromFn = (table: string) => { update: SupabaseUpdateFn };

const { fromMock, updateMock, eqMock } = vi.hoisted(() => {
  const eq = vi.fn<SupabaseEqFn>(async () => ({ error: null }));
  const update = vi.fn<SupabaseUpdateFn>(() => ({
    eq,
  }));
  const from = vi.fn<SupabaseFromFn>(() => ({
    update,
  }));

  return { fromMock: from, updateMock: update, eqMock: eq };
});

vi.mock("../../../builder/stores", () => ({
  getStoreState: () => storeState,
}));

vi.mock("../../../env/supabase.client", () => ({
  supabase: {
    from: fromMock,
  },
}));

// Mock IndexedDB (getDB) - hoisted for vi.mock
const { mockElementsUpdate, mockPagesUpdate, mockProjectsUpdate, mockDesignTokensUpdate } = vi.hoisted(() => ({
  mockElementsUpdate: vi.fn().mockResolvedValue({}),
  mockPagesUpdate: vi.fn().mockResolvedValue({}),
  mockProjectsUpdate: vi.fn().mockResolvedValue({}),
  mockDesignTokensUpdate: vi.fn().mockResolvedValue({}),
}));

vi.mock("../../../lib/db", () => ({
  getDB: vi.fn().mockResolvedValue({
    elements: {
      update: mockElementsUpdate,
    },
    pages: {
      update: mockPagesUpdate,
    },
    projects: {
      update: mockProjectsUpdate,
    },
    designTokens: {
      update: mockDesignTokensUpdate,
    },
  }),
}));

describe("SaveService", () => {
  beforeEach(() => {
    storeState.isRealtimeMode = true;
    storeState.pendingChanges.clear();
    fromMock.mockClear();
    updateMock.mockClear();
    eqMock.mockReset();
    eqMock.mockResolvedValue({ error: null });
    storeState.addPendingChange.mockClear();
    storeState.clearPendingChanges.mockClear();
    storeState.getPendingChanges.mockClear();
    // IndexedDB mocks
    mockElementsUpdate.mockClear();
    mockPagesUpdate.mockClear();
    mockProjectsUpdate.mockClear();
    mockDesignTokensUpdate.mockClear();
  });

  it("실시간 모드에서는 즉시 IndexedDB에 저장한다", async () => {
    storeState.isRealtimeMode = true;

    await saveService.savePropertyChange({
      table: "elements",
      id: "element-1",
      data: { name: "Heading" },
    });

    // 실시간 모드: IndexedDB에 저장 (로컬 우선)
    expect(mockElementsUpdate).toHaveBeenCalledWith("element-1", { name: "Heading" });
    expect(storeState.addPendingChange).not.toHaveBeenCalled();
    expect(storeState.pendingChanges.size).toBe(0);
  });

  it("수동 모드에서는 보류 변경사항에 추가한다", async () => {
    storeState.isRealtimeMode = false;

    await saveService.savePropertyChange({
      table: "elements",
      id: "element-2",
      data: { title: "Section" },
    });

    expect(eqMock).not.toHaveBeenCalled();
    expect(storeState.addPendingChange).toHaveBeenCalledWith(
      "elements:element-2",
      { title: "Section" }
    );
    expect(storeState.pendingChanges.get("elements:element-2")).toEqual({
      title: "Section",
    });
  });

  it("보류 변경사항 저장 시 모두 Supabase에 반영하고 초기화한다", async () => {
    storeState.isRealtimeMode = false;
    storeState.pendingChanges.set("elements:element-3", { name: "Hero" });
    storeState.pendingChanges.set("pages:page-1", { title: "Landing" });

    await saveService.saveAllPendingChanges();

    expect(eqMock).toHaveBeenCalledTimes(2);
    expect(storeState.clearPendingChanges).toHaveBeenCalledTimes(1);
    expect(storeState.pendingChanges.size).toBe(0);
  });
});
