/**
 * NodesPanel - 페이지 노드 트리 패널
 *
 * PanelProps 인터페이스를 구현하여 패널 시스템과 통합
 * 내부적으로 Sidebar의 Nodes 섹션을 재사용
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

const { addElement: storeAddElement } = useStore.getState();

export function NodesPanel({ isActive }: PanelProps) {
  // URL params
  const { projectId } = useParams<{ projectId: string }>();

  // Store state
  const currentPageId = useStore((state) => state.currentPageId);
  const pages = useStore((state) => state.pages);
  // 🆕 elements 구독 제거 - 콜백 내에서 getState()로 가져옴 (불필요한 리렌더링 방지)

  // Edit Mode state
  const editMode = useEditModeStore((state) => state.mode);
  const currentLayoutId = useLayoutsStore((state) => state.currentLayoutId);

  // Hooks
  const { requestAutoSelectAfterUpdate } = useIframeMessenger();
  const { pageList, addPage, addPageWithParams, fetchElements, initializeProject } = usePageManager({ requestAutoSelectAfterUpdate });
  const { handleAddElement } = useElementCreator();

  // 프로젝트 초기화 - pages가 비어있으면 초기화
  useEffect(() => {
    if (projectId && pages.length === 0 && isActive) {
      initializeProject(projectId);
    }
  }, [projectId, pages.length, isActive, initializeProject]);

  // Convert store pages to UnifiedPage for Sidebar
  const unifiedPages: UnifiedPage[] = useMemo(() =>
    pages.map(p => ({
      id: p.id,
      title: p.title || 'Untitled',
      project_id: p.project_id || '', // Not used by Sidebar
      slug: p.slug || '',
      parent_id: p.parent_id,
      order_num: p.order_num || 0
    })),
    [pages]
  );

  // addPage wrapper
  const handleAddPage = useCallback(async () => {
    if (!projectId) {
      console.error("프로젝트 ID가 없습니다");
      return;
    }
    await addPage(projectId);
  }, [projectId, addPage]);

  // fetchElements wrapper - convert ApiResult to void
  const handleFetchElements = useCallback(async (pageId: string) => {
    await fetchElements(pageId);
  }, [fetchElements]);

  // handleAddElement wrapper - match Sidebar signature
  // EditMode에 따라 Page 또는 Layout에 element 추가
  const handleAddElementWrapper = useCallback(
    async (tag: string) => {
      // 🆕 콜백 실행 시점에 최신 elements 가져오기 (구독 대신 getState 사용)
      const currentElements = useStore.getState().elements;
      const getPageElements = useStore.getState().getPageElements;

      // Layout 모드인 경우
      if (editMode === "layout" && currentLayoutId) {
        console.log(`🏗️ Layout 모드: ${tag}를 Layout ${currentLayoutId}에 추가`);
        await handleAddElement(
          tag,
          "", // currentPageId - layout 모드에서는 사용 안함
          null, // selectedElementId
          currentElements.filter(el => el.layout_id === currentLayoutId), // 현재 레이아웃의 elements만
          storeAddElement,
          () => {}, // sendElementsToIframe - not used here
          currentLayoutId // layoutId 전달
        );
        return;
      }

      // Page 모드인 경우
      if (!currentPageId) return;
      // 🆕 O(1) 인덱스 기반 조회
      const pageElements = getPageElements(currentPageId);
      await handleAddElement(
        tag,
        currentPageId,
        null, // selectedElementId
        pageElements,
        storeAddElement,
        () => {} // sendElementsToIframe - not used here
      );
    },
    [currentPageId, currentLayoutId, editMode, handleAddElement]
  );

  // Force nodes tab to be active
  const forcedActiveTabs = useMemo(() => new Set(['nodes']), []);

  // 활성 상태가 아니면 렌더링하지 않음 (성능 최적화)
  if (!isActive) {
    return null;
  }

  // Page 모드에서 페이지가 없으면 빈 상태 표시
  // Layout 모드에서는 Sidebar를 렌더링해야 사용자가 레이아웃을 선택/생성할 수 있음
  if (editMode === "page" && !currentPageId) {
    return (
      <div className="panel-empty-state">
        <p className="empty-message">페이지를 선택하세요</p>
      </div>
    );
  }

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
