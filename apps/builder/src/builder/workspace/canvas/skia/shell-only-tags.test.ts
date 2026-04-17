/**
 * ADR-072 Phase 1 + 2-A + 2-B: Shell-only container tags 검증
 *
 * `_hasChildren` 컨벤션 SSOT — factory 자식 자동 생성이 확인된 태그들이
 * SHELL_ONLY_CONTAINER_TAGS로 이동되었음을 보장한다.
 *
 * 검증 범위:
 *   1. Set membership: Shell-only Set 포함 + Synthetic-merge Set 미포함
 *   2. shapes invariant: `_hasChildren=true` 시 standalone container 미생성
 *   3. standalone 회귀 금지: `_hasChildren=false` 시 placeholder 존재
 *      (Phase 2-B는 text/gradient 등 다양한 실렌더 shape이므로 container 대신
 *       "shell 수 < standalone 수" 검증으로 일반화)
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
  DisclosureSpec,
  FormSpec,
  PopoverSpec,
  TooltipSpec,
  ColorPickerSpec,
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

// Phase 2-B (standalone 실렌더 — factory 자식 Element가 대체 커버)
const phase2BCandidates: Array<{ tag: string; spec: AnySpec }> = [
  { tag: "Disclosure", spec: DisclosureSpec as unknown as AnySpec },
  { tag: "Form", spec: FormSpec as unknown as AnySpec },
  { tag: "Popover", spec: PopoverSpec as unknown as AnySpec },
  { tag: "Tooltip", spec: TooltipSpec as unknown as AnySpec },
  { tag: "ColorPicker", spec: ColorPickerSpec as unknown as AnySpec },
];

const containerPlaceholderCandidates = [
  ...phase1Candidates,
  ...phase2ACandidates,
];

const candidates = [
  ...phase1Candidates,
  ...phase2ACandidates,
  ...phase2BCandidates,
];

function callShapes(spec: AnySpec, hasChildren: boolean) {
  const defaultSize = spec.defaultSize ?? "md";
  const size = spec.sizes![defaultSize]!;
  const props = hasChildren ? { _hasChildren: true } : {};
  return spec.render.shapes!(props, size, "default");
}

describe("ADR-072 Phase 1 + 2-A + 2-B: SHELL_ONLY_CONTAINER_TAGS 재분류", () => {
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
    for (const { tag, spec } of containerPlaceholderCandidates) {
      it(`${tag}: standalone container 미생성`, () => {
        const shapes = callShapes(spec, true);
        const containers = shapes.filter((s) => s.type === "container");
        expect(containers).toHaveLength(0);
      });
    }
  });

  describe("_hasChildren=false → standalone placeholder 존재 (회귀 방지)", () => {
    for (const { tag, spec } of containerPlaceholderCandidates) {
      it(`${tag}: standalone container 최소 1개 존재`, () => {
        const shapes = callShapes(spec, false);
        const containers = shapes.filter((s) => s.type === "container");
        expect(containers.length).toBeGreaterThan(0);
      });
    }
  });

  describe("Phase 2-B: _hasChildren 분기 invariant (factory 자식이 실렌더 대체)", () => {
    // Phase 2-B 태그들은 standalone 분기에 text/gradient/arrow 등 다양한 실렌더
    // shape이 존재. Shell-only 이동 후에도 _hasChildren=true 시에는 이들이
    // 생성되지 않고 shell(bg/border 등)만 유지됨을 검증.
    for (const { tag, spec } of phase2BCandidates) {
      it(`${tag}: shell shapes < standalone shapes`, () => {
        const shellShapes = callShapes(spec, true);
        const standaloneShapes = callShapes(spec, false);
        expect(shellShapes.length).toBeLessThan(standaloneShapes.length);
      });
    }
  });
});
