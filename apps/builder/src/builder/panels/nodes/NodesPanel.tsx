/**
 * NodesPanel - 페이지 노드 트리 패널
 *
 * PanelProps 인터페이스를 구현하여 패널 시스템과 통합
 * 🚀 Performance: PagesSection/LayersSection 분리로 리렌더링 범위 최소화
 */

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import type { PanelProps } from "../core/types";
import "./NodesPanel.css";
import { useStore } from "../../stores";
import { useEditModeStore } from "../../stores/editMode";
import { usePageManager, useIframeMessenger } from "@/builder/hooks";
import { NodesPanelTabs, type NodesPanelTabType } from "./NodesPanelTabs";
import { LayoutsTab } from "./LayoutsTab/LayoutsTab";
// 🚀 Performance: 분리된 섹션 컴포넌트
import { PagesSection } from "./PagesSection";
import { LayersSection } from "./LayersSection";

export function NodesPanel({ isActive }: PanelProps) {
  const renderStartRef = useRef(performance.now());
  renderStartRef.current = performance.now();

  // URL params
  const { projectId } = useParams<{ projectId: string }>();

  // 🚀 Performance: 최소한의 상태만 구독
  const currentPageId = useStore((state) => state.currentPageId);
  const pageCount = useStore((state) => state.pages.length);
  const selectedElementId = useStore((state) => state.selectedElementId);
  const setSelectedElement = useStore((state) => state.setSelectedElement);

  // Edit Mode state
  const editMode = useEditModeStore((state) => state.mode);

  // Hooks
  const { requestAutoSelectAfterUpdate, sendElementSelectedMessage } = useIframeMessenger();
  const { initializeProject } = usePageManager({ requestAutoSelectAfterUpdate });

  // 프로젝트 초기화 - pages가 비어있으면 초기화
  useEffect(() => {
    if (projectId && pageCount === 0 && isActive) {
      initializeProject(projectId);
    }
  }, [projectId, pageCount, isActive, initializeProject]);

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

  useLayoutEffect(() => {
    const duration = performance.now() - renderStartRef.current;
    if (duration >= 8) {
      console.log("[perf] panel.nodes.render", {
        durationMs: Number(duration.toFixed(1)),
        currentPageId,
        pageCount,
        isActive,
      });
    }
  });

  // 활성 상태가 아니면 렌더링하지 않음 (성능 최적화)
  if (!isActive) {
    return null;
  }

  // Page 모드에서 페이지가 없으면 빈 상태 표시
  // Layout 모드에서는 Sidebar를 렌더링해야 사용자가 레이아웃을 선택/생성할 수 있음
  if (editMode === "page" && !currentPageId && pageCount === 0) {
    return (
      <div className="panel-empty-state">
        <p className="empty-message">페이지를 선택하세요</p>
      </div>
    );
  }

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
