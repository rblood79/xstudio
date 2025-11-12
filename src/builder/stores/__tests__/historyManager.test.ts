import { Buffer } from "node:buffer";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { historyManager } from "../history";
import type { Element } from "../../../types/builder/unified.types";

describe("HistoryManager", () => {
  beforeAll(() => {
    if (typeof globalThis.btoa === "undefined") {
      globalThis.btoa = (data: string) =>
        Buffer.from(data, "utf-8").toString("base64");
    }
    if (typeof globalThis.atob === "undefined") {
      globalThis.atob = (data: string) =>
        Buffer.from(data, "base64").toString("utf-8");
    }
  });

  beforeEach(() => {
    historyManager.clearAllHistory();
    historyManager.setCurrentPage("page-test");
  });

  const sampleElement: Element = {
    id: "element-1",
    tag: "TextField",
    props: { label: "Label" },
    parent_id: null,
    page_id: "page-test",
    order_num: 0,
  };

  it("변경사항을 추가하면 Undo가 가능해진다", () => {
    historyManager.addEntry({
      type: "add",
      elementId: sampleElement.id,
      data: {
        element: sampleElement,
      },
    });

    expect(historyManager.canUndo()).toBe(true);
    const entry = historyManager.undo();
    expect(entry).not.toBeNull();
    expect(entry?.type).toBe("add");
    expect(historyManager.canRedo()).toBe(true);
  });

  it("Undo 이후 Redo를 실행하면 이전 상태를 복원한다", () => {
    historyManager.addEntry({
      type: "update",
      elementId: sampleElement.id,
      data: {
        element: sampleElement,
        prevProps: { label: "Old" },
        props: { label: "New" },
      },
    });

    const undoEntry = historyManager.undo();
    expect(undoEntry?.type).toBe("update");
    expect(historyManager.canRedo()).toBe(true);

    const redoEntry = historyManager.redo();
    expect(redoEntry?.type).toBe("update");
    expect(historyManager.canRedo()).toBe(false);
    expect(historyManager.canUndo()).toBe(true);
  });

  it("Redo 가능한 항목이 없으면 null을 반환한다", () => {
    const redoEntry = historyManager.redo();
    expect(redoEntry).toBeNull();
    expect(historyManager.canRedo()).toBe(false);
  });
});
