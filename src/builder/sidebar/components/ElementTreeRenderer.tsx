/**
 * ElementTreeRenderer - 요소 트리 렌더링 컴포넌트
 *
 * 🚀 Performance Optimization:
 * - React.memo로 불필요한 재렌더 방지
 * - useMemo로 메모이제이션
 * - sortChildrenByParentTag로 캐시된 정렬 사용
 * - TreeNodeItem으로 개별 노드 최적화
 */

import React, { memo, useMemo, useDeferredValue } from "react";
import { TreeNodeItem } from "./TreeNodeItem";
import type { Element } from "../../../types/core/store.types";
import { sortChildrenByParentTag, sortByOrderNum } from "../../utils/treeUtils";

interface ElementTreeRendererProps {
  /** 요소 목록 */
  elements: Element[];
  /** 현재 선택된 요소 ID */
  selectedElementId: string | null;
  /** 펼쳐진 노드 ID Set */
  expandedKeys: Set<string | number>;
  /** 요소 선택 핸들러 */
  onSelect: (element: Element) => void;
  /** 요소 삭제 핸들러 */
  onDelete: (element: Element) => Promise<void>;
  /** 노드 펼치기/접기 핸들러 */
  onToggle: (id: string) => void;
}

/**
 * 요소가 삭제 가능한지 확인
 * - body 태그는 삭제 불가
 */
function canDeleteElement(element: Element): boolean {
  return element.tag !== "body";
}

/**
 * 요소의 라벨 생성
 */
function getElementLabel(element: Element): string {
  const { tag, props } = element;

  switch (tag) {
    case "Tab":
      return `Tab: ${(props as { title?: string })?.title || "Untitled"}`;
    case "Panel":
      return `Panel: ${(props as { title?: string })?.title || "Untitled"}`;
    case "TableHeader":
      return "thead";
    case "TableBody":
      return "tbody";
    case "Column":
      return `th: ${(props as { children?: string })?.children || "Column"}`;
    case "Row":
      return "tr";
    case "Cell":
      return `td: ${(props as { children?: string })?.children || "Cell"}`;
    default:
      return tag;
  }
}

/**
 * 메모이제이션된 요소 트리 렌더러
 *
 * 🚀 Phase 4.5: useDeferredValue로 선택 하이라이트 낮은 우선순위 처리
 * - 캔버스 클릭은 즉시 반응
 * - 트리 하이라이트는 concurrent 렌더링으로 지연
 */
export const ElementTreeRenderer = memo(function ElementTreeRenderer({
  elements,
  selectedElementId: rawSelectedElementId,
  expandedKeys,
  onSelect,
  onDelete,
  onToggle,
}: ElementTreeRendererProps) {
  // 🚀 Phase 4.5: 선택 하이라이트를 낮은 우선순위로 처리
  const selectedElementId = useDeferredValue(rawSelectedElementId);
  // 🚀 Performance: childrenMap 생성 (O(n))
  const childrenMap = useMemo(() => {
    const map = new Map<string, Element[]>();

    elements.forEach((el) => {
      if (el.deleted) return;

      const key = el.parent_id || "root";
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(el);
    });

    return map;
  }, [elements]);

  // 🚀 Performance: elementsMap 생성 (O(n))
  const elementsMap = useMemo(() => {
    const map = new Map<string, Element>();
    elements.forEach((el) => map.set(el.id, el));
    return map;
  }, [elements]);

  /**
   * 재귀적 요소 트리 렌더링
   * ⚡ useMemo + 내부 함수 패턴으로 변경 (useCallback 재귀 참조 문제 해결)
   */
  const renderElementTree = useMemo(() => {
    const render = (parentId: string | null = null, depth: number = 0): React.ReactNode => {
      // O(1) 조회로 자식 요소 가져오기
      const key = parentId || "root";
      const children = childrenMap.get(key) || [];

      if (children.length === 0) return null;

      // 삭제되지 않은 요소만 필터링
      const activeChildren = children.filter((el) => !el.deleted);

      if (activeChildren.length === 0) return null;

      // 부모 태그에 따른 정렬
      const parentElement = parentId ? elementsMap.get(parentId) : undefined;
      const parentTag = parentElement?.tag;

      const sortedChildren = parentTag
        ? sortChildrenByParentTag(elements, activeChildren, parentTag, parentId || "root")
        : sortByOrderNum(activeChildren);

      return (
        <>
          {sortedChildren.map((element) => {
            const elementChildren = childrenMap.get(element.id) || [];
            const hasChildren = elementChildren.some((child) => !child.deleted);
            const isExpanded = expandedKeys.has(element.id);
            const isSelected = selectedElementId === element.id;
            const deletable = canDeleteElement(element);
            const label = getElementLabel(element);

            return (
              <TreeNodeItem
                key={element.id}
                id={element.id}
                label={label}
                tag={element.tag}
                props={element.props as Record<string, unknown>}
                depth={depth}
                hasChildren={hasChildren}
                isExpanded={isExpanded}
                isSelected={isSelected}
                canDelete={deletable}
                onClick={() => onSelect(element)}
                onToggle={() => onToggle(element.id)}
                onDelete={async () => onDelete(element)}
              >
                {/* 펼쳐진 경우 자식 요소들 렌더링 */}
                {isExpanded && hasChildren && render(element.id, depth + 1)}
              </TreeNodeItem>
            );
          })}
        </>
      );
    };
    return render;
  }, [elements, childrenMap, elementsMap, selectedElementId, expandedKeys, onSelect, onDelete, onToggle]);

  return <>{renderElementTree(null, 0)}</>;
});

ElementTreeRenderer.displayName = "ElementTreeRenderer";

export default ElementTreeRenderer;
