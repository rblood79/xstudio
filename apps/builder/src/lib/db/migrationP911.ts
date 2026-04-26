/**
 * ADR-911 Phase 1 (G1) — Layout migration tool
 *
 * legacy `LayoutTemplate` (`tag="Slot"` 기반) → canonical reusable `FrameNode`
 * (pencil schema: `frame` + `reusable: true` + `slot: false | string[]`).
 *
 * 변환 규칙 (`docs/adr/design/911-layout-frameset-pencil-redesign-breakdown.md`
 * P1-a):
 *
 * - `LayoutTemplate.slots[]` → `FrameNode.slot = slots.map(s => s.name)`
 * - `tag="Slot"` 자식 → 제거 (slot 정보는 `FrameNode.slot` field 로 흡수)
 * - `reusable: true` (재사용 원본)
 * - `placeholder: true` (slot.required 가 하나라도 있는 경우)
 *
 * 후속 단계 (P2-a / P3): RefNode 생성 시 `buildDescendantsFromSlots()` 로 빈
 * descendants 초기화 후 사용자가 채움.
 */

import type {
  CanonicalNode,
  FrameNode,
  DescendantChildrenMode,
} from "@composition/shared";
import type {
  LayoutTemplate,
  LayoutTemplateElement,
} from "../../builder/templates/layoutTemplates";
import type { SlotProps } from "../../types/builder/layout.types";

/**
 * legacy `LayoutTemplate` → canonical reusable `FrameNode`
 *
 * @example
 * ```ts
 * const frame = convertTemplateToCanonicalFrame(singleColumnTemplate);
 * // frame.type === "frame"
 * // frame.reusable === true
 * // frame.slot === ["header", "content", "footer"]
 * // frame.placeholder === true (content slot.required)
 * ```
 */
export function convertTemplateToCanonicalFrame(
  template: LayoutTemplate,
): FrameNode {
  const slotNames = template.slots.map((s) => s.name);
  const hasRequired = template.slots.some((s) => s.required === true);

  const frame: FrameNode = {
    id: template.id,
    type: "frame",
    name: template.name,
    reusable: true,
    slot: slotNames.length > 0 ? slotNames : false,
    children: flattenTemplateElements(template.elements),
  };

  if (hasRequired) {
    frame.placeholder = true;
  }

  return frame;
}

/**
 * `LayoutTemplateElement[]` 에서 `tag="Slot"` 노드 제거 + 나머지 구조 보존.
 * Slot 위치는 `FrameNode.slot` field + 후속 `descendants` key 로 대체됨.
 *
 * @returns canonical `CanonicalNode[]` (tag="Slot" 제외)
 */
export function flattenTemplateElements(
  elements: LayoutTemplateElement[],
): CanonicalNode[] {
  return elements
    .filter((el) => el.tag !== "Slot")
    .map((el) => ({
      id: crypto.randomUUID(),
      // ComponentTag literal union 에 임의 string 직접 할당 불가 — frame 으로 통일.
      // (P2 에서 import adapter 가 정확한 component 매핑으로 교체)
      type: "frame" as const,
      name: el.tag,
    }));
}

/**
 * `SlotProps[]` → `descendants` override 맵 초기화 (RefNode 용).
 *
 * 각 slot name 을 key 로, `{ children: [] }` (children replacement mode) 빈
 * placeholder 배치. 사용자가 RefNode 인스턴스에서 slot 을 채우면
 * `descendants[slotKey].children` 에 노드가 추가됨.
 *
 * @example
 * ```ts
 * const refNode: RefNode = {
 *   id: "ref-1",
 *   type: "ref",
 *   ref: "single-column",
 *   descendants: buildDescendantsFromSlots(template.slots),
 * };
 * ```
 */
export function buildDescendantsFromSlots(
  slots: ReadonlyArray<Pick<SlotProps, "name">>,
): Record<string, DescendantChildrenMode> {
  return Object.fromEntries(
    slots.map((s) => [s.name, { children: [] } as DescendantChildrenMode]),
  );
}
