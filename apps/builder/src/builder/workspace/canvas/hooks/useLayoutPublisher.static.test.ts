import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("useLayoutPublisher invalidation contract", () => {
  it("republishes layout when page/frame input structure changes without layoutVersion bump", async () => {
    const source = await readFile(
      resolve(__dirname, "useLayoutPublisher.ts"),
      "utf-8",
    );

    expect(source).toMatch(/const layoutInputKey = \[\.\.\.pages, \.\.\.framePages\]/);
    expect(source).toMatch(/createPageElementsSignature\(/);
    expect(source).toMatch(/createPageLayoutSignature\(/);
    expect(source).toMatch(
      /\}, \[layoutVersion, dimensionKey, layoutInputKey\]\);/,
    );
  });

  it("clears stale page/frame layout maps when the active render mode changes", async () => {
    const source = await readFile(
      resolve(__dirname, "useLayoutPublisher.ts"),
      "utf-8",
    );

    expect(source).toContain("const publishedKeysRef = useRef<Set<string>>");
    expect(source).toContain("const layoutUpdates: Array<");
    expect(source).toMatch(
      /const key =\s*bodyElement\.page_id \?\? bodyElement\.layout_id \?\? bodyElement\.id;/,
    );
    expect(source).toContain("activeKeys.add(key);");
    expect(source).toContain("const sourceElementById = new Map(elementById);");
    expect(source).toContain(
      "sourceElementById.set(bodyElement.id, bodyElement);",
    );
    expect(source).toMatch(/elementsMap: sourceElementById,/);
    expect(source).toContain("layoutUpdates.push({ key, map: layoutMap });");
    expect(source).toMatch(/publishFilteredChildrenMap\(null, key\);/);
    expect(source).toMatch(/publishLayoutMapsBatch\(layoutUpdates, staleKeys\);/);
    expect(source).not.toMatch(/publishLayoutMap\(layoutMap, key\);/);
    expect(source).toContain("publishedKeysRef.current = activeKeys;");
  });
});
