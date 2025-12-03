/**
 * TreeNodeItem - 메모이제이션된 트리 노드 아이템 컴포넌트
 *
 * 🚀 Performance Optimization:
 * - React.memo로 불필요한 재렌더 방지
 * - 부모 트리 변경 시에도 해당 노드만 영향받음
 */

import React, { memo, useCallback } from "react";
import { Settings2, Trash, ChevronRight, Box } from "lucide-react";
import type { ElementProps } from "../../../types/integrations/supabase.types";

interface TreeNodeItemProps {
  /** 노드 ID */
  id: string;
  /** 노드 라벨 */
  label: string;
  /** 노드 태그 (Element의 경우) */
  tag?: string;
  /** 노드 props (Element의 경우) */
  props?: Record<string, unknown>;
  /** 트리 깊이 */
  depth: number;
  /** 자식 노드 존재 여부 */
  hasChildren: boolean;
  /** 펼쳐진 상태 */
  isExpanded: boolean;
  /** 선택된 상태 */
  isSelected: boolean;
  /** 삭제 가능 여부 */
  canDelete: boolean;
  /** 클릭 핸들러 */
  onClick: () => void;
  /** 펼치기/접기 핸들러 */
  onToggle: () => void;
  /** 삭제 핸들러 */
  onDelete: () => Promise<void>;
  /** 자식 노드 렌더 함수 */
  children?: React.ReactNode;
}

// 아이콘 설정 (상수로 분리하여 재생성 방지)
const ICON_PROPS = {
  color: "#171717",
  strokeWidth: 1,
  size: 16,
} as const;

/**
 * 태그에 따른 라벨 포맷팅
 */
function formatLabel(
  tag: string | undefined,
  label: string,
  props?: Record<string, unknown>
): string {
  if (!tag) return label;

  switch (tag) {
    case "Tab":
      return `Tab: ${(props as ElementProps)?.title || "Untitled"}`;
    case "Panel":
      return `Panel: ${(props as ElementProps)?.title || "Untitled"}`;
    case "TableHeader":
      return "thead";
    case "TableBody":
      return "tbody";
    case "Column":
      return `th: ${(props as ElementProps)?.children || "Column"}`;
    case "Row":
      return "tr";
    case "Cell":
      return `td: ${(props as ElementProps)?.children || "Cell"}`;
    default:
      return label;
  }
}

/**
 * 메모이제이션된 트리 노드 아이템 컴포넌트
 */
export const TreeNodeItem = memo(function TreeNodeItem({
  id,
  label,
  tag,
  props,
  depth,
  hasChildren,
  isExpanded,
  isSelected,
  canDelete,
  onClick,
  onToggle,
  onDelete,
  children,
}: TreeNodeItemProps) {
  // 삭제 핸들러 메모이제이션
  const handleDelete = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      await onDelete();
    },
    [onDelete]
  );

  // 토글 핸들러 메모이제이션
  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasChildren) {
        onToggle();
      }
    },
    [hasChildren, onToggle]
  );

  // 클릭 핸들러 메모이제이션
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick();
    },
    [onClick]
  );

  const displayLabel = formatLabel(tag, label, props);

  return (
    <div
      key={id}
      data-depth={depth}
      data-has-children={hasChildren}
      onClick={handleClick}
      className="element"
    >
      <div className={`elementItem ${isSelected ? "active" : ""}`}>
        <div
          className="elementItemIndent"
          style={{ width: depth > 0 ? `${depth * 8}px` : "0px" }}
        />
        <div className="elementItemIcon" onClick={handleToggle}>
          {hasChildren ? (
            <ChevronRight
              color={ICON_PROPS.color}
              strokeWidth={ICON_PROPS.strokeWidth}
              size={ICON_PROPS.size}
              style={{
                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              }}
            />
          ) : (
            <Box
              color={ICON_PROPS.color}
              strokeWidth={ICON_PROPS.strokeWidth}
              size={ICON_PROPS.size}
              style={{ padding: "2px" }}
            />
          )}
        </div>
        <div className="elementItemLabel">{displayLabel}</div>
        <div className="elementItemActions">
          <button className="iconButton" aria-label="Settings">
            <Settings2
              color={ICON_PROPS.color}
              strokeWidth={ICON_PROPS.strokeWidth}
              size={ICON_PROPS.size}
            />
          </button>
          {canDelete && (
            <button
              className="iconButton"
              aria-label={`Delete ${displayLabel}`}
              onClick={handleDelete}
            >
              <Trash
                color={ICON_PROPS.color}
                strokeWidth={ICON_PROPS.strokeWidth}
                size={ICON_PROPS.size}
              />
            </button>
          )}
        </div>
      </div>
      {isExpanded && children}
    </div>
  );
});

// 컴포넌트 비교 함수 (커스텀 shouldUpdate 로직)
TreeNodeItem.displayName = "TreeNodeItem";

export default TreeNodeItem;
