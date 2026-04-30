import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("fullTreeLayout shared filtered children key contract", () => {
  it("uses the same page/layout/id fallback key for filtered children as layout maps", async () => {
    const source = await readFile(
      resolve(__dirname, "fullTreeLayout.ts"),
      "utf-8",
    );

    expect(source).toMatch(
      /const rootKey = rootEl\.page_id \?\? rootEl\.layout_id \?\? rootElementId;/,
    );
    expect(source).toContain(
      "publishFilteredChildrenMap(filteredChildIdsMap, rootKey);",
    );
    expect(source).not.toContain(
      "publishFilteredChildrenMap(filteredChildIdsMap, rootPageId ?? undefined)",
    );
  });

  it("keys persistent Taffy trees by page/layout/id so reusable Frames do not share __default__", async () => {
    const source = await readFile(
      resolve(__dirname, "fullTreeLayout.ts"),
      "utf-8",
    );

    expect(source).toMatch(
      /const rootKey = rootEl\.page_id \?\? rootEl\.layout_id \?\? rootElementId;/,
    );
    expect(source).toContain("persistentTrees.get(rootKey)");
    expect(source).toContain("persistentTrees.set(rootKey, persistentTree)");
    expect(source).not.toContain(
      'const pageId = rootEl.page_id ?? "__default__";',
    );
  });

  it("exposes cloned filtered children maps for layout cache hit republish", async () => {
    const source = await readFile(
      resolve(__dirname, "fullTreeLayout.ts"),
      "utf-8",
    );

    expect(source).toMatch(/function cloneFilteredChildrenMap\(/);
    expect(source).toMatch(/export function getPublishedFilteredChildrenMap\(/);
    expect(source).toMatch(
      /return map \? cloneFilteredChildrenMap\(map\) : null;/,
    );
  });

  it("stores synthetic layout children by the same root key as filtered children", async () => {
    const source = await readFile(
      resolve(__dirname, "fullTreeLayout.ts"),
      "utf-8",
    );

    expect(source).toContain("const _perPageSyntheticElementsMaps");
    expect(source).toContain("beginSyntheticElementsCollection();");
    expect(source).toContain("publishCollectedSyntheticElements(rootKey);");
    expect(source).toContain("publishSyntheticElementsMap(null, pageId);");
  });

  it("batch-publishes layout map updates with a single listener notification", async () => {
    const source = await readFile(
      resolve(__dirname, "fullTreeLayout.ts"),
      "utf-8",
    );

    expect(source).toMatch(/export function publishLayoutMapsBatch\(/);
    expect(source).toMatch(
      /for \(const \{ key, map \} of updates\) \{[\s\S]*_perPageLayoutMaps\.set\(key, map\);/,
    );
    expect(source).toMatch(
      /for \(const cb of _layoutPublishListeners\) cb\(\);/,
    );
  });
});
