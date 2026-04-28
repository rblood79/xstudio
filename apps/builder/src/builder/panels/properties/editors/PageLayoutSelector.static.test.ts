import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("PageLayoutSelector frame binding persistence contract", () => {
  it("serializes layout_id persistence behind pending page creation writes", async () => {
    const source = await readFile(
      resolve(__dirname, "PageLayoutSelector.tsx"),
      "utf-8",
    );

    expect(source).toContain(
      'import { enqueuePagePersistence } from "../../../utils/pagePersistenceQueue";',
    );
    expect(source).toMatch(/await enqueuePagePersistence\(async \(\) => \{/);
    expect(source).toMatch(
      /await persistenceDb\.pages\.update\(pageId,\s*\{\s*layout_id: nextLayoutId,/,
    );
    expect(source).toMatch(
      /await persistenceDb\.pages\.insert\(\{[\s\S]*layout_id: nextLayoutId,/,
    );
    expect(source).not.toMatch(
      /await db\.pages\.update\(pageId,\s*\{\s*layout_id:/,
    );
  });
});
