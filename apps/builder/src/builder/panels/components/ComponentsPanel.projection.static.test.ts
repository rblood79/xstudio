import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("ComponentsPanel canonical projection contract", () => {
  it("uses active canonical document instead of rebuilding projection during add", async () => {
    const source = await readFile(
      resolve(__dirname, "ComponentsPanel.tsx"),
      "utf-8",
    );

    expect(source).toContain("getActiveCanonicalDocument");
    expect(source).not.toContain("selectCanonicalDocument");
  });
});
