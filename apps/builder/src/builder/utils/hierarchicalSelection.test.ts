import { describe, expect, it } from "vitest";
import { resolveClickTarget } from "./hierarchicalSelection";

describe("resolveClickTarget", () => {
  it("supports projected instance descendants inside an instance editing context", () => {
    const elementsMap = new Map([
      ["body", { id: "body", type: "body", parent_id: null }],
      ["instance", { id: "instance", type: "NumberField", parent_id: "body" }],
      [
        "instance/label",
        { id: "instance/label", type: "Label", parent_id: "instance" },
      ],
    ]);

    expect(resolveClickTarget("instance/label", null, elementsMap)).toBe(
      "instance",
    );
    expect(resolveClickTarget("instance/label", "instance", elementsMap)).toBe(
      "instance/label",
    );
  });
});
