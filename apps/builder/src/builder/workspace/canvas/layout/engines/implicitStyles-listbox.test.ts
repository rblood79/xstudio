/**
 * ADR-079 Phase 3.2 drift 감지
 *
 * `implicitStyles.ts` ListBox 분기 (line 668-676) 의 fallback 상수 가
 * `ListBoxSpec.containerStyles` 와 정합한지 unit test 로 강제.
 *
 * 목적: Spec 값 수정 시 layout engine 에 자동 전파되지 않는 이원화 재발 방지.
 * Spec 이 수정되면 본 test 가 실패 → implicitStyles.ts 동기화 유도.
 */

import { describe, expect, it } from "vitest";
import { ListBoxSpec } from "@composition/specs";

describe("ListBoxSpec.containerStyles vs implicitStyles.listbox 분기 (ADR-079 Phase 3.2 drift 감지)", () => {
  it("display + flexDirection 가 Spec SSOT 와 일치", () => {
    const c = ListBoxSpec.containerStyles!;
    expect(c.display).toBe("flex");
    expect(c.flexDirection).toBe("column");
  });

  it("padding TokenRef = {spacing.xs} (→ CSS 해결 시 4px, implicitStyles fallback `?? 4` 와 정합)", () => {
    const c = ListBoxSpec.containerStyles!;
    expect(c.padding).toBe("{spacing.xs}");
  });

  it("gap TokenRef = {spacing.2xs} (→ CSS 해결 시 2px, implicitStyles fallback `?? 2` 와 정합)", () => {
    const c = ListBoxSpec.containerStyles!;
    expect(c.gap).toBe("{spacing.2xs}");
  });
});
