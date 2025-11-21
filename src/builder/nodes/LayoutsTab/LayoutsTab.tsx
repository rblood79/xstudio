/**
 * LayoutsTab
 *
 * Layouts 탭의 메인 컨테이너.
 * Layout 목록과 현재 Layout의 Element 트리를 표시.
 */

import React, { useCallback, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { CirclePlus, CopyMinus } from "lucide-react";
import { iconProps } from "../../../utils/ui/uiConstants";
import { useLayoutsStore } from "../../stores/layouts";
import { useEditModeStore } from "../../stores/editMode";
import { useStore } from "../../stores";
import { ElementProps } from "../../../types/integrations/supabase.types";
import { Element } from "../../../types/core/store.types";
import type { ElementTreeItem } from "../../../types/builder/stately.types";
import type { Layout } from "../../../types/builder/layout.types";
import { buildTreeFromElements } from "../../utils/treeUtils";
import { MessageService } from "../../../utils/messaging";

interface LayoutsTabProps {
  renderTree: <
    T extends { id: string; parent_id?: string | null; order_num?: number }
  >(
    items: T[],
    getLabel: (item: T) => string,
    onClick: (item: T) => void,
    onDelete: (item: T) => Promise<void>,
    parentId?: string | null,
    depth?: number
  ) => React.ReactNode;
  renderElementTree: (
    tree: ElementTreeItem[],
    onClick: (item: Element) => void,
    onDelete: (item: Element) => Promise<void>,
    depth?: number
  ) => React.ReactNode;
  selectedElementId: string | null;
  setSelectedElement: (elementId: string | null, props?: ElementProps) => void;
  sendElementSelectedMessage: (elementId: string, props: ElementProps) => void;
  collapseAllTreeItems?: () => void;
  projectId?: string; // prop으로 받은 projectId (우선 사용)
}

export function LayoutsTab({
  renderElementTree,
  selectedElementId,
  setSelectedElement,
  sendElementSelectedMessage,
  collapseAllTreeItems,
  projectId: projectIdProp,
}: LayoutsTabProps) {
  // URL params (fallback)
  const { projectId: projectIdFromParams } = useParams<{ projectId: string }>();

  // prop 우선, useParams fallback
  const projectId = projectIdProp || projectIdFromParams;

  // Layouts store
  const layouts = useLayoutsStore((state) => state.layouts);
  const currentLayoutId = useLayoutsStore((state) => state.currentLayoutId);
  const setCurrentLayoutInStore = useLayoutsStore((state) => state.setCurrentLayout);
  const createLayout = useLayoutsStore((state) => state.createLayout);
  const deleteLayout = useLayoutsStore((state) => state.deleteLayout);
  const fetchLayouts = useLayoutsStore((state) => state.fetchLayouts);

  // Compute currentLayout from layouts and currentLayoutId
  const currentLayout = useMemo(() => {
    return layouts.find((l) => l.id === currentLayoutId) || null;
  }, [layouts, currentLayoutId]);

  // Edit Mode store
  const setEditModeLayoutId = useEditModeStore(
    (state) => state.setCurrentLayoutId
  );

  // Elements store - Layout에 속한 요소들
  const allElements = useStore((state) => state.elements);
  const removeElement = useStore((state) => state.removeElement);

  // 컴포넌트 마운트 시 Layouts 로드
  useEffect(() => {
    console.log("🔍 [LayoutsTab] projectId:", projectId);
    if (projectId) {
      console.log("📥 [LayoutsTab] fetchLayouts 호출:", projectId);
      fetchLayouts(projectId);
    } else {
      console.warn("⚠️ [LayoutsTab] projectId가 없습니다!");
    }
  }, [projectId, fetchLayouts]);

  // 현재 Layout의 요소들만 필터링
  const layoutElements = useMemo(() => {
    if (!currentLayout) return [];
    return allElements.filter((el) => el.layout_id === currentLayout.id);
  }, [allElements, currentLayout]);

  // Layout 요소 트리 빌드
  const layoutElementTree = useMemo(() => {
    return buildTreeFromElements(layoutElements);
  }, [layoutElements]);

  // Layout 선택 핸들러
  const handleSelectLayout = useCallback(
    (layout: Layout) => {
      setCurrentLayoutInStore(layout.id);
      setEditModeLayoutId(layout.id);
    },
    [setCurrentLayoutInStore, setEditModeLayoutId]
  );

  // Layout 삭제 핸들러
  const handleDeleteLayout = useCallback(
    async (layout: Layout) => {
      try {
        await deleteLayout(layout.id);
        // 삭제 후 다른 Layout 선택
        const remaining = layouts.filter((l) => l.id !== layout.id);
        if (remaining.length > 0) {
          handleSelectLayout(remaining[0]);
        } else {
          setCurrentLayoutInStore(null);
          setEditModeLayoutId(null);
        }
      } catch (error) {
        console.error("Layout 삭제 에러:", error);
      }
    },
    [
      deleteLayout,
      layouts,
      handleSelectLayout,
      setCurrentLayoutInStore,
      setEditModeLayoutId,
    ]
  );

  // 새 Layout 생성 핸들러
  const handleAddLayout = useCallback(async () => {
    if (!projectId) {
      console.error("프로젝트 ID가 없습니다");
      return;
    }
    try {
      const newLayout = await createLayout({
        name: `Layout ${layouts.length + 1}`,
        description: "",
        project_id: projectId,
      });
      if (newLayout) {
        handleSelectLayout(newLayout);
      }
    } catch (error) {
      console.error("Layout 생성 에러:", error);
    }
  }, [projectId, createLayout, layouts.length, handleSelectLayout]);

  // Element 삭제 핸들러
  const handleDeleteElement = useCallback(
    async (el: Element) => {
      await removeElement(el.id);
      if (el.id === selectedElementId) {
        setSelectedElement(null);
        MessageService.clearOverlay();
      }
    },
    [removeElement, selectedElementId, setSelectedElement]
  );

  return (
    <div
      className="layouts-tab"
      role="tabpanel"
      id="tabpanel-layouts"
      aria-label="Layouts"
    >
      {/* Layouts List */}
      <div className="sidebar_layouts">
        <div className="panel-header">
          <h3 className="panel-title">Layouts</h3>
          <div className="header-actions">
            <button
              className="iconButton"
              aria-label="Add Layout"
              onClick={handleAddLayout}
            >
              <CirclePlus
                color={iconProps.color}
                strokeWidth={iconProps.stroke}
                size={iconProps.size}
              />
            </button>
          </div>
        </div>

        <div className="elements">
          {layouts.length === 0 ? (
            <p className="no_element">No layouts available</p>
          ) : (
            <div className="layout-list">
              {layouts.map((layout) => (
                <div
                  key={layout.id}
                  className={`layout-item ${
                    currentLayout?.id === layout.id ? "active" : ""
                  }`}
                  onClick={() => handleSelectLayout(layout)}
                >
                  <span className="layout-name">{layout.name}</span>
                  <button
                    className="iconButton delete-btn"
                    aria-label={`Delete ${layout.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLayout(layout);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Layout Element Tree */}
      <div className="sidebar_elements">
        <div className="panel-header">
          <h3 className="panel-title">
            {currentLayout ? `${currentLayout.name} Elements` : "Elements"}
          </h3>
          <div className="header-actions">
            <button
              className="iconButton"
              aria-label="Collapse All"
              onClick={() => collapseAllTreeItems?.()}
            >
              <CopyMinus
                color={iconProps.color}
                strokeWidth={iconProps.stroke}
                size={iconProps.size}
              />
            </button>
          </div>
        </div>
        <div className="elements">
          {!currentLayout ? (
            <p className="no_element">Select a layout to view elements</p>
          ) : layoutElements.length === 0 ? (
            <p className="no_element">No elements in this layout</p>
          ) : (
            renderElementTree(
              layoutElementTree,
              (el) => {
                setSelectedElement(el.id, el.props as ElementProps);
                requestAnimationFrame(() =>
                  sendElementSelectedMessage(el.id, el.props as ElementProps)
                );
              },
              handleDeleteElement
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default LayoutsTab;
