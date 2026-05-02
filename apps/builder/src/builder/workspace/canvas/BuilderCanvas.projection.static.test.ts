import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("BuilderCanvas canonical projection contract", () => {
  it("uses active canonical document instead of rebuilding projection in render memo paths", async () => {
    const source = await readFile(
      resolve(__dirname, "BuilderCanvas.tsx"),
      "utf-8",
    );

    expect(source).toContain("useActiveCanonicalDocument");
    expect(source).toContain("canonicalDocumentToElements");
    expect(source).toContain("isFrameEditMode && canonicalElements");
    expect(source).not.toContain("selectCanonicalDocument");
  });
});
