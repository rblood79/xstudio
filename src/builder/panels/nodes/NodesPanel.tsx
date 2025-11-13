/**
 * NodesPanel - 페이지 노드 트리 패널
 *
 * PanelProps 인터페이스를 구현하여 패널 시스템과 통합
 * 내부적으로 Sidebar의 Nodes 섹션을 재사용
 */

import { useCallback } from "react";
import { useParams } from "react-router-dom";
import type { PanelProps } from "../core/types";
import Sidebar from "../../sidebar";
import { useStore } from "../../stores";
import { usePageManager } from "../../hooks/usePageManager";
import { useElementCreator } from "../../hooks/useElementCreator";

export function NodesPanel({ isActive }: PanelProps) {
  // URL params
  const { projectId } = useParams<{ projectId: string }>();

  // Store state
  const currentPageId = useStore((state) => state.currentPageId);
  const pages = useStore((state) => state.pages);
  const addElement = useStore((state) => state.addElement);

  // Hooks
  const { pageList, addPage, fetchElements } = usePageManager();
  const { handleAddElement } = useElementCreator();

  // addPage wrapper
  const handleAddPage = useCallback(async () => {
    if (!projectId) {
      console.error("프로젝트 ID가 없습니다");
      return;
    }
    await addPage(projectId, addElement);
  }, [projectId, addPage, addElement]);

  // 활성 상태가 아니면 렌더링하지 않음 (성능 최적화)
  if (!isActive) {
    return null;
  }

  // 현재 페이지가 없으면 빈 상태 표시
  if (!currentPageId) {
    return (
      <div className="inspector-container empty">
        <div className="empty-state">
          <p className="empty-message">페이지를 선택하세요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="nodes-panel sidebar-section">
      <Sidebar
        pages={pages}
        pageList={pageList}
        handleAddPage={handleAddPage}
        handleAddElement={handleAddElement}
        fetchElements={fetchElements}
        selectedPageId={currentPageId}
      />
    </div>
  );
}
