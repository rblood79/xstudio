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
  removeElement: vi.fn(),
  mergeElements: vi.fn(),
};

const mockEditModeState = {
  setCurrentLayoutId: vi.fn(),
};

const mockGetByLayout = vi.fn(async () => [] as never[]);

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
    elements: { getByLayout: mockGetByLayout },
  })),
}));

vi.mock("@/utils/messaging", () => ({
  MessageService: { clearOverlay: vi.fn() },
}));

vi.mock("@/utils/featureFlags", () => ({
  isWebGLCanvas: () => true,
  isCanvasCompareMode: () => false,
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
  vi.clearAllMocks();
  mockGetByLayout.mockResolvedValue([] as never[]);
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
      // 기존 1개 frame 있으므로 새 frame 이름은 "Frame 2" (layouts.length + 1)
      expect(createReusableFrameMock).toHaveBeenCalledWith({
        name: "Frame 2",
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
});
