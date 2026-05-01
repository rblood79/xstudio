/**
 * @fileoverview Canonical → Legacy Element[] derived view — ADR-916 Phase 2 G3 Step 1b
 *
 * canonical store 의 active document 를 legacy `Element[]` 로 평탄화. 5 hot path
 * cutover 의 read backbone — 기존 파이프라인 (buildTreeFromElements /
 * convertToLayerTreeNodes / Inspector / Preview sync) 을 변경하지 않고
 * canonical → derived view 로 사용 가능.
 *
 * **D13-A 채택 (1 PR 통합)**: id 정규화 + element 역추적을 helper 1개로 응축.
 * `metadata.legacyProps` (`buildLegacyElementMetadata`) 에 보존된 7 fields
 * (id/parent_id/page_id/layout_id/order_num/fills/type + props spread) 를 통해
 * legacy Element 무손실 재구성.
 *
 * Direct cutover 이후 canonical store 가 hydrated 일 때 의미가 있다. 초기
 * hydration 전에는 `useCanonicalElements()` 가 `null` 을 반환하고 caller 가
 * legacy 경로로 fallback 한다.
 */

import { useMemo } from "react";
import type {
  CanonicalNode,
  CompositionDocument,
  CompositionExtension,
} from "@composition/shared";
import type { Element } from "../../../types/builder/unified.types";
import { LEGACY_ELEMENT_PROPS_METADATA_TYPE } from "../../../adapters/canonical/legacyMetadata";
import {
  LEGACY_LAYOUT_ID_FIELD,
  withLegacyLayoutId,
} from "../../../adapters/canonical/legacyElementFields";
import { useActiveCanonicalDocument } from "./canonicalElementsBridge";

/**
 * ADR-916 Phase 5 G7 본격 cutover (2026-05-01) — `x-composition` extension 에서
 * events / dataBinding 추출하여 Element 에 spread 가능한 partial 객체 반환.
 * 양쪽 미정의 시 빈 객체 반환.
 */
function extractExtensionFields(node: CanonicalNode): {
  events?: Element["events"];
  dataBinding?: Element["dataBinding"];
} {
  const ext = (
    node as CanonicalNode & { "x-composition"?: CompositionExtension }
  )["x-composition"];
  if (!ext) return {};
  const out: {
    events?: Element["events"];
    dataBinding?: Element["dataBinding"];
  } = {};
  if (ext.events !== undefined) {
    out.events = ext.events as Element["events"];
  }
  if (ext.dataBinding !== undefined) {
    out.dataBinding = ext.dataBinding as Element["dataBinding"];
  }
  return out;
}

// ─────────────────────────────────────────────
// Conversion helpers
// ─────────────────────────────────────────────

interface LegacyMetadata {
  type?: unknown;
  legacyProps?: Record<string, unknown>;
}

/**
 * canonical CanonicalNode + parent context → legacy Element 재구성.
 *
 * **두 경로 분기 (ADR-916 G6-1)**:
 *
 * 1. **legacy adapter 경유** (Phase 1~Phase 5 G6-1 first work 까지의 backbone):
 *    `metadata.type === "legacy-element-props"` + `legacyProps.id` 보존된 노드.
 *    `legacyToCanonical` 가 산출한 read-through projection. 7 fields
 *    (id/parent_id/page_id/layout_id/order_num/fills/type) 무손실 복원.
 * 2. **canonical primary fallback** (G6-1 second work, 2026-05-01):
 *    `metadata.legacyProps` 없이 `node.props` 만 정의된 canonical primary
 *    write 결과. `node.id/.type/.props/.name` 직접 사용해서 Element 복원.
 *    page_id/layout_id/fills 미정의 → null. parent_id/order_num 은 caller
 *    parent context 사용. **Phase 3 G4 canonical primary write 진입 prerequisite**.
 *
 * **null skip 조건** (양 경로 모두 미충족):
 * - metadata 미보존 + props 미정의 (page placeholder, slot synthetic 등)
 * - metadata.type === "legacy-element-props" 인데 legacyProps.id 누락
 *
 * `type` 은 legacy 경로에서는 metadata.legacyProps.type 우선 (ref 노드 원본
 * type 보존), canonical primary 경로에서는 `node.type` 직접 사용.
 */
export function canonicalNodeToElement(
  node: CanonicalNode,
  parentId: string | null,
  orderNum: number,
): Element | null {
  const metadata = node.metadata as LegacyMetadata | undefined;
  // ADR-916 Phase 5 G7 본격 cutover — `x-composition` extension 에서
  // events/dataBinding 복원. metadata.legacyProps dual-storage 종결.
  const extFields = extractExtensionFields(node);
  if (
    !metadata ||
    metadata.type !== LEGACY_ELEMENT_PROPS_METADATA_TYPE ||
    !metadata.legacyProps
  ) {
    // ADR-916 G6-1 second work — canonical primary fallback.
    // Button/TextField/Section 등 component spec consumer 가 `metadata.legacyProps`
    // 없이도 Skia + DOM 정합 렌더 가능하도록 `CanonicalNode.props` 직접 사용.
    // page placeholder / slot synthetic (props 미정의) 노드는 기존대로 null skip.
    if (!node.props) return null;

    return withLegacyLayoutId(
      {
        id: node.id,
        type: node.type,
        props: { ...node.props },
        parent_id: parentId,
        order_num: orderNum,
        page_id: null,
        fills: undefined,
        componentName: node.name,
        ...extFields,
      },
      null,
    );
  }

  const lp = metadata.legacyProps;
  const legacyId = lp.id;
  if (typeof legacyId !== "string") {
    return null;
  }

  // legacyProps 에서 element top-level fields 분리 → 나머지는 props 로 복원.
  const {
    id: _id,
    parent_id: lpParentId,
    page_id: lpPageId,
    [LEGACY_LAYOUT_ID_FIELD]: lpLayoutId,
    order_num: lpOrderNum,
    fills: lpFills,
    type: lpType,
    ...restProps
  } = lp;
  void _id;

  return withLegacyLayoutId(
    {
      id: legacyId,
      type: typeof lpType === "string" ? lpType : node.type,
      props: restProps,
      parent_id:
        typeof lpParentId === "string" || lpParentId === null
          ? (lpParentId as string | null)
          : parentId,
      order_num: typeof lpOrderNum === "number" ? lpOrderNum : orderNum,
      page_id:
        typeof lpPageId === "string" || lpPageId === null
          ? (lpPageId as string | null)
          : null,
      fills: lpFills as Element["fills"],
      componentName: node.name,
      ...extFields,
    },
    typeof lpLayoutId === "string" || lpLayoutId === null
      ? (lpLayoutId as string | null)
      : null,
  );
}

/**
 * canonical document tree 를 평탄한 legacy `Element[]` 로 변환.
 *
 * - DFS 순회 (root → children).
 * - metadata 미보존 노드는 skip — children 은 부모 context (skip 직전 부모 id) 로 승계.
 * - 결과 Element[] 는 buildTreeFromElements 가 `parent_id` 기반으로 재구성 가능.
 */
export function canonicalDocumentToElements(
  doc: CompositionDocument,
): Element[] {
  const result: Element[] = [];

  function visit(
    node: CanonicalNode,
    parentLegacyId: string | null,
    siblingIndex: number,
  ): void {
    const element = canonicalNodeToElement(node, parentLegacyId, siblingIndex);
    const nextParentId = element?.id ?? parentLegacyId;
    if (element) result.push(element);
    if (node.children) {
      node.children.forEach((child, idx) => {
        visit(child, nextParentId, idx);
      });
    }
  }

  doc.children.forEach((child, idx) => {
    visit(child, null, idx);
  });

  return result;
}

// ─────────────────────────────────────────────
// React hook
// ─────────────────────────────────────────────

/**
 * 활성 canonical document 의 legacy `Element[]` derived view 를 React 컴포넌트
 * 에서 구독.
 *
 * - canonical store 비활성 (currentProjectId === null) 또는 doc 미등록 시 `null`.
 * - mutation 시 `useActiveCanonicalDocument` 가 새 reference 반환 → useMemo 가
 *   재계산 → caller 가 새 Element[] 수신.
 * - canonical → Element 변환 비용 = O(n) DFS. document 가 자주 mutate 되면 cost
 *   누적 — Sub-Phase B 후속 sub-step 에서 memoization 강화 고려.
 *
 * @returns canonical 에서 파생된 legacy `Element[]` 또는 `null` (비활성)
 */
export function useCanonicalElements(): Element[] | null {
  const doc = useActiveCanonicalDocument();
  return useMemo(() => {
    if (!doc) return null;
    return canonicalDocumentToElements(doc);
  }, [doc]);
}

/**
 * canonical document 트리에서 `metadata.legacyProps.id === legacyId` 인 노드를
 * DFS 검색. legacy uuid 와 canonical node.id (segId, stable path) 가 다르기
 * 때문에, selectedElementId (legacy uuid) 기반 lookup 은 metadata 검색 필요.
 *
 * @returns 매칭 노드 또는 `null` (없음)
 */
function findNodeByLegacyId(
  doc: CompositionDocument,
  legacyId: string,
): CanonicalNode | null {
  function visit(node: CanonicalNode): CanonicalNode | null {
    const md = node.metadata as LegacyMetadata | undefined;
    if (
      md?.type === LEGACY_ELEMENT_PROPS_METADATA_TYPE &&
      md.legacyProps?.id === legacyId
    ) {
      return node;
    }
    if (node.children) {
      for (const c of node.children) {
        const found = visit(c);
        if (found) return found;
      }
    }
    return null;
  }
  for (const c of doc.children) {
    const found = visit(c);
    if (found) return found;
  }
  return null;
}

/**
 * 활성 canonical document 에서 selected legacy element 를 `Element` 형태로 파생.
 *
 * **ADR-916 Phase 2 G3 Step 2 (Selection/properties)** read backbone — selected
 * element 의 panel 데이터를 canonical store 에서 직접 파생.
 *
 * **lookup 정책**: selectedElementId 는 legacy uuid (예: "uuid-xxx"), canonical
 * node.id 는 segId (stable path, 예: "page:p1/0/2"). 따라서 store 의
 * `findNodeById` 가 아닌 metadata.legacyProps.id 기반 DFS 검색 사용.
 *
 * **비용**: O(n) DFS per render. document mutation 또는 selectedElementId 변경시
 * 만 재계산 (useMemo 가드). hot path 가 selection panel 1개라 perf 영향 미미.
 *
 * **반환 조건**:
 * - `selectedElementId === null` → null
 * - canonical store 비활성 (doc null) → null
 * - 매칭 노드 없음 → null
 * - metadata 미보존 노드 (canonicalNodeToElement → null) → null
 *
 * @param selectedElementId — caller 의 selectedElementId (legacy uuid)
 * @returns canonical 에서 파생된 legacy `Element` 또는 `null`
 */
export function useCanonicalSelectedElement(
  selectedElementId: string | null,
): Element | null {
  const doc = useActiveCanonicalDocument();
  return useMemo(() => {
    if (!selectedElementId || !doc) return null;
    const node = findNodeByLegacyId(doc, selectedElementId);
    if (!node) return null;
    return canonicalNodeToElement(node, null, 0);
  }, [selectedElementId, doc]);
}
