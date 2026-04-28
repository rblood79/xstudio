import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("StoreRenderBridge layout publish contract", () => {
  it("forces full rebuild after layout publish and async image materialization", async () => {
    const source = await readFile(
      resolve(__dirname, "StoreRenderBridge.ts"),
      "utf-8",
    );

    expect(source).toMatch(/forceFullRebuild = false/);
    expect(source).toMatch(/this\.pendingResync = \(\) => resync\(true\);/);
    expect(source).toMatch(/resync\(true\);/);
    expect(source).toMatch(
      /this\.unsubscribeLayout = onLayoutPublished\(\(\) => resync\(true\)\);/,
    );
    expect(source).toMatch(/forceFullRebuild \|\| themeChanged/);
  });
});
