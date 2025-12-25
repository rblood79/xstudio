import { useMemo, useEffect, useCallback } from "react";
import { useTreeData } from "react-stately";
import { buildTreeFromElements } from "../../../../utils/treeUtils";
import type { Element } from "../../../../../types/core/store.types";
import type { ElementTreeItem } from "../../../../../types/builder/stately.types";
import type { ElementProps } from "../../../../../types/integrations/supabase.types";
import { useStore } from "../../../../stores";
import {
  childrenAs,
  type ButtonItem,
  type CheckboxItem,
  type RadioItem,
  type ListItem,
  type TreeItem as TreeItemType,
} from "../../../../sidebar/treeHelpers";
import type { LayerTreeNode, VirtualChildType } from "./types";

export function useLayerTreeData(elements: Element[]) {
  const elementTree = useMemo(
    () => buildTreeFromElements(elements),
    [elements]
  );

  const treeNodes = useMemo(
    () => convertToLayerTreeNodes(elementTree, elements),
    [elementTree, elements]
  );

  const tree = useTreeData<LayerTreeNode>({
    initialItems: treeNodes,
    getKey: (item) => item.id,
    getChildren: (item) => item.children ?? [],
  });

  useEffect(() => {
    syncTreeData(tree, treeNodes);
  }, [tree, treeNodes]);

  const batchUpdateElements = useStore((state) => state.batchUpdateElements);
  const syncToStore = useCallback(
    (updates: Array<{ id: string; parentId?: string | null; orderNum?: number }>) => {
      if (updates.length === 0) return;
      batchUpdateElements(
        updates.map((update) => ({
          elementId: update.id,
          updates: {
            ...(update.parentId !== undefined && { parent_id: update.parentId }),
            ...(update.orderNum !== undefined && { order_num: update.orderNum }),
          },
        }))
      );
    },
    [batchUpdateElements]
  );

  return { tree, treeNodes, syncToStore };
}

function syncTreeData(tree: unknown, items: LayerTreeNode[]) {
  const treeData = tree as {
    setItems?: (nextItems: LayerTreeNode[]) => void;
  };
  if (!treeData.setItems) return;
  treeData.setItems(items);
}

function convertToLayerTreeNodes(
  tree: ElementTreeItem[],
  elements: Element[],
  depth = 0
): LayerTreeNode[] {
  const elementsMap = new Map(elements.map((el) => [el.id, el]));

  return tree.flatMap((item): LayerTreeNode[] => {
    const element = elementsMap.get(item.id);
    if (!element) return [];

    const childNodes = item.children
      ? convertToLayerTreeNodes(item.children, elements, depth + 1)
      : [];
    const virtualChildren = getVirtualChildren(item, depth + 1, element);
    const children = [...childNodes, ...virtualChildren];

    const baseNode: LayerTreeNode = {
      id: item.id,
      name: getDisplayName(item),
      tag: item.tag,
      parentId: item.parent_id ?? null,
      orderNum: item.order_num ?? 0,
      depth,
      hasChildren: children.length > 0,
      isLeaf: children.length === 0,
      element,
      children,
    };

    return [baseNode];
  });
}

function getDisplayName(item: ElementTreeItem): string {
  const props = item.props as ElementProps | undefined;

  if (item.tag === "Tab") {
    return `Tab: ${props?.title || "Untitled"}`;
  }
  if (item.tag === "Panel") {
    return `Panel: ${props?.title || "Untitled"}`;
  }
  if (item.tag === "TableHeader") return "thead";
  if (item.tag === "TableBody") return "tbody";
  if (item.tag === "Column") {
    return `th: ${props?.children || "Column"}`;
  }
  if (item.tag === "Row") return "tr";
  if (item.tag === "Cell") {
    return `td: ${props?.children || "Cell"}`;
  }

  return item.tag;
}

function getVirtualChildren(
  item: ElementTreeItem,
  depth: number,
  element: Element
): LayerTreeNode[] {
  const props = item.props as ElementProps | undefined;
  if (!props) return [];

  const makeNode = (
    type: VirtualChildType,
    index: number,
    label: string,
    data: unknown
  ): LayerTreeNode => ({
    id: `${item.id}::${type}:${index}`,
    name: label,
    tag: item.tag,
    parentId: item.id,
    orderNum: index,
    depth,
    hasChildren: false,
    isLeaf: true,
    element,
    virtualChildType: type,
    virtualChildIndex: index,
    virtualChildData: data,
  });

  if (item.tag === "ToggleButtonGroup") {
    const children = childrenAs<ButtonItem>(props.children);
    return children.map((child, index) =>
      makeNode(
        "toggle",
        index,
        child.title || `Button ${index + 1}`,
        child
      )
    );
  }

  if (item.tag === "CheckboxGroup") {
    const children = childrenAs<CheckboxItem>(props.children);
    return children.map((child, index) =>
      makeNode(
        "checkbox",
        index,
        child.label || `Checkbox ${index + 1}`,
        child
      )
    );
  }

  if (item.tag === "RadioGroup") {
    const children = childrenAs<RadioItem>(props.children);
    return children.map((child, index) =>
      makeNode(
        "radio",
        index,
        child.label || `Radio ${index + 1}`,
        child
      )
    );
  }

  if (item.tag === "ListBox") {
    const children = childrenAs<ListItem>(props.children);
    return children.map((child, index) =>
      makeNode("listbox", index, child.label || `Item ${index + 1}`, child)
    );
  }

  if (item.tag === "GridList") {
    const children = childrenAs<ListItem>(props.children);
    return children.map((child, index) =>
      makeNode("gridlist", index, child.label || `Item ${index + 1}`, child)
    );
  }

  if (item.tag === "Select") {
    const children = childrenAs<ListItem>(props.children);
    return children.map((child, index) =>
      makeNode("select", index, child.label || `Option ${index + 1}`, child)
    );
  }

  if (item.tag === "ComboBox") {
    const children = childrenAs<ListItem>(props.children);
    return children.map((child, index) =>
      makeNode("combobox", index, child.label || `Option ${index + 1}`, child)
    );
  }

  if (item.tag === "Tree") {
    const children = childrenAs<TreeItemType>(props.children);
    return children.map((child, index) =>
      makeNode("tree", index, child.title || `Item ${index + 1}`, child)
    );
  }

  return [];
}
