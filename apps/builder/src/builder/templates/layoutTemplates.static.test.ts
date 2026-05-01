import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("layoutTemplates frame mirror contract", () => {
  it("creates template element frame bindings through the frameMirror adapter", async () => {
    const source = await readFile(
      resolve(__dirname, "layoutTemplates.ts"),
      "utf-8",
    );

    expect(source).toContain("withFrameElementMirrorId(");
    expect(source).toContain("FRAME_ELEMENT_MIRROR_ID_FIELD");
    expect(source).not.toContain("withLegacyLayoutId");
    expect(source).not.toContain("LEGACY_LAYOUT_ID_FIELD");
  });
});
