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
  DataSourceNodeData,
  EventNavigationInfo,
  DataSourceInfo,
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
  showEventLinks: true,
  showLayoutEdges: true,
  showDataSources: true,
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
  pages: WorkflowPage[],
  slugMap?: Map<string, string>,
  normalizeSlugOverride?: (slug?: string | null) => string
): string[] {
  // 내부 슬러그/링크를 비교하기 전에 선행 슬래시 제거 + 쿼리/해시 제거
  const normalizeSlug = (slug?: string | null) => {
    if (!slug) return '';
    const trimmed = slug
      .split(/[?#]/)[0]
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');
    return trimmed;
  };

  const pageElements = elements.filter((el) => el.page_id === pageId);
  const links: string[] = [];

  // 슬러그 비교 시 / 여부 차이가 나도 매칭되도록 정규화 맵 구성
  const pageSlugs =
    slugMap ||
    new Map(pages.map((p) => [(normalizeSlugOverride || normalizeSlug)(p.slug), p.id]));

  pageElements.forEach((el) => {
    // Link/a/Button 등 내부 이동 가능성을 모두 확인
    const href =
      (el.props?.href as string | undefined) ||
      (el.props?.to as string | undefined) ||
      (el.props?.path as string | undefined) ||
      (el.props?.url as string | undefined) ||
      // 일부 컴포넌트가 link 객체를 감싸는 경우
      ((el.props?.link as { href?: string } | undefined)?.href);

    const tagLower = (el.tag || '').toLowerCase();
    const isNavigableTag = tagLower === 'link' || tagLower === 'a' || tagLower === 'button';

    if (isNavigableTag && href && !href.startsWith('http') && !href.startsWith('#')) {
      // 내부 링크인 경우 slug로 페이지 ID 찾기 (선행 슬래시 유무 무시)
      const cleanHref = normalizeSlug(href);
      const targetPageId = pageSlugs.get(cleanHref);
      if (targetPageId && targetPageId !== pageId) {
        links.push(targetPageId);
      }
    }

    // 이벤트 기반 네비게이션(navigate action)도 링크로 처리
    if (Array.isArray(el.events)) {
      el.events.forEach((event) => {
        if (!event || event.enabled === false) return;
        const actions = Array.isArray(event.actions) ? event.actions : [];
        actions.forEach((action) => {
          if (!action || action.enabled === false) return;

          // 통합 액션 타입 (block editor)
          const actionType = (action.type || '').toLowerCase();
          const actionPath =
            // BlockEventAction: config.path
            (action.config as { path?: string; href?: string; to?: string; url?: string } | undefined)?.path ||
            (action.config as { href?: string } | undefined)?.href ||
            (action.config as { to?: string } | undefined)?.to ||
            (action.config as { url?: string } | undefined)?.url ||
            // EventAction legacy: value.path/href/to
            (action.value as { path?: string; href?: string; to?: string; url?: string } | undefined)?.path ||
            (action.value as { href?: string } | undefined)?.href ||
            (action.value as { to?: string } | undefined)?.to ||
            (action.value as { url?: string } | undefined)?.url;

          const isNavigate = actionType === 'navigate' || actionType === 'link' || actionType.includes('navigate');

          if (isNavigate && actionPath && !actionPath.startsWith('http') && !actionPath.startsWith('#')) {
            const cleanPath = normalizeSlug(actionPath);
            const targetPageId = pageSlugs.get(cleanPath);
            if (targetPageId && targetPageId !== pageId) {
              links.push(targetPageId);
            }
          }
        });
      });
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
 * 페이지 내 Element의 events에서 navigate 액션 추출
 * - onClick, onSubmit 등의 이벤트에서 navigate 액션을 찾음
 * - path를 slug로 변환하여 target pageId 반환
 */
function extractNavigationFromEvents(
  pageId: string,
  elements: WorkflowElement[],
  pages: WorkflowPage[],
  normalizeSlugOverride?: (slug?: string | null) => string,
  slugMap?: Map<string, string>
): EventNavigationInfo[] {
  const normalizeSlug =
    normalizeSlugOverride ||
    ((slug?: string | null) => {
      if (!slug) return '';
      return slug.split(/[?#]/)[0].replace(/^\/+/, '').replace(/\/+$/, '');
    });

  const pageElements = elements.filter((el) => el.page_id === pageId);
  const navigationInfos: EventNavigationInfo[] = [];

  // slug → pageId 매핑
  const pageSlugs = slugMap ?? new Map(pages.map((p) => [normalizeSlug(p.slug), p.id]));
  // '/' 없이도 매칭할 수 있도록
  const pageSlugsByPath = new Map<string, string>();
  pages.forEach((p) => {
    const normalized = normalizeSlug(p.slug);
    pageSlugsByPath.set(normalized, p.id);
    pageSlugsByPath.set(`/${normalized}`, p.id);
    // home 페이지의 경우 '/' 경로도 매칭
    if (normalized === 'home' || normalized === '') {
      pageSlugsByPath.set('/', p.id);
    }
  });

  pageElements.forEach((el) => {
    // Element에 events가 없으면 skip
    if (!el.events || !Array.isArray(el.events)) return;

    el.events.forEach((event) => {
      // 비활성화된 이벤트는 skip
      if (!event.enabled) return;

      const eventType = (event.event_type || (event as { event?: string }).event || '').toString();
      const actions = Array.isArray(event.actions) ? event.actions : [];

      actions.forEach((action) => {
        // navigate 액션만 처리
        if (action.type !== 'navigate') return;
        // 비활성화된 액션은 skip
        if (action.enabled === false) return;

        // config 또는 value에 경로가 들어있는 형태 모두 처리
        const path =
          (action.config as { path?: string; href?: string; to?: string; url?: string } | undefined)?.path ||
          (action.config as { href?: string } | undefined)?.href ||
          (action.config as { to?: string } | undefined)?.to ||
          (action.config as { url?: string } | undefined)?.url ||
          (action.value as { path?: string; href?: string; to?: string; url?: string } | undefined)?.path ||
          (action.value as { href?: string } | undefined)?.href ||
          (action.value as { to?: string } | undefined)?.to ||
          (action.value as { url?: string } | undefined)?.url;
        if (!path) return;

        // 외부 링크는 skip
        if (path.startsWith('http') || path.startsWith('#')) return;

        // path를 정규화
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        const cleanPath = normalizedPath === '/' ? '/' : normalizeSlug(path);

        // pageId 찾기
        const targetPageId = pageSlugsByPath.get(normalizedPath) || pageSlugs.get(cleanPath);

        // 찾지 못하면 skip
        if (!targetPageId || targetPageId === pageId) return;

        navigationInfos.push({
          sourceElementId: el.id,
          sourceElementTag: el.tag,
          eventType,
          targetPageId,
          condition: action.condition,
        });
      });
    });
  });

  // 동일한 target에 대한 중복 제거 (같은 페이지로 가는 여러 이벤트는 유지)
  return navigationInfos;
}

/**
 * Element의 dataBinding에서 데이터 소스 정보 추출
 * - dataTable, api, supabase 등의 소스를 찾아서 그룹화
 */
function extractDataSources(elements: WorkflowElement[]): DataSourceInfo[] {
  const dataSourceMap = new Map<string, DataSourceInfo>();

  elements.forEach((el) => {
    // dataBinding이 없으면 skip
    if (!el.dataBinding) return;

    const binding = el.dataBinding;
    let sourceType: DataSourceInfo['sourceType'] | null = null;
    let name = '';
    let id = '';

    // PropertyDataBinding 형식 (Inspector에서 설정)
    if ('source' in binding && 'name' in binding && binding.name) {
      if (binding.source === 'dataTable') {
        sourceType = 'dataTable';
        name = binding.name;
        id = `dataTable-${name}`;
      } else if (binding.source === 'api') {
        sourceType = 'api';
        name = binding.name;
        id = `api-${name}`;
      }
    }

    // DataBinding 형식 (프로그래매틱)
    if ('type' in binding && binding.config) {
      const config = binding.config;

      if (config.baseUrl === 'MOCK_DATA') {
        sourceType = 'mock';
        name = config.endpoint as string || 'Mock Data';
        id = `mock-${name}`;
      } else if (binding.source === 'supabase' && config.tableName) {
        sourceType = 'supabase';
        name = config.tableName;
        id = `supabase-${name}`;
      } else if (binding.source === 'api' && config.endpoint) {
        sourceType = 'api';
        name = config.endpoint;
        id = `api-${name}`;
      }
    }

    // 유효한 데이터 소스가 아니면 skip
    if (!sourceType || !name) return;

    // 기존 데이터 소스에 추가하거나 새로 생성
    if (dataSourceMap.has(id)) {
      const existing = dataSourceMap.get(id)!;
      existing.boundElements.push({
        elementId: el.id,
        elementTag: el.tag,
        pageId: el.page_id || '',
      });
    } else {
      dataSourceMap.set(id, {
        id,
        sourceType,
        name,
        boundElements: [{
          elementId: el.id,
          elementTag: el.tag,
          pageId: el.page_id || '',
        }],
      });
    }
  });

  return Array.from(dataSourceMap.values());
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
  showEventLinks: boolean,
  showLayoutEdges: boolean,
  showDataSources: boolean
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  // slug 정규화 도우미 (앞/뒤 슬래시, 쿼리/해시 제거)
  const normalizeSlug = (slug?: string | null) => {
    if (!slug) return '';
    return slug.split(/[?#]/)[0].replace(/^\/+/, '').replace(/\/+$/, '');
  };

  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  // 데이터 소스 추출
  const dataSources = extractDataSources(elements);

  // Y 오프셋 계산 (데이터 소스가 있으면 상단에 배치)
  const dataSourceYOffset = showDataSources && dataSources.length > 0 ? 150 : 0;

  // DataSource 노드 생성 (최상단에 배치)
  if (showDataSources && dataSources.length > 0) {
    dataSources.forEach((dataSource, index) => {
      // 이 데이터 소스를 사용하는 페이지 ID 목록
      const pageIds = [...new Set(dataSource.boundElements.map((be) => be.pageId).filter(Boolean))];

      const dataSourceNode: WorkflowNode = {
        id: `datasource-${dataSource.id}`,
        type: 'dataSource',
        position: { x: 100 + index * 200, y: 0 },
        data: {
          type: 'dataSource',
          dataSource,
          pageIds,
        } as DataSourceNodeData,
      };
      nodes.push(dataSourceNode);
    });
  }

  // Layout 노드 생성 (상단에 배치)
  if (showLayouts) {
    layouts.forEach((layout, index) => {
      const pageIds = pages
        .filter((p) => p.layout_id === layout.id)
        .map((p) => p.id);

      const layoutNode: WorkflowNode = {
        id: `layout-${layout.id}`,
        type: 'layout',
        position: { x: 100 + index * 300, y: 50 + dataSourceYOffset },
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

  // 슬러그 → 페이지 맵 (정규화 슬러그 사용)
  const pageSlugMap = new Map(pages.map((p) => [normalizeSlug(p.slug), p.id]));

  // Page 노드 생성 (Layout 아래에 배치)
  const pagesWithoutLayout = pages.filter((p) => !p.layout_id);
  const pagesWithLayout = pages.filter((p) => p.layout_id);

  // Layout이 없는 페이지들
  pagesWithoutLayout.forEach((page, index) => {
    const outgoingLinks = extractNavigationLinks(page.id, elements, pages, pageSlugMap, normalizeSlug);
    const outgoingEventLinks = extractNavigationFromEvents(page.id, elements, pages, normalizeSlug);
    const elementCount = elements.filter((el) => el.page_id === page.id).length;

    const pageNode: WorkflowNode = {
      id: `page-${page.id}`,
      type: 'page',
      position: { x: 100 + index * 250, y: (showLayouts ? 250 : 100) + dataSourceYOffset },
      data: {
        type: 'page',
        page,
        outgoingLinks,
        outgoingEventLinks,
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
      const outgoingLinks = extractNavigationLinks(page.id, elements, pages, pageSlugMap, normalizeSlug);
      const outgoingEventLinks = extractNavigationFromEvents(page.id, elements, pages, normalizeSlug);
      const elementCount = elements.filter((el) => el.page_id === page.id).length;

      const pageNode: WorkflowNode = {
        id: `page-${page.id}`,
        type: 'page',
        position: {
          x: 100 + layoutGroupIndex * 300 + pageIndex * 50,
          y: (showLayouts ? 400 + pageIndex * 150 : 250 + pageIndex * 150) + dataSourceYOffset,
        },
        data: {
          type: 'page',
          page,
          outgoingLinks,
          outgoingEventLinks,
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

  // Navigation 엣지 생성 (Link 요소 기반)
  if (showNavigationEdges) {
    // 공용 slug → pageId 맵 (정규화된 슬러그 사용)
    const slugMap = new Map(pages.map((p) => [normalizeSlug(p.slug), p.id]));

    pages.forEach((page) => {
      const outgoingLinks = extractNavigationLinks(page.id, elements, pages, slugMap, normalizeSlug);
      outgoingLinks.forEach((targetPageId) => {
        edges.push({
          id: `edge-nav-${page.id}-${targetPageId}`,
          source: `page-${page.id}`,
          target: `page-${targetPageId}`,
          type: 'smoothstep',
          animated: true,
          style: { stroke: 'var(--color-primary-500)' },
          markerEnd: { type: MarkerType.ArrowClosed },
          data: { type: 'navigation', label: 'Link' },
        });
      });
    });
  }

  // Event 기반 Navigation 엣지 생성
  if (showEventLinks) {
    const slugMap = new Map(pages.map((p) => [normalizeSlug(p.slug), p.id]));

    pages.forEach((page) => {
      const eventNavigations = extractNavigationFromEvents(page.id, elements, pages, normalizeSlug, slugMap);
      eventNavigations.forEach((navInfo, index) => {
        // 이미 동일한 source-target 엣지가 있는지 확인
        const edgeExists = edges.some(
          (e) =>
            e.source === `page-${page.id}` &&
            e.target === `page-${navInfo.targetPageId}`
        );

        edges.push({
          id: `edge-event-${page.id}-${navInfo.targetPageId}-${index}`,
          source: `page-${page.id}`,
          target: `page-${navInfo.targetPageId}`,
          type: 'smoothstep',
          animated: true,
          style: {
            stroke: 'var(--color-secondary-500)',
            strokeDasharray: '5,5',
          },
          markerEnd: { type: MarkerType.ArrowClosed },
          data: {
            type: 'event-navigation' as const,
            label: `${navInfo.eventType}${navInfo.condition ? ' (조건부)' : ''}`,
          },
          // 기존 Link 엣지가 있으면 약간 오프셋
          ...(edgeExists && { labelBgPadding: [8, 4], style: { strokeDasharray: '2,2' } }),
        });
      });
    });
  }

  // DataSource → Page 엣지 생성
  if (showDataSources && dataSources.length > 0) {
    dataSources.forEach((dataSource) => {
      // 이 데이터 소스를 사용하는 페이지들
      const pageIds = [...new Set(dataSource.boundElements.map((be) => be.pageId).filter(Boolean))];

      pageIds.forEach((pageId) => {
        edges.push({
          id: `edge-data-${dataSource.id}-page-${pageId}`,
          source: `datasource-${dataSource.id}`,
          target: `page-${pageId}`,
          type: 'smoothstep',
          animated: false,
          style: {
            stroke: 'var(--color-success-500)',
            strokeDasharray: '3,3',
          },
          data: {
            type: 'data-binding' as const,
            label: dataSource.name,
          },
        });
      });
    });
  }

  // 개발 중 그래프 결과 로그
  if (process.env.NODE_ENV === 'development') {
    const navEdgeCount = edges.filter((e) => e.data?.type === 'navigation').length;
    const eventEdgeCount = edges.filter((e) => e.data?.type === 'event-navigation').length;
    console.log('[Workflow] graph built', {
      nodes: nodes.length,
      edges: edges.length,
      navEdgeCount,
      eventEdgeCount,
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

  toggleShowEventLinks: () => {
    set({ showEventLinks: !get().showEventLinks });
    get().buildWorkflowGraph();
  },

  toggleShowLayoutEdges: () => {
    set({ showLayoutEdges: !get().showLayoutEdges });
    get().buildWorkflowGraph();
  },

  toggleShowDataSources: () => {
    set({ showDataSources: !get().showDataSources });
    get().buildWorkflowGraph();
  },

  // Build Graph
  buildWorkflowGraph: () => {
    const { pages, layouts, elements, showLayouts, showNavigationEdges, showEventLinks, showLayoutEdges, showDataSources } = get();

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
      showEventLinks,
      showLayoutEdges,
      showDataSources
    );

    set({ nodes, edges });
  },
}));

// ============================================
// Selectors
// ============================================

export const getWorkflowStore = () => useWorkflowStore.getState();
