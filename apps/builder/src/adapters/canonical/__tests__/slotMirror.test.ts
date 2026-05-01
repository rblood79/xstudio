import { describe, expect, it } from "vitest";
import {
  getSlotMirrorName,
  SLOT_NAME_MIRROR_FIELD,
  withSlotMirrorName,
} from "../slotMirror";

describe("slotMirror adapter helpers", () => {
  it("reads and writes slot mirror payloads", () => {
    expect(getSlotMirrorName({ slot_name: "content" })).toBe("content");
    expect(getSlotMirrorName({})).toBeNull();
    expect(withSlotMirrorName({ id: "el-1" }, "header")).toEqual({
      id: "el-1",
      [SLOT_NAME_MIRROR_FIELD]: "header",
    });
  });
});
