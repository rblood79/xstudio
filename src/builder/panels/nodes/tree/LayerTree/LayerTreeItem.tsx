import React from "react";
import { Collection, TreeItem } from "react-aria-components";
import type { Element } from "../../../../../types/core/store.types";
import type { ElementProps } from "../../../../../types/integrations/supabase.types";
import { LayerTreeContent } from "./LayerTreeContent";
import { VirtualChildItem } from "./VirtualChildItem";
import type { LayerTreeNode } from "./types";

interface LayerTreeItemProps {
  node: LayerTreeNode;
  onDelete: (element: Element) => Promise<void>;
  selectedTab?: { parentId: string; tabIndex: number } | null;
  onSelectTabElement?: (
    parentId: string,
    props: ElementProps,
    index: number
  ) => void;
}

export function LayerTreeItem({
  node,
  onDelete,
  selectedTab,
  onSelectTabElement,
}: LayerTreeItemProps) {
  if (node.virtualChildType) {
    return (
      <VirtualChildItem
        node={node}
        selectedTab={selectedTab}
        onSelectTabElement={onSelectTabElement}
      />
    );
  }

  const children = node.children ?? [];

  return (
    <TreeItem id={node.id} textValue={node.name}>
      <LayerTreeContent node={node} onDelete={onDelete} />
      {children.length > 0 ? (
        <Collection items={children}>
          {(child) => (
            <LayerTreeItem
              node={child}
              onDelete={onDelete}
              selectedTab={selectedTab}
              onSelectTabElement={onSelectTabElement}
            />
          )}
        </Collection>
      ) : null}
    </TreeItem>
  );
}
