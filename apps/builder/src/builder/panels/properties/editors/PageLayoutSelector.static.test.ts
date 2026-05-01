import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("PageLayoutSelector frame binding persistence contract", () => {
  it("delegates frame binding writes to the canonical primary adapter", async () => {
    const source = await readFile(
      resolve(__dirname, "PageLayoutSelector.tsx"),
      "utf-8",
    );

    expect(source).toContain("applyPageFrameBindingCanonicalPrimary");
    expect(source).toMatch(
      /await applyPageFrameBindingCanonicalPrimary\(\{\s*pageId,/,
    );
    expect(source).not.toMatch(/LEGACY_LAYOUT_ID_FIELD/);
    expect(source).not.toMatch(/withLegacyLayoutId/);
    expect(source).not.toMatch(/await enqueuePagePersistence/);
    expect(source).not.toMatch(
      /await db\.pages\.update\(pageId,\s*\{\s*layout_id:/,
    );
  });
});
