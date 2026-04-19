import { describe, it, expect } from "vitest";
import { tokenToCSSVar, resolveToken } from "../tokenResolver";

describe("tokenResolver — surface elevation", () => {
  it("{color.raised} maps to var(--bg-raised)", () => {
    expect(tokenToCSSVar("{color.raised}")).toBe("var(--bg-raised)");
  });

  it("{color.base} maps to var(--bg) (baseline)", () => {
    expect(tokenToCSSVar("{color.base}")).toBe("var(--bg)");
  });

  it("{color.layer-1} maps to var(--bg-overlay) (baseline)", () => {
    expect(tokenToCSSVar("{color.layer-1}")).toBe("var(--bg-overlay)");
  });
});

describe("tokenResolver — spacing 2xs primitive", () => {
  it("{spacing.2xs} resolves to 2 (px)", () => {
    expect(resolveToken("{spacing.2xs}")).toBe(2);
  });

  it("{spacing.2xs} maps to var(--spacing-2xs)", () => {
    expect(tokenToCSSVar("{spacing.2xs}")).toBe("var(--spacing-2xs)");
  });

  it("{spacing.xs} still resolves to 4 (baseline unaffected)", () => {
    expect(resolveToken("{spacing.xs}")).toBe(4);
  });
});
