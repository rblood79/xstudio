/**
 * Workflow Store
 *
 * 워크플로우 시각화를 위한 Zustand 스토어
 */

import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
  type NodeChange,
  type EdgeChange,
  type Node,
} from 'reactflow';
import type {
  WorkflowStore,
  WorkflowState,
  WorkflowPage,
  WorkflowLayout,
  WorkflowElement,
  WorkflowNode,
  WorkflowEdge,
  PageNodeData,
  LayoutNodeData,
} from '../types';

// ============================================
// Initial State
// ============================================

const initialState: WorkflowState = {
  // Data
  pages: [],
  layouts: [],
  elements: [],
  projectId: null,

  // ReactFlow State
  nodes: [],
  edges: [],

  // UI State
  selectedNodeId: null,
  isLoading: false,
  error: null,

  // View Settings
  showLayouts: true,
  showNavigationEdges: true,
  showLayoutEdges: true,
};

// ============================================
// Helper Functions
// ============================================

/**
 * 페이지 내 Link 요소에서 href를 추출하여 다른 페이지로의 링크 목록 반환
 */
function extractNavigationLinks(
  pageId: string,
  elements: WorkflowElement[],
  pages: WorkflowPage[]
): string[] {
  const pageElements = elements.filter((el) => el.page_id === pageId);
  const links: string[] = [];

  const pageSlugs = new Map(pages.map((p) => [p.slug, p.id]));

  pageElements.forEach((el) => {
    if (el.tag === 'Link' || el.tag === 'a') {
      const href = el.props?.href as string | undefined;
      if (href && !href.startsWith('http') && !href.startsWith('#')) {
        // 내부 링크인 경우 slug로 페이지 ID 찾기
        const cleanHref = href.startsWith('/') ? href.slice(1) : href;
        const targetPageId = pageSlugs.get(cleanHref);
        if (targetPageId && targetPageId !== pageId) {
          links.push(targetPageId);
        }
      }
    }
  });

  return [...new Set(links)]; // 중복 제거
}

/**
 * Layout에 속한 Slot 개수 계산
 */
function countLayoutSlots(layoutId: string, elements: WorkflowElement[]): number {
  return elements.filter(
    (el) => el.layout_id === layoutId && el.tag === 'Slot'
  ).length;
}

/**
 * 페이지/레이아웃 데이터를 ReactFlow 노드/엣지로 변환
 */
function buildGraph(
  pages: WorkflowPage[],
  layouts: WorkflowLayout[],
  elements: WorkflowElement[],
  showLayouts: boolean,
  showNavigationEdges: boolean,
  showLayoutEdges: boolean
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  // Layout 노드 생성 (상단에 배치)
  if (showLayouts) {
    layouts.forEach((layout, index) => {
      const pageIds = pages
        .filter((p) => p.layout_id === layout.id)
        .map((p) => p.id);

      const layoutNode: WorkflowNode = {
        id: `layout-${layout.id}`,
        type: 'layout',
        position: { x: 100 + index * 300, y: 50 },
        data: {
          type: 'layout',
          layout,
          pageIds,
          slotCount: countLayoutSlots(layout.id, elements),
        } as LayoutNodeData,
      };
      nodes.push(layoutNode);
    });
  }

  // Page 노드 생성 (Layout 아래에 배치)
  const pagesWithoutLayout = pages.filter((p) => !p.layout_id);
  const pagesWithLayout = pages.filter((p) => p.layout_id);

  // Layout이 없는 페이지들
  pagesWithoutLayout.forEach((page, index) => {
    const outgoingLinks = extractNavigationLinks(page.id, elements, pages);
    const elementCount = elements.filter((el) => el.page_id === page.id).length;

    const pageNode: WorkflowNode = {
      id: `page-${page.id}`,
      type: 'page',
      position: { x: 100 + index * 250, y: showLayouts ? 250 : 100 },
      data: {
        type: 'page',
        page,
        outgoingLinks,
        layoutId: null,
        elementCount,
      } as PageNodeData,
    };
    nodes.push(pageNode);
  });

  // Layout이 있는 페이지들 (Layout 아래에 그룹화)
  const layoutGroups = new Map<string, WorkflowPage[]>();
  pagesWithLayout.forEach((page) => {
    const layoutId = page.layout_id!;
    if (!layoutGroups.has(layoutId)) {
      layoutGroups.set(layoutId, []);
    }
    layoutGroups.get(layoutId)!.push(page);
  });

  let layoutGroupIndex = 0;
  layoutGroups.forEach((groupPages, layoutId) => {
    groupPages.forEach((page, pageIndex) => {
      const outgoingLinks = extractNavigationLinks(page.id, elements, pages);
      const elementCount = elements.filter((el) => el.page_id === page.id).length;

      const pageNode: WorkflowNode = {
        id: `page-${page.id}`,
        type: 'page',
        position: {
          x: 100 + layoutGroupIndex * 300 + pageIndex * 50,
          y: showLayouts ? 400 + pageIndex * 150 : 250 + pageIndex * 150,
        },
        data: {
          type: 'page',
          page,
          outgoingLinks,
          layoutId,
          elementCount,
        } as PageNodeData,
      };
      nodes.push(pageNode);

      // Layout → Page 엣지
      if (showLayouts && showLayoutEdges) {
        edges.push({
          id: `edge-layout-${layoutId}-page-${page.id}`,
          source: `layout-${layoutId}`,
          target: `page-${page.id}`,
          type: 'smoothstep',
          animated: false,
          style: { stroke: 'var(--color-secondary-400)', strokeDasharray: '5,5' },
          data: { type: 'layout-usage', label: 'uses layout' },
        });
      }
    });
    layoutGroupIndex++;
  });

  // Navigation 엣지 생성
  if (showNavigationEdges) {
    pages.forEach((page) => {
      const outgoingLinks = extractNavigationLinks(page.id, elements, pages);
      outgoingLinks.forEach((targetPageId) => {
        edges.push({
          id: `edge-nav-${page.id}-${targetPageId}`,
          source: `page-${page.id}`,
          target: `page-${targetPageId}`,
          type: 'smoothstep',
          animated: true,
          style: { stroke: 'var(--color-primary-500)' },
          markerEnd: { type: MarkerType.ArrowClosed },
          data: { type: 'navigation', label: 'navigates to' },
        });
      });
    });
  }

  return { nodes, edges };
}

// ============================================
// Store
// ============================================

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  ...initialState,

  // Data Actions
  setProjectId: (projectId) => set({ projectId }),

  setPages: (pages) => {
    set({ pages });
    get().buildWorkflowGraph();
  },

  setLayouts: (layouts) => {
    set({ layouts });
    get().buildWorkflowGraph();
  },

  setElements: (elements) => {
    set({ elements });
    get().buildWorkflowGraph();
  },

  // ReactFlow Actions
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes as NodeChange[], get().nodes as Node[]) as WorkflowNode[],
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes as EdgeChange[], get().edges),
    });
  },

  // UI Actions
  setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // View Settings Actions
  toggleShowLayouts: () => {
    set({ showLayouts: !get().showLayouts });
    get().buildWorkflowGraph();
  },

  toggleShowNavigationEdges: () => {
    set({ showNavigationEdges: !get().showNavigationEdges });
    get().buildWorkflowGraph();
  },

  toggleShowLayoutEdges: () => {
    set({ showLayoutEdges: !get().showLayoutEdges });
    get().buildWorkflowGraph();
  },

  // Build Graph
  buildWorkflowGraph: () => {
    const { pages, layouts, elements, showLayouts, showNavigationEdges, showLayoutEdges } = get();

    if (pages.length === 0) {
      set({ nodes: [], edges: [] });
      return;
    }

    const { nodes, edges } = buildGraph(
      pages,
      layouts,
      elements,
      showLayouts,
      showNavigationEdges,
      showLayoutEdges
    );

    set({ nodes, edges });
  },
}));

// ============================================
// Selectors
// ============================================

export const getWorkflowStore = () => useWorkflowStore.getState();
