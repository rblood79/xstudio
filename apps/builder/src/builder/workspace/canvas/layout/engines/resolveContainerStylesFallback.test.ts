/**
 * ADR-080 Gate G1: `resolveContainerStylesFallback` unit test.
 *
 * Spec SSOT(ListBoxSpec.containerStyles) ↔ layout fallback 간 drift 감지 경로.
 * primitives(spacing.xs=4, spacing.2xs=2) 값이 변경되면 여기서 failure 발생 → Spec 과
 * layout 의 이원화 방지 (ADR-079 P3.2 drift test 의 구조적 계승).
 *
 * ADR-081 G2 C3 진입점: tokenConsumerDrift.test.ts 는 본 함수 반환값을 primitives 와
 * cross-reference 한다. 본 test 는 함수 자체 계약 (drift 감지) 검증.
 */

import { describe, expect, it } from "vitest";
import { resolveToken } from "@composition/specs";
import { resolveContainerStylesFallback } from "./implicitStyles";

describe("resolveContainerStylesFallback (ADR-080 G1 + ADR-083 Phase 0)", () => {
  describe("listbox — ListBoxSpec.containerStyles SSOT", () => {
    it("empty parentStyle → ListBoxSpec.containerStyles layout primitive 8 필드 반환", () => {
      const fb = resolveContainerStylesFallback("listbox", {});
      // ADR-083 Phase 0: 10 필드 lookup (display/flexDirection/alignItems/
      // justifyContent/width/maxHeight/overflow/outline/gap/padding) 중
      // ListBoxSpec.containerStyles 에 선언된 8 필드 (alignItems/justifyContent 미선언).
      expect(fb).toEqual({
        display: "flex",
        flexDirection: "column",
        gap: 2, // {spacing.2xs}
        padding: 4, // {spacing.xs}
        width: "100%",
        maxHeight: "300px",
        overflow: "auto",
        outline: "none",
      });
    });

    it("parentStyle.display 명시 → display 는 반환값에서 제외 (사용자 편집 우선)", () => {
      const fb = resolveContainerStylesFallback("listbox", {
        display: "block",
      });
      expect(fb).not.toHaveProperty("display");
      expect(fb).toEqual({
        flexDirection: "column",
        gap: 2,
        padding: 4,
        width: "100%",
        maxHeight: "300px",
        overflow: "auto",
        outline: "none",
      });
    });

    it("parentStyle.gap/padding 명시 → 해당 key 제외, 나머지 Spec fallback 반환", () => {
      const fb = resolveContainerStylesFallback("listbox", {
        gap: 8,
        padding: 16,
      });
      expect(fb).not.toHaveProperty("gap");
      expect(fb).not.toHaveProperty("padding");
      expect(fb).toEqual({
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxHeight: "300px",
        overflow: "auto",
        outline: "none",
      });
    });

    it("parentStyle 8속성 모두 명시 → 빈 객체 반환 (ListBoxSpec 선언 필드 전부 override)", () => {
      const fb = resolveContainerStylesFallback("listbox", {
        display: "block",
        flexDirection: "row",
        gap: 8,
        padding: 16,
        width: "50%",
        maxHeight: "100px",
        overflow: "hidden",
        outline: "1px solid red",
      });
      expect(fb).toEqual({});
    });
  });

  describe("unknown tag — containerStyles 보유 Spec 아님", () => {
    it("미지원 tag → 빈 객체", () => {
      expect(resolveContainerStylesFallback("unknown", {})).toEqual({});
      expect(resolveContainerStylesFallback("button", {})).toEqual({});
    });
  });

  // ADR-083 Phase 0 주의: ListBoxItemSpec 은 TAG_SPEC_MAP 미등록 (ListBox.childSpecs
  //   경로로 Skia 렌더) → Phase 0 LOWERCASE_TAG_SPEC_MAP 에도 미포함 → fallback 조회 불가.
  //   ListBoxItem containerStyles 는 CSS emit / ADR-079 P1 cascade 에만 기여하며, Skia
  //   layout 경로(implicitStyles) 로는 별도 ADR (ListBoxItemSpec 을 TAG_SPEC_MAP 에 등록
  //   또는 childSpecs lookup 추가) 로 확장 필요. 본 test 는 그 상태를 선언적으로 문서화.
  describe("listboxitem — TAG_SPEC_MAP 미등록 (Phase 0 범위 외)", () => {
    it("empty parentStyle → {} (childSpecs 전용 spec 은 lookup 미작동)", () => {
      const fb = resolveContainerStylesFallback("listboxitem", {});
      expect(fb).toEqual({});
    });
  });

  describe("menu — Menu.spec.containerStyles (Phase 0 일반화 + Phase 6 merge — 8 필드)", () => {
    it("empty parentStyle → display/flexDirection/padding/gap/width/maxHeight/overflow/outline 반환", () => {
      const fb = resolveContainerStylesFallback("menu", {});
      // Phase 6: Menu containerStyles 에 display/flexDirection 2 필드 추가 → 8 필드 반환.
      // Menu 분기는 filteredChildren=[] 로 early return 하므로 effectiveParent 에
      // parentStyle 전파는 발생하지 않음. 본 test 는 단순히 lookup 계약 확증.
      expect(fb).toEqual({
        display: "flex",
        flexDirection: "column",
        padding: 4, // {spacing.xs}
        gap: 2, // {spacing.2xs}
        width: "100%",
        maxHeight: "300px",
        overflow: "auto",
        outline: "none",
      });
    });
  });

  describe("primitives 정합 (drift 감지 기반)", () => {
    it("resolveToken('{spacing.xs}') === 4 (padding fallback 근거)", () => {
      expect(resolveToken("{spacing.xs}")).toBe(4);
    });

    it("resolveToken('{spacing.2xs}') === 2 (gap fallback 근거)", () => {
      expect(resolveToken("{spacing.2xs}")).toBe(2);
    });
  });
});
