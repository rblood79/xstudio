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
      /const rootKey =\s*rootElement\?\.page_id \?\? rootElement\?\.layout_id \?\? rootElementId;/,
    );
    expect(source).toContain(
      "publishFilteredChildrenMap(filteredChildIdsMap, rootKey);",
    );
    expect(source).not.toContain(
      "publishFilteredChildrenMap(filteredChildIdsMap, rootPageId ?? undefined)",
    );
  });

  it("exposes cloned filtered children maps for layout cache hit republish", async () => {
    const source = await readFile(
      resolve(__dirname, "fullTreeLayout.ts"),
      "utf-8",
    );

    expect(source).toMatch(/function cloneFilteredChildrenMap\(/);
    expect(source).toMatch(/export function getPublishedFilteredChildrenMap\(/);
    expect(source).toMatch(/return map \? cloneFilteredChildrenMap\(map\) : null;/);
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
    expect(source).toMatch(/for \(const cb of _layoutPublishListeners\) cb\(\);/);
  });
});
