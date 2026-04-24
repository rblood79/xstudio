/**
 * ADR-908 Phase 2 — Fill token dual-read seam 검증
 *
 * 대상:
 * - `variantSpecToFillTokens(variant)` — legacy background 10 필드 → FillTokenSpec 변환
 * - `resolveFillTokens(variant)` — spec.fill 우선 + legacy fallback seam
 *
 * 파리티 (Phase 1) 와의 차이:
 * - Phase 1 테스트는 "타입 수준 매핑 가능성" 증명
 * - Phase 2 테스트는 "런타임 변환 정확성 + seam 우선순위" 증명
 */

import { describe, it, expect } from "vitest";
import {
  variantSpecToFillTokens,
  resolveFillTokens,
} from "../utils/fillTokens";
import type { FillTokenSpec, TokenRef, VariantSpec } from "../types/spec.types";

const T = (s: string): TokenRef => s as TokenRef;

const minimalVariant: VariantSpec = {
  background: T("{color.accent}"),
  backgroundHover: T("{color.accent-hover}"),
  backgroundPressed: T("{color.accent-pressed}"),
  text: T("{color.on-accent}"),
};

describe("variantSpecToFillTokens — legacy 10 필드 변환", () => {
  it("minimal variant (background/Hover/Pressed 만) → default state 3 필드", () => {
    const fill = variantSpecToFillTokens(minimalVariant);
    expect(fill.default.base).toBe("{color.accent}");
    expect(fill.default.hover).toBe("{color.accent-hover}");
    expect(fill.default.pressed).toBe("{color.accent-pressed}");
    expect(fill.default.selected).toBeUndefined();
    expect(fill.default.selectedHover).toBeUndefined();
    expect(fill.default.selectedPressed).toBeUndefined();
    expect(fill.default.emphasizedSelected).toBeUndefined();
    expect(fill.outline).toBeUndefined();
    expect(fill.subtle).toBeUndefined();
    expect(fill.alpha).toBeUndefined();
  });

  it("selected 계열 3 필드 모두 변환", () => {
    const variant: VariantSpec = {
      ...minimalVariant,
      selectedBackground: T("{color.accent}"),
      selectedBackgroundHover: T("{color.accent-hover}"),
      selectedBackgroundPressed: T("{color.accent-pressed}"),
    };
    const fill = variantSpecToFillTokens(variant);
    expect(fill.default.selected).toBe("{color.accent}");
    expect(fill.default.selectedHover).toBe("{color.accent-hover}");
    expect(fill.default.selectedPressed).toBe("{color.accent-pressed}");
  });

  it("emphasizedSelectedBackground → default.emphasizedSelected", () => {
    const variant: VariantSpec = {
      ...minimalVariant,
      emphasizedSelectedBackground: T("{color.accent}"),
    };
    const fill = variantSpecToFillTokens(variant);
    expect(fill.default.emphasizedSelected).toBe("{color.accent}");
  });

  it("outlineBackground → outline.base / subtleBackground → subtle.base", () => {
    const variant: VariantSpec = {
      ...minimalVariant,
      outlineBackground: T("{color.transparent}"),
      subtleBackground: T("{color.neutral-subtle}"),
    };
    const fill = variantSpecToFillTokens(variant);
    expect(fill.outline?.base).toBe("{color.transparent}");
    expect(fill.subtle?.base).toBe("{color.neutral-subtle}");
  });

  it("backgroundAlpha → alpha (0.8)", () => {
    const variant: VariantSpec = {
      ...minimalVariant,
      backgroundAlpha: 0.8,
    };
    const fill = variantSpecToFillTokens(variant);
    expect(fill.alpha).toBe(0.8);
  });

  it("exhaustive 10 필드 전수 → FillTokenSpec 전 슬롯 채워짐", () => {
    const variant: VariantSpec = {
      background: T("{color.accent}"),
      backgroundHover: T("{color.accent-hover}"),
      backgroundPressed: T("{color.accent-pressed}"),
      selectedBackground: T("{color.accent}"),
      selectedBackgroundHover: T("{color.accent-hover}"),
      selectedBackgroundPressed: T("{color.accent-pressed}"),
      emphasizedSelectedBackground: T("{color.accent}"),
      outlineBackground: T("{color.transparent}"),
      subtleBackground: T("{color.neutral-subtle}"),
      backgroundAlpha: 0.9,
      text: T("{color.on-accent}"),
    };
    const fill = variantSpecToFillTokens(variant);

    expect(fill).toEqual({
      default: {
        base: "{color.accent}",
        hover: "{color.accent-hover}",
        pressed: "{color.accent-pressed}",
        selected: "{color.accent}",
        selectedHover: "{color.accent-hover}",
        selectedPressed: "{color.accent-pressed}",
        emphasizedSelected: "{color.accent}",
      },
      outline: { base: "{color.transparent}" },
      subtle: { base: "{color.neutral-subtle}" },
      alpha: 0.9,
    });
  });

  it("optional 필드 미지정 시 FillTokenSpec 에 추가되지 않음 (exactOptionalPropertyTypes)", () => {
    const fill = variantSpecToFillTokens(minimalVariant);
    expect("selected" in fill.default).toBe(false);
    expect("emphasizedSelected" in fill.default).toBe(false);
    expect("outline" in fill).toBe(false);
    expect("subtle" in fill).toBe(false);
    expect("alpha" in fill).toBe(false);
  });
});

describe("resolveFillTokens — dual-read seam 우선순위", () => {
  it("variant.fill 미선언 → variantSpecToFillTokens() fallback", () => {
    const fill = resolveFillTokens(minimalVariant);
    expect(fill.default.base).toBe("{color.accent}");
    expect(fill.default.hover).toBe("{color.accent-hover}");
    expect(fill.default.pressed).toBe("{color.accent-pressed}");
  });

  it("variant.fill 선언 → 그대로 반환 (legacy 필드 무시)", () => {
    const override: FillTokenSpec = {
      default: {
        base: T("{color.negative}"),
        hover: T("{color.negative-hover}"),
      },
      alpha: 0.5,
    };
    const variant: VariantSpec = {
      ...minimalVariant,
      fill: override,
    };
    const fill = resolveFillTokens(variant);
    expect(fill).toBe(override); // 동일 참조
    expect(fill.default.base).toBe("{color.negative}");
    expect(fill.alpha).toBe(0.5);
    // legacy background 는 완전히 무시됨 (seam 규약)
    expect(fill.default.pressed).toBeUndefined();
  });

  it("variant.fill + legacy background 공존 시 fill 우선 (legacy 완전 무시)", () => {
    const variant: VariantSpec = {
      background: T("{color.accent}"),
      backgroundHover: T("{color.accent-hover}"),
      backgroundPressed: T("{color.accent-pressed}"),
      selectedBackground: T("{color.accent}"),
      text: T("{color.on-accent}"),
      fill: {
        default: { base: T("{color.negative}") },
      },
    };
    const fill = resolveFillTokens(variant);
    expect(fill.default.base).toBe("{color.negative}");
    expect(fill.default.selected).toBeUndefined();
  });

  it("variant.fill partial (default 만) → outline/subtle/alpha undefined 유지", () => {
    const variant: VariantSpec = {
      ...minimalVariant,
      outlineBackground: T("{color.transparent}"),
      fill: { default: { base: T("{color.negative}") } },
    };
    const fill = resolveFillTokens(variant);
    // fill 우선이므로 outlineBackground 는 무시
    expect(fill.outline).toBeUndefined();
  });
});
