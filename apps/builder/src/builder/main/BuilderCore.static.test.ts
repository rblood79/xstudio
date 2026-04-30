import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("BuilderCore frame refresh hydration contract", () => {
  it("uses frame element fallback loading for restored frame edit mode", async () => {
    const source = await readFile(
      resolve(__dirname, "BuilderCore.tsx"),
      "utf-8",
    );

    expect(source).toContain(
      'import { loadFrameElements } from "../utils/frameElementLoader";',
    );
    expect(source).toMatch(/if \(editMode === "layout"\) \{/);
    expect(source).toMatch(/await fetchLayouts\(projectId\);/);
    expect(source).toMatch(
      /const activeFrameId = selectedReusableFrameId \?\? currentLayoutId;/,
    );
    expect(source).toMatch(/const frameIds = Array\.from\(/);
    expect(source).toMatch(/layouts\.map\(\(layout\) => layout\.id\)/);
    expect(source).toMatch(/elements: await loadFrameElements\(db, frameId\)/);
    expect(source).not.toContain("getDescendants(currentLayoutId)");
  });

  it("does not replace hydrated frame elements with an empty refresh load", async () => {
    const source = await readFile(
      resolve(__dirname, "BuilderCore.tsx"),
      "utf-8",
    );

    expect(source).toMatch(/if \(layoutElements\.length > 0\) \{/);
    expect(source).toMatch(
      /if \(layoutElements\.length > 0\) \{[\s\S]*setElements\(mergedElements\);[\s\S]*\}/,
    );
  });
});
