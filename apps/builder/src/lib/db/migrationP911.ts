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
  CompositionDocument,
  FrameNode,
  DescendantChildrenMode,
} from "@composition/shared";
import type {
  LayoutTemplate,
  LayoutTemplateElement,
} from "../../builder/templates/layoutTemplates";
import type { Layout, SlotProps } from "../../types/builder/layout.types";

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

/**
 * legacy `Layout` entity → canonical reusable `FrameNode` (frame shell only).
 *
 * **scope (P1-b1)**: pure transformation. legacy fields → metadata 보존.
 * children / slot 정보는 후속 P1-b2 에서 layout-bound elements 처리 시 채움.
 *
 * **legacy 메타데이터 보존**: 출처 추적 + read-through shim 디버깅 용도로
 * `metadata.type = "legacy-layout-hoist"` 마커 + 원본 fields (`projectId` /
 * `description` / `slug` / `orderNum` / `notFoundPageId` / `inheritNotFound`) 를
 * `metadata` 안에 보존. P4 G4 cleanup 시점에 dead 판정 후 제거.
 *
 * @example
 * ```ts
 * const frame = hoistLayoutAsReusableFrame({
 *   id: "layout-1",
 *   name: "Main",
 *   project_id: "proj-1",
 *   slug: "/main",
 * });
 * // frame.type === "frame"
 * // frame.reusable === true
 * // frame.metadata.type === "legacy-layout-hoist"
 * // frame.metadata.slug === "/main"
 * ```
 */
export function hoistLayoutAsReusableFrame(layout: Layout): FrameNode {
  const metadata: { type: string; [k: string]: unknown } = {
    type: "legacy-layout-hoist",
    projectId: layout.project_id,
  };

  if (layout.description !== undefined)
    metadata.description = layout.description;
  if (layout.slug !== undefined) metadata.slug = layout.slug;
  if (layout.order_num !== undefined) metadata.orderNum = layout.order_num;
  if (layout.notFoundPageId !== undefined)
    metadata.notFoundPageId = layout.notFoundPageId;
  if (layout.inheritNotFound !== undefined)
    metadata.inheritNotFound = layout.inheritNotFound;

  return {
    id: layout.id,
    type: "frame",
    name: layout.name,
    reusable: true,
    slot: false,
    children: [],
    metadata,
  };
}

/**
 * P1-b2 dryRun 결과.
 *
 * - `hoisted`: canonical doc 에 미존재하는 layouts → `hoistLayoutAsReusableFrame` 변환 결과.
 *   apply 단계에서 `doc.children` 에 삽입 예정.
 * - `skipped`: canonical doc 에 이미 매칭 reusable FrameNode (동일 id) 존재 — idempotent skip.
 * - `errors`: 변환 실패 메시지 (예: layout.id 충돌, 잘못된 metadata 등).
 */
export interface MigrationP911Result {
  status: "success" | "skipped" | "failure";
  hoisted: FrameNode[];
  skipped: string[];
  errors: string[];
  reason?: string;
}

/**
 * P1-b2 가 의존하는 IndexedDB adapter 의 minimal surface.
 * dryRun 단계는 read-only — `layouts.getByProject` 만 사용.
 */
export interface MigrationP911Adapter {
  layouts: {
    getByProject(projectId: string): Promise<Layout[]>;
  };
}

/**
 * legacy `layouts` store rows 와 canonical document tree 를 비교하여
 * **read-only dry-run** 으로 hoist 후보를 계산.
 *
 * 알고리즘:
 *
 * 1. `adapter.layouts.getByProject(projectId)` 로 legacy Layout[] 조회
 * 2. canonical doc 의 `reusable: true` FrameNode id 수집 (Set)
 * 3. 각 layout 에 대해:
 *    - 매칭 reusable id 존재 → `skipped` (이미 ADR-903 P3 등에서 변환됨)
 *    - 미존재 → `hoistLayoutAsReusableFrame(layout)` → `hoisted`
 * 4. 결과 반환 (DB write 없음)
 *
 * apply 단계는 본 결과의 `hoisted[]` 를 `doc.children` 에 삽입 + persistence
 * (P1-b3 후속 작업).
 *
 * @example
 * ```ts
 * const result = await dryRunMigrationP911(adapter, projectId, canonicalDoc);
 * console.log(`hoist 대상: ${result.hoisted.length}, skip: ${result.skipped.length}`);
 * if (result.errors.length === 0) {
 *   await applyMigrationP911(adapter, result); // 후속 (P1-b3)
 * }
 * ```
 */
export async function dryRunMigrationP911(
  adapter: MigrationP911Adapter,
  projectId: string,
  canonicalDoc: CompositionDocument,
): Promise<MigrationP911Result> {
  const layouts = await adapter.layouts.getByProject(projectId);

  const reusableFrameIds = new Set<string>();
  for (const node of canonicalDoc.children) {
    if (node.type === "frame" && (node as FrameNode).reusable === true) {
      reusableFrameIds.add(node.id);
    }
  }

  const hoisted: FrameNode[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const layout of layouts) {
    if (reusableFrameIds.has(layout.id)) {
      skipped.push(layout.id);
      continue;
    }

    try {
      hoisted.push(hoistLayoutAsReusableFrame(layout));
    } catch (err) {
      errors.push(
        `layout '${layout.id}': ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return {
    status: errors.length > 0 ? "failure" : "success",
    hoisted,
    skipped,
    errors,
  };
}
