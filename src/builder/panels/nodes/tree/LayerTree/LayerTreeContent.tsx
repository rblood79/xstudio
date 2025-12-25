import React from "react";
import { Button, TreeItemContent } from "react-aria-components";
import { ChevronRight, Box, Settings2, Trash, GripVertical } from "lucide-react";
import { ICON_EDIT_PROPS } from "../../../../sidebar/treeHelpers";
import type { Element } from "../../../../../types/core/store.types";
import type { LayerTreeNode } from "./types";

interface LayerTreeContentProps {
  node: LayerTreeNode;
  onDelete: (element: Element) => Promise<void>;
}

export function LayerTreeContent({
  node,
  onDelete,
}: LayerTreeContentProps) {
  const { depth, hasChildren, tag, element, name } = node;

  return (
    <TreeItemContent>
      {({ isExpanded, isFocusVisible, isSelected }) => (
        <div
          className={`elementItem ${isSelected ? "active" : ""} ${
            isFocusVisible ? "focused" : ""
          }`}
        >
          <div
            className="elementItemIndent"
            style={{ width: depth > 0 ? `${depth * 8}px` : "0px" }}
          />
          <div className="elementItemIcon">
            {hasChildren ? (
              <Button
                slot="chevron"
                className="layer-expand-button"
                aria-label={`${isExpanded ? "Collapse" : "Expand"} ${name}`}
              >
                <ChevronRight
                  color={ICON_EDIT_PROPS.color}
                  strokeWidth={ICON_EDIT_PROPS.stroke}
                  size={ICON_EDIT_PROPS.size}
                  data-chevron="true"
                />
              </Button>
            ) : (
              <Box
                color={ICON_EDIT_PROPS.color}
                strokeWidth={ICON_EDIT_PROPS.stroke}
                size={ICON_EDIT_PROPS.size}
                style={{ padding: "2px" }}
              />
            )}
          </div>
          <div className="elementItemLabel">{name}</div>
          <div className="elementItemActions">
            <Button
              slot="drag"
              className="iconButton layer-drag-handle"
              aria-label={`Drag ${name}`}
              style={{ pointerEvents: "auto" }}
            >
              <GripVertical
                color={ICON_EDIT_PROPS.color}
                strokeWidth={ICON_EDIT_PROPS.stroke}
                size={ICON_EDIT_PROPS.size}
              />
            </Button>
            <Button className="iconButton" aria-label="Settings">
              <Settings2
                color={ICON_EDIT_PROPS.color}
                strokeWidth={ICON_EDIT_PROPS.stroke}
                size={ICON_EDIT_PROPS.size}
              />
            </Button>
            {tag !== "body" && (
              <Button
                className="iconButton"
                aria-label={`Delete ${tag}`}
                onPress={() => onDelete(element)}
              >
                <Trash
                  color={ICON_EDIT_PROPS.color}
                  strokeWidth={ICON_EDIT_PROPS.stroke}
                  size={ICON_EDIT_PROPS.size}
                />
              </Button>
            )}
          </div>
        </div>
      )}
    </TreeItemContent>
  );
}
