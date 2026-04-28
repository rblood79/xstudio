import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { normalizeFramePresetContainerStyle } from "./usePresetApply";

describe("LayoutPresetSelector usePresetApply replace contract", () => {
  it("removes existing slots with one batch action instead of parallel single deletes", async () => {
    const source = await readFile(
      resolve(__dirname, "usePresetApply.ts"),
      "utf-8",
    );

    expect(source).toContain(
      "const removeElements = useStore((state) => state.removeElements);",
    );
    expect(source).toContain(
      "await removeElements(existingSlots.map((slot) => slot.elementId));",
    );
    expect(source).not.toContain("Promise.all(");
    expect(source).not.toContain("removeElement(slot.elementId)");
  });

  it("does not persist viewport minHeight as a frame body transform override", () => {
    expect(
      normalizeFramePresetContainerStyle({
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }),
    ).toEqual({
      display: "flex",
      flexDirection: "column",
    });

    expect(
      normalizeFramePresetContainerStyle({
        display: "flex",
        minHeight: "640px",
      }),
    ).toEqual({
      display: "flex",
      minHeight: "640px",
    });
  });
});
