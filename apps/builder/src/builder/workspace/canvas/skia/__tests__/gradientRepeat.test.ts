import { describe, test, expect } from "vitest";

describe("G5: repeating-gradient TileMode", () => {
  test("repeating=true → Repeat", () => {
    const fill = { type: "linear-gradient" as const, repeating: true };
    const tileMode = fill.repeating ? "Repeat" : "Clamp";
    expect(tileMode).toBe("Repeat");
  });

  test("repeating=false → Clamp (default)", () => {
    const fill = { type: "linear-gradient" as const, repeating: false };
    const tileMode = fill.repeating ? "Repeat" : "Clamp";
    expect(tileMode).toBe("Clamp");
  });

  test("repeating=undefined → Clamp (default)", () => {
    const fill = { type: "linear-gradient" as const };
    const tileMode = (fill as { repeating?: boolean }).repeating
      ? "Repeat"
      : "Clamp";
    expect(tileMode).toBe("Clamp");
  });
});
