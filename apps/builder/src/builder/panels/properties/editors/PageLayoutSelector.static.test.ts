import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("PageLayoutSelector frame binding persistence contract", () => {
  it("serializes legacy layout persistence behind pending page creation writes", async () => {
    const source = await readFile(
      resolve(__dirname, "PageLayoutSelector.tsx"),
      "utf-8",
    );

    expect(source).toContain(
      'import { enqueuePagePersistence } from "../../../utils/pagePersistenceQueue";',
    );
    expect(source).toMatch(/await enqueuePagePersistence\(async \(\) => \{/);
    expect(source).toMatch(/LEGACY_LAYOUT_ID_FIELD/);
    expect(source).toMatch(
      /await persistenceDb\.pages\.update\(pageId,\s*\{\s*\[LEGACY_LAYOUT_ID_FIELD\]: nextLayoutId,/,
    );
    expect(source).toMatch(
      /await persistenceDb\.pages\.insert\(\{[\s\S]*withLegacyLayoutId\(updatedPage, nextLayoutId\)/,
    );
    expect(source).toContain(
      'import { loadFrameElements } from "../../../utils/frameElementLoader";',
    );
    expect(source).toMatch(/const layoutElements = await loadFrameElements\(/);
    expect(source).not.toMatch(
      /await db\.pages\.update\(pageId,\s*\{\s*layout_id:/,
    );
  });
});
