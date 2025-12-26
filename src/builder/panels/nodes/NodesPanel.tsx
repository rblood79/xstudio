/**
 * NodesPanel - 페이지 노드 트리 패널
 *
 * PanelProps 인터페이스를 구현하여 패널 시스템과 통합
 * 🚀 Performance: PagesSection/LayersSection 분리로 리렌더링 범위 최소화
 */

import { useCallback, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import type { PanelProps } from "../core/types";
import Sidebar from "../../sidebar";
import { useStore } from "../../stores";
import { useEditModeStore } from "../../stores/editMode";
import { useLayoutsStore } from "../../stores/layouts";
import { usePageManager } from "../../hooks/usePageManager";
import { useElementCreator } from "../../hooks/useElementCreator";
import { useIframeMessenger } from "../../hooks/useIframeMessenger";
import type { Page as UnifiedPage } from "../../../types/builder/unified.types";
// Issue 1: Layout 탭 복원을 위한 임포트
import { NodesPanelTabs, type NodesPanelTabType } from "../../nodes/NodesPanelTabs";
import { LayoutsTab } from "../../nodes/LayoutsTab/LayoutsTab";
// 🚀 Performance: 분리된 섹션 컴포넌트
import { PagesSection } from "./PagesSection";
import { LayersSection } from "./LayersSection";

// 기능 플래그: true면 새 Tree 사용, false면 Sidebar 사용
const USE_NEW_TREE = true;

const { addElement: storeAddElement } = useStore.getState();

export function NodesPanel({ isActive }: PanelProps) {
  // URL params
  const { projectId } = useParams<{ projectId: string }>();

  // 🚀 Performance: 최소한의 상태만 구독
  const currentPageId = useStore((state) => state.currentPageId);
  const pages = useStore((state) => state.pages);
  const selectedElementId = useStore((state) => state.selectedElementId);
  const setSelectedElement = useStore((state) => state.setSelectedElement);

  // Edit Mode state
  const editMode = useEditModeStore((state) => state.mode);
  const currentLayoutId = useLayoutsStore((state) => state.currentLayoutId);

  // Hooks
  const { requestAutoSelectAfterUpdate, sendElementSelectedMessage } = useIframeMessenger();
  const { pageList, addPage, addPageWithParams, fetchElements, initializeProject } = usePageManager({ requestAutoSelectAfterUpdate });
  const { handleAddElement } = useElementCreator();

  // 프로젝트 초기화 - pages가 비어있으면 초기화
  useEffect(() => {
    if (projectId && pages.length === 0 && isActive) {
      initializeProject(projectId);
    }
  }, [projectId, pages.length, isActive, initializeProject]);

  // Convert store pages to UnifiedPage for Sidebar (레거시 Sidebar용)
  const unifiedPages: UnifiedPage[] = useMemo(() =>
    pages.map(p => ({
      id: p.id,
      title: p.title || 'Untitled',
      project_id: p.project_id || '',
      slug: p.slug || '',
      parent_id: p.parent_id,
      order_num: p.order_num || 0
    })),
    [pages]
  );

  // addPage wrapper (레거시 Sidebar용)
  const handleAddPage = useCallback(async () => {
    if (!projectId) {
      console.error("프로젝트 ID가 없습니다");
      return;
    }
    await addPage(projectId);
  }, [projectId, addPage]);

  // fetchElements wrapper (레거시 Sidebar용)
  const handleFetchElements = useCallback(async (pageId: string) => {
    await fetchElements(pageId);
  }, [fetchElements]);

  // handleAddElement wrapper (레거시 Sidebar용)
  const handleAddElementWrapper = useCallback(
    async (tag: string) => {
      const currentElements = useStore.getState().elements;
      const getPageElements = useStore.getState().getPageElements;

      if (editMode === "layout" && currentLayoutId) {
        await handleAddElement(
          tag,
          "",
          null,
          currentElements.filter(el => el.layout_id === currentLayoutId),
          storeAddElement,
          () => {},
          currentLayoutId
        );
        return;
      }

      if (!currentPageId) return;
      const pageElements = getPageElements(currentPageId);
      await handleAddElement(
        tag,
        currentPageId,
        null,
        pageElements,
        storeAddElement,
        () => {}
      );
    },
    [currentPageId, currentLayoutId, editMode, handleAddElement]
  );

  // Force nodes tab to be active (레거시 Sidebar용)
  const forcedActiveTabs = useMemo(() => new Set(['nodes']), []);

  // 🚀 Performance: 탭 관련 상태만 구독
  const setEditMode = useEditModeStore((state) => state.setMode);
  const setEditModeCurrentPageId = useEditModeStore((state) => state.setCurrentPageId);
  const setEditModeCurrentLayoutId = useEditModeStore((state) => state.setCurrentLayoutId);

  // 현재 활성 탭 (Edit Mode에서 파생)
  const activeTab: NodesPanelTabType = editMode === "layout" ? "layouts" : "pages";

  // 탭 변경 핸들러
  const handleTabChange = useCallback(
    (tab: NodesPanelTabType) => {
      if (tab === "pages") {
        setEditMode("page");
        setEditModeCurrentLayoutId(null);
      } else {
        setEditMode("layout");
        setEditModeCurrentPageId(null);
      }
    },
    [setEditMode, setEditModeCurrentPageId, setEditModeCurrentLayoutId]
  );

  // 활성 상태가 아니면 렌더링하지 않음 (성능 최적화)
  if (!isActive) {
    return null;
  }

  // Page 모드에서 페이지가 없으면 빈 상태 표시
  // Layout 모드에서는 Sidebar를 렌더링해야 사용자가 레이아웃을 선택/생성할 수 있음
  if (editMode === "page" && !currentPageId && pages.length === 0) {
    return (
      <div className="panel-empty-state">
        <p className="empty-message">페이지를 선택하세요</p>
      </div>
    );
  }

  // 🚀 Performance: 새 Tree 사용 - 분리된 컴포넌트로 리렌더링 최소화
  if (USE_NEW_TREE) {
    return (
      <div className="nodes-panel nodes-panel--new-tree">
        <NodesPanelTabs activeTab={activeTab} onTabChange={handleTabChange} />

        <div className="nodes-panel-content">
          {activeTab === "pages" ? (
            // Pages 탭 콘텐츠 - PagesSection/LayersSection 분리로 독립 리렌더링
            <>
              <PagesSection projectId={projectId} />
              {currentPageId && <LayersSection currentPageId={currentPageId} />}
            </>
          ) : (
            // Layouts 탭 콘텐츠
            <LayoutsTab
              selectedElementId={selectedElementId}
              setSelectedElement={setSelectedElement}
              sendElementSelectedMessage={sendElementSelectedMessage}
              requestAutoSelectAfterUpdate={requestAutoSelectAfterUpdate}
              projectId={projectId}
            />
          )}
        </div>
      </div>
    );
  }

  // 기존 Sidebar 사용
  return (
    <div className="nodes-panel">
      <Sidebar
        pages={unifiedPages}
        pageList={pageList}
        handleAddPage={handleAddPage}
        addPageWithParams={addPageWithParams}
        handleAddElement={handleAddElementWrapper}
        fetchElements={handleFetchElements}
        selectedPageId={currentPageId}
        forcedActiveTabs={forcedActiveTabs}
        projectId={projectId}
      />
    </div>
  );
}
