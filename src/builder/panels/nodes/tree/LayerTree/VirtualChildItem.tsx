import React from "react";
import { TreeItem, TreeItemContent } from "react-aria-components";
import { Box, Folder, File } from "lucide-react";
import type { ElementProps } from "../../../../../types/integrations/supabase.types";
import { ICON_EDIT_PROPS, type TreeItem as TreeItemType } from "../../../../sidebar/treeHelpers";
import type { LayerTreeNode } from "./types";

interface VirtualChildItemProps {
  node: LayerTreeNode;
  selectedTab?: { parentId: string; tabIndex: number } | null;
  onSelectTabElement?: (
    parentId: string,
    props: ElementProps,
    index: number
  ) => void;
}

export function VirtualChildItem({
  node,
  selectedTab,
  onSelectTabElement,
}: VirtualChildItemProps) {
  const { virtualChildType, virtualChildIndex, virtualChildData, depth } = node;

  if (!virtualChildType || virtualChildIndex === undefined) return null;

  const isSelected =
    selectedTab?.parentId === node.parentId &&
    selectedTab?.tabIndex === virtualChildIndex;

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!onSelectTabElement) return;
    if (!node.parentId) return;
    onSelectTabElement(
      node.parentId,
      node.element.props as ElementProps,
      virtualChildIndex
    );
  };

  const icon = getVirtualChildIcon(virtualChildType, virtualChildData);

  return (
    <TreeItem id={node.id} textValue={node.name} isDisabled>
      <TreeItemContent>
        {({ isFocusVisible }) => (
          <div
            className={`elementItem ${isSelected ? "active" : ""} ${
              isFocusVisible ? "focused" : ""
            }`}
            onClick={handleClick}
            aria-disabled="true"
          >
            <div
              className="elementItemIndent"
              style={{ width: depth > 0 ? `${depth * 8}px` : "0px" }}
            />
            <div className="elementItemIcon">{icon}</div>
            <div className="elementItemLabel">{node.name}</div>
            <div className="elementItemActions" />
          </div>
        )}
      </TreeItemContent>
    </TreeItem>
  );
}

function getVirtualChildIcon(type: LayerTreeNode["virtualChildType"], data: unknown) {
  if (type === "tree") {
    const treeItem = data as TreeItemType;
    return treeItem.children && treeItem.children.length > 0 ? (
      <Folder
        color={ICON_EDIT_PROPS.color}
        strokeWidth={ICON_EDIT_PROPS.stroke}
        size={ICON_EDIT_PROPS.size}
      />
    ) : (
      <File
        color={ICON_EDIT_PROPS.color}
        strokeWidth={ICON_EDIT_PROPS.stroke}
        size={ICON_EDIT_PROPS.size}
      />
    );
  }

  return (
    <Box
      color={ICON_EDIT_PROPS.color}
      strokeWidth={ICON_EDIT_PROPS.stroke}
      size={ICON_EDIT_PROPS.size}
      style={{ padding: "2px" }}
    />
  );
}
