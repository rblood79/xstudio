/**
 * ADR-072 Phase 1 + Phase 2-A: Shell-only container tags 검증
 *
 * `_hasChildren` 컨벤션 SSOT — Empty-placeholder 확인된 태그들이
 * SHELL_ONLY_CONTAINER_TAGS로 이동되었음을 보장한다.
 *
 * 검증 범위:
 *   1. Set membership: Shell-only Set 포함 + Synthetic-merge Set 미포함
 *   2. shapes invariant: `_hasChildren=true` 시 standalone container 미생성
 *   3. standalone 회귀 금지: `_hasChildren=false` 시 placeholder 존재
 *
 * 자식 수와 무관한 `_hasChildren=true` 주입은 Calendar/RangeCalendar
 * 대칭 테스트(`calendar-symmetry.test.ts`)에서 이미 증명됨.
 */

import { describe, expect, it } from "vitest";
import {
  CardSpec,
  DialogSpec,
  SectionSpec,
  DisclosureGroupSpec,
  ButtonGroupSpec,
  CheckboxGroupSpec,
  RadioGroupSpec,
  ToggleButtonGroupSpec,
} from "@composition/specs";
import type { ComponentSpec } from "@composition/specs";
import {
  SHELL_ONLY_CONTAINER_TAGS,
  SYNTHETIC_CHILD_PROP_MERGE_TAGS,
} from "./buildSpecNodeData";

type AnySpec = ComponentSpec<Record<string, unknown>>;

// Phase 1 (Empty-placeholder Case A)
const phase1Candidates: Array<{ tag: string; spec: AnySpec }> = [
  { tag: "Card", spec: CardSpec as unknown as AnySpec },
  { tag: "Dialog", spec: DialogSpec as unknown as AnySpec },
  { tag: "Section", spec: SectionSpec as unknown as AnySpec },
  { tag: "DisclosureGroup", spec: DisclosureGroupSpec as unknown as AnySpec },
];

// Phase 2-A (Group 컨테이너 — factory items 자동 생성)
const phase2ACandidates: Array<{ tag: string; spec: AnySpec }> = [
  { tag: "ButtonGroup", spec: ButtonGroupSpec as unknown as AnySpec },
  { tag: "CheckboxGroup", spec: CheckboxGroupSpec as unknown as AnySpec },
  { tag: "RadioGroup", spec: RadioGroupSpec as unknown as AnySpec },
  {
    tag: "ToggleButtonGroup",
    spec: ToggleButtonGroupSpec as unknown as AnySpec,
  },
];

const candidates = [...phase1Candidates, ...phase2ACandidates];

function callShapes(spec: AnySpec, hasChildren: boolean) {
  const defaultSize = spec.defaultSize ?? "md";
  const size = spec.sizes![defaultSize]!;
  const props = hasChildren ? { _hasChildren: true } : {};
  return spec.render.shapes!(props, size, "default");
}

describe("ADR-072 Phase 1 + 2-A: SHELL_ONLY_CONTAINER_TAGS 재분류", () => {
  describe("Set membership", () => {
    for (const { tag } of candidates) {
      it(`${tag}: SHELL_ONLY_CONTAINER_TAGS 포함`, () => {
        expect(SHELL_ONLY_CONTAINER_TAGS.has(tag)).toBe(true);
      });

      it(`${tag}: SYNTHETIC_CHILD_PROP_MERGE_TAGS 제외`, () => {
        expect(SYNTHETIC_CHILD_PROP_MERGE_TAGS.has(tag)).toBe(false);
      });
    }
  });

  describe("_hasChildren=true → shell만 반환 (container placeholder 없음)", () => {
    for (const { tag, spec } of candidates) {
      it(`${tag}: standalone container 미생성`, () => {
        const shapes = callShapes(spec, true);
        const containers = shapes.filter((s) => s.type === "container");
        expect(containers).toHaveLength(0);
      });
    }
  });

  describe("_hasChildren=false → standalone placeholder 존재 (회귀 방지)", () => {
    for (const { tag, spec } of candidates) {
      it(`${tag}: standalone container 최소 1개 존재`, () => {
        const shapes = callShapes(spec, false);
        const containers = shapes.filter((s) => s.type === "container");
        expect(containers.length).toBeGreaterThan(0);
      });
    }
  });
});
