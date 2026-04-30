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
 * **flag gating**: `isCanonicalDocumentSyncEnabled()` && canonical store 가
 * hydrated 일 때만 의미. 미충족 시 `useCanonicalElements()` 가 `null` 반환 →
 * caller 가 legacy 경로로 fallback.
 */

import { useMemo } from "react";
import type { CanonicalNode, CompositionDocument } from "@composition/shared";
import type { Element } from "../../../types/builder/unified.types";
import { LEGACY_ELEMENT_PROPS_METADATA_TYPE } from "../../../adapters/canonical/legacyMetadata";
import { useActiveCanonicalDocument } from "./canonicalElementsBridge";

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
 * - `metadata.type === "legacy-element-props"` 이고 `legacyProps.id` 가 있을 때만
 *   변환 가능. 미보존 노드 (예: page placeholder, slot synthetic) 는 `null` 반환.
 * - `parent_id` / `order_num` 은 metadata 우선, 미보존 시 caller 가 전달한
 *   parent context 사용.
 * - `type` 은 metadata.legacyProps.type 우선, 미보존 시 `node.type` fallback
 *   (ref 노드의 경우 fallback 시 "ref" 가 들어와 LayerTree 분기 무력화 → 본 경로
 *   진입 시 metadata 누락 노드는 `null` 반환으로 처리).
 */
function canonicalNodeToElement(
  node: CanonicalNode,
  parentId: string | null,
  orderNum: number,
): Element | null {
  const metadata = node.metadata as LegacyMetadata | undefined;
  if (
    !metadata ||
    metadata.type !== LEGACY_ELEMENT_PROPS_METADATA_TYPE ||
    !metadata.legacyProps
  ) {
    return null;
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
    layout_id: lpLayoutId,
    order_num: lpOrderNum,
    fills: lpFills,
    type: lpType,
    ...restProps
  } = lp;
  void _id;

  return {
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
    layout_id:
      typeof lpLayoutId === "string" || lpLayoutId === null
        ? (lpLayoutId as string | null)
        : null,
    fills: lpFills as Element["fills"],
    componentName: node.name,
  };
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
