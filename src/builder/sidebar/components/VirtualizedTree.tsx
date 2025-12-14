/**
 * VirtualizedTree - 가상화된 트리 컴포넌트
 *
 * 🚀 Performance Features:
 * - @tanstack/react-virtual로 가상 스크롤링
 * - React.memo로 노드 메모이제이션
 * - 캐시된 정렬 (WeakMap)
 *
 * ♿ Accessibility Features:
 * - ARIA 속성 (role="tree", role="treeitem")
 * - 키보드 네비게이션 (Arrow, Home, End, Enter)
 * - Focus 관리
 */

import React, {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
  KeyboardEvent,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Settings2, Trash, ChevronRight, Box } from "lucide-react";
import type { Element } from "../../../types/core/store.types";
import { sortChildrenByParentTag, sortByOrderNum } from "../../utils/treeUtils";

// ============================================
// Types
// ============================================

interface FlattenedNode {
  id: string;
  element: Element;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

interface VirtualizedTreeProps {
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
  /** 트리 높이 (기본: 400px) */
  height?: number;
  /** 노드 높이 (기본: 32px) */
  itemHeight?: number;
}

// ============================================
// Constants
// ============================================

const ICON_PROPS = {
  color: "#171717",
  strokeWidth: 1,
  size: 16,
} as const;

const DEFAULT_HEIGHT = 400;
const DEFAULT_ITEM_HEIGHT = 32;

// ============================================
// Helper Functions
// ============================================

/**
 * 요소가 삭제 가능한지 확인
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
 * 계층 트리를 평탄화 (가상화를 위해)
 */
function flattenTree(
  elements: Element[],
  expandedKeys: Set<string | number>,
  parentId: string | null = null,
  depth: number = 0,
  result: FlattenedNode[] = []
): FlattenedNode[] {
  // childrenMap 생성
  const childrenMap = new Map<string, Element[]>();
  const elementsMap = new Map<string, Element>();

  elements.forEach((el) => {
    if (el.deleted) return;
    elementsMap.set(el.id, el);
    const key = el.parent_id || "root";
    if (!childrenMap.has(key)) {
      childrenMap.set(key, []);
    }
    childrenMap.get(key)!.push(el);
  });

  // 재귀적 평탄화
  const flatten = (pId: string | null, d: number) => {
    const key = pId || "root";
    const children = childrenMap.get(key) || [];

    if (children.length === 0) return;

    // 부모 태그에 따른 정렬
    const parentElement = pId ? elementsMap.get(pId) : undefined;
    const parentTag = parentElement?.tag;

    const sortedChildren = parentTag
      ? sortChildrenByParentTag(elements, children, parentTag, pId || "root")
      : sortByOrderNum(children);

    sortedChildren.forEach((element) => {
      const elementChildren = childrenMap.get(element.id) || [];
      const hasChildren = elementChildren.some((child) => !child.deleted);
      const isExpanded = expandedKeys.has(element.id);

      result.push({
        id: element.id,
        element,
        depth: d,
        hasChildren,
        isExpanded,
      });

      // 펼쳐진 경우 자식도 평탄화
      if (isExpanded && hasChildren) {
        flatten(element.id, d + 1);
      }
    });
  };

  flatten(parentId, depth);
  return result;
}

// ============================================
// VirtualizedTreeNode Component
// ============================================

interface TreeNodeProps {
  node: FlattenedNode;
  isSelected: boolean;
  isFocused: boolean;
  onSelect: () => void;
  onDelete: () => Promise<void>;
  onToggle: () => void;
  onFocus: () => void;
}

const VirtualizedTreeNode = memo(function VirtualizedTreeNode({
  node,
  isSelected,
  isFocused,
  onSelect,
  onDelete,
  onToggle,
  onFocus,
}: TreeNodeProps) {
  const { element, depth, hasChildren, isExpanded } = node;
  const label = getElementLabel(element);
  const deletable = canDeleteElement(element);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect();
      onFocus();
    },
    [onSelect, onFocus]
  );

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasChildren) {
        onToggle();
      }
    },
    [hasChildren, onToggle]
  );

  const handleDelete = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      await onDelete();
    },
    [onDelete]
  );

  return (
    <div
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={isSelected}
      aria-level={depth + 1}
      tabIndex={isFocused ? 0 : -1}
      data-depth={depth}
      data-has-children={hasChildren}
      data-focused={isFocused}
      onClick={handleClick}
      className="element"
      style={{ height: DEFAULT_ITEM_HEIGHT }}
    >
      <div className={`elementItem ${isSelected ? "active" : ""} ${isFocused ? "focused" : ""}`}>
        <div
          className="elementItemIndent"
          style={{ width: depth > 0 ? `${depth * 8}px` : "0px" }}
        />
        <div
          className="elementItemIcon"
          onClick={handleToggle}
          aria-label={hasChildren ? (isExpanded ? "Collapse" : "Expand") : undefined}
        >
          {hasChildren ? (
            <ChevronRight
              color={ICON_PROPS.color}
              strokeWidth={ICON_PROPS.strokeWidth}
              size={ICON_PROPS.size}
              style={{
                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform 150ms ease",
              }}
            />
          ) : (
            <Box
              color={ICON_PROPS.color}
              strokeWidth={ICON_PROPS.strokeWidth}
              size={ICON_PROPS.size}
              style={{ padding: "2px" }}
            />
          )}
        </div>
        <div className="elementItemLabel">{label}</div>
        <div className="elementItemActions">
          <button className="iconButton" aria-label="Settings">
            <Settings2
              color={ICON_PROPS.color}
              strokeWidth={ICON_PROPS.strokeWidth}
              size={ICON_PROPS.size}
            />
          </button>
          {deletable && (
            <button
              className="iconButton"
              aria-label={`Delete ${label}`}
              onClick={handleDelete}
            >
              <Trash
                color={ICON_PROPS.color}
                strokeWidth={ICON_PROPS.strokeWidth}
                size={ICON_PROPS.size}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// ============================================
// VirtualizedTree Component
// ============================================

export const VirtualizedTree = memo(function VirtualizedTree({
  elements,
  selectedElementId,
  expandedKeys,
  onSelect,
  onDelete,
  onToggle,
  height = DEFAULT_HEIGHT,
  itemHeight = DEFAULT_ITEM_HEIGHT,
}: VirtualizedTreeProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // 평탄화된 노드 목록 (메모이제이션)
  const flattenedNodes = useMemo(() => {
    return flattenTree(elements, expandedKeys);
  }, [elements, expandedKeys]);

  // 가상화 설정
  // eslint-disable-next-line react-hooks/incompatible-library -- useVirtualizer()는 React Compiler에서 memoize 불가
  const virtualizer = useVirtualizer({
    count: flattenedNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5, // 뷰포트 외 5개 추가 렌더
  });

  // 선택된 요소로 스크롤
  useEffect(() => {
    if (selectedElementId) {
      const index = flattenedNodes.findIndex((n) => n.id === selectedElementId);
      if (index !== -1) {
        virtualizer.scrollToIndex(index, { align: "auto" });
        setFocusedIndex(index);
      }
    }
  }, [selectedElementId, flattenedNodes, virtualizer]);

  // 키보드 네비게이션
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = focusedIndex;
      const nodes = flattenedNodes;
      const count = nodes.length;

      if (count === 0) return;

      let newIndex = currentIndex;
      let handled = false;

      switch (e.key) {
        case "ArrowDown":
          newIndex = Math.min(currentIndex + 1, count - 1);
          handled = true;
          break;

        case "ArrowUp":
          newIndex = Math.max(currentIndex - 1, 0);
          handled = true;
          break;

        case "Home":
          newIndex = 0;
          handled = true;
          break;

        case "End":
          newIndex = count - 1;
          handled = true;
          break;

        case "Enter":
        case " ":
          if (currentIndex >= 0 && currentIndex < count) {
            onSelect(nodes[currentIndex].element);
            handled = true;
          }
          break;

        case "ArrowRight":
          if (currentIndex >= 0 && currentIndex < count) {
            const node = nodes[currentIndex];
            if (node.hasChildren && !node.isExpanded) {
              onToggle(node.id);
              handled = true;
            }
          }
          break;

        case "ArrowLeft":
          if (currentIndex >= 0 && currentIndex < count) {
            const node = nodes[currentIndex];
            if (node.hasChildren && node.isExpanded) {
              onToggle(node.id);
              handled = true;
            } else if (node.element.parent_id) {
              // 부모로 이동
              const parentIndex = nodes.findIndex(
                (n) => n.id === node.element.parent_id
              );
              if (parentIndex !== -1) {
                newIndex = parentIndex;
                handled = true;
              }
            }
          }
          break;

        default:
          break;
      }

      if (handled) {
        e.preventDefault();
        e.stopPropagation();

        if (newIndex !== currentIndex) {
          setFocusedIndex(newIndex);
          virtualizer.scrollToIndex(newIndex, { align: "auto" });

          // 포커스 이동 시 선택도 함께 변경 (옵션)
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            onSelect(nodes[newIndex].element);
          }
        }
      }
    },
    [focusedIndex, flattenedNodes, onSelect, onToggle, virtualizer]
  );

  // 포커스 관리
  const handleFocus = useCallback(() => {
    if (focusedIndex === -1 && flattenedNodes.length > 0) {
      // 선택된 요소가 있으면 그것으로, 없으면 첫 번째로
      const selectedIndex = selectedElementId
        ? flattenedNodes.findIndex((n) => n.id === selectedElementId)
        : 0;
      setFocusedIndex(selectedIndex !== -1 ? selectedIndex : 0);
    }
  }, [focusedIndex, flattenedNodes, selectedElementId]);

  const virtualItems = virtualizer.getVirtualItems();

  if (flattenedNodes.length === 0) {
    return (
      <div
        role="tree"
        aria-label="Element tree"
        className="virtualized-tree-empty"
      >
        <p className="no_element">No elements available</p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      role="tree"
      aria-label="Element tree"
      aria-activedescendant={
        focusedIndex >= 0 ? flattenedNodes[focusedIndex]?.id : undefined
      }
      tabIndex={0}
      className="virtualized-tree"
      style={{
        height,
        overflow: "auto",
        contain: "strict",
      }}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((virtualItem) => {
          const node = flattenedNodes[virtualItem.index];
          const isSelected = selectedElementId === node.id;
          const isFocused = focusedIndex === virtualItem.index;

          return (
            <div
              key={node.id}
              id={node.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <VirtualizedTreeNode
                node={node}
                isSelected={isSelected}
                isFocused={isFocused}
                onSelect={() => onSelect(node.element)}
                onDelete={() => onDelete(node.element)}
                onToggle={() => onToggle(node.id)}
                onFocus={() => setFocusedIndex(virtualItem.index)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});

VirtualizedTree.displayName = "VirtualizedTree";

export default VirtualizedTree;
