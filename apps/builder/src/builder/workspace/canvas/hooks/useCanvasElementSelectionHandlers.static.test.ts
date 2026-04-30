import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("useCanvasElementSelectionHandlers frame selection contract", () => {
  it("syncs selected reusable frame when clicking a layout-owned canvas element", async () => {
    const source = await readFile(
      resolve(__dirname, "useCanvasElementSelectionHandlers.ts"),
      "utf-8",
    );

    expect(source).toContain(
      "function syncReusableFrameSelectionForElement(",
    );
    expect(source).toContain("selectReusableFrame(element.layout_id);");
    expect(source).toContain(
      "useEditModeStore.getState().setCurrentLayoutId(element.layout_id);",
    );
    expect(source).toContain(
      "syncReusableFrameSelectionForElement(clickedElement);",
    );
  });
});
