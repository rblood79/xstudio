import type { Element } from "../../types/core/store.types";

/**
 * canonical CanonicalNode.metadata 의 type discriminator.
 * `CanonicalNodeRenderer.legacyUuid` resolution 이 의존하는 contract.
 */
export const LEGACY_ELEMENT_PROPS_METADATA_TYPE =
  "legacy-element-props" as const;

/**
 * legacyToCanonical 의 metadata.legacyProps 표준 빌더.
 *
 * `CanonicalNodeRenderer` 가 `legacyProps.id` 로 element 의 원본 UUID 를 식별 →
 * shared renderer 의 `childrenMap.get(element.id)` 가 자식의 `parent_id` 와 정합.
 * 미주입 시 fallback 으로 canonical path-id (segId) 사용 → mismatch → 자식 미렌더 회귀.
 *
 * **보존 필수 7 fields** (element top-level): `id` / `parent_id` / `page_id` /
 * `layout_id` / `order_num` / `fills` / `type` (ADR-916 Phase 2 G3 Step 1b — hot
 * path inverse 변환에서 element.type 복원에 필요. ref 노드의 경우 canonical type
 * 이 "ref" 로 변환되므로 원본 element.type 보존 없이 LayerTree 분기 불가).
 * 추가 필드 (componentRole / slot_name 등) 는 canonical 변환에서 별도 metadata 로 보존.
 *
 * **ADR-916 Phase 5 G7 본격 cutover** (2026-05-01): `element.events` /
 * `element.dataBinding` 은 본 metadata 에 더 이상 spread 되지 않는다. 대신
 * `x-composition` extension namespace 로 분리 (`buildCompositionExtensionField`,
 * `index.ts` / `slotAndLayoutAdapter.ts` 양쪽). transition first slice 의 dual-storage
 * 는 종결 — extension 이 단일 SSOT.
 *
 * spread 순서: `...element.props` 먼저 → top-level fields 가 props 의 동명 키 덮어씀.
 */
export function buildLegacyElementMetadata(element: Element): {
  type: typeof LEGACY_ELEMENT_PROPS_METADATA_TYPE;
  legacyProps: Record<string, unknown>;
} {
  return {
    type: LEGACY_ELEMENT_PROPS_METADATA_TYPE,
    legacyProps: {
      ...element.props,
      id: element.id,
      parent_id: element.parent_id,
      page_id: element.page_id,
      layout_id: element.layout_id,
      order_num: element.order_num,
      fills: element.fills,
      type: element.type,
    },
  };
}

/**
 * Layout/Slot System ownership 규칙: layoutId 가 있으면 page_id=null,
 * 없으면 page_id=pageId. `useElementCreator` (단순 컴포넌트 경로) 와
 * `createElementsFromDefinition` (복합 컴포넌트 경로) 양쪽이 동일 규칙 사용.
 */
export function resolveOwnerPageId(
  pageId: string | null,
  layoutId: string | null | undefined,
): string | null {
  return layoutId ? null : pageId;
}
