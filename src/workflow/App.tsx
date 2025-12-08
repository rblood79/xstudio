/**
 * Workflow App - 워크플로우 시각화 메인 앱
 *
 * 프로젝트의 페이지/레이아웃 흐름을 ReactFlow로 시각화
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useWorkflowStore, getWorkflowStore } from './store';
import { WorkflowCanvas, WorkflowToolbar } from './components';
import type { WorkflowMessage, WorkflowPage, WorkflowLayout, WorkflowElement } from './types';
import './styles/workflow.css';

// ============================================
// Mock Data (개발/테스트용)
// ============================================

const MOCK_PAGES: WorkflowPage[] = [
  { id: 'page-1', title: 'Home', slug: 'home', project_id: 'proj-1', layout_id: 'layout-1', order_num: 1 },
  { id: 'page-2', title: 'Products', slug: 'products', project_id: 'proj-1', layout_id: 'layout-1', order_num: 2 },
  { id: 'page-3', title: 'Product Detail', slug: 'products/[id]', project_id: 'proj-1', layout_id: 'layout-1', order_num: 3 },
  { id: 'page-4', title: 'About', slug: 'about', project_id: 'proj-1', layout_id: 'layout-1', order_num: 4 },
  { id: 'page-5', title: 'Contact', slug: 'contact', project_id: 'proj-1', order_num: 5 },
  { id: 'page-6', title: 'Dashboard', slug: 'dashboard', project_id: 'proj-1', layout_id: 'layout-2', order_num: 6 },
  { id: 'page-7', title: 'Settings', slug: 'settings', project_id: 'proj-1', layout_id: 'layout-2', order_num: 7 },
];

const MOCK_LAYOUTS: WorkflowLayout[] = [
  { id: 'layout-1', name: 'Main Layout', project_id: 'proj-1', description: 'Header + Footer' },
  { id: 'layout-2', name: 'Dashboard Layout', project_id: 'proj-1', description: 'Sidebar + Content' },
];

const MOCK_ELEMENTS: WorkflowElement[] = [
  // Home page elements
  { id: 'el-1', tag: 'Link', props: { href: '/products' }, page_id: 'page-1', order_num: 1 },
  { id: 'el-2', tag: 'Link', props: { href: '/about' }, page_id: 'page-1', order_num: 2 },
  // Products page elements
  { id: 'el-3', tag: 'Link', props: { href: '/products/1' }, page_id: 'page-2', order_num: 1 },
  { id: 'el-4', tag: 'Link', props: { href: '/' }, page_id: 'page-2', order_num: 2 },
  // Product Detail page elements
  { id: 'el-5', tag: 'Link', props: { href: '/products' }, page_id: 'page-3', order_num: 1 },
  { id: 'el-6', tag: 'Button', props: { children: 'Add to Cart' }, page_id: 'page-3', order_num: 2 },
  // About page elements
  { id: 'el-7', tag: 'Link', props: { href: '/contact' }, page_id: 'page-4', order_num: 1 },
  // Dashboard page elements
  { id: 'el-8', tag: 'Link', props: { href: '/settings' }, page_id: 'page-6', order_num: 1 },
  // Settings page elements
  { id: 'el-9', tag: 'Link', props: { href: '/dashboard' }, page_id: 'page-7', order_num: 1 },
  // Layout slots
  { id: 'slot-1', tag: 'Slot', props: { name: 'content' }, layout_id: 'layout-1', order_num: 1 },
  { id: 'slot-2', tag: 'Slot', props: { name: 'sidebar' }, layout_id: 'layout-2', order_num: 1 },
  { id: 'slot-3', tag: 'Slot', props: { name: 'content' }, layout_id: 'layout-2', order_num: 2 },
];

// ============================================
// Message Handler
// ============================================

function useWorkflowMessages() {
  const setPages = useWorkflowStore((s) => s.setPages);
  const setLayouts = useWorkflowStore((s) => s.setLayouts);
  const setElements = useWorkflowStore((s) => s.setElements);
  const setProjectId = useWorkflowStore((s) => s.setProjectId);
  const setLoading = useWorkflowStore((s) => s.setLoading);

  const mockLoadedRef = useRef(false);

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
    [setPages, setLayouts, setElements, setProjectId, setLoading]
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);

    // 준비 완료 알림
    window.parent.postMessage({ type: 'WORKFLOW_READY' }, '*');
    console.log('[Workflow] Ready');

    // 독립 실행 모드: 3초 후에도 데이터가 없으면 Mock 데이터 로드
    const mockTimeout = setTimeout(() => {
      const store = getWorkflowStore();
      if (store.pages.length === 0 && !mockLoadedRef.current) {
        mockLoadedRef.current = true;
        console.log('[Workflow] No data received, loading mock data...');
        setProjectId('mock-project');
        setPages(MOCK_PAGES);
        setLayouts(MOCK_LAYOUTS);
        setElements(MOCK_ELEMENTS);
        setLoading(false);
      }
    }, 1500);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(mockTimeout);
    };
  }, [handleMessage, setPages, setLayouts, setElements, setProjectId, setLoading]);
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
  // Initialize synchronously using lazy initialization
  const [isInitialized] = useState(() => {
    // Initialize store on first render
    const store = getWorkflowStore();
    store.setLoading(true);
    return true;
  });

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
