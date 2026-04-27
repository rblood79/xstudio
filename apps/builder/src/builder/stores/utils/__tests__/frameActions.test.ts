/**
 * ADR-911 P2-a (PR-A) — frameActions canonical-shaped wrapper 테스트
 *
 * 본 테스트는 `frameActions.ts` 가 legacy `useLayoutsStore` 액션을 정확히
 * canonical-shaped API 로 wrapping 하는지 검증한다. P3 이전까지는 이 wrapper 가
 * 그대로 legacy bridge 를 호출하므로, 테스트는 양 측의 input/output mapping 과
 * 호출 횟수만 검증한다 (DB layer 는 store mock 으로 격리).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/builder/stores/layouts", () => ({
  useLayoutsStore: {
    getState: vi.fn(),
  },
}));

import { useLayoutsStore } from "@/builder/stores/layouts";
import {
  createReusableFrame,
  deleteReusableFrame,
  updateReusableFrameName,
  selectReusableFrame,
  getNextFrameName,
} from "../frameActions";
import type { Layout } from "@/types/builder/layout.types";

const getStateMock = vi.mocked(useLayoutsStore.getState);

function makeLayout(overrides: Partial<Layout> = {}): Layout {
  return {
    id: "layout-1",
    name: "Frame 1",
    project_id: "proj-1",
    description: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("frameActions (ADR-911 P2-a)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createReusableFrame", () => {
    it("legacy createLayout 으로 위임하고 canonical-shaped ref 를 반환한다", async () => {
      const createLayoutSpy = vi
        .fn()
        .mockResolvedValue(makeLayout({ id: "frame-x", name: "My Frame" }));
      getStateMock.mockReturnValue({
        createLayout: createLayoutSpy,
      } as never);

      const result = await createReusableFrame({
        name: "My Frame",
        projectId: "proj-1",
        description: "desc",
      });

      expect(createLayoutSpy).toHaveBeenCalledTimes(1);
      expect(createLayoutSpy).toHaveBeenCalledWith({
        name: "My Frame",
        project_id: "proj-1",
        description: "desc",
      });
      expect(result).toEqual({ id: "frame-x", name: "My Frame" });
    });

    it("description 미지정 시 빈 문자열로 채운다 (legacy LayoutCreate 정합)", async () => {
      const createLayoutSpy = vi
        .fn()
        .mockResolvedValue(makeLayout({ id: "frame-y" }));
      getStateMock.mockReturnValue({
        createLayout: createLayoutSpy,
      } as never);

      await createReusableFrame({ name: "F", projectId: "p" });

      expect(createLayoutSpy).toHaveBeenCalledWith({
        name: "F",
        project_id: "p",
        description: "",
      });
    });

    it("legacy 액션이 reject 하면 그대로 throw 한다", async () => {
      const err = new Error("DB 실패");
      const createLayoutSpy = vi.fn().mockRejectedValue(err);
      getStateMock.mockReturnValue({
        createLayout: createLayoutSpy,
      } as never);

      await expect(
        createReusableFrame({ name: "F", projectId: "p" }),
      ).rejects.toThrow("DB 실패");
    });
  });

  describe("deleteReusableFrame", () => {
    it("legacy deleteLayout 으로 위임한다", async () => {
      const deleteLayoutSpy = vi.fn().mockResolvedValue(undefined);
      getStateMock.mockReturnValue({
        deleteLayout: deleteLayoutSpy,
      } as never);

      await deleteReusableFrame("frame-x");

      expect(deleteLayoutSpy).toHaveBeenCalledTimes(1);
      expect(deleteLayoutSpy).toHaveBeenCalledWith("frame-x");
    });
  });

  describe("updateReusableFrameName", () => {
    it("legacy updateLayout 으로 name 만 update 한다", async () => {
      const updateLayoutSpy = vi.fn().mockResolvedValue(undefined);
      getStateMock.mockReturnValue({
        updateLayout: updateLayoutSpy,
      } as never);

      await updateReusableFrameName("frame-x", "New Name");

      expect(updateLayoutSpy).toHaveBeenCalledTimes(1);
      expect(updateLayoutSpy).toHaveBeenCalledWith("frame-x", {
        name: "New Name",
      });
    });
  });

  describe("selectReusableFrame", () => {
    it("legacy setCurrentLayout 으로 위임한다 (id 전달)", () => {
      const setCurrentLayoutSpy = vi.fn();
      getStateMock.mockReturnValue({
        setCurrentLayout: setCurrentLayoutSpy,
      } as never);

      selectReusableFrame("frame-x");

      expect(setCurrentLayoutSpy).toHaveBeenCalledTimes(1);
      expect(setCurrentLayoutSpy).toHaveBeenCalledWith("frame-x");
    });

    it("null 전달 시 선택 해제로 위임한다", () => {
      const setCurrentLayoutSpy = vi.fn();
      getStateMock.mockReturnValue({
        setCurrentLayout: setCurrentLayoutSpy,
      } as never);

      selectReusableFrame(null);

      expect(setCurrentLayoutSpy).toHaveBeenCalledWith(null);
    });
  });

  describe("getNextFrameName (중복 회피)", () => {
    it("빈 배열 → 'Frame 1'", () => {
      expect(getNextFrameName([])).toBe("Frame 1");
    });

    it("['Frame 1', 'Frame 2'] → 'Frame 3' (max + 1)", () => {
      expect(getNextFrameName([{ name: "Frame 1" }, { name: "Frame 2" }])).toBe(
        "Frame 3",
      );
    });

    it("['Frame 1', 'Frame 3'] → 'Frame 2' (gap 채움)", () => {
      expect(getNextFrameName([{ name: "Frame 1" }, { name: "Frame 3" }])).toBe(
        "Frame 2",
      );
    });

    it("['Frame 2'] → 'Frame 1' (시작 gap 채움)", () => {
      expect(getNextFrameName([{ name: "Frame 2" }])).toBe("Frame 1");
    });

    it("['My Custom'] → 'Frame 1' (Frame N 패턴 아닌 이름은 무시)", () => {
      expect(getNextFrameName([{ name: "My Custom" }])).toBe("Frame 1");
    });

    it("['Frame 1', 'My Custom', 'Frame 3'] → 'Frame 2'", () => {
      expect(
        getNextFrameName([
          { name: "Frame 1" },
          { name: "My Custom" },
          { name: "Frame 3" },
        ]),
      ).toBe("Frame 2");
    });

    it("이전 length+1 패턴이 만들 수 있는 충돌 시나리오 회피 — 삭제 후 추가", () => {
      // 시나리오: 3개 생성 → Frame 1 삭제 → 추가 → 이전에는 'Frame 3' 충돌
      const afterDelete = [{ name: "Frame 2" }, { name: "Frame 3" }];
      // length+1 = 3 → 충돌. getNextFrameName 은 'Frame 1' 반환 (gap 채움)
      expect(getNextFrameName(afterDelete)).toBe("Frame 1");
    });

    it("100 개 frame 까지 안정적 (numeric overflow 안 함)", () => {
      const frames = Array.from({ length: 100 }, (_, i) => ({
        name: `Frame ${i + 1}`,
      }));
      expect(getNextFrameName(frames)).toBe("Frame 101");
    });
  });
});
