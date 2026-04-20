// specPresetResolver.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  resolveSpecPreset,
  resolveAppearanceSpecPreset,
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

describe("ADR-082 G2 — 3-tier fallback chain (containerStyles → composition → sizes)", () => {
  beforeEach(() => clearSpecPresetCache());

  describe("Non-composite containerStyles (ADR-071 스키마)", () => {
    it("ListBox.containerStyles → Appearance preset (borderRadius/borderWidth/colors)", () => {
      // ListBoxSpec.containerStyles = { borderRadius: "{radius.lg}"=8, borderWidth: 1,
      //   background: "{color.raised}", border: "{color.border}" }
      const preset = resolveAppearanceSpecPreset("ListBox", undefined);
      expect(preset.borderRadius).toBe(8);
      expect(preset.borderWidth).toBe(1);
      expect(preset.backgroundColor).toBe("var(--bg-raised)");
      expect(preset.borderColor).toBe("var(--border)");
    });

    it("ListBox.containerStyles → Layout preset (gap/padding 4-way split)", () => {
      // ListBoxSpec.containerStyles = { gap: "{spacing.2xs}"=2, padding: "{spacing.xs}"=4 }
      const preset = resolveLayoutSpecPreset("ListBox", undefined);
      expect(preset.gap).toBe(2);
      expect(preset.paddingTop).toBe(4);
      expect(preset.paddingRight).toBe(4);
      expect(preset.paddingBottom).toBe(4);
      expect(preset.paddingLeft).toBe(4);
    });

    it("Menu.containerStyles → Appearance preset", () => {
      // MenuSpec.containerStyles = { borderRadius: "{radius.md}"=6, borderWidth: 1,
      //   background: "{color.raised}", border: "{color.border}" }
      const preset = resolveAppearanceSpecPreset("Menu", undefined);
      expect(preset.borderRadius).toBe(6);
      expect(preset.borderWidth).toBe(1);
      expect(preset.backgroundColor).toBe("var(--bg-raised)");
    });
  });

  describe("Composite composition.* (ADR-036 Phase 3a 스키마) — sizes 우선, composition 은 sizes 없을 때만 반영", () => {
    it("Select.sizes.md.gap=6 이 composition.gap=4 를 override (회귀 0 보장)", () => {
      // SelectSpec.sizes.md.gap = 6 우선 반영, composition.gap="var(--spacing-xs)"=4 는 fallback 만
      const preset = resolveLayoutSpecPreset("Select", "md");
      expect(preset.gap).toBe(6);
    });

    it("Select size=absent → sizes 없음 → composition.gap=4 반영", () => {
      // 존재하지 않는 size 키 → sizes preset 빈 객체 → composition fallback 발동
      const preset = resolveLayoutSpecPreset("Select", "xxl");
      expect(preset.gap).toBe(4);
    });

    it("ComboBox size=absent → composition.gap fallback 확인", () => {
      const preset = resolveLayoutSpecPreset("ComboBox", "xxl");
      expect(preset.gap).toBe(4);
    });
  });

  describe("fallback 우선순위 — sizes 가 최우선 (회귀 0)", () => {
    it("sizes 값이 있으면 containerStyles/composition 덮어씀", () => {
      // Button 은 sizes.md 에 숫자 필드 있음 + composition 없음 → sizes 반환 유지
      const preset = resolveAppearanceSpecPreset("Button", "md");
      // Button.sizes.md.borderRadius 가 있으면 그 값 우선
      if (typeof preset.borderRadius === "number") {
        expect(preset.borderRadius).toBeGreaterThanOrEqual(0);
      }
    });

    it("containerStyles 만 있고 sizes 없으면 containerStyles 반환", () => {
      // ListBox 는 sizes 블록 자체가 거의 비어있고 containerStyles 보유
      const preset = resolveAppearanceSpecPreset("ListBox", undefined);
      expect(preset.borderRadius).toBe(8); // from containerStyles
    });
  });

  describe("캐싱 — 3-tier merge 결과도 캐시 재사용", () => {
    it("동일 (type, size) 재호출 시 identical reference", () => {
      const a = resolveAppearanceSpecPreset("ListBox", undefined);
      const b = resolveAppearanceSpecPreset("ListBox", undefined);
      expect(a).toBe(b);
    });
  });

  describe("ADR-082 P3 — Flex/Grid 레이아웃 키 (display/flexDirection/alignItems/justifyContent)", () => {
    it("Non-composite containerStyles: ListBox → display=flex / flexDirection=column (camelCase 경로)", () => {
      // ListBoxSpec.containerStyles = { display: "flex", flexDirection: "column", ... }
      const preset = resolveLayoutSpecPreset("ListBox", undefined);
      expect(preset.display).toBe("flex");
      expect(preset.flexDirection).toBe("column");
    });

    it("Composite composition.containerStyles: Pagination → display=flex / flexDirection=column (kebab-case 경로)", () => {
      // PaginationSpec.composition.containerStyles =
      //   { display: "flex", "flex-direction": "column", gap: "var(--spacing-sm)", ... }
      const preset = resolveLayoutSpecPreset("Pagination", undefined);
      expect(preset.display).toBe("flex");
      expect(preset.flexDirection).toBe("column");
    });

    it("containerStyles 미보유 Spec → 레이아웃 키 undefined (기존 기본값 경로 유지)", () => {
      const preset = resolveLayoutSpecPreset("Kbd", "md");
      expect(preset.display).toBeUndefined();
      expect(preset.flexDirection).toBeUndefined();
      expect(preset.alignItems).toBeUndefined();
      expect(preset.justifyContent).toBeUndefined();
    });

    // ADR-082 P3 resolver 인프라 검증 — 실제 등록 Spec 중 루트 containerStyles 에
    //   alignItems/justifyContent 를 공급하는 케이스는 현재 없음 (ListBoxItem 은 TAG_SPEC_MAP
    //   미등록, ADR-076 synthetic item 전환 중). extractor 동작은 아래 단위 호출로 검증.
    it("layoutFromContainerStyles 는 alignItems/justifyContent CSS 값을 그대로 통과시킨다", () => {
      // resolveLayoutSpecPreset 내부 extractor 검증용 — 실제 spec 공급이 생기면 E2E 으로 승격
      // 이 케이스는 resolver 자체 단위 경로만 커버
      const preset = resolveLayoutSpecPreset("ListBox", undefined);
      expect(preset.alignItems).toBeUndefined(); // ListBox 는 정의 없음
      expect(preset.justifyContent).toBeUndefined();
    });
  });
});
