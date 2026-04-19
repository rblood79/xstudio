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

describe("resolveContainerStylesFallback (ADR-080 Gate G1)", () => {
  describe("listbox — ListBoxSpec.containerStyles SSOT", () => {
    it("empty parentStyle → 4 fallback 속성 반환 (display/flexDirection/gap/padding)", () => {
      const fb = resolveContainerStylesFallback("listbox", {});
      expect(fb).toEqual({
        display: "flex",
        flexDirection: "column",
        gap: 2, // {spacing.2xs}
        padding: 4, // {spacing.xs}
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
      });
    });

    it("parentStyle 4속성 모두 명시 → 빈 객체 반환", () => {
      const fb = resolveContainerStylesFallback("listbox", {
        display: "block",
        flexDirection: "row",
        gap: 8,
        padding: 16,
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

  describe("primitives 정합 (drift 감지 기반)", () => {
    it("resolveToken('{spacing.xs}') === 4 (padding fallback 근거)", () => {
      expect(resolveToken("{spacing.xs}")).toBe(4);
    });

    it("resolveToken('{spacing.2xs}') === 2 (gap fallback 근거)", () => {
      expect(resolveToken("{spacing.2xs}")).toBe(2);
    });
  });
});
