/**
 * FrameElementTree — frame 의 element 트리 렌더 + Layers 헤더 + Collapse All 버튼.
 *
 * ADR-911 Phase 2 PR-D2: FramesTab.tsx 의 `sidebar_elements` 영역 (Layers 헤더 +
 * tree 렌더 + placeholder) 추출.
 *
 * 본 컴포넌트는 프레젠테이션 전용 — element 선택 / 삭제 핸들러 구현은 부모 책임.
 * tree 데이터, expand 상태, 핸들러 모두 props 로 주입받아 결정적 UI 만 렌더.
 *
 * functional 동등 — 추출 전후 동작 차이 없음 (FramesTab 8/8 회귀 0).
 */

import React from "react";
import { Minimize, ChevronRight, Box, Trash, Settings2 } from "lucide-react";
import { iconProps } from "../../../../utils/ui/uiConstants";
import type { ElementProps } from "../../../../types/integrations/supabase.types";
import type { Element } from "../../../../types/core/store.types";
import type { ElementTreeItem } from "../../../../types/builder/stately.types";
import { withLegacyLayoutId } from "../../../../adapters/canonical/legacyElementFields";

export interface FrameElementTreeProps {
  /** 렌더할 element 트리 */
  tree: ElementTreeItem[];
  /** 현재 선택된 frame id (없으면 placeholder 표시 + element 의 legacy layout binding source) */
  frameId: string | null;
  /** 현재 선택된 element id (active 표시용) */
  selectedElementId: string | null;
  /** 펼쳐진 element id 집합 */
  expandedKeys: ReadonlySet<string>;
  /** 펼침/접힘 토글 */
  toggleKey: (id: string) => void;
  /** Collapse All 버튼 핸들러 */
  onCollapseAll: () => void;
  /** Element 항목 클릭 핸들러 */
  onElementClick: (element: Element) => void;
  /** Element 삭제 버튼 핸들러 */
  onElementDelete: (element: Element) => Promise<void> | void;
}

export function FrameElementTree({
  tree,
  frameId,
  selectedElementId,
  expandedKeys,
  toggleKey,
  onCollapseAll,
  onElementClick,
  onElementDelete,
}: FrameElementTreeProps) {
  const renderTree = (
    items: ElementTreeItem[],
    currentDepth: number,
  ): React.ReactNode => {
    if (items.length === 0) return null;

    return (
      <>
        {items.map((item) => {
          const hasChildNodes = item.children && item.children.length > 0;
          const isExpanded = expandedKeys.has(item.id);

          const element: Element = withLegacyLayoutId(
            {
              id: item.id,
              type: item.type,
              parent_id: item.parent_id || null,
              order_num: item.order_num,
              props: item.props as ElementProps,
              deleted: item.deleted,
              page_id: null,
              created_at: "",
              updated_at: "",
            },
            frameId ?? null,
          );

          return (
            <div
              key={item.id}
              data-depth={currentDepth}
              data-has-children={hasChildNodes}
              onClick={(e) => {
                e.stopPropagation();
                onElementClick(element);
              }}
              className="element"
            >
              <div
                className={`elementItem ${
                  selectedElementId === item.id ? "active" : ""
                }`}
              >
                <div
                  className="elementItemIndent"
                  style={{
                    width: currentDepth > 0 ? `${currentDepth * 8}px` : "0px",
                  }}
                ></div>
                <div
                  className="elementItemIcon"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasChildNodes) {
                      toggleKey(item.id);
                    }
                  }}
                >
                  {hasChildNodes ? (
                    <ChevronRight
                      color={iconProps.color}
                      strokeWidth={iconProps.strokeWidth}
                      size={iconProps.size}
                      style={{
                        transform: isExpanded
                          ? "rotate(90deg)"
                          : "rotate(0deg)",
                      }}
                    />
                  ) : (
                    <Box
                      color={iconProps.color}
                      strokeWidth={iconProps.strokeWidth}
                      size={iconProps.size}
                      style={{ padding: "2px" }}
                    />
                  )}
                </div>
                <div className="elementItemLabel">
                  {item.type === "Slot" && item.props
                    ? `Slot: ${
                        (item.props as Record<string, unknown>).name ||
                        "unnamed"
                      }`
                    : item.type}
                </div>
                <div className="elementItemActions">
                  {item.type === "body" && (
                    <button className="iconButton" aria-label="Settings">
                      <Settings2
                        color={iconProps.color}
                        strokeWidth={iconProps.strokeWidth}
                        size={iconProps.size}
                      />
                    </button>
                  )}
                  {item.type !== "body" && (
                    <button
                      className="iconButton"
                      aria-label={`Delete ${item.type}`}
                      onClick={async (e) => {
                        e.stopPropagation();
                        await onElementDelete(element);
                      }}
                    >
                      <Trash
                        color={iconProps.color}
                        strokeWidth={iconProps.strokeWidth}
                        size={iconProps.size}
                      />
                    </button>
                  )}
                </div>
              </div>
              {isExpanded &&
                hasChildNodes &&
                item.children &&
                renderTree(item.children, currentDepth + 1)}
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div className="sidebar_elements">
      <div className="panel-header">
        <h3 className="panel-title">Layers</h3>
        <div className="header-actions">
          <button
            className="iconButton"
            aria-label="Collapse All"
            onClick={onCollapseAll}
          >
            <Minimize
              color={iconProps.color}
              strokeWidth={iconProps.strokeWidth}
              size={iconProps.size}
            />
          </button>
        </div>
      </div>
      <div className="elements">
        {!frameId ? (
          <p className="no_element">Select a frame to view elements</p>
        ) : tree.length === 0 ? (
          <p className="no_element">No elements in this frame</p>
        ) : (
          renderTree(tree, 0)
        )}
      </div>
    </div>
  );
}
