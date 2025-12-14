/**
 * VirtualizedLayerTree
 *
 * 🚀 Performance: @tanstack/react-virtual을 사용한 가상 스크롤링 트리
 * - 대규모 트리(100+ 요소)에서 DOM 노드 수 최소화
 * - 보이는 영역만 렌더링하여 메모리 사용량 감소
 */

import React, { useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Settings2, Trash, ChevronRight, Box, Folder, File } from "lucide-react";
import type { ElementTreeItem } from "../../types/builder/stately.types";
import type { ElementProps } from "../../types/integrations/supabase.types";
import type { Element } from "../../types/core/store.types";
import type { DataBinding } from "../../types/builder/unified.types";
import {
  ICON_EDIT_PROPS,
  type ButtonItem,
  type CheckboxItem,
  type RadioItem,
  type ListItem,
  type TreeItem as TreeItemType,
} from "./treeHelpers";

// ============================================
// Types
// ============================================

interface FlattenedTreeItem {
  item: ElementTreeItem;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  /** 가상 자식 노드 타입 (Collection 컴포넌트용) */
  virtualChildType?: "toggle" | "checkbox" | "radio" | "listbox" | "gridlist" | "select" | "combobox" | "tree";
  virtualChildIndex?: number;
  virtualChildData?: unknown;
}

interface VirtualizedLayerTreeProps {
  tree: ElementTreeItem[];
  expandedKeys: Set<string | number>;
  selectedElementId: string | null;
  selectedTab?: { parentId: string; tabIndex: number } | null;
  onItemClick: (element: Element) => void;
  onItemDelete: (element: Element) => Promise<void>;
  onToggleExpand: (key: string) => void;
  onSelectTabElement?: (parentId: string, props: ElementProps, index: number) => void;
  /** 요소 배열 (Table 구조 렌더링용) */
  elements?: Element[];
  /** 컨테이너 높이 (px) */
  containerHeight?: number;
}

// ============================================
// Flatten Tree Utility
// ============================================

function flattenTree(
  tree: ElementTreeItem[],
  expandedKeys: Set<string | number>,
  depth: number = 0
): FlattenedTreeItem[] {
  const result: FlattenedTreeItem[] = [];

  for (const item of tree) {
    const hasChildNodes = item.children && item.children.length > 0;
    const isExpanded = expandedKeys.has(item.id);

    // Collection 컴포넌트들의 가상 자식 노드들 확인
    const hasToggleChildren =
      item.tag === "ToggleButtonGroup" &&
      item.props?.children &&
      Array.isArray(item.props.children) &&
      item.props.children.length > 0;
    const hasCheckboxChildren =
      item.tag === "CheckboxGroup" &&
      item.props?.children &&
      Array.isArray(item.props.children) &&
      item.props.children.length > 0;
    const hasRadioChildren =
      item.tag === "RadioGroup" &&
      item.props?.children &&
      Array.isArray(item.props.children) &&
      item.props.children.length > 0;
    const hasListBoxChildren =
      item.tag === "ListBox" &&
      item.props?.children &&
      Array.isArray(item.props.children) &&
      item.props.children.length > 0;
    const hasGridListChildren =
      item.tag === "GridList" &&
      item.props?.children &&
      Array.isArray(item.props.children) &&
      item.props.children.length > 0;
    const hasSelectChildren =
      item.tag === "Select" &&
      item.props?.children &&
      Array.isArray(item.props.children) &&
      item.props.children.length > 0;
    const hasComboBoxChildren =
      item.tag === "ComboBox" &&
      item.props?.children &&
      Array.isArray(item.props.children) &&
      item.props.children.length > 0;
    const hasTreeChildren =
      item.tag === "Tree" &&
      item.props?.children &&
      Array.isArray(item.props.children) &&
      item.props.children.length > 0;

    const hasAnyChildren =
      hasChildNodes ||
      hasToggleChildren ||
      hasCheckboxChildren ||
      hasRadioChildren ||
      hasListBoxChildren ||
      hasGridListChildren ||
      hasSelectChildren ||
      hasComboBoxChildren ||
      hasTreeChildren;

    // 부모 아이템 추가
    result.push({
      item,
      depth,
      hasChildren: hasAnyChildren,
      isExpanded,
    });

    // 확장된 경우 자식들 추가
    if (isExpanded) {
      // 실제 자식 노드들
      if (hasChildNodes && item.children) {
        const childItems = flattenTree(item.children, expandedKeys, depth + 1);
        result.push(...childItems);
      }

      // 가상 자식 노드들 (Collection 컴포넌트)
      if (hasToggleChildren) {
        const children = item.props?.children as ButtonItem[];
        children.forEach((child, index) => {
          result.push({
            item,
            depth: depth + 1,
            hasChildren: false,
            isExpanded: false,
            virtualChildType: "toggle",
            virtualChildIndex: index,
            virtualChildData: child,
          });
        });
      }
      if (hasCheckboxChildren) {
        const children = item.props?.children as CheckboxItem[];
        children.forEach((child, index) => {
          result.push({
            item,
            depth: depth + 1,
            hasChildren: false,
            isExpanded: false,
            virtualChildType: "checkbox",
            virtualChildIndex: index,
            virtualChildData: child,
          });
        });
      }
      if (hasRadioChildren) {
        const children = item.props?.children as RadioItem[];
        children.forEach((child, index) => {
          result.push({
            item,
            depth: depth + 1,
            hasChildren: false,
            isExpanded: false,
            virtualChildType: "radio",
            virtualChildIndex: index,
            virtualChildData: child,
          });
        });
      }
      if (hasListBoxChildren || hasGridListChildren || hasSelectChildren || hasComboBoxChildren) {
        const children = item.props?.children as ListItem[];
        const type = hasListBoxChildren ? "listbox" : hasGridListChildren ? "gridlist" : hasSelectChildren ? "select" : "combobox";
        children.forEach((child, index) => {
          result.push({
            item,
            depth: depth + 1,
            hasChildren: false,
            isExpanded: false,
            virtualChildType: type,
            virtualChildIndex: index,
            virtualChildData: child,
          });
        });
      }
      if (hasTreeChildren) {
        const children = item.props?.children as TreeItemType[];
        children.forEach((child, index) => {
          result.push({
            item,
            depth: depth + 1,
            hasChildren: child.children && child.children.length > 0,
            isExpanded: false,
            virtualChildType: "tree",
            virtualChildIndex: index,
            virtualChildData: child,
          });
        });
      }
    }
  }

  return result;
}

// ============================================
// Memoized Tree Item Component
// ============================================

interface TreeItemRowProps {
  flatItem: FlattenedTreeItem;
  selectedElementId: string | null;
  selectedTab?: { parentId: string; tabIndex: number } | null;
  onItemClick: (element: Element) => void;
  onItemDelete: (element: Element) => Promise<void>;
  onToggleExpand: (key: string) => void;
  onSelectTabElement?: (parentId: string, props: ElementProps, index: number) => void;
}

const TreeItemRow = React.memo(function TreeItemRow({
  flatItem,
  selectedElementId,
  selectedTab,
  onItemClick,
  onItemDelete,
  onToggleExpand,
  onSelectTabElement,
}: TreeItemRowProps) {
  const { item, depth, hasChildren, isExpanded, virtualChildType, virtualChildIndex, virtualChildData } = flatItem;

  // 가상 자식 노드 렌더링
  if (virtualChildType && virtualChildIndex !== undefined) {
    const isSelected = selectedTab?.parentId === item.id && selectedTab?.tabIndex === virtualChildIndex;

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelectTabElement?.(item.id, item.props as ElementProps, virtualChildIndex);
    };

    let label = "";
    let icon = <Box color={ICON_EDIT_PROPS.color} strokeWidth={ICON_EDIT_PROPS.stroke} size={ICON_EDIT_PROPS.size} style={{ padding: "2px" }} />;

    switch (virtualChildType) {
      case "toggle":
        label = (virtualChildData as ButtonItem).title || `Button ${virtualChildIndex + 1}`;
        break;
      case "checkbox":
        label = (virtualChildData as CheckboxItem).label || `Checkbox ${virtualChildIndex + 1}`;
        break;
      case "radio":
        label = (virtualChildData as RadioItem).label || `Radio ${virtualChildIndex + 1}`;
        break;
      case "listbox":
      case "gridlist":
        label = (virtualChildData as ListItem).label || `Item ${virtualChildIndex + 1}`;
        break;
      case "select":
      case "combobox":
        label = (virtualChildData as ListItem).label || `Option ${virtualChildIndex + 1}`;
        break;
      case "tree": {
        const treeItem = virtualChildData as TreeItemType;
        label = treeItem.title;
        icon = treeItem.children && treeItem.children.length > 0
          ? <Folder color={ICON_EDIT_PROPS.color} strokeWidth={ICON_EDIT_PROPS.stroke} size={ICON_EDIT_PROPS.size} />
          : <File color={ICON_EDIT_PROPS.color} strokeWidth={ICON_EDIT_PROPS.stroke} size={ICON_EDIT_PROPS.size} />;
        break;
      }
    }

    return (
      <div
        data-depth={depth}
        data-has-children={false}
        onClick={handleClick}
        className="element"
      >
        <div className={`elementItem ${isSelected ? "active" : ""}`}>
          <div className="elementItemIndent" style={{ width: depth > 0 ? `${depth * 8}px` : "0px" }}></div>
          <div className="elementItemIcon">{icon}</div>
          <div className="elementItemLabel">{label}</div>
          <div className="elementItemActions"></div>
        </div>
      </div>
    );
  }

  // 일반 트리 아이템 렌더링
  const element: Element = {
    id: item.id,
    tag: item.tag,
    parent_id: item.parent_id || null,
    order_num: item.order_num,
    props: item.props as ElementProps,
    deleted: item.deleted,
    dataBinding: item.dataBinding as DataBinding | undefined,
    page_id: "",
    created_at: "",
    updated_at: "",
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onItemClick(element);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggleExpand(item.id);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onItemDelete(element);
  };

  // 라벨 결정
  let label = item.tag;
  if (item.tag === "Tab" && item.props) {
    label = `Tab: ${(item.props as ElementProps).title || "Untitled"}`;
  } else if (item.tag === "Panel" && item.props) {
    label = `Panel: ${(item.props as ElementProps).title || "Untitled"}`;
  } else if (item.tag === "TableHeader") {
    label = "thead";
  } else if (item.tag === "TableBody") {
    label = "tbody";
  } else if (item.tag === "Column" && item.props) {
    label = `th: ${(item.props as ElementProps).children || "Column"}`;
  } else if (item.tag === "Row") {
    label = "tr";
  } else if (item.tag === "Cell" && item.props) {
    label = `td: ${(item.props as ElementProps).children || "Cell"}`;
  }

  return (
    <div
      data-depth={depth}
      data-has-children={hasChildren}
      onClick={handleClick}
      className="element"
    >
      <div className={`elementItem ${selectedElementId === item.id ? "active" : ""}`}>
        <div className="elementItemIndent" style={{ width: depth > 0 ? `${depth * 8}px` : "0px" }}></div>
        <div className="elementItemIcon" onClick={handleToggle}>
          {hasChildren ? (
            <ChevronRight
              color={ICON_EDIT_PROPS.color}
              strokeWidth={ICON_EDIT_PROPS.stroke}
              size={ICON_EDIT_PROPS.size}
              style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
            />
          ) : (
            <Box
              color={ICON_EDIT_PROPS.color}
              strokeWidth={ICON_EDIT_PROPS.stroke}
              size={ICON_EDIT_PROPS.size}
              style={{ padding: "2px" }}
            />
          )}
        </div>
        <div className="elementItemLabel">{label}</div>
        <div className="elementItemActions">
          <button className="iconButton" aria-label="Settings">
            <Settings2
              color={ICON_EDIT_PROPS.color}
              strokeWidth={ICON_EDIT_PROPS.stroke}
              size={ICON_EDIT_PROPS.size}
            />
          </button>
          {item.tag !== "body" && (
            <button className="iconButton" aria-label={`Delete ${item.tag}`} onClick={handleDelete}>
              <Trash
                color={ICON_EDIT_PROPS.color}
                strokeWidth={ICON_EDIT_PROPS.stroke}
                size={ICON_EDIT_PROPS.size}
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// ============================================
// Main Component
// ============================================

export const VirtualizedLayerTree = React.memo(function VirtualizedLayerTree({
  tree,
  expandedKeys,
  selectedElementId,
  selectedTab,
  onItemClick,
  onItemDelete,
  onToggleExpand,
  onSelectTabElement,
  containerHeight = 400,
}: VirtualizedLayerTreeProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // 트리를 flat 리스트로 변환
  const flattenedItems = useMemo(
    () => flattenTree(tree, expandedKeys),
    [tree, expandedKeys]
  );

  // Virtualizer 설정
  // eslint-disable-next-line react-hooks/incompatible-library -- useVirtualizer()는 React Compiler에서 memoize 불가
  const virtualizer = useVirtualizer({
    count: flattenedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28, // 각 아이템의 예상 높이 (px)
    overscan: 5, // 화면 밖에 미리 렌더링할 아이템 수
  });

  const virtualItems = virtualizer.getVirtualItems();

  // 아이템이 적은 경우 일반 렌더링 (가상화 오버헤드 방지)
  // 🚀 Performance: 컨테이너 wrapper 제거하여 기존 renderElementTree와 동일한 DOM 구조 유지
  if (flattenedItems.length < 50) {
    return (
      <>
        {flattenedItems.map((flatItem) => (
          <TreeItemRow
            key={flatItem.virtualChildType ? `${flatItem.item.id}-${flatItem.virtualChildType}-${flatItem.virtualChildIndex}` : flatItem.item.id}
            flatItem={flatItem}
            selectedElementId={selectedElementId}
            selectedTab={selectedTab}
            onItemClick={onItemClick}
            onItemDelete={onItemDelete}
            onToggleExpand={onToggleExpand}
            onSelectTabElement={onSelectTabElement}
          />
        ))}
      </>
    );
  }

  return (
    <div
      ref={parentRef}
      className="virtualized-tree-container"
      style={{ height: containerHeight, overflow: "auto" }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((virtualRow) => {
          const flatItem = flattenedItems[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <TreeItemRow
                flatItem={flatItem}
                selectedElementId={selectedElementId}
                selectedTab={selectedTab}
                onItemClick={onItemClick}
                onItemDelete={onItemDelete}
                onToggleExpand={onToggleExpand}
                onSelectTabElement={onSelectTabElement}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default VirtualizedLayerTree;
