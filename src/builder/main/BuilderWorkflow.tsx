/**
 * BuilderWorkflow - 빌더 내 워크플로우 시각화
 *
 * Builder에 직접 임베드되어 프로젝트 워크플로우를 시각화
 * Builder stores에서 데이터를 직접 가져와 workflow store에 동기화
 */

import { useEffect, useRef } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useStore } from '../stores';
import { useLayoutsStore } from '../stores/layouts';
import { useWorkflowStore } from '../../workflow/store';
import { WorkflowCanvas, WorkflowToolbar } from '../../workflow/components';
import type { WorkflowPage, WorkflowLayout, WorkflowElement } from '../../workflow/types';

import '../../workflow/styles/workflow.css';

// ============================================
// Data Sync Hook
// ============================================

function useWorkflowSync() {
  const setPages = useWorkflowStore((s) => s.setPages);
  const setLayouts = useWorkflowStore((s) => s.setLayouts);
  const setElements = useWorkflowStore((s) => s.setElements);
  const setProjectId = useWorkflowStore((s) => s.setProjectId);
  const setLoading = useWorkflowStore((s) => s.setLoading);

  // Builder stores
  const pages = useStore((s) => s.pages);
  const elements = useStore((s) => s.elements);
  const currentPageId = useStore((s) => s.currentPageId);
  const layouts = useLayoutsStore((s) => s.layouts);

  const initializedRef = useRef(false);

  // Sync pages
  useEffect(() => {
    const workflowPages: WorkflowPage[] = pages.map((p) => ({
      id: p.id,
      title: p.name,
      // 슬러그 앞의 "/"를 제거해 표시/매칭 시 중복 슬래시 방지
      slug: p.slug?.replace(/^\/+/, '') || '',
      project_id: p.project_id || '',
      parent_id: p.parent_id,
      order_num: p.order_num,
      layout_id: p.layout_id,
    }));
    setPages(workflowPages);

    // 최초 동기화 시점에 로딩 해제 (페이지가 0개여도 로딩에서 빠져야 함)
    if (!initializedRef.current) {
      initializedRef.current = true;
      setLoading(false);
    }
  }, [pages, setPages, setLoading]);

  // Sync layouts
  useEffect(() => {
    const workflowLayouts: WorkflowLayout[] = layouts.map((l) => ({
      id: l.id,
      name: l.name,
      project_id: l.project_id || '',
      description: l.description,
    }));
    setLayouts(workflowLayouts);
  }, [layouts, setLayouts]);

  // Sync elements
  useEffect(() => {
    const workflowElements: WorkflowElement[] = elements.map((el) => ({
      id: el.id,
      tag: el.tag,
      props: el.props as Record<string, unknown>,
      parent_id: el.parent_id,
      page_id: el.page_id,
      layout_id: el.layout_id,
      order_num: el.order_num,
      // Events는 props.events에 저장되는 경우가 있으므로 우선 사용
      events:
        ((el.props as { events?: unknown }).events as WorkflowElement['events']) ||
        (el.events as WorkflowElement['events']),
      dataBinding:
        ((el.props as { dataBinding?: unknown }).dataBinding as WorkflowElement['dataBinding']) ||
        (el.dataBinding as WorkflowElement['dataBinding']),
    }));
    setElements(workflowElements);
  }, [elements, setElements]);

  // Set project ID from current page
  useEffect(() => {
    const currentPage = pages.find((p) => p.id === currentPageId);
    if (currentPage?.project_id) {
      setProjectId(currentPage.project_id);
    }
  }, [currentPageId, pages, setProjectId]);
}

// ============================================
// Workflow Content
// ============================================

function WorkflowContent() {
  useWorkflowSync();

  const isLoading = useWorkflowStore((s) => s.isLoading);
  const error = useWorkflowStore((s) => s.error);
  const nodes = useWorkflowStore((s) => s.nodes);

  if (isLoading) {
    return (
      <div className="workflow-loading">
        <div className="workflow-loading-spinner" />
        <span>Loading workflow...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="workflow-error">
        <span>Error: {error}</span>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="workflow-empty">
        <span>No pages to display</span>
        <p>Add pages to your project to see the workflow</p>
      </div>
    );
  }

  return <WorkflowCanvas />;
}

// ============================================
// BuilderWorkflow Component
// ============================================

export const BuilderWorkflow: React.FC = () => {
  return (
    <ReactFlowProvider>
      <div className="workflow-app builder-workflow">
        <WorkflowToolbar />
        <WorkflowContent />
      </div>
    </ReactFlowProvider>
  );
};

export default BuilderWorkflow;
