import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("useCanvasDragDropHelpers canonical projection contract", () => {
  it("does not rebuild CompositionDocument in drag/drop hot paths", async () => {
    const source = await readFile(
      resolve(__dirname, "useCanvasDragDropHelpers.ts"),
      "utf-8",
    );

    expect(source).toContain("getActiveCanonicalDocument");
    expect(source).not.toContain("selectCanonicalDocument");
    expect(source).not.toContain("useLayoutsStore");
  });
});
