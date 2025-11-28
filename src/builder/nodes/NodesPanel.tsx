/**
 * NodesPanel
 *
 * Pages/Layouts 탭을 포함하는 메인 Nodes 패널.
 * Edit Mode와 연동되어 탭 전환 시 자동으로 모드가 변경됨.
 */

import React, { useCallback, useMemo } from "react";
import { NodesPanelTabs, NodesPanelTabType } from "./NodesPanelTabs";
import { PagesTab } from "./PagesTab/PagesTab";
import { LayoutsTab } from "./LayoutsTab/LayoutsTab";
import { useEditModeStore } from "../stores/editMode";
import { ElementProps } from "../../types/integrations/supabase.types";
import { Element, Page } from "../../types/core/store.types";
import type { ElementTreeItem } from "../../types/builder/stately.types";
import "./index.css";

interface NodesPanelProps {
  pages: Page[];
  pageList: { remove: (...keys: string[]) => void };
  handleAddPage: () => Promise<void>;
  /** ⭐ Nested Routes & Slug System */
  addPageWithParams?: (params: import('../hooks/usePageManager').AddPageParams) => Promise<{ success: boolean; error?: Error }>;
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
  fetchElements: (pageId: string) => Promise<void>;
  elements: Element[];
  selectedElementId: string | null;
  setSelectedElement: (elementId: string | null, props?: ElementProps) => void;
  sendElementSelectedMessage: (elementId: string, props: ElementProps) => void;
  requestAutoSelectAfterUpdate: (elementId: string) => void; // ⭐ ACK 기반 auto-select
  collapseAllTreeItems?: () => void;
  projectId?: string; // Layout/Slot System용 projectId
}

export function NodesPanel({
  pages,
  pageList,
  handleAddPage,
  addPageWithParams,
  renderTree,
  renderElementTree,
  fetchElements,
  elements,
  selectedElementId,
  setSelectedElement,
  sendElementSelectedMessage,
  requestAutoSelectAfterUpdate,
  collapseAllTreeItems,
  projectId,
}: NodesPanelProps) {
  // Edit Mode 상태
  const editMode = useEditModeStore((state) => state.mode);
  const setEditMode = useEditModeStore((state) => state.setMode);
  const setCurrentPageId = useEditModeStore((state) => state.setCurrentPageId);
  const setCurrentLayoutId = useEditModeStore(
    (state) => state.setCurrentLayoutId
  );

  // 현재 활성 탭 (Edit Mode에서 파생)
  const activeTab: NodesPanelTabType = editMode === "layout" ? "layouts" : "pages";

  // 탭 변경 핸들러 - Edit Mode도 함께 변경
  const handleTabChange = useCallback(
    (tab: NodesPanelTabType) => {
      if (tab === "pages") {
        setEditMode("page");
        // Layout 편집 컨텍스트 초기화
        setCurrentLayoutId(null);
      } else {
        setEditMode("layout");
        // Page 편집 컨텍스트 초기화
        setCurrentPageId(null);
      }
    },
    [setEditMode, setCurrentPageId, setCurrentLayoutId]
  );

  // 탭 콘텐츠 렌더링
  const tabContent = useMemo(() => {
    if (activeTab === "pages") {
      return (
        <PagesTab
          pages={pages}
          pageList={pageList}
          handleAddPage={handleAddPage}
          addPageWithParams={addPageWithParams}
          projectId={projectId}
          renderTree={renderTree}
          renderElementTree={renderElementTree}
          fetchElements={fetchElements}
          elements={elements}
          selectedElementId={selectedElementId}
          setSelectedElement={setSelectedElement}
          sendElementSelectedMessage={sendElementSelectedMessage}
          requestAutoSelectAfterUpdate={requestAutoSelectAfterUpdate}
          collapseAllTreeItems={collapseAllTreeItems}
        />
      );
    }

    return (
      <LayoutsTab
        selectedElementId={selectedElementId}
        setSelectedElement={setSelectedElement}
        sendElementSelectedMessage={sendElementSelectedMessage}
        requestAutoSelectAfterUpdate={requestAutoSelectAfterUpdate}
        projectId={projectId}
      />
    );
  }, [
    activeTab,
    pages,
    pageList,
    handleAddPage,
    addPageWithParams,
    projectId,
    renderTree,
    renderElementTree,
    fetchElements,
    elements,
    selectedElementId,
    setSelectedElement,
    sendElementSelectedMessage,
    requestAutoSelectAfterUpdate,
    collapseAllTreeItems,
  ]);

  return (
    <div className="nodes-panel">
      <NodesPanelTabs activeTab={activeTab} onTabChange={handleTabChange} />
      <div className="nodes-panel-content">{tabContent}</div>
    </div>
  );
}

export default NodesPanel;
