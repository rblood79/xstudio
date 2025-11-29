/**
 * Layout/Slot System Type Definitions
 *
 * Layout = 자유로운 Element 트리 + Slot 마커
 * Slot = Layout 내 "Page 내용 삽입 위치" 표시
 * Page = 각 Slot에 맞는 Element들 제공
 */

import type { Element } from "./unified.types";

// ============================================
// Layout
// ============================================

/**
 * Layout 타입 (layouts 테이블)
 */
export interface Layout {
  id: string;
  name: string;
  project_id: string;
  description?: string;

  // Nested Routes & Slug System
  order_num?: number; // 정렬 순서
  slug?: string; // URL base path (e.g., "/products")

  // 404 Page Strategy
  notFoundPageId?: string; // Layout 전용 404 페이지 ID
  inheritNotFound?: boolean; // true면 프로젝트 기본 404 상속 (기본값: true)

  created_at?: string;
  updated_at?: string;
}

/**
 * Layout 생성 시 필요한 필드
 */
export type LayoutCreate = Pick<Layout, "name" | "project_id"> & {
  description?: string;
  order_num?: number; // 정렬 순서
  slug?: string; // URL base path (e.g., "/products")
};

/**
 * Layout 업데이트 시 필요한 필드
 */
export type LayoutUpdate = Partial<
  Pick<Layout, "name" | "description" | "slug" | "order_num" | "notFoundPageId" | "inheritNotFound">
>;

// ============================================
// Slot (Element의 특수 형태)
// ============================================

/**
 * Slot props 타입 (Element.props에 저장)
 * Slot은 tag="Slot"인 Element
 */
export interface SlotProps {
  /** Slot 식별자 (예: "content", "sidebar", "navigation") */
  name: string;

  /** 필수 여부 - true면 Page에서 반드시 채워야 함 */
  required?: boolean;

  /** Slot 설명 (UI 표시용) */
  description?: string;
}

// ============================================
// Element Extensions
// ============================================

/**
 * Element 타입 확장 (기존 Element에 추가되는 필드)
 *
 * 제약조건:
 * - page_id와 layout_id 중 하나만 설정 가능
 * - slot_name은 Page element에만 설정 가능
 */
export interface ElementLayoutFields {
  /** Layout에 속한 요소면 Layout ID (page_id와 상호 배타적) */
  layout_id?: string | null;

  /** Page 요소가 어떤 Slot에 들어갈지 (Page element에만 설정) */
  slot_name?: string | null;
}

// ============================================
// Page Extensions
// ============================================

/**
 * Page 타입 확장 (기존 Page에 추가되는 필드)
 */
export interface PageLayoutFields {
  /** 적용할 Layout ID (optional - 없으면 Layout 없이 렌더링) */
  layout_id?: string | null;
}

// ============================================
// Slot Info (Layout에서 추출)
// ============================================

/**
 * Layout에서 추출한 Slot 정보
 */
export interface SlotInfo {
  name: string; // 고유 식별자 (이름 없으면 slot_${elementId.slice(0,8)})
  displayName: string; // UI 표시용 이름 (이름 없으면 "unnamed")
  required: boolean;
  description?: string;
  elementId: string; // Slot Element의 ID
}

// ============================================
// Resolved Types (Preview용)
// ============================================

/**
 * Slot에 채워진 내용 (Preview 렌더링용)
 */
export interface ResolvedSlotContent {
  slotName: string;
  slotElementId: string;
  pageElements: Element[];
  isEmpty: boolean;
}

/**
 * Layout + Page 합성 결과 (Preview 렌더링용)
 */
export interface LayoutResolutionResult {
  /** 합성된 Element 트리 */
  resolvedTree: ResolvedElement[];

  /** Slot별 내용 매핑 */
  slotContents: Map<string, ResolvedSlotContent>;

  /** 유효성 검사 에러 */
  validationErrors: SlotValidationError[];

  /** Layout 적용 여부 */
  hasLayout: boolean;
}

/**
 * 합성된 Element (렌더링용)
 */
export interface ResolvedElement {
  /** 원본 Element */
  element: Element;

  /** 합성된 자식들 (Slot인 경우 Page elements로 교체됨) */
  children: ResolvedElement[];

  /** Slot이 Page elements로 교체되었는지 */
  isSlotReplaced?: boolean;
}

// ============================================
// Validation
// ============================================

/**
 * Slot 유효성 검사 에러
 */
export interface SlotValidationError {
  slotName: string;
  errorType: "REQUIRED_SLOT_EMPTY" | "INVALID_SLOT_NAME";
  message: string;
}

// ============================================
// Edit Mode
// ============================================

/**
 * 편집 모드 타입
 */
export type EditMode = "page" | "layout";

/**
 * 편집 컨텍스트
 */
export interface EditContext {
  mode: EditMode;
  pageId: string | null;
  layoutId: string | null;
}

// ============================================
// Store Types
// ============================================

/**
 * Layout Store State
 */
export interface LayoutsStoreState {
  /** 현재 프로젝트의 모든 Layout */
  layouts: Layout[];

  /** 현재 편집 중인 Layout ID */
  currentLayoutId: string | null;

  /** 로딩 상태 */
  isLoading: boolean;

  /** 에러 상태 */
  error: Error | null;
}

/**
 * Layout Store Actions
 */
export interface LayoutsStoreActions {
  // CRUD
  fetchLayouts: (projectId: string) => Promise<void>;
  createLayout: (data: LayoutCreate) => Promise<Layout>;
  updateLayout: (id: string, updates: LayoutUpdate) => Promise<void>;
  deleteLayout: (id: string) => Promise<void>;
  duplicateLayout: (id: string) => Promise<Layout>;

  // Selection
  setCurrentLayout: (layoutId: string | null) => void;

  // Utilities
  getLayoutById: (id: string) => Layout | undefined;
  getLayoutSlots: (layoutId: string) => SlotInfo[];
  validateLayoutDelete: (
    id: string
  ) => Promise<{ canDelete: boolean; usedByPages: string[] }>;
}

/**
 * 완전한 Layout Store 타입
 */
export type LayoutsStore = LayoutsStoreState & LayoutsStoreActions;

// ============================================
// Edit Mode Store Types
// ============================================

/**
 * Edit Mode Store State
 */
export interface EditModeStoreState {
  /** 현재 편집 모드 */
  mode: EditMode;

  /** Page 모드일 때 편집 중인 Page ID */
  pageId: string | null;

  /** Layout 모드일 때 편집 중인 Layout ID */
  layoutId: string | null;
}

/**
 * Edit Mode Store Actions
 */
export interface EditModeStoreActions {
  /** Page 편집 모드로 전환 */
  enterPageMode: (pageId: string) => void;

  /** Layout 편집 모드로 전환 */
  enterLayoutMode: (layoutId: string) => void;

  /** 현재 편집 컨텍스트 반환 */
  getEditContext: () => EditContext;

  /** Edit Mode 직접 설정 (탭 전환용) */
  setMode: (mode: EditMode) => void;

  /** 현재 편집 중인 Page ID 설정 */
  setCurrentPageId: (pageId: string | null) => void;

  /** 현재 편집 중인 Layout ID 설정 */
  setCurrentLayoutId: (layoutId: string | null) => void;
}

/**
 * 완전한 Edit Mode Store 타입
 */
export type EditModeStore = EditModeStoreState & EditModeStoreActions;

// ============================================
// Nodes Panel Types
// ============================================

/**
 * Nodes Panel 탭 타입
 */
export type NodesPanelTab = "pages" | "layouts";

/**
 * Pages 탭의 Item
 */
export interface PageTreeItem {
  type: "page" | "element";
  id: string;
  name: string;
  layoutName?: string; // Page에 적용된 Layout 이름
  slotName?: string; // Element의 target slot
  children: PageTreeItem[];
}

/**
 * Layouts 탭의 Item
 */
export interface LayoutTreeItem {
  type: "layout" | "element" | "slot";
  id: string;
  name: string;
  slotProps?: {
    // Slot인 경우
    name: string;
    required: boolean;
  };
  children: LayoutTreeItem[];
}
