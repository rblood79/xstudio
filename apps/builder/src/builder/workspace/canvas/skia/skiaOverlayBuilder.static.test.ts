import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("skiaOverlayBuilder slot placeholder chrome contract", () => {
  it("renders slot hatch only through empty slot marker targets, not hover/selection", async () => {
    const source = await readFile(
      resolve(__dirname, "skiaOverlayBuilder.ts"),
      "utf-8",
    );

    const hatchCalls = source.match(/renderSlotHatchPattern\(/g) ?? [];
    expect(hatchCalls).toHaveLength(1);
    expect(source).toContain("target.semanticRole ?? target.slotMarkerRole");
    expect(source).toContain(
      "selectionData.semanticRole ?? selectionData.slotMarkerRole",
    );
  });
});
