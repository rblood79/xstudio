import React from "react";
import {
  Button,
  Collection,
  TreeItem,
  TreeItemContent,
} from "react-aria-components";
import {
  ChevronRight,
  FileText,
  Home,
  Settings2,
  Trash,
  GripVertical,
} from "lucide-react";
import { ICON_EDIT_PROPS } from "../../../../sidebar/treeHelpers";
import type { Page } from "../../../../../types/builder/unified.types";
import type { PageTreeNode } from "./types";

interface PageTreeItemProps {
  node: PageTreeNode;
  onDelete: (page: Page) => Promise<void>;
  onSettings?: (page: Page) => void;
}

export function PageTreeItem({
  node,
  onDelete,
  onSettings,
}: PageTreeItemProps) {
  const children = node.children ?? [];

  return (
    <TreeItem id={node.id} textValue={node.name}>
      <PageTreeContent
        node={node}
        onDelete={onDelete}
        onSettings={onSettings}
      />
      {children.length > 0 ? (
        <Collection items={children}>
          {(child) => (
            <PageTreeItem
              node={child}
              onDelete={onDelete}
              onSettings={onSettings}
            />
          )}
        </Collection>
      ) : null}
    </TreeItem>
  );
}

interface PageTreeContentProps {
  node: PageTreeNode;
  onDelete: (page: Page) => Promise<void>;
  onSettings?: (page: Page) => void;
}

function PageTreeContent({ node, onDelete, onSettings }: PageTreeContentProps) {
  const { depth, hasChildren, isRoot, page, name, isDraggable } = node;

  return (
    <TreeItemContent>
      {({ isExpanded, isFocusVisible, isSelected }) => (
        <div
          className={`pageItem ${isSelected ? "active" : ""} ${
            isFocusVisible ? "focused" : ""
          }`}
        >
          <div
            className="pageItemIndent"
            style={{ width: depth > 0 ? `${depth * 8}px` : "0px" }}
          />
          <div className="pageItemIcon">
            {hasChildren ? (
              <Button
                slot="chevron"
                className="page-expand-button"
                aria-label={`${isExpanded ? "Collapse" : "Expand"} ${name}`}
              >
                <ChevronRight
                  color={ICON_EDIT_PROPS.color}
                  strokeWidth={ICON_EDIT_PROPS.stroke}
                  size={ICON_EDIT_PROPS.size}
                  data-chevron="true"
                />
              </Button>
            ) : isRoot ? (
              <Home
                color={ICON_EDIT_PROPS.color}
                strokeWidth={ICON_EDIT_PROPS.stroke}
                size={ICON_EDIT_PROPS.size}
                style={{ padding: "2px" }}
              />
            ) : (
              <FileText
                color={ICON_EDIT_PROPS.color}
                strokeWidth={ICON_EDIT_PROPS.stroke}
                size={ICON_EDIT_PROPS.size}
                style={{ padding: "2px" }}
              />
            )}
          </div>
          <div className="pageItemLabel">{name}</div>
          {node.slug && <div className="pageItemSlug">/{node.slug}</div>}
          <div className="pageItemActions">
            {/* react-aria DnD requires slot="drag" on all items for a11y */}
            <Button
              slot="drag"
              className={`iconButton page-drag-handle${!isDraggable ? " page-drag-handle--hidden" : ""}`}
              aria-label={`Drag ${name}`}
              aria-hidden={!isDraggable}
              style={{ pointerEvents: isDraggable ? "auto" : "none" }}
              isDisabled={!isDraggable}
            >
              <GripVertical
                color={ICON_EDIT_PROPS.color}
                strokeWidth={ICON_EDIT_PROPS.stroke}
                size={ICON_EDIT_PROPS.size}
              />
            </Button>
            {onSettings && (
              <Button
                className="iconButton"
                aria-label={`Settings for ${name}`}
                onPress={() => onSettings(page)}
              >
                <Settings2
                  color={ICON_EDIT_PROPS.color}
                  strokeWidth={ICON_EDIT_PROPS.stroke}
                  size={ICON_EDIT_PROPS.size}
                />
              </Button>
            )}
            {!isRoot && (
              <Button
                className="iconButton"
                aria-label={`Delete ${name}`}
                onPress={() => onDelete(page)}
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
