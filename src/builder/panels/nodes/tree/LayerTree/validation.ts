import type { Key } from "react-stately";
import type { LayerTreeNode } from "./types";

type TreeDataLike = {
  getItem: (key: Key | string) => { value: LayerTreeNode } | null | undefined;
};

export function isValidDrop(
  draggedId: string,
  targetId: string,
  dropPosition: "before" | "after" | "on",
  tree: TreeDataLike
): { valid: boolean; reason?: string } {
  const draggedNode = tree.getItem(draggedId)?.value;
  const targetNode = tree.getItem(targetId)?.value;

  if (!draggedNode || !targetNode) {
    return { valid: false, reason: "invalid-node" };
  }

  if (draggedId === targetId) {
    return { valid: false, reason: "self-drop" };
  }

  if (isDescendant(draggedId, targetId, tree)) {
    return { valid: false, reason: "descendant-drop" };
  }

  if (draggedNode.virtualChildType || targetNode.virtualChildType) {
    return { valid: false, reason: "virtual-child" };
  }

  if (draggedNode.tag === "body") {
    return { valid: false, reason: "body-immutable" };
  }

  if (targetNode.depth === 0 && dropPosition !== "on") {
    return { valid: false, reason: "root-level-denied" };
  }

  const draggedElement = draggedNode.element;
  const targetElement = targetNode.element;
  if (
    draggedElement.page_id !== targetElement.page_id ||
    draggedElement.layout_id !== targetElement.layout_id
  ) {
    return { valid: false, reason: "context-mismatch" };
  }

  return { valid: true };
}

function isDescendant(
  ancestorId: string,
  descendantId: string,
  tree: TreeDataLike
): boolean {
  let current = tree.getItem(descendantId);
  while (current) {
    if (current.value.parentId === ancestorId) return true;
    current = current.value.parentId
      ? tree.getItem(current.value.parentId)
      : null;
  }
  return false;
}
