import React, { useCallback, useMemo, useRef, useState } from "react";
import { DropIndicator, Tree, useDragAndDrop } from "react-aria-components";
import type { Key } from "react-stately";
import type { LayerTreeNode, LayerTreeProps } from "./types";
import { useLayerTreeData } from "./useLayerTreeData";
import { calculateMoveUpdates } from "./useLayerTreeDnd";
import { isValidDrop } from "./validation";
import { LayerTreeItem } from "./LayerTreeItem";

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
  const lastDraggedKeysRef = useRef<Set<Key> | null>(null);
  const nodeMap = useMemo(() => {
    const map = new Map<string, LayerTreeNode>();
    const stack = [...treeNodes];
    while (stack.length > 0) {
      const node = stack.shift();
      if (!node) continue;
      map.set(node.id, node);
      if (node.children && node.children.length > 0) {
        stack.unshift(...node.children);
      }
    }
    return map;
  }, [treeNodes]);
  const treeData = {
    items: treeNodes,
    getItem: (key: Key | string) => tree.getItem(key),
  };

  const resolvedExpandedKeys = expandedKeys ?? internalExpandedKeys;

  const handleExpandedChange = useCallback(
    (keys: "all" | Set<Key>) => {
      if (keys === "all") return;
      const next = new Set(keys);
      if (!expandedKeys) {
        setInternalExpandedKeys(next);
      }
      onExpandedChange?.(next as Set<string | number>);
    },
    [expandedKeys, onExpandedChange]
  );

  const { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) => {
      lastDraggedKeysRef.current = keys;
      return [...keys].flatMap((key) => {
        const node = treeData.getItem(key)?.value;
        if (!node || node.virtualChildType) return [];
        return [
          {
            "application/x-layer-tree-item": JSON.stringify({ id: key }),
            "text/plain": node.name || "",
          },
        ];
      });
    },
    acceptedDragTypes: ["application/x-layer-tree-item"],
    onMove(e) {
      const { keys, target } = e;
      if (!target || target.type !== "item") return;
      for (const key of keys) {
        const { valid } = isValidDrop(
          String(key),
          String(target.key),
          target.dropPosition,
          treeData
        );
        if (!valid) return;
      }
      const updates = calculateMoveUpdates({
        tree: treeData,
        movedKeys: keys,
        targetKey: target.key,
        dropPosition: target.dropPosition,
      });
      syncToStore(updates);
    },
    renderDropIndicator(target) {
      if (target.type !== "item") {
        return (
          <DropIndicator
            target={target}
            className="layer-drop-indicator layer-drop-indicator--hidden"
          />
        );
      }
      const targetNode = treeData.getItem(target.key)?.value;
      if (targetNode?.virtualChildType) {
        return (
          <DropIndicator
            target={target}
            className="layer-drop-indicator layer-drop-indicator--hidden"
          />
        );
      }
      let isInvalid = false;
      const draggedKeys = lastDraggedKeysRef.current;
      if (draggedKeys) {
        for (const key of draggedKeys) {
          const { valid } = isValidDrop(
            String(key),
            String(target.key),
            target.dropPosition,
            treeData
          );
          if (!valid) {
            isInvalid = true;
            break;
          }
        }
      }
      return (
        <DropIndicator
          target={target}
          className={`layer-drop-indicator${
            isInvalid ? " layer-drop-indicator--hidden" : ""
          }`}
        />
      );
    },
  });

  return (
    <Tree
      aria-label="Layers"
      items={treeNodes}
      selectionMode="single"
      selectedKeys={
        selectedElementId ? new Set([selectedElementId]) : new Set()
      }
      expandedKeys={resolvedExpandedKeys}
      onExpandedChange={handleExpandedChange}
      onSelectionChange={(keys) => {
        if (keys === "all") return;
        const key = [...keys][0] as string;
        const node = nodeMap.get(key);
        if (!node || node.virtualChildType) return;
        onItemClick(node.element);
      }}
      dragAndDropHooks={dragAndDropHooks}
    >
      {(node) => (
        <LayerTreeItem
          key={node.id}
          node={node}
          onDelete={onItemDelete}
          selectedTab={selectedTab}
          onSelectTabElement={onSelectTabElement}
        />
      )}
    </Tree>
  );
}
