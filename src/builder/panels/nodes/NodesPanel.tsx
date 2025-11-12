/**
 * NodesPanel - 페이지 노드 트리 패널
 *
 * PanelProps 인터페이스를 구현하여 패널 시스템과 통합
 * 기존 Sidebar 컴포넌트를 재사용 (nodes 탭 강제 활성화)
 */

import { useEffect } from "react";
import { useParams } from "react-router-dom";
import type { PanelProps } from "../core/types";
import Sidebar from "../../sidebar";
import { useStore } from "../../stores";
import { usePageManager } from "../../hooks/usePageManager";
import { useElementCreator } from "../../hooks/useElementCreator";

const SIDEBAR_TABS_KEY = 'xstudio_sidebar_tabs';

export function NodesPanel({ isActive }: PanelProps) {
  const { projectId } = useParams<{ projectId: string }>(); // URL에서 projectId 가져오기
  const currentPageId = useStore((state) => state.currentPageId);
  const pages = useStore((state) => state.pages); // Store에서 pages 가져오기
  const addElement = useStore((state) => state.addElement); // addElement 가져오기

  // Hooks
  const { pageList, addPage, fetchElements } = usePageManager();
  const { handleAddElement } = useElementCreator();

  // addPage wrapper - projectId와 addElement를 자동으로 전달
  const handleAddPage = async () => {
    if (!projectId) {
      console.error('프로젝트 ID가 없습니다');
      return;
    }
    await addPage(projectId, addElement);
  };

  // 컴포넌트 마운트 시 'nodes' 탭 강제 활성화
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_TABS_KEY);
      let tabs: string[] = [];

      if (stored) {
        tabs = JSON.parse(stored);
      }

      // 'nodes' 탭이 없으면 추가
      if (!tabs.includes('nodes')) {
        tabs.push('nodes');
        localStorage.setItem(SIDEBAR_TABS_KEY, JSON.stringify(tabs));
        // 강제 리렌더링을 위해 storage 이벤트 발생
        window.dispatchEvent(new Event('storage'));
      }
    } catch (error) {
      console.error('Failed to activate nodes tab:', error);
    }
  }, []);

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
