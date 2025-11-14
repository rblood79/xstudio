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
import { usePageManager } from "../../hooks/usePageManager";
import { useElementCreator } from "../../hooks/useElementCreator";
import type { Page as UnifiedPage } from "../../../types/builder/unified.types";

export function NodesPanel({ isActive }: PanelProps) {
  // URL params
  const { projectId } = useParams<{ projectId: string }>();

  // Store state
  const currentPageId = useStore((state) => state.currentPageId);
  const pages = useStore((state) => state.pages);
  const addElement = useStore((state) => state.addElement);

  // Hooks
  const { pageList, addPage, fetchElements, initializeProject } = usePageManager();
  const { handleAddElement } = useElementCreator();

  // 프로젝트 초기화 - pages가 비어있으면 초기화
  useEffect(() => {
    if (projectId && pages.length === 0 && isActive) {
      console.log('🔄 NodesPanel: 프로젝트 초기화 시작', projectId);
      initializeProject(projectId);
    }
  }, [projectId, pages.length, isActive, initializeProject]);

  // Convert store pages (name) to UnifiedPage (title) for Sidebar
  const unifiedPages: UnifiedPage[] = useMemo(() =>
    pages.map(p => ({
      id: p.id,
      title: p.name, // Convert name → title
      project_id: '', // Not used by Sidebar
      slug: p.slug,
      parent_id: p.parent_id,
      order_num: p.order_num
    })),
    [pages]
  );

  // addPage wrapper
  const handleAddPage = useCallback(async () => {
    if (!projectId) {
      console.error("프로젝트 ID가 없습니다");
      return;
    }
    await addPage(projectId, addElement);
  }, [projectId, addPage, addElement]);

  // fetchElements wrapper - convert ApiResult to void
  const handleFetchElements = useCallback(async (pageId: string) => {
    await fetchElements(pageId);
  }, [fetchElements]);

  // handleAddElement wrapper - match Sidebar signature
  const handleAddElementWrapper = useCallback(
    async (tag: string) => {
      if (!currentPageId) return;
      await handleAddElement(
        tag,
        currentPageId,
        null, // selectedElementId
        [], // elements - will be fetched from store
        addElement,
        () => {} // sendElementsToIframe - not used here
      );
    },
    [currentPageId, handleAddElement, addElement]
  );

  // Force nodes tab to be active
  const forcedActiveTabs = useMemo(() => new Set(['nodes']), []);

  // 활성 상태가 아니면 렌더링하지 않음 (성능 최적화)
  if (!isActive) {
    return null;
  }

  // 현재 페이지가 없으면 빈 상태 표시
  if (!currentPageId) {
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
        handleAddElement={handleAddElementWrapper}
        fetchElements={handleFetchElements}
        selectedPageId={currentPageId}
        forcedActiveTabs={forcedActiveTabs}
      />
    </div>
  );
}
