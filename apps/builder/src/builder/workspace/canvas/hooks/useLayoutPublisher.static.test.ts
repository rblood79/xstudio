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
});
