import React, { useCallback, useMemo, useState } from "react";
import type { Key } from "react-stately";
import { TreeBase } from "../TreeBase";
import type { TreeItemState } from "../TreeBase/types";
import type { LayerTreeNode, LayerTreeProps } from "./types";
import { useLayerTreeData } from "./useLayerTreeData";
import { calculateMoveUpdates } from "./useLayerTreeDnd";
import { isValidDrop } from "./validation";
import { LayerTreeItemContent } from "./LayerTreeItemContent";

/**
 * LayerTree - TreeBase 기반 구현
 *
 * 도메인 로직:
 * - LayerTreeNode 변환 (useLayerTreeData)
 * - VirtualChild 처리
 * - Validation (isValidDrop)
 * - Store 동기화 (syncToStore)
 */
export function LayerTree({
  elements,
  selectedElementId,
  selectedTab,
  expandedKeys,
  onExpandedChange,
  onItemClick,
  onItemDelete,
  onSelectTabElement,
}: LayerTreeProps) {
  const { tree, treeNodes, syncToStore } = useLayerTreeData(elements);
  const [internalExpandedKeys, setInternalExpandedKeys] = useState<Set<Key>>(
    new Set()
  );

  // VirtualChild 노드들을 disabled로 처리
  const disabledKeys = useMemo(() => {
    const keys = new Set<Key>();
    const stack = [...treeNodes];
    while (stack.length > 0) {
      const node = stack.shift();
      if (!node) continue;
      if (node.virtualChildType) {
        keys.add(node.id);
      }
      if (node.children && node.children.length > 0) {
        stack.unshift(...node.children);
      }
    }
    return keys;
  }, [treeNodes]);

  const resolvedExpandedKeys = expandedKeys ?? internalExpandedKeys;

  const handleExpandedChange = useCallback(
    (keys: Set<Key>) => {
      if (!expandedKeys) {
        setInternalExpandedKeys(keys);
      }
      onExpandedChange?.(keys as Set<string | number>);
    },
    [expandedKeys, onExpandedChange]
  );

  const handleSelectionChange = useCallback(
    (keys: Set<Key>) => {
      const key = [...keys][0] as string;
      if (!key) return;

      // treeNodes에서 노드 찾기
      const findNode = (nodes: LayerTreeNode[]): LayerTreeNode | undefined => {
        for (const node of nodes) {
          if (node.id === key) return node;
          if (node.children) {
            const found = findNode(node.children);
            if (found) return found;
          }
        }
        return undefined;
      };

      const node = findNode(treeNodes);
      if (!node || node.virtualChildType) return;
      onItemClick(node.element);
    },
    [treeNodes, onItemClick]
  );

  // DnD 유효성 검사 (클로저로 tree 캡처)
  const handleIsValidDrop = useCallback(
    (draggedKey: Key, targetKey: Key, position: "before" | "after" | "on") => {
      return isValidDrop(String(draggedKey), String(targetKey), position, {
        getItem: (key) => tree.getItem(key),
      }).valid;
    },
    [tree]
  );

  // DnD 이동 처리 (클로저로 tree, syncToStore 캡처)
  const handleMove = useCallback(
    (payload: {
      keys: Set<Key>;
      target: {
        key: Key;
        node: LayerTreeNode;
        dropPosition: "before" | "after" | "on";
      };
    }) => {
      const updates = calculateMoveUpdates({
        tree: {
          items: treeNodes,
          getItem: (key) => tree.getItem(key),
        },
        movedKeys: payload.keys,
        targetKey: payload.target.key,
        dropPosition: payload.target.dropPosition,
      });
      syncToStore(updates);
    },
    [tree, treeNodes, syncToStore]
  );

  // 드래그 가능 여부
  const canDrag = useCallback((node: LayerTreeNode) => {
    return !node.virtualChildType && node.tag !== "body";
  }, []);

  // 렌더링
  const renderContent = useCallback(
    (node: LayerTreeNode, state: TreeItemState) => (
      <LayerTreeItemContent
        node={node}
        state={state}
        onDelete={onItemDelete}
        selectedTab={selectedTab}
        onSelectTabElement={onSelectTabElement}
      />
    ),
    [onItemDelete, selectedTab, onSelectTabElement]
  );

  return (
    <TreeBase<LayerTreeNode>
      aria-label="Layers"
      items={treeNodes}
      getKey={(node) => node.id}
      getTextValue={(node) => node.name}
      renderContent={renderContent}
      selectedKeys={
        selectedElementId ? new Set([selectedElementId]) : new Set()
      }
      expandedKeys={resolvedExpandedKeys}
      disabledKeys={disabledKeys}
      onSelectionChange={handleSelectionChange}
      onExpandedChange={handleExpandedChange}
      dnd={{
        canDrag,
        isValidDrop: handleIsValidDrop,
        onMove: handleMove,
        dragType: "application/x-layer-tree-item",
      }}
      dropIndicatorClassName="layer-drop-indicator"
    />
  );
}
