/**
 * Workflow App - 워크플로우 시각화 메인 앱
 *
 * 프로젝트의 페이지/레이아웃 흐름을 ReactFlow로 시각화
 */

import { useEffect, useCallback, useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { useWorkflowStore, getWorkflowStore } from './store';
import { WorkflowCanvas, WorkflowToolbar } from './components';
import type { WorkflowMessage } from './types';
import './styles/workflow.css';

// ============================================
// Message Handler
// ============================================

function useWorkflowMessages() {
  const setPages = useWorkflowStore((s) => s.setPages);
  const setLayouts = useWorkflowStore((s) => s.setLayouts);
  const setElements = useWorkflowStore((s) => s.setElements);
  const setProjectId = useWorkflowStore((s) => s.setProjectId);
  const setLoading = useWorkflowStore((s) => s.setLoading);
  const setError = useWorkflowStore((s) => s.setError);

  const handleMessage = useCallback(
    (event: MessageEvent<WorkflowMessage>) => {
      const { data } = event;

      if (!data || typeof data !== 'object' || !('type' in data)) {
        return;
      }

      switch (data.type) {
        case 'WORKFLOW_INIT': {
          const { projectId, pages, layouts, elements } = data.payload;
          setProjectId(projectId);
          setPages(pages);
          setLayouts(layouts);
          setElements(elements);
          setLoading(false);
          console.log('[Workflow] Initialized with', pages.length, 'pages');
          break;
        }

        case 'WORKFLOW_UPDATE': {
          const { pages, layouts, elements } = data.payload;
          if (pages) setPages(pages);
          if (layouts) setLayouts(layouts);
          if (elements) setElements(elements);
          console.log('[Workflow] Updated');
          break;
        }

        default:
          break;
      }
    },
    [setPages, setLayouts, setElements, setProjectId, setLoading, setError]
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);

    // 준비 완료 알림
    window.parent.postMessage({ type: 'WORKFLOW_READY' }, '*');
    console.log('[Workflow] Ready');

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);
}

// ============================================
// Workflow Content
// ============================================

function WorkflowContent() {
  useWorkflowMessages();

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
// Workflow App
// ============================================

export function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize store
    const store = getWorkflowStore();
    store.setLoading(true);
    setIsInitialized(true);
  }, []);

  if (!isInitialized) {
    return (
      <div className="workflow-loading">
        <span>Initializing...</span>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <div className="workflow-app">
        <WorkflowToolbar />
        <WorkflowContent />
      </div>
    </ReactFlowProvider>
  );
}

export default App;
