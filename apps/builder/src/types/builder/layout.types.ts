/**
 * Layout/Slot System Type Definitions
 *
 * Layout = 자유로운 Element 트리 + Slot 마커
 * Slot = Layout 내 "Page 내용 삽입 위치" 표시
 * Page = 각 Slot에 맞는 Element들 제공
 *
 * **ADR-903 Migration (Phase 0)**
 *
 * 본 파일의 타입들은 CSS/DOM 기반 빌더 시대에 만든 layout-vs-page 이원화 시스템의
 * 산물이다. Skia canonical 전환(ADR-903) 이후에는 다음과 같이 흡수된다:
 *
 * - `Layout` → canonical `FrameNode` + `reusable: true` 로 흡수 (ADR-903 Phase 3)
 * - `SlotProps` / `tag="Slot"` + `slot_name` → 컨테이너의 `slot?: false | string[]`
 *   schema 속성으로 전환 (ADR-903 Phase 3)
 * - `ElementLayoutFields.layout_id` → page root `type:"ref"` to reusable layout shell
 * - `PageLayoutFields.layout_id` → page root ref 참조로 대체
 * - `useLayoutsStore` (`layouts[]` 별도 저장) → canonical document tree 내부
 *   `reusable: true` 노드 조회 selector로 해체 (ADR-903 Phase 3/Phase 5 G5)
 *
 * Phase 1~3 기간에는 adapter 입력 타입으로만 사용된다.
 * 신규 기능은 canonical format(`composition-document.types.ts`)에만 추가할 것.
 *
 * @see docs/adr/903-ref-descendants-slot-composition-format-migration-plan.md
 * @see packages/shared/src/types/composition-document.types.ts
 */

import type { Element } from "./unified.types";

// ============================================
// Layout
// ============================================

/**
 * Layout 타입 (layouts 테이블)
 *
 * @deprecated ADR-903 P3: canonical 'FrameNode' + 'reusable: true'로 흡수 예정.
 * layouts[] 별도 테이블은 Phase 5 G5 완료 시점에 canonical document tree 내부
 * reusable 노드로 통합. Phase 1~3 기간 adapter 입력 타입으로만 사용.
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
 *
 * @deprecated ADR-903 P3: `createLayout` → `createReusableFrame` 전환 예정.
 * canonical `{ type: "frame", reusable: true, children, slot }` 노드 생성 API로 대체.
 * Phase 1~3 기간 adapter 입력 타입으로만 사용.
 */
export type LayoutCreate = Pick<Layout, "name" | "project_id"> & {
  description?: string;
  order_num?: number; // 정렬 순서
  slug?: string; // URL base path (e.g., "/products")
};

/**
 * Layout 업데이트 시 필요한 필드
 *
 * @deprecated ADR-903 P3: canonical reusable frame 노드의 속성 직접 업데이트로 대체.
 * Phase 1~3 기간 adapter 입력 타입으로만 사용.
 */
export type LayoutUpdate = Partial<
  Pick<
    Layout,
    | "name"
    | "description"
    | "slug"
    | "order_num"
    | "notFoundPageId"
    | "inheritNotFound"
  >
>;

// ============================================
// Slot (Element의 특수 형태)
// ============================================

/**
 * Slot props 타입 (Element.props에 저장)
 * Slot은 tag="Slot"인 Element
 *
 * @deprecated ADR-903 P3: canonical 컨테이너 schema 속성 `slot?: false | string[]`으로
 * 전환. 별도 Slot 특수 노드(`tag="Slot"`) 제거 예정. `name` 필드는 descendants path의
 * key 역할로 흡수. Phase 1~3 기간 adapter 입력 타입으로만 사용.
 */
export interface SlotProps extends Record<string, unknown> {
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
 *
 * @deprecated ADR-903 P3: 두 필드 모두 canonical format으로 흡수 예정.
 * - `layout_id` → page root `type:"ref"` to reusable layout shell
 * - `slot_name` → canonical `descendants[slotPath].children` (mode C)
 * Phase 1~3 기간 adapter 입력 타입으로만 사용.
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
 *
 * @deprecated ADR-903 P3: `layout_id` 외래키 방식 폐기 예정. canonical format에서
 * page는 reusable layout shell의 `type:"ref"` 인스턴스로 표현됨. 외부 `layout_id`
 * 참조 대신 page root 노드 자체에 `ref: "<layoutId>"` 선언. Phase 1~3 기간
 * adapter 입력 타입으로만 사용.
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
 *
 * @deprecated ADR-903 P3: `extractSlotMetaFromNode(FrameNode)` 으로 대체.
 * canonical `FrameNode.slot: string[]` 에서 슬롯 메타 추출.
 * Phase 1~3 기간 adapter 입력 타입으로만 사용.
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
 *
 * @deprecated ADR-903 P3: canonical slot 검증은 resolver 단계에서 처리.
 * `DescendantOverride` 3-mode union 기반 slot resolution 으로 대체.
 * Phase 1~3 기간 adapter 입력 타입으로만 사용.
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
 *
 * @deprecated ADR-903 P3: `selectCanonicalReusableFrames(CompositionDocument)` 으로 대체.
 * `layouts[]` 별도 store 는 canonical document tree 내부 `reusable: true` 노드 조회
 * selector 로 해체 예정 (ADR-903 Phase 3/Phase 5 G5). Phase 1~3 기간
 * adapter 입력 타입으로만 사용.
 */
export interface LayoutsStoreState {
  /** 현재 프로젝트의 모든 Layout */
  layouts: Layout[];

  /**
   * 현재 선택된 reusable frame id (canonical semantics).
   * P3-B: `currentLayoutId` 에서 rename.
   * P3-D 이전까지는 두 필드를 동기화하여 backward-compat 유지.
   */
  selectedReusableFrameId: string | null;

  /**
   * 현재 편집 중인 Layout ID
   *
   * @deprecated ADR-903 P3-B: `selectedReusableFrameId` 로 rename됨.
   * backwards-compat alias — 1 release 잔존. P3-D 완료 후 제거 예정.
   */
  currentLayoutId: string | null;

  /** 로딩 상태 */
  isLoading: boolean;

  /** 에러 상태 */
  error: Error | null;
}

/**
 * Layout Store Actions
 *
 * @deprecated ADR-903 P3: `selectCanonicalReusableFrames(CompositionDocument)` 으로 대체.
 * CRUD actions 는 canonical document tree 내부 reusable frame 노드 직접 조작으로
 * 해체 예정 (ADR-903 Phase 3/Phase 5 G5). Phase 1~3 기간 adapter 입력 타입으로만 사용.
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
    id: string,
  ) => Promise<{ canDelete: boolean; usedByPages: string[] }>;
}

/**
 * 완전한 Layout Store 타입
 *
 * @deprecated ADR-903 P3: `selectCanonicalReusableFrames()` 기반 selector 로 대체.
 * `useLayoutsStore` 사용처는 Phase 3-B Stores 해체 시 canonical document API 로 전환.
 * Phase 1~3 기간 adapter 입력 타입으로만 사용.
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
