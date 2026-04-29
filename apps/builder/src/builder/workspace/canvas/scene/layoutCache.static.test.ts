import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("layoutCache filtered children republish contract", () => {
  it("republishes cached filtered children on page layout cache hit", async () => {
    const source = await readFile(resolve(__dirname, "layoutCache.ts"), "utf-8");

    expect(source).toMatch(/getPublishedFilteredChildrenMap/);
    expect(source).toMatch(/publishFilteredChildrenMap/);
    expect(source).toMatch(/filteredChildIdsMap: Map<string, string\[]> \| null;/);
    expect(source).toMatch(/rootKey: string;/);
    expect(source).toMatch(
      /publishFilteredChildrenMap\(\s*cachedEntry\.filteredChildIdsMap,\s*cachedEntry\.rootKey,\s*\);/,
    );
    expect(source).toMatch(
      /const filteredChildIdsMap = getPublishedFilteredChildrenMap\(rootKey\);/,
    );
  });
});
