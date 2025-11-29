/**
 * Workflow Visualization Types
 *
 * ReactFlow 기반 프로젝트 워크플로우 시각화를 위한 타입 정의
 */

import type { Node, Edge } from 'reactflow';

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
}

// ============================================
// Node Data Types
// ============================================

export interface PageNodeData {
  type: 'page';
  page: WorkflowPage;
  /** 페이지 내 링크 목록 (다른 페이지로의 네비게이션) */
  outgoingLinks: string[];
  /** 이 페이지를 사용하는 Layout ID */
  layoutId?: string | null;
  /** 썸네일 이미지 URL (선택적) */
  thumbnail?: string;
  /** 페이지 요소 개수 */
  elementCount: number;
}

export interface LayoutNodeData {
  type: 'layout';
  layout: WorkflowLayout;
  /** 이 Layout을 사용하는 페이지 ID 목록 */
  pageIds: string[];
  /** Slot 개수 */
  slotCount: number;
}

// ============================================
// ReactFlow Node Types
// ============================================

export type PageNode = Node<PageNodeData, 'page'>;
export type LayoutNode = Node<LayoutNodeData, 'layout'>;
export type WorkflowNode = PageNode | LayoutNode;

// ============================================
// Edge Types
// ============================================

export type EdgeType = 'navigation' | 'layout-usage' | 'parent-child';

export interface WorkflowEdgeData {
  type: EdgeType;
  label?: string;
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
  showLayoutEdges: boolean;
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
  toggleShowLayoutEdges: () => void;

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
