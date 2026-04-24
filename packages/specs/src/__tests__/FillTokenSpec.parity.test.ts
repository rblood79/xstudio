/**
 * ADR-908 Phase 1 — FillTokenSpec ↔ VariantSpec.background* parity 검증
 *
 * 목적: VariantSpec 의 background 계열 10 필드가 FillTokenSpec 구조에 1:1 매핑 가능함을
 * 타입 수준 + 런타임 수준에서 증명. Phase 2+ migration 의 설계 고정 기준.
 *
 * 검증 차원:
 * - 타입: 각 VariantSpec 필드의 non-null 값이 FillTokenSpec 의 대응 경로에 assignable
 * - 런타임: 10 VariantSpec 필드를 동시에 채운 fixture 를 FillTokenSpec 으로 변환 가능
 */

import { describe, it, expect, expectTypeOf } from "vitest";
import type {
  FillTokenSpec,
  FillStateTokens,
  VariantSpec,
  TokenRef,
} from "../types/spec.types";

describe("ADR-908 FillTokenSpec ↔ VariantSpec.background* 타입 parity", () => {
  it("default.base ↔ background (required TokenRef)", () => {
    expectTypeOf<FillStateTokens["base"]>().toEqualTypeOf<TokenRef>();
    expectTypeOf<VariantSpec["background"]>().toEqualTypeOf<TokenRef>();
  });

  it("default.hover ↔ backgroundHover (VariantSpec 의 required 값을 optional FillStateTokens 에 할당 가능)", () => {
    type HoverSlot = FillStateTokens["hover"];
    expectTypeOf<VariantSpec["backgroundHover"]>().toMatchTypeOf<HoverSlot>();
  });

  it("default.pressed ↔ backgroundPressed", () => {
    type PressedSlot = FillStateTokens["pressed"];
    expectTypeOf<
      VariantSpec["backgroundPressed"]
    >().toMatchTypeOf<PressedSlot>();
  });

  it("default.selected / selectedHover / selectedPressed ↔ selectedBackground*", () => {
    expectTypeOf<VariantSpec["selectedBackground"]>().toMatchTypeOf<
      FillStateTokens["selected"]
    >();
    expectTypeOf<VariantSpec["selectedBackgroundHover"]>().toMatchTypeOf<
      FillStateTokens["selectedHover"]
    >();
    expectTypeOf<VariantSpec["selectedBackgroundPressed"]>().toMatchTypeOf<
      FillStateTokens["selectedPressed"]
    >();
  });

  it("default.emphasizedSelected ↔ emphasizedSelectedBackground", () => {
    expectTypeOf<VariantSpec["emphasizedSelectedBackground"]>().toMatchTypeOf<
      FillStateTokens["emphasizedSelected"]
    >();
  });

  it("outline.base ↔ outlineBackground", () => {
    type OutlineBase = NonNullable<FillTokenSpec["outline"]>["base"];
    expectTypeOf<
      VariantSpec["outlineBackground"]
    >().toMatchTypeOf<OutlineBase>();
  });

  it("subtle.base ↔ subtleBackground", () => {
    type SubtleBase = NonNullable<FillTokenSpec["subtle"]>["base"];
    expectTypeOf<VariantSpec["subtleBackground"]>().toMatchTypeOf<SubtleBase>();
  });

  it("alpha ↔ backgroundAlpha (number)", () => {
    expectTypeOf<FillTokenSpec["alpha"]>().toEqualTypeOf<number | undefined>();
    expectTypeOf<VariantSpec["backgroundAlpha"]>().toEqualTypeOf<
      number | undefined
    >();
  });

  it("FillTokenSpec 은 runtime FillItem 전용 필드 (id / opacity / blendMode / color string) 를 포함하지 않음", () => {
    // 존재해서는 안 되는 필드가 타입에 없음을 증명 (컴파일 오류 방지용 never)
    type FillTokenSpecKeys = keyof FillTokenSpec;
    type ForbiddenKeys = "id" | "opacity" | "blendMode" | "color" | "stops";
    type HasForbidden = Extract<FillTokenSpecKeys, ForbiddenKeys>;
    expectTypeOf<HasForbidden>().toEqualTypeOf<never>();
  });
});

describe("ADR-908 FillTokenSpec 10-field exhaustive mapping (런타임 fixture)", () => {
  it("VariantSpec background 계열 10 필드 전수를 FillTokenSpec 으로 1:1 변환", () => {
    const variantBackgrounds: Required<
      Pick<
        VariantSpec,
        | "background"
        | "backgroundHover"
        | "backgroundPressed"
        | "selectedBackground"
        | "selectedBackgroundHover"
        | "selectedBackgroundPressed"
        | "emphasizedSelectedBackground"
        | "outlineBackground"
        | "subtleBackground"
      >
    > & { backgroundAlpha: number } = {
      background: "{color.accent}" as TokenRef,
      backgroundHover: "{color.accent-hover}" as TokenRef,
      backgroundPressed: "{color.accent-pressed}" as TokenRef,
      selectedBackground: "{color.accent}" as TokenRef,
      selectedBackgroundHover: "{color.accent-hover}" as TokenRef,
      selectedBackgroundPressed: "{color.accent-pressed}" as TokenRef,
      emphasizedSelectedBackground: "{color.accent}" as TokenRef,
      outlineBackground: "{color.transparent}" as TokenRef,
      subtleBackground: "{color.neutral-subtle}" as TokenRef,
      backgroundAlpha: 0.8,
    };

    const fill: FillTokenSpec = {
      default: {
        base: variantBackgrounds.background,
        hover: variantBackgrounds.backgroundHover,
        pressed: variantBackgrounds.backgroundPressed,
        selected: variantBackgrounds.selectedBackground,
        selectedHover: variantBackgrounds.selectedBackgroundHover,
        selectedPressed: variantBackgrounds.selectedBackgroundPressed,
        emphasizedSelected: variantBackgrounds.emphasizedSelectedBackground,
      },
      outline: { base: variantBackgrounds.outlineBackground },
      subtle: { base: variantBackgrounds.subtleBackground },
      alpha: variantBackgrounds.backgroundAlpha,
    };

    expect(fill.default.base).toBe(variantBackgrounds.background);
    expect(fill.default.hover).toBe(variantBackgrounds.backgroundHover);
    expect(fill.default.pressed).toBe(variantBackgrounds.backgroundPressed);
    expect(fill.default.selected).toBe(variantBackgrounds.selectedBackground);
    expect(fill.default.selectedHover).toBe(
      variantBackgrounds.selectedBackgroundHover,
    );
    expect(fill.default.selectedPressed).toBe(
      variantBackgrounds.selectedBackgroundPressed,
    );
    expect(fill.default.emphasizedSelected).toBe(
      variantBackgrounds.emphasizedSelectedBackground,
    );
    expect(fill.outline?.base).toBe(variantBackgrounds.outlineBackground);
    expect(fill.subtle?.base).toBe(variantBackgrounds.subtleBackground);
    expect(fill.alpha).toBe(variantBackgrounds.backgroundAlpha);
  });

  it("minimal FillTokenSpec — default.base 하나만 있어도 유효", () => {
    const minimal: FillTokenSpec = {
      default: { base: "{color.accent}" as TokenRef },
    };
    expect(minimal.default.base).toBeDefined();
    expect(minimal.default.hover).toBeUndefined();
    expect(minimal.outline).toBeUndefined();
    expect(minimal.subtle).toBeUndefined();
    expect(minimal.alpha).toBeUndefined();
  });

  it("outline / subtle 은 partial FillStateTokens — base 없이도 hover 만 정의 가능", () => {
    const partialOutline: FillTokenSpec = {
      default: { base: "{color.accent}" as TokenRef },
      outline: { hover: "{color.accent-hover}" as TokenRef },
    };
    expect(partialOutline.outline?.base).toBeUndefined();
    expect(partialOutline.outline?.hover).toBe("{color.accent-hover}");
  });
});
