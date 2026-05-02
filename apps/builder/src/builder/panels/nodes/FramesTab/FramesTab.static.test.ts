import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("FramesTab frame selection race guard", () => {
  it("selects immediately and ignores stale async frame loads", async () => {
    const source = await readFile(resolve(__dirname, "FramesTab.tsx"), "utf-8");

    expect(source).toContain("const frameSelectRequestRef = React.useRef(0);");
    expect(source).toMatch(
      /const requestId = frameSelectRequestRef\.current \+ 1;/,
    );
    expect(source).toMatch(
      /frameSelectRequestRef\.current = requestId;[\s\S]*selectReusableFrame\(frameId\);[\s\S]*setEditModeLayoutId\(frameId\);/,
    );
    expect(source).toMatch(
      /if \(requestId !== frameSelectRequestRef\.current\) \{[\s\S]*return;[\s\S]*\}/,
    );
  });

  it("does not replace live frame elements with an empty descendant load", async () => {
    const source = await readFile(resolve(__dirname, "FramesTab.tsx"), "utf-8");

    expect(source).toContain(
      'loadFrameElements,\n} from "../../../../adapters/canonical/frameElementLoader";',
    );
    expect(source).toMatch(/const frameElements = await loadFrameElements\(/);
    expect(source).toMatch(/mergeElementsCanonicalPrimary\(frameElements\);/);
    expect(source).not.toContain(
      "const storeSetElements = useStore.getState().setElements;",
    );
    expect(source).not.toMatch(
      /filter\(\s*\(el\) => el\.layout_id !== selectedReusableFrameId/,
    );
  });

  it("uses active canonical document without rebuilding projection for frame list", async () => {
    const source = await readFile(resolve(__dirname, "FramesTab.tsx"), "utf-8");

    expect(source).toContain("useCanonicalReusableFrameLayouts");
    expect(source).not.toContain("selectCanonicalDocument");
    expect(source).not.toContain("useLayoutsStore");
  });
});
