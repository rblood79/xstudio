import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveService } from "../saveService";

// Mock IndexedDB (getDB) - hoisted for vi.mock
const { mockElementsUpdate, mockPagesUpdate, mockProjectsUpdate } = vi.hoisted(() => ({
  mockElementsUpdate: vi.fn().mockResolvedValue({}),
  mockPagesUpdate: vi.fn().mockResolvedValue({}),
  mockProjectsUpdate: vi.fn().mockResolvedValue({}),
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
  }),
}));

describe("SaveService", () => {
  beforeEach(() => {
    // IndexedDB mocks
    mockElementsUpdate.mockClear();
    mockPagesUpdate.mockClear();
    mockProjectsUpdate.mockClear();
    // Clear validation errors
    saveService.clearValidationErrors();
  });

  it("IndexedDB에 elements 데이터를 저장한다", async () => {
    await saveService.savePropertyChange({
      table: "elements",
      id: "element-1",
      data: { name: "Heading" },
    });

    expect(mockElementsUpdate).toHaveBeenCalledWith("element-1", { name: "Heading" });
  });

  it("IndexedDB에 pages 데이터를 저장한다", async () => {
    await saveService.savePropertyChange({
      table: "pages",
      id: "page-1",
      data: { title: "Home Page" },
    });

    expect(mockPagesUpdate).toHaveBeenCalledWith("page-1", { title: "Home Page" });
  });

  it("IndexedDB에 projects 데이터를 저장한다", async () => {
    await saveService.savePropertyChange({
      table: "projects",
      id: "project-1",
      data: { name: "My Project" },
    });

    expect(mockProjectsUpdate).toHaveBeenCalledWith("project-1", { name: "My Project" });
  });

  it("preview 소스에서는 저장을 건너뛴다", async () => {
    await saveService.savePropertyChange(
      {
        table: "elements",
        id: "element-1",
        data: { name: "Test" },
      },
      { source: "preview", allowPreviewSaves: false }
    );

    expect(mockElementsUpdate).not.toHaveBeenCalled();
  });

  it("preview 소스에서도 allowPreviewSaves가 true면 저장한다", async () => {
    await saveService.savePropertyChange(
      {
        table: "elements",
        id: "element-1",
        data: { name: "Test" },
      },
      { source: "preview", allowPreviewSaves: true }
    );

    expect(mockElementsUpdate).toHaveBeenCalledWith("element-1", { name: "Test" });
  });

  it("성능 메트릭을 추적한다", async () => {
    await saveService.savePropertyChange({
      table: "elements",
      id: "element-1",
      data: { name: "Test" },
    });

    const metrics = saveService.getPerformanceMetrics();
    expect(metrics.saveOperations).toBeGreaterThan(0);
  });
});
