import React, { useCallback, useMemo, useRef, useState } from "react";
import { DropIndicator, Tree, useDragAndDrop } from "react-aria-components";
import type { Key } from "react-stately";
import type { PageTreeNode, PageTreeProps } from "./types";
import { usePageTreeData } from "./usePageTreeData";
import { calculatePageMoveUpdates } from "./usePageTreeDnd";
import { isValidPageDrop } from "./validation";
import { PageTreeItem } from "./PageTreeItem";
import "./PageTree.css";

export function PageTree({
  pages,
  selectedPageId,
  expandedKeys,
  onExpandedChange,
  onPageSelect,
  onPageDelete,
  onPageSettings,
}: PageTreeProps) {
  const { tree, treeNodes, syncToStore } = usePageTreeData(pages);
  const [internalExpandedKeys, setInternalExpandedKeys] = useState<Set<Key>>(
    new Set()
  );
  const lastDraggedKeysRef = useRef<Set<Key> | null>(null);

  // 노드 맵 생성 (빠른 조회용)
  const nodeMap = useMemo(() => {
    const map = new Map<string, PageTreeNode>();
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
      onExpandedChange?.(next);
    },
    [expandedKeys, onExpandedChange]
  );

  const { dragAndDropHooks } = useDragAndDrop({
    getItems: (keys) => {
      lastDraggedKeysRef.current = keys;
      return [...keys].flatMap((key) => {
        const node = treeData.getItem(key)?.value;
        // Home 페이지(isRoot)는 드래그 금지
        if (!node || node.isRoot) return [];
        return [
          {
            "application/x-page-tree-item": JSON.stringify({ id: key }),
            "text/plain": node.name || "",
          },
        ];
      });
    },
    acceptedDragTypes: ["application/x-page-tree-item"],
    onMove(e) {
      const { keys, target } = e;
      if (!target || target.type !== "item") return;

      // 모든 드래그 키에 대해 유효성 검사
      for (const key of keys) {
        const { valid } = isValidPageDrop(
          String(key),
          String(target.key),
          target.dropPosition,
          treeData
        );
        if (!valid) return;
      }

      const updates = calculatePageMoveUpdates({
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
            className="page-drop-indicator page-drop-indicator--hidden"
          />
        );
      }

      let isInvalid = false;
      const draggedKeys = lastDraggedKeysRef.current;
      if (draggedKeys) {
        for (const key of draggedKeys) {
          const { valid } = isValidPageDrop(
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
          className={`page-drop-indicator${
            isInvalid ? " page-drop-indicator--hidden" : ""
          }`}
        />
      );
    },
  });

  return (
    <Tree
      aria-label="Pages"
      items={treeNodes}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={selectedPageId ? new Set([selectedPageId]) : new Set()}
      expandedKeys={resolvedExpandedKeys}
      onExpandedChange={handleExpandedChange}
      onSelectionChange={(keys) => {
        if (keys === "all") return;
        const key = [...keys][0] as string;
        const node = nodeMap.get(key);
        if (node) {
          onPageSelect(node.page);
        }
      }}
      dragAndDropHooks={dragAndDropHooks}
      className="page-tree"
    >
      {(node) => (
        <PageTreeItem
          key={node.id}
          node={node}
          onDelete={onPageDelete}
          onSettings={onPageSettings}
        />
      )}
    </Tree>
  );
}
