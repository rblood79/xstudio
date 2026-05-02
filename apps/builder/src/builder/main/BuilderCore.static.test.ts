import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("BuilderCore frame refresh hydration contract", () => {
  it("uses frame element fallback loading for restored frame edit mode", async () => {
    const source = await readFile(
      resolve(__dirname, "BuilderCore.tsx"),
      "utf-8",
    );

    expect(source).toContain('from "@/adapters/canonical/frameElementLoader";');
    expect(source).toContain("isFrameElementForFrame");
    expect(source).toMatch(/if \(editMode === "layout"\) \{/);
    expect(source).toContain("getCanonicalReusableFrameLayouts");
    expect(source).toMatch(
      /const activeFrameId = getSelectedReusableFrameId\(\);/,
    );
    expect(source).toMatch(/const frameIds = Array\.from\(/);
    expect(source).toMatch(/layouts\.map\(\(layout\) => layout\.id\)/);
    expect(source).toMatch(/elements: await loadFrameElements\(db, frameId\)/);
    expect(source).not.toContain("fetchLayouts");
    expect(source).not.toContain("currentLayoutId");
    expect(source).not.toContain("getDescendants(currentLayoutId)");
    expect(source).not.toContain("selectCanonicalDocument");
  });

  it("does not replace hydrated frame elements with an empty refresh load", async () => {
    const source = await readFile(
      resolve(__dirname, "BuilderCore.tsx"),
      "utf-8",
    );

    expect(source).toMatch(/if \(layoutElements\.length > 0\) \{/);
    expect(source).toMatch(
      /if \(layoutElements\.length > 0\) \{[\s\S]*setElementsCanonicalPrimary\(mergedElements\);[\s\S]*\}/,
    );
  });

  it("persists active CompositionDocument as primary storage and bridges page shell mutations", async () => {
    const source = await readFile(
      resolve(__dirname, "BuilderCore.tsx"),
      "utf-8",
    );

    expect(source).toContain("db.documents.put(projectId, doc)");
    expect(source).toContain(
      "page shell mutations also update the canonical doc",
    );
    expect(source).toMatch(/if \(state\.pages === pagesRef\) return;/);
    expect(source).toContain(
      "setElementsCanonicalPrimary(Array.from(state.elementsMap.values()))",
    );
  });
});
