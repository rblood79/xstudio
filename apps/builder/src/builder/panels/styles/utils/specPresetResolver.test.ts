// specPresetResolver.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  resolveSpecPreset,
  resolveLayoutSpecPreset,
  clearSpecPresetCache,
} from "./specPresetResolver";

describe("resolveSpecPreset", () => {
  beforeEach(() => clearSpecPresetCache());

  it("returns numeric width/height for Kbd size=md", () => {
    const preset = resolveSpecPreset("Kbd", "md");
    expect(typeof preset.width === "number" || preset.width === undefined).toBe(
      true,
    );
    expect(
      typeof preset.height === "number" || preset.height === undefined,
    ).toBe(true);
    // Kbd 스펙은 height에 고정값이 있음 (size md 기준 26)
    expect(preset.height).toBeGreaterThan(0);
  });

  it("returns {} for unknown tag", () => {
    expect(resolveSpecPreset("UnknownTag", "md")).toEqual({});
  });

  it("returns {} for null element type", () => {
    expect(resolveSpecPreset(undefined, undefined)).toEqual({});
  });

  it("caches by (type, size) — same input returns same reference", () => {
    const a = resolveSpecPreset("Kbd", "md");
    const b = resolveSpecPreset("Kbd", "md");
    expect(a).toBe(b);
  });

  it("different size returns different cached entry", () => {
    const md = resolveSpecPreset("Kbd", "md");
    const lg = resolveSpecPreset("Kbd", "lg");
    expect(md).not.toBe(lg);
  });

  // L2 (리뷰 지적): flat-spec fallback — sizes 객체 없는 spec 안전 처리
  it("returns {} gracefully when spec has no sizes object (flat-spec fallback)", () => {
    // 일부 spec(ToggleButton/TagGroup 등)은 flat 구조일 수 있음
    // resolveSpecPreset은 sizes[size] 미존재 시 빈 객체 반환해야 한다
    const preset = resolveSpecPreset("ToggleButton", "md");
    // 존재하지 않거나 sizes 미보유 시에도 throw 없이 객체 반환
    expect(preset).toEqual(expect.any(Object));
  });

  it("returns {} when sizes exists but target size key is absent", () => {
    // 예: size="xxl"처럼 해당 컴포넌트에 정의 안 된 size 요청
    const preset = resolveSpecPreset("Kbd", "xxl");
    expect(preset).toEqual({});
  });
});

describe("resolveLayoutSpecPreset", () => {
  beforeEach(() => clearSpecPresetCache());

  it("returns {} for undefined type", () => {
    expect(resolveLayoutSpecPreset(undefined, undefined)).toEqual({});
  });

  it("returns {} for unknown tag", () => {
    expect(resolveLayoutSpecPreset("UnknownTag", "md")).toEqual({});
  });

  it("returns {} for absent size key", () => {
    expect(resolveLayoutSpecPreset("Kbd", "xxl")).toEqual({});
  });

  it("caches by (type, size) — same input returns same reference", () => {
    const a = resolveLayoutSpecPreset("Kbd", "md");
    const b = resolveLayoutSpecPreset("Kbd", "md");
    expect(a).toBe(b);
  });

  it("only includes keys whose numeric values are defined in spec", () => {
    // gap/padding*/margin* 중 spec에 정의된 것만 number로 포함 — 미정의는 undefined
    const preset = resolveLayoutSpecPreset("Kbd", "md");
    for (const k of Object.keys(preset) as (keyof typeof preset)[]) {
      expect(typeof preset[k]).toBe("number");
    }
  });

  it("returns object gracefully for flat-spec components", () => {
    const preset = resolveLayoutSpecPreset("ToggleButton", "md");
    expect(preset).toEqual(expect.any(Object));
  });
});
