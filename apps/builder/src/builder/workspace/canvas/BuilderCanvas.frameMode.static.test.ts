import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("BuilderCanvas frame edit surface contract", () => {
  it("lays out frame areas like page canvases using the configured page direction", async () => {
    const source = await readFile(
      resolve(__dirname, "BuilderCanvas.tsx"),
      "utf-8",
    );

    expect(source).toContain(
      "const anchorPageId = currentPageId ?? pages[0]?.id ?? null;",
    );
    expect(source).toContain("const anchorPosition = anchorPageId");
    expect(source).toContain("function computeStackedCanvasPosition(");
    expect(source).toContain("pageLayoutDirection");
    expect(source).toContain("x: (anchorPosition?.x ?? 0) + stackedPosition.x");
    expect(source).toContain("y: (anchorPosition?.y ?? 0) + stackedPosition.y");
    expect(source).toContain("width: pageWidth");
    expect(source).toContain("height: pageHeight");
  });

  it("does not let hidden page areas drive body selection in frame mode", async () => {
    const source = await readFile(
      resolve(__dirname, "BuilderCanvas.tsx"),
      "utf-8",
    );

    expect(source).toContain("pageSelectionEnabled: !isFrameEditMode");
    expect(source).toContain("if (isFrameEditMode) return;");
  });
});
