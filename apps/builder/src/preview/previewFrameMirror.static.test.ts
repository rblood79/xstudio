import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const previewFiles = [
  "App.tsx",
  "router/CanvasRouter.tsx",
  "components/CanonicalNodeRenderer.tsx",
  "utils/layoutResolver.ts",
] as const;

describe("preview frame mirror contract", () => {
  it("routes page/frame ownership through frameMirror or frameElementLoader", async () => {
    for (const file of previewFiles) {
      const source = await readFile(resolve(__dirname, file), "utf-8");

      expect(source).not.toContain("getLegacyLayoutId");
      expect(source).not.toContain("withLegacyLayoutId");
      expect(source).not.toContain("hasLegacyLayoutId");
      expect(source).not.toContain("matchesLegacyLayoutId");
      expect(source).not.toContain("legacyToCanonical");
    }
  });
});
