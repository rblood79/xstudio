/**
 * @fileoverview Legacy → Canonical Document Adapter — ADR-903 P1.
 *
 * read-through 변환:
 *   elements[] + pages[] + layouts[] → CompositionDocument (canonical doc tree)
 *
 * 변환 책임 분담:
 *  - tag → type rename: tagRename.ts (Stream 1 본 모듈)
 *  - componentRole/masterId/overrides/descendants → reusable/ref:
 *      componentRoleAdapter.ts (Stream 2)
 *  - tag="Slot" + slot_name + Page.layout_id → slot 메타 + descendants[path].children + page ref:
 *      slotAndLayoutAdapter.ts (Stream 3)
 *  - parent_id/order_num → tree order: 본 파일 buildTree() 함수
 *
 * 저장 포맷 미변경 (Phase 5에서 전환). Phase 2 resolver는 본 adapter 결과만 소비.
 */

import type {
  CanonicalNode,
  CompositionDocument,
  RefNode,
} from "@composition/shared";
import type { Element } from "@/types/builder/unified.types";
import type {
  ConvertComponentRoleFn,
  ConvertPageLayoutFn,
  LegacyAdapterInput,
} from "./types";
import { isLegacySlotTag, tagToType } from "./tagRename";
import { buildIdPathContext, segId } from "./idPath";
import {
  convertLayoutToReusableFrame,
  buildSlotPathMap,
} from "./slotAndLayoutAdapter";

export interface LegacyAdapterDeps {
  convertComponentRole: ConvertComponentRoleFn;
  convertPageLayout: ConvertPageLayoutFn;
}

export function legacyToCanonical(
  input: LegacyAdapterInput,
  deps: LegacyAdapterDeps,
): CompositionDocument {
  const { elements, pages, layouts } = input;
  const { convertComponentRole, convertPageLayout } = deps;

  // 1. id path 컨텍스트 구축 (UUID → stable path remap)
  const idPathCtx = buildIdPathContext(elements);

  // 2. element → CanonicalNode 변환 (tree traversal)
  const childrenByParent = indexChildrenByParent(elements);

  function buildNode(element: Element): CanonicalNode {
    const baseType = tagToType(element.tag);

    // componentRole 분기: master → reusable / instance → ref
    const roleResult = convertComponentRole(element, {
      idPathMap: idPathCtx.idPathMap,
    });

    // 자식 노드 (재귀)
    const childElements = childrenByParent.get(element.id) ?? [];
    childElements.sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0));
    const canonicalChildren = childElements.map(buildNode);

    // Slot tag 특수 처리: container의 slot 메타로 변환되어야 하지만,
    // standalone Slot element는 부모 컨테이너 slot 메타로 흡수되어야 한다.
    // P1 단계에서는 Slot element를 일반 frame으로 변환 + metadata 보존.
    // (실제 흡수는 Stream 3이 page composition 단계에서 처리)
    if (isLegacySlotTag(element.tag)) {
      const slotName =
        (element.props.name as string | undefined) ?? element.slot_name ?? null;
      return {
        id: segId(element.id, idPathCtx.idSegmentMap),
        type: "frame",
        name: element.componentName,
        metadata: {
          type: "legacy-slot",
          slot_name: element.slot_name,
          ...(slotName ? { slotName } : {}),
        },
        children: canonicalChildren,
      };
    }

    const node: CanonicalNode = {
      id: segId(element.id, idPathCtx.idSegmentMap),
      type: roleResult.ref ? "ref" : baseType,
      name: element.componentName,
      ...(roleResult.reusable ? { reusable: true } : {}),
      ...(roleResult.ref
        ? ({
            ref: roleResult.ref,
            ...(roleResult.descendantsRemapped
              ? { descendants: roleResult.descendantsRemapped }
              : {}),
          } satisfies Partial<RefNode>)
        : {}),
      children: canonicalChildren,
      ...(roleResult.rootOverrides ?? {}),
      // legacy Element.props는 metadata로 보존 (Phase 2+ resolver가 활용)
      metadata: { type: "legacy-element-props", legacyProps: element.props },
    };

    return node;
  }

  // 3. Page 단위 ref 인스턴스 변환 (Stream 3).
  // layout 별 slotPathMap (slot name → stable id path) 사전 계산.
  // resolver mode C 매칭은 stable id path 기준 (P2 contract).
  const layoutSlotPathMaps = new Map<string, Map<string, string>>();
  for (const layout of layouts) {
    const layoutElements = elements.filter((e) => e.layout_id === layout.id);
    const layoutIdPathMap = buildIdPathContext(layoutElements).idPathMap;
    layoutSlotPathMaps.set(
      layout.id,
      buildSlotPathMap(layoutElements, layoutIdPathMap),
    );
  }

  const pageNodes: CanonicalNode[] = [];
  for (const page of pages) {
    const pageElements = elements.filter((e) => e.page_id === page.id);
    const slotPathMap = page.layout_id
      ? (layoutSlotPathMaps.get(page.layout_id) ?? new Map())
      : new Map();
    const pageRef = convertPageLayout(page, layouts, pageElements, slotPathMap);
    if (pageRef) {
      pageNodes.push(pageRef);
    } else {
      // layout_id 없는 page: pageElements를 그대로 root children으로 묶음
      const pageRootElements = pageElements.filter((e) => e.parent_id == null);
      pageRootElements.sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0));
      pageNodes.push({
        id: page.id,
        type: "frame",
        name: page.title,
        metadata: {
          type: "legacy-page",
          pageId: page.id,
          slug: page.slug,
        },
        children: pageRootElements.map(buildNode),
      });
    }
  }

  // 4. Reusable nodes (componentRole === "master") 추출 — top-level reusable로 승격
  // master elements는 buildNode에서 reusable: true가 세팅되며, ordering은
  // master 먼저 / page 먼저 정책: reusable masters를 앞에 배치하여 ref 해석 시
  // 선행 정의가 보장됨 (resolver가 순서 의존 없이도 동작해야 하지만, 직렬화
  // 가독성 + diff 안정성을 위해 masters first).
  const reusableMasters: CanonicalNode[] = elements
    .filter((e) => e.componentRole === "master")
    .map(buildNode);

  // 5. Layout shells → canonical reusable FrameNodes.
  // page refs (Stream 3 convertPageLayout)가 ref: "layout-<id>"로 참조하므로
  // layout frames가 먼저 정의되어야 ref 해석 시 선행 정의 보장.
  const layoutFrames: CanonicalNode[] = layouts.map((layout) => {
    const layoutElements = elements.filter((e) => e.layout_id === layout.id);
    return convertLayoutToReusableFrame(layout, layoutElements);
  });

  return {
    version: "composition-1.0",
    children: [...layoutFrames, ...reusableMasters, ...pageNodes],
  };
}

function indexChildrenByParent(
  elements: Element[],
): Map<string | null, Element[]> {
  const map = new Map<string | null, Element[]>();
  for (const el of elements) {
    const parent = el.parent_id ?? null;
    const arr = map.get(parent) ?? [];
    arr.push(el);
    map.set(parent, arr);
  }
  return map;
}
