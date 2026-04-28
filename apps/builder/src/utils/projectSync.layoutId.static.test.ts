import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("projectSync page layout_id contract", () => {
  it("preserves page layout_id on cloud upload and download", async () => {
    const source = await readFile(
      resolve(__dirname, "projectSync.ts"),
      "utf-8",
    );

    const layoutIdMappings =
      source.match(/layout_id:\s*page\.layout_id \?\? null/g) ?? [];

    expect(layoutIdMappings).toHaveLength(2);
  });
});
