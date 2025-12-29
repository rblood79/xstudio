import React from "react";
import { Button } from "react-aria-components";
import {
  ChevronRight,
  File,
  Home,
  Settings2,
  Trash,
  GripVertical,
} from "lucide-react";
import { ICON_EDIT_PROPS } from "../helpers";
import type { Page } from "../../../../../types/builder/unified.types";
import type { TreeItemState } from "../TreeBase/types";
import type { PageTreeNode } from "./types";

interface PageTreeItemContentProps {
  node: PageTreeNode;
  state: TreeItemState;
  onDelete: (page: Page) => Promise<void>;
  onSettings?: (page: Page) => void;
}

/**
 * PageTree 아이템 콘텐츠
 * - 일반 페이지: 드래그/삭제 가능
 * - Home 페이지: 드래그/삭제 불가
 */
export function PageTreeItemContent({
  node,
  state,
  onDelete,
  onSettings,
}: PageTreeItemContentProps) {
  const { depth, hasChildren, isRoot, page, name, isDraggable } = node;
  const { isSelected, isExpanded, isFocusVisible } = state;

  return (
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
          <File
            color={ICON_EDIT_PROPS.color}
            strokeWidth={ICON_EDIT_PROPS.stroke}
            size={ICON_EDIT_PROPS.size}
            style={{ padding: "2px" }}
          />
        )}
      </div>
      <div className="pageItemLabel">{name}</div>
      <div className="pageItemActions">
        {/* react-aria DnD requires slot="drag" on all items for a11y */}
        <Button
          slot="drag"
          className={`iconButton page-drag-handle${
            !isDraggable ? " page-drag-handle--hidden" : ""
          }`}
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
  );
}
