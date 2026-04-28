import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("BuilderCanvas frame edit surface contract", () => {
  it("normalizes frame areas to the current page position and page size", async () => {
    const source = await readFile(
      resolve(__dirname, "BuilderCanvas.tsx"),
      "utf-8",
    );

    expect(source).toContain(
      "const anchorPageId = currentPageId ?? pages[0]?.id ?? null;",
    );
    expect(source).toContain("const anchorPosition = anchorPageId");
    expect(source).toContain("x: anchorPosition?.x ?? 0");
    expect(source).toContain("y: anchorPosition?.y ?? 0");
    expect(source).toContain("width: pageWidth");
    expect(source).toContain("height: pageHeight");
    expect(source).not.toContain("pageWidth + PAGE_STACK_GAP");
  });
});
