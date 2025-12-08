/**
 * Workflow Visualization Types
 *
 * ReactFlow 기반 프로젝트 워크플로우 시각화를 위한 타입 정의
 */

import type { Node, Edge } from '@xyflow/react';

// ============================================
// Page & Layout Types (from Builder)
// ============================================

export interface WorkflowPage {
  id: string;
  title: string;
  slug: string;
  project_id: string;
  parent_id?: string | null;
  order_num?: number;
  layout_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface WorkflowLayout {
  id: string;
  name: string;
  project_id: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkflowElement {
  id: string;
  tag: string;
  props: Record<string, unknown>;
  parent_id?: string | null;
  page_id?: string | null;
  layout_id?: string | null;
  order_num?: number;
  /** Element events (for navigate action analysis) */
  events?: WorkflowElementEvent[];
  /** DataBinding configuration */
  dataBinding?: WorkflowDataBinding;
}

// ============================================
// DataBinding Types
// ============================================

export interface WorkflowDataBinding {
  /** Binding type */
  type?: 'collection' | 'single' | 'field';
  /** Data source type */
  source?: 'static' | 'api' | 'supabase' | 'dataTable';
  /** Data source name (for dataTable/api) */
  name?: string;
  /** Configuration */
  config?: {
    endpoint?: string;
    baseUrl?: string;
    tableName?: string;
    [key: string]: unknown;
  };
}

/** Extracted data source information */
export interface DataSourceInfo {
  /** Unique identifier for this data source */
  id: string;
  /** Data source type */
  sourceType: 'dataTable' | 'api' | 'supabase' | 'mock';
  /** Name of the data source */
  name: string;
  /** Elements using this data source */
  boundElements: Array<{
    elementId: string;
    elementTag: string;
    pageId: string;
  }>;
}

// ============================================
// Event Types (for navigation analysis)
// ============================================

export interface WorkflowEventAction {
  id: string;
  type: string;
  target?: string;
  /** Config field (new block editor format) */
  config?: {
    path?: string;
    href?: string;
    to?: string;
    url?: string;
    [key: string]: unknown;
  };
  /** Value field (legacy format) */
  value?: {
    path?: string;
    href?: string;
    to?: string;
    url?: string;
    openInNewTab?: boolean;
    replace?: boolean;
    [key: string]: unknown;
  };
  delay?: number;
  condition?: string;
  enabled?: boolean;
}

export interface WorkflowElementEvent {
  id: string;
  event_type: string;
  actions: WorkflowEventAction[];
  enabled: boolean;
  description?: string;
}

/** Information about event-based navigation */
export interface EventNavigationInfo {
  /** Source element ID */
  sourceElementId: string;
  /** Source element tag */
  sourceElementTag: string;
  /** Event type that triggers navigation */
  eventType: string;
  /** Target page ID */
  targetPageId: string;
  /** Action condition (if any) */
  condition?: string;
}

// ============================================
// Node Data Types
// ============================================

export interface PageNodeData {
  type: 'page';
  page: WorkflowPage;
  /** 페이지 내 Link 요소 기반 네비게이션 목록 */
  outgoingLinks: string[];
  /** 페이지 내 Event 기반 네비게이션 목록 */
  outgoingEventLinks: EventNavigationInfo[];
  /** 이 페이지를 사용하는 Layout ID */
  layoutId?: string | null;
  /** 썸네일 이미지 URL (선택적) */
  thumbnail?: string;
  /** 페이지 요소 개수 */
  elementCount: number;
  /** Index signature for @xyflow/react v12 compatibility */
  [key: string]: unknown;
}

export interface LayoutNodeData {
  type: 'layout';
  layout: WorkflowLayout;
  /** 이 Layout을 사용하는 페이지 ID 목록 */
  pageIds: string[];
  /** Slot 개수 */
  slotCount: number;
  /** Index signature for @xyflow/react v12 compatibility */
  [key: string]: unknown;
}

export interface DataSourceNodeData {
  type: 'dataSource';
  dataSource: DataSourceInfo;
  /** 이 데이터 소스를 사용하는 페이지 ID 목록 */
  pageIds: string[];
  /** Index signature for @xyflow/react v12 compatibility */
  [key: string]: unknown;
}

// ============================================
// ReactFlow Node Types
// ============================================

export type PageNode = Node<PageNodeData, 'page'>;
export type LayoutNode = Node<LayoutNodeData, 'layout'>;
export type DataSourceNode = Node<DataSourceNodeData, 'dataSource'>;
export type WorkflowNode = PageNode | LayoutNode | DataSourceNode;

// ============================================
// Edge Types
// ============================================

export type EdgeType = 'navigation' | 'event-navigation' | 'layout-usage' | 'data-binding' | 'parent-child';

export interface WorkflowEdgeData {
  type: EdgeType;
  label?: string;
  /** Index signature for @xyflow/react v12 compatibility */
  [key: string]: unknown;
}

export type WorkflowEdge = Edge<WorkflowEdgeData>;

// ============================================
// Store Types
// ============================================

export interface WorkflowState {
  // Data
  pages: WorkflowPage[];
  layouts: WorkflowLayout[];
  elements: WorkflowElement[];
  projectId: string | null;

  // ReactFlow State
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];

  // UI State
  selectedNodeId: string | null;
  isLoading: boolean;
  error: string | null;

  // View Settings
  showLayouts: boolean;
  showNavigationEdges: boolean;
  showEventLinks: boolean;
  showLayoutEdges: boolean;
  showDataSources: boolean;
}

export interface WorkflowActions {
  // Data Actions
  setProjectId: (projectId: string) => void;
  setPages: (pages: WorkflowPage[]) => void;
  setLayouts: (layouts: WorkflowLayout[]) => void;
  setElements: (elements: WorkflowElement[]) => void;

  // ReactFlow Actions
  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: WorkflowEdge[]) => void;
  onNodesChange: (changes: unknown[]) => void;
  onEdgesChange: (changes: unknown[]) => void;

  // UI Actions
  setSelectedNodeId: (nodeId: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // View Settings Actions
  toggleShowLayouts: () => void;
  toggleShowNavigationEdges: () => void;
  toggleShowEventLinks: () => void;
  toggleShowLayoutEdges: () => void;
  toggleShowDataSources: () => void;

  // Computed Actions
  buildWorkflowGraph: () => void;
}

export type WorkflowStore = WorkflowState & WorkflowActions;

// ============================================
// Message Types (Builder ↔ Workflow)
// ============================================

export interface WorkflowReadyMessage {
  type: 'WORKFLOW_READY';
}

export interface WorkflowInitMessage {
  type: 'WORKFLOW_INIT';
  payload: {
    projectId: string;
    pages: WorkflowPage[];
    layouts: WorkflowLayout[];
    elements: WorkflowElement[];
  };
}

export interface WorkflowUpdateMessage {
  type: 'WORKFLOW_UPDATE';
  payload: {
    pages?: WorkflowPage[];
    layouts?: WorkflowLayout[];
    elements?: WorkflowElement[];
  };
}

export interface WorkflowSelectPageMessage {
  type: 'WORKFLOW_SELECT_PAGE';
  payload: {
    pageId: string;
  };
}

export type WorkflowMessage =
  | WorkflowReadyMessage
  | WorkflowInitMessage
  | WorkflowUpdateMessage
  | WorkflowSelectPageMessage;
