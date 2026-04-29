// @vitest-environment jsdom
/**
 * ADR-911 Phase 2 PR-B baseline 잠금 테스트.
 *
 * 본 테스트는 PR-B 시점의 FramesTab 동작을 회귀 안전망으로 잠근다. 후속 PR-C
 * (read path canonical 전환) 진입 시 동작 차이를 즉시 감지하기 위함이다.
 *
 * 시나리오 5개:
 *  1. 빈 frames 상태 → "No frames available" + "Select a frame to view elements"
 *  2. 2개 frames 렌더 → 이름 모두 표시
 *  3. Add Frame 버튼 클릭 → `createReusableFrame({ name, projectId })` 호출
 *  4. Frame 항목 클릭 → `selectReusableFrame(frameId)` 호출 (id 기반 시그니처 검증)
 *  5. Delete 버튼 클릭 → `deleteReusableFrame(frameId)` 호출
 *
 * 외부 의존성은 모두 vi.mock 으로 격리. Zustand selector 패턴은
 * `useLayoutsStore((state) => state.layouts)` / `useStore((state) => ...)` 호출 시
 * mockState 에 selector 적용하는 방식으로 구현.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, screen, cleanup } from "@testing-library/react";

// ─── mock state holders ─────────────────────────────────────────────────────
type LayoutLite = { id: string; name: string; project_id: string };

const mockLayoutsState = {
  layouts: [] as LayoutLite[],
  fetchLayouts: vi.fn(),
  selectedReusableFrameId: null as string | null,
};

const mockStoreState = {
  elementsMap: new Map(),
  pages: [] as Array<{ id: string }>,
  removeElement: vi.fn(),
  mergeElements: vi.fn(),
};

// PR-C: feature flag + canonical projection mocks
let mockIsFramesTabCanonical = false;
const mockSelectCanonicalDocument = vi.fn();

const mockEditModeState = {
  setCurrentLayoutId: vi.fn(),
};

const mockGetAllElements = vi.fn(async () => [] as never[]);
const mockGetDescendants = vi.fn(async () => [] as never[]);

// ─── module mocks ───────────────────────────────────────────────────────────
vi.mock("react-router-dom", () => ({
  useParams: () => ({ projectId: "test-project" }),
}));

vi.mock("@/builder/stores/layouts", () => ({
  useLayoutsStore: <T,>(selector?: (state: typeof mockLayoutsState) => T) =>
    selector ? selector(mockLayoutsState) : (mockLayoutsState as unknown as T),
  useSelectedReusableFrameId: () => mockLayoutsState.selectedReusableFrameId,
}));

vi.mock("@/builder/stores/utils/frameActions", () => ({
  createReusableFrame: vi.fn(),
  deleteReusableFrame: vi.fn(),
  selectReusableFrame: vi.fn(),
  // 실제 로직 흉내 — Frame N 패턴 추출 + 미사용 번호 사용
  getNextFrameName: (frames: ReadonlyArray<{ name: string }>) => {
    const used = new Set<number>();
    for (const f of frames) {
      const m = /^Frame (\d+)$/.exec(f.name);
      if (m) used.add(Number(m[1]));
    }
    let n = 1;
    while (used.has(n)) n++;
    return `Frame ${n}`;
  },
}));

vi.mock("@/builder/stores/editMode", () => ({
  useEditModeStore: <T,>(selector?: (state: typeof mockEditModeState) => T) =>
    selector
      ? selector(mockEditModeState)
      : (mockEditModeState as unknown as T),
}));

vi.mock("@/builder/stores", () => ({
  useStore: Object.assign(
    <T,>(selector?: (state: typeof mockStoreState) => T) =>
      selector ? selector(mockStoreState) : (mockStoreState as unknown as T),
    {
      getState: () => mockStoreState,
      setState: vi.fn(),
    },
  ),
}));

vi.mock("@/lib/db", () => ({
  getDB: vi.fn(async () => ({
    elements: {
      getAll: mockGetAllElements,
      getDescendants: mockGetDescendants,
    },
  })),
}));

vi.mock("@/utils/messaging", () => ({
  MessageService: { clearOverlay: vi.fn() },
}));

vi.mock("@/utils/featureFlags", () => ({
  isWebGLCanvas: () => true,
  isCanvasCompareMode: () => false,
  isFramesTabCanonical: () => mockIsFramesTabCanonical,
}));

vi.mock("@/builder/stores/elements", () => ({
  selectCanonicalDocument: (
    ...args: Parameters<typeof mockSelectCanonicalDocument>
  ) => mockSelectCanonicalDocument(...args),
}));

vi.mock("@/builder/hooks", () => ({
  useTreeExpandState: () => ({
    expandedKeys: new Set<string>(),
    toggleKey: vi.fn(),
    collapseAll: vi.fn(),
    expandKey: vi.fn(),
  }),
}));

vi.mock("@/builder/utils/treeUtils", () => ({
  buildTreeFromElements: vi.fn(() => []),
}));

// ─── import under test (after mocks) ────────────────────────────────────────
import { FramesTab } from "../FramesTab";
import {
  createReusableFrame,
  deleteReusableFrame,
  selectReusableFrame,
} from "@/builder/stores/utils/frameActions";

const createReusableFrameMock = vi.mocked(createReusableFrame);
const deleteReusableFrameMock = vi.mocked(deleteReusableFrame);
const selectReusableFrameMock = vi.mocked(selectReusableFrame);

// ─── helpers ────────────────────────────────────────────────────────────────
function makeProps(): React.ComponentProps<typeof FramesTab> {
  return {
    selectedElementId: null,
    setSelectedElement: vi.fn(),
    sendElementSelectedMessage: vi.fn(),
    requestAutoSelectAfterUpdate: vi.fn(),
    projectId: "test-project",
  };
}

function resetMockState() {
  mockLayoutsState.layouts = [];
  mockLayoutsState.selectedReusableFrameId = null;
  mockStoreState.elementsMap = new Map();
  mockStoreState.pages = [];
  mockIsFramesTabCanonical = false;
  vi.clearAllMocks();
  mockGetAllElements.mockResolvedValue([] as never[]);
  mockGetDescendants.mockResolvedValue([] as never[]);
  mockSelectCanonicalDocument.mockReturnValue({ children: [] });
  // wrapper Promise resolve 기본값 — 정상 동작
  createReusableFrameMock.mockResolvedValue({
    id: "new-frame",
    name: "Frame 1",
  });
  deleteReusableFrameMock.mockResolvedValue(undefined);
}

// ─── tests ──────────────────────────────────────────────────────────────────
describe("FramesTab (ADR-911 P2-a PR-B baseline)", () => {
  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    cleanup();
  });

  describe("rendering", () => {
    it("frames 가 비어있으면 'No frames available' 표시 + Layers 영역도 'Select a frame'", () => {
      mockLayoutsState.layouts = [];
      render(<FramesTab {...makeProps()} />);

      expect(screen.getByText("No frames available")).toBeTruthy();
      expect(screen.getByText("Select a frame to view elements")).toBeTruthy();
    });

    it("frames 2개가 있으면 각 frame name 을 모두 표시한다", () => {
      mockLayoutsState.layouts = [
        { id: "f-1", name: "Header Frame", project_id: "test-project" },
        { id: "f-2", name: "Footer Frame", project_id: "test-project" },
      ];
      render(<FramesTab {...makeProps()} />);

      expect(screen.getByText("Header Frame")).toBeTruthy();
      expect(screen.getByText("Footer Frame")).toBeTruthy();
    });
  });

  describe("frame creation", () => {
    it("Add Frame 버튼 클릭 시 createReusableFrame({ name, projectId }) 위임", async () => {
      mockLayoutsState.layouts = [
        { id: "existing", name: "Existing", project_id: "test-project" },
      ];
      render(<FramesTab {...makeProps()} />);

      const addButton = screen.getByRole("button", { name: "Add Frame" });
      fireEvent.click(addButton);

      // Promise resolve flush
      await Promise.resolve();
      await Promise.resolve();

      expect(createReusableFrameMock).toHaveBeenCalledTimes(1);
      // 기존 frame "Existing" 은 Frame N 패턴 아님 → getNextFrameName 이 "Frame 1" 반환
      expect(createReusableFrameMock).toHaveBeenCalledWith({
        name: "Frame 1",
        projectId: "test-project",
      });
    });
  });

  describe("frame selection", () => {
    it("Frame 항목 클릭 시 selectReusableFrame(frameId) 위임 — id 기반 시그니처", async () => {
      mockLayoutsState.layouts = [
        { id: "frame-abc", name: "Header", project_id: "test-project" },
      ];
      render(<FramesTab {...makeProps()} />);

      const frameLabel = screen.getByText("Header");
      fireEvent.click(frameLabel);

      // handleSelectFrame async 흐름 (getByLayout → mergeElements → selectReusableFrame)
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(selectReusableFrameMock).toHaveBeenCalledWith("frame-abc");
    });
  });

  describe("frame deletion", () => {
    it("Delete 버튼 클릭 시 deleteReusableFrame(frameId) 위임 + stopPropagation", async () => {
      mockLayoutsState.layouts = [
        { id: "frame-xyz", name: "Doomed", project_id: "test-project" },
      ];
      render(<FramesTab {...makeProps()} />);

      const deleteButton = screen.getByRole("button", {
        name: "Delete Doomed",
      });
      fireEvent.click(deleteButton);

      await Promise.resolve();
      await Promise.resolve();

      expect(deleteReusableFrameMock).toHaveBeenCalledTimes(1);
      expect(deleteReusableFrameMock).toHaveBeenCalledWith("frame-xyz");
      // stopPropagation 효과: 부모 onClick (handleSelectFrame) 미호출 확인
      // selectReusableFrame 은 deleteFrame 마지막에 remaining=0 이면 null 호출됨
      // → 호출은 1회 (null 인자) — 부모 click 으로 인한 추가 호출 없음
      expect(selectReusableFrameMock).toHaveBeenCalledTimes(1);
      expect(selectReusableFrameMock).toHaveBeenCalledWith(null);
    });
  });

  // ─── PR-C: canonical-native read path ──────────────────────────────────────
  describe("canonical-native read path (isFramesTabCanonical=true)", () => {
    it("frame 목록을 selectCanonicalDocument 의 reusable FrameNode 로 표시", () => {
      mockIsFramesTabCanonical = true;
      // legacy layouts[] 에는 데이터 있지만, canonical doc 가 다르면 canonical 표시
      mockLayoutsState.layouts = [
        { id: "legacy-id", name: "Legacy Should Not Show", project_id: "p" },
      ];
      mockSelectCanonicalDocument.mockReturnValue({
        children: [
          {
            id: "layout-canonical-id",
            type: "frame",
            reusable: true,
            name: "Canonical Frame",
            metadata: { type: "legacy-layout", layoutId: "canonical-id" },
            children: [],
          },
        ],
      });

      render(<FramesTab {...makeProps()} />);

      expect(screen.getByText("Canonical Frame")).toBeTruthy();
      expect(screen.queryByText("Legacy Should Not Show")).toBeNull();
    });

    it("non-frame / non-reusable 노드는 필터링됨", () => {
      mockIsFramesTabCanonical = true;
      mockSelectCanonicalDocument.mockReturnValue({
        children: [
          {
            id: "layout-frame-1",
            type: "frame",
            reusable: true,
            name: "Reusable Frame",
            metadata: { type: "legacy-layout", layoutId: "frame-1" },
            children: [],
          },
          // reusable: false (page-bound frame) — 필터아웃
          {
            id: "page-frame",
            type: "frame",
            reusable: false,
            name: "Page Frame",
            children: [],
          },
          // ref 노드 — 필터아웃
          {
            id: "ref-1",
            type: "ref",
            ref: "layout-frame-1",
            name: "Some Ref",
          },
        ],
      });

      render(<FramesTab {...makeProps()} />);

      expect(screen.getByText("Reusable Frame")).toBeTruthy();
      expect(screen.queryByText("Page Frame")).toBeNull();
      expect(screen.queryByText("Some Ref")).toBeNull();
    });

    it("canonical frame 클릭 시 metadata.layoutId (legacy id) 로 selectReusableFrame 위임 — write 정합성", async () => {
      mockIsFramesTabCanonical = true;
      mockSelectCanonicalDocument.mockReturnValue({
        children: [
          {
            id: "layout-frame-zzz", // canonical id (prefix 포함)
            type: "frame",
            reusable: true,
            name: "Header",
            metadata: { type: "legacy-layout", layoutId: "frame-zzz" }, // legacy id
            children: [],
          },
        ],
      });

      render(<FramesTab {...makeProps()} />);
      fireEvent.click(screen.getByText("Header"));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      // legacy id ("frame-zzz") 로 select 호출 — canonical id ("layout-frame-zzz") 아님
      expect(selectReusableFrameMock).toHaveBeenCalledWith("frame-zzz");
    });
  });
});
