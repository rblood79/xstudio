/**
 * @fileoverview ADR-916 Phase 3 G4 — 3-A-impl: exportLegacyDocument
 *
 * canonical primary storage 전환 후 legacy compat payload 생성 SSOT (D18=A 단일
 * 진입점).
 *
 * **D18=A 채택 사유**: 모든 legacy `elements[]` 생성 site 가 본 함수 경유 →
 * grep gate 단순 (`exportLegacyDocument` 외 legacy direct write 0건). 단일
 * 진입점 testability + post-cutover refactor scope 좁힘.
 *
 * **변환 contract**:
 * - canonical 노드의 `metadata.legacyProps` 가 element 의 7 top-level fields
 *   (id / parent_id / page_id / layout_id / order_num / fills / type) + props
 *   전체 보존 (`buildLegacyElementMetadata` 단일 SSOT 출처).
 * - DFS 순회 시 `metadata.legacyProps` 가진 노드만 element 로 emit.
 * - synthetic 컨테이너 (page node / layout shell / reusable master 외부 wrapper)
 *   는 metadata.legacyProps 없으므로 자동 skip.
 * - round-trip 보장: `exportLegacyDocument(legacyToCanonical({elements,…})).length
 *   === elements.length` (모든 legacy fields 무손실 복원).
 *
 * **ADR-916 Phase 5 G7 본격 cutover** (2026-05-01): events / dataBinding 은
 * `x-composition` extension namespace 에서 reverse 추출. metadata.legacyProps
 * dual-storage 종결 — extension 이 단일 SSOT.
 */

import type {
  CanonicalNode,
  CompositionDocument,
  CompositionExtension,
  RefNode,
} from "@composition/shared";
import type { Element } from "@/types/builder/unified.types";
import type { FillItem } from "@/types/builder/fill.types";

import { LEGACY_ELEMENT_PROPS_METADATA_TYPE } from "./legacyMetadata";

interface LegacyPropsShape {
  id?: string;
  parent_id?: string | null;
  page_id?: string | null;
  layout_id?: string | null;
  slot_name?: string | null;
  order_num?: number;
  fills?: FillItem[];
  type?: string;
  componentRole?: Element["componentRole"];
  masterId?: string;
  overrides?: Record<string, unknown>;
  descendants?: Element["descendants"];
  componentName?: string;
  [propKey: string]: unknown;
}

/**
 * canonical document → legacy `Element[]` payload 역변환.
 *
 * `metadata.legacyProps` 보존된 노드만 element 로 복원. 보존 누락된 컨테이너 노드
 * (page / layout / reusable shell) 는 element[] 에서 제외 — pages[] / layouts[]
 * 는 별도 export 경로 사용.
 *
 * @param doc - canonical CompositionDocument (sync 결과 또는 primary write 결과)
 * @returns legacy Element[] (DFS 순회 결과, parent_id 그대로 보존)
 */
export function exportLegacyDocument(doc: CompositionDocument): Element[] {
  const elements: Element[] = [];

  for (const root of doc.children) {
    walkAndCollect(root, elements);
  }

  return elements;
}

function walkAndCollect(node: CanonicalNode, out: Element[]): void {
  const legacy = extractLegacyElement(node);
  if (legacy) {
    out.push(legacy);
  }

  if (node.children) {
    for (const child of node.children) {
      walkAndCollect(child, out);
    }
  }

  if (node.type === "ref") {
    const descendants = (node as RefNode).descendants ?? {};
    for (const override of Object.values(descendants)) {
      if (
        override &&
        typeof override === "object" &&
        "children" in override &&
        Array.isArray(override.children)
      ) {
        for (const child of override.children) {
          walkAndCollect(child, out);
        }
      }
    }
  }
}

/**
 * canonical node 에서 legacy Element 복원 — `metadata.legacyProps` 가 보존되어
 * 있으면 그것을 source 로 element 재구성. 보존 없으면 null (synthetic 컨테이너).
 */
function extractLegacyElement(node: CanonicalNode): Element | null {
  const meta = node.metadata as
    | {
        type?: string;
        legacyProps?: LegacyPropsShape;
      }
    | undefined;

  if (
    !meta ||
    meta.type !== LEGACY_ELEMENT_PROPS_METADATA_TYPE ||
    !meta.legacyProps
  ) {
    return null;
  }

  const legacyProps = meta.legacyProps;

  // 7 top-level fields 분리 — 나머지는 props.
  const {
    id,
    parent_id,
    page_id,
    layout_id,
    slot_name,
    order_num,
    fills,
    type,
    componentRole,
    masterId,
    overrides,
    descendants,
    componentName,
    ...restProps
  } = legacyProps;

  if (!id || typeof id !== "string") {
    return null;
  }

  const elementType =
    typeof type === "string" && type.length > 0 ? type : node.type;

  const element: Element = {
    id,
    type: elementType,
    props: restProps as Record<string, unknown>,
    parent_id: parent_id ?? null,
    order_num: typeof order_num === "number" ? order_num : 0,
    page_id: page_id ?? null,
    layout_id: layout_id ?? null,
  };

  if (fills !== undefined) {
    element.fills = fills as FillItem[];
  }
  if (slot_name !== undefined) {
    element.slot_name = slot_name;
  }
  if (componentRole !== undefined) {
    element.componentRole = componentRole;
  }
  if (masterId !== undefined) {
    element.masterId = masterId;
  }
  if (overrides !== undefined) {
    element.overrides = overrides;
  }
  if (descendants !== undefined) {
    element.descendants = descendants;
  }
  if (componentName !== undefined) {
    element.componentName = componentName;
  }

  // ADR-916 Phase 5 G7 본격 cutover (2026-05-01) — events/dataBinding 은
  // `x-composition` extension namespace 에서 reverse 복원. metadata.legacyProps
  // dual-storage 종결 — extension 이 단일 SSOT.
  const ext = (
    node as CanonicalNode & { "x-composition"?: CompositionExtension }
  )["x-composition"];
  if (ext?.events !== undefined) {
    element.events = ext.events as Element["events"];
  }
  if (ext?.dataBinding !== undefined) {
    element.dataBinding = ext.dataBinding as Element["dataBinding"];
  }

  return element;
}
