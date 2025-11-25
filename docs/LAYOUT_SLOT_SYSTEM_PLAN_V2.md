# Layout/Slot System - 완전한 구현 계획 V2

**작성일:** 2025-11-21
**버전:** 2.0
**우선순위:** 🔴 Critical
**목표:** 자유로운 Layout 구조 + Slot 기반 페이지 컨텐츠 시스템

---

## 목차

1. [Executive Summary](#executive-summary)
2. [핵심 설계 원칙](#핵심-설계-원칙)
3. [Layout 패턴 지원](#layout-패턴-지원)
4. [Nodes Panel UI](#nodes-panel-ui)
5. [Database Schema](#database-schema)
6. [Type Definitions](#type-definitions)
7. [Store Architecture](#store-architecture)
8. [Component Implementation](#component-implementation)
9. [Preview Rendering Engine](#preview-rendering-engine)
10. [Inspector UI](#inspector-ui)
11. [Edit Mode System](#edit-mode-system)
12. [Preview Canvas](#preview-canvas)
13. [Component Palette](#component-palette)
14. [Responsive Layout](#responsive-layout)
15. [History Integration](#history-integration)
16. [Validation System](#validation-system)
17. [Implementation Phases](#implementation-phases)
18. [File Structure](#file-structure)
19. [Success Criteria](#success-criteria)

---

## Executive Summary

### 핵심 개념

```
Layout = 자유로운 Element 트리 + Slot 마커
Slot = Layout 내 "Page 내용 삽입 위치" 표시
Page = 각 Slot에 맞는 Element들 제공
```

### 핵심 흐름

```
1. Layout 생성 → Layout 편집 모드 진입
2. 자유롭게 Element 배치 (header, div, aside, footer 등)
3. CSS Grid/Flexbox로 레이아웃 구조 설계
4. 원하는 위치에 Slot 컴포넌트 배치
5. Page에 Layout 적용
6. Page 편집 모드에서 Element 추가 시 Target Slot 선택
7. Preview에서 Layout + Page 합성 렌더링
```

---

## 핵심 설계 원칙

### 1. Layout = Element 트리 + Slot

```
Layout은 일반 Element들로 구성된 트리이고,
그 중 일부가 Slot으로 지정되어 Page 내용을 받음

Layout "DashboardLayout"
├─ header (일반 Element)
│  ├─ Logo (일반 Element)
│  └─ Navigation (일반 Element)
├─ div.container (일반 Element, CSS Grid)
│  ├─ aside.sidebar (일반 Element)
│  │  └─ Menu (일반 Element)
│  ├─ main (일반 Element)
│  │  ├─ Slot[navigation]    ← 선택적 Slot
│  │  └─ Slot[content]       ← 필수 Slot
│  └─ Slot[aside]            ← 선택적 Slot
└─ footer (일반 Element)
   └─ Copyright (일반 Element)
```

### 2. Slot은 위치 마커

```
Slot의 역할:
- "이 위치에 Page 내용 삽입"을 표시
- Layout 내 어디든 배치 가능
- 중첩 구조 내부에도 배치 가능
- 개수 제한 없음 (1개 이상)
- required 속성으로 필수/선택 구분
```

### 3. Page는 Slot에 내용 제공

```
Page "Dashboard"
├─ BreadcrumbNav (slot_name: "navigation")
├─ DashboardGrid (slot_name: "content")
├─ StatsPanel (slot_name: "content")
└─ QuickActions (slot_name: "aside")

렌더링 결과:
- Slot[navigation] → BreadcrumbNav
- Slot[content] → DashboardGrid, StatsPanel (순서대로)
- Slot[aside] → QuickActions
```

### 4. 고정 영역 vs 가변 영역

| 구분 | 저장 위치 | 편집 | 렌더링 |
|------|-----------|------|--------|
| **고정 영역** (Header, Footer, Sidebar 등) | Layout의 Element | Layout 모드 | 그대로 렌더링 |
| **가변 영역** (Slot) | Layout의 Element (tag=Slot) | Layout 모드에서 위치/이름 설정 | Page elements로 교체 |
| **Page 내용** | Page의 Element (slot_name 지정) | Page 모드 | 해당 Slot 위치에 삽입 |

---

## Layout 패턴 지원

### 지원 가능한 모든 패턴

```
1-1. 수직 3단
┌─────────────────────┐
│ header              │  ← Layout element
├─────────────────────┤
│ Slot[content]       │  ← Page가 채움
├─────────────────────┤
│ footer              │  ← Layout element
└─────────────────────┘

1-2. 수평 2단
┌─────────┬───────────┐
│ aside   │ Slot      │
│ (고정)  │ [content] │
└─────────┴───────────┘

1-3. 복합 3영역
┌─────────────────────┐
│ header              │
├─────────┬───────────┤
│ aside   │ Slot      │
│         │ [content] │
├─────────┴───────────┤
│ footer              │
└─────────────────────┘

1-4. 복합 4영역 (3열)
┌─────────────────────────────┐
│ header                      │
├─────────┬───────────┬───────┤
│ aside   │ Slot      │ aside │
│ .left   │ [content] │ .right│
├─────────┴───────────┴───────┤
│ footer                      │
└─────────────────────────────┘

1-5. 중첩 복합 (다중 Slot)
┌─────────────────────────────────────┐
│ header                              │
├─────────┬───────────────────┬───────┤
│         │ Slot[navigation]  │       │
│ aside   ├───────────────────┤ aside │
│ .left   │ Slot[main]        │ .right│
├─────────┴───────────────────┴───────┤
│ footer                              │
└─────────────────────────────────────┘

대시보드 (다중 Slot)
┌─────────────────────────────────────┐
│ header                              │
├─────────┬───────────────────────────┤
│         │ Slot[toolbar]             │
│ aside   ├───────────┬───────────────┤
│         │ Slot      │ Slot[widgets] │
│         │ [main]    │               │
├─────────┴───────────┴───────────────┤
│ footer                              │
└─────────────────────────────────────┘

랜딩페이지 (전체 자유)
┌─────────────────────────────────────┐
│ Slot[content]                       │
│ (페이지 전체가 Slot)                │
└─────────────────────────────────────┘
```

### Layout 구조 예시 (Element 트리)

```typescript
// 1-5 패턴의 실제 Element 트리
const layout1_5 = {
  id: "layout-1",
  name: "ComplexLayout",
  elements: [
    // Header (고정)
    { id: "e1", tag: "header", parent_id: null, layout_id: "layout-1", props: { className: "react-aria-LayoutHeader" } },
    { id: "e1-1", tag: "Logo", parent_id: "e1", layout_id: "layout-1", props: {} },
    { id: "e1-2", tag: "Nav", parent_id: "e1", layout_id: "layout-1", props: {} },

    // Container (CSS Grid)
    { id: "e2", tag: "div", parent_id: null, layout_id: "layout-1", props: { className: "react-aria-LayoutContainer", style: { display: "grid", gridTemplateColumns: "250px 1fr 200px" } } },

    // Sidebar Left (고정)
    { id: "e2-1", tag: "aside", parent_id: "e2", layout_id: "layout-1", props: { className: "react-aria-LayoutSidebar" } },
    { id: "e2-1-1", tag: "Menu", parent_id: "e2-1", layout_id: "layout-1", props: {} },

    // Main Area (Slot 포함)
    { id: "e2-2", tag: "main", parent_id: "e2", layout_id: "layout-1", props: { className: "react-aria-LayoutMain" } },
    { id: "e2-2-1", tag: "Slot", parent_id: "e2-2", layout_id: "layout-1", props: { name: "navigation", required: false } },
    { id: "e2-2-2", tag: "Slot", parent_id: "e2-2", layout_id: "layout-1", props: { name: "content", required: true } },

    // Sidebar Right (Slot)
    { id: "e2-3", tag: "Slot", parent_id: "e2", layout_id: "layout-1", props: { name: "aside", required: false } },

    // Footer (고정)
    { id: "e3", tag: "footer", parent_id: null, layout_id: "layout-1", props: { className: "react-aria-LayoutFooter" } },
    { id: "e3-1", tag: "Text", parent_id: "e3", layout_id: "layout-1", props: { children: "© 2025" } },
  ]
};
```

---

## Nodes Panel UI

### Pages / Layouts 탭 분리

Nodes Panel에서 Pages와 Layouts를 **탭으로 분리**하여 관리.

```
┌─────────────────────────────────────────┐
│ Nodes                                   │
├───────────────────┬─────────────────────┤
│ [📄 Pages]        │ [📐 Layouts]        │  ← 탭 전환
├───────────────────┴─────────────────────┤
│                                         │
│  (탭 내용)                              │
│                                         │
└─────────────────────────────────────────┘
```

### Pages 탭

Page 편집 모드. Page 목록과 Page elements 표시.

```
┌─────────────────────────────────────────┐
│ [📄 Pages]        │ [📐 Layouts]        │
├─────────────────────────────────────────┤
│ 📄 Home (MainLayout)                    │ ← 적용된 Layout 표시
│    ├─ Hero Section        [content]     │ ← slot_name 표시
│    ├─ Features Grid       [content]     │
│    └─ CTA                 [content]     │
│                                         │
│ 📄 Products (MainLayout)                │
│    ├─ Filter Panel        [sidebar]     │
│    ├─ Product Grid        [content]     │
│    └─ Pagination          [content]     │
│                                         │
│ 📄 Dashboard (DashboardLayout)          │
│    ├─ Breadcrumb          [navigation]  │
│    ├─ Stats Cards         [content]     │
│    └─ Quick Actions       [aside]       │
│                                         │
│ 📄 Landing (No Layout)                  │ ← Layout 없음
│    ├─ Full Hero                         │
│    └─ Full Content                      │
└─────────────────────────────────────────┘
```

**동작:**
- Page 클릭 → Page 선택, Page 편집 모드
- Page 내 Element 클릭 → Element 선택
- Element의 `[slot_name]` 뱃지 표시
- Layout 이름은 Page 옆에 괄호로 표시

### Layouts 탭

Layout 편집 모드. Layout 목록과 Layout elements 표시.

```
┌─────────────────────────────────────────┐
│ [📄 Pages]        │ [📐 Layouts]        │
├─────────────────────────────────────────┤
│ 📐 MainLayout                           │
│    ├─ header                            │
│    │  ├─ Logo                           │
│    │  └─ Navigation                     │
│    ├─ div.container                     │
│    │  ├─ aside.sidebar                  │
│    │  │  └─ Menu                        │
│    │  └─ 🔲 Slot[content] *             │ ← Slot 아이콘 + required 표시
│    └─ footer                            │
│       └─ Copyright                      │
│                                         │
│ 📐 DashboardLayout                      │
│    ├─ header                            │
│    ├─ div.main-container                │
│    │  ├─ aside.sidebar                  │
│    │  ├─ main                           │
│    │  │  ├─ 🔲 Slot[navigation]         │
│    │  │  └─ 🔲 Slot[content] *          │
│    │  └─ 🔲 Slot[aside]                 │
│    └─ footer                            │
│                                         │
│ [+ New Layout]                          │
└─────────────────────────────────────────┘
```

**동작:**
- Layout 클릭 → Layout 선택, Layout 편집 모드 진입
- Layout 내 Element 클릭 → Element 선택 (Layout element)
- Slot은 특별 아이콘 (🔲) + 이름 + required(*) 표시
- `[+ New Layout]` 버튼으로 Layout 생성

### 탭 전환과 Edit Mode 연동

```typescript
// 탭 전환 시 자동 모드 전환
const handleTabChange = (tab: 'pages' | 'layouts') => {
  if (tab === 'pages') {
    // 마지막 선택된 Page로 이동
    setPageMode(lastSelectedPageId);
  } else {
    // 마지막 선택된 Layout으로 이동 (또는 첫 번째)
    setLayoutMode(lastSelectedLayoutId || layouts[0]?.id);
  }
};

// Element 클릭 시 자동 모드 판별
const handleElementClick = (element: Element) => {
  if (element.layout_id) {
    // Layout element → Layout 모드
    setLayoutMode(element.layout_id);
  } else if (element.page_id) {
    // Page element → Page 모드
    setPageMode(element.page_id);
  }
  setSelectedElement(element.id);
};
```

### Layer Tree Item 표시

```typescript
// Pages 탭의 Item
interface PageTreeItem {
  type: 'page' | 'element';
  id: string;
  name: string;
  layoutName?: string;      // Page에 적용된 Layout 이름
  slotName?: string;        // Element의 target slot
  children: PageTreeItem[];
}

// Layouts 탭의 Item
interface LayoutTreeItem {
  type: 'layout' | 'element' | 'slot';
  id: string;
  name: string;
  slotProps?: {             // Slot인 경우
    name: string;
    required: boolean;
  };
  children: LayoutTreeItem[];
}
```

### UI 컴포넌트 구조

```
src/builder/sidebar/
├── NodesPanel.tsx              # 메인 패널 (탭 컨테이너)
├── NodesPanelTabs.tsx          # 탭 UI (Pages / Layouts)
├── PagesTab/
│   ├── PagesTab.tsx            # Pages 탭 컨테이너
│   ├── PageTreeItem.tsx        # Page 항목
│   └── PageElementItem.tsx     # Page element 항목
└── LayoutsTab/
    ├── LayoutsTab.tsx          # Layouts 탭 컨테이너
    ├── LayoutTreeItem.tsx      # Layout 항목
    ├── LayoutElementItem.tsx   # Layout element 항목
    └── SlotItem.tsx            # Slot 특별 표시
```

### CSS Classes

```css
/* 탭 */
.react-aria-NodesPanel-tabs { }
.react-aria-NodesPanel-tab { }
.react-aria-NodesPanel-tab[data-selected] { }

/* Pages 탭 */
.react-aria-PageTreeItem { }
.react-aria-PageTreeItem-layout { }  /* Layout 이름 뱃지 */
.react-aria-PageElementItem { }
.react-aria-PageElementItem-slot { }  /* slot_name 뱃지 */

/* Layouts 탭 */
.react-aria-LayoutTreeItem { }
.react-aria-LayoutElementItem { }
.react-aria-SlotItem { }
.react-aria-SlotItem-name { }
.react-aria-SlotItem-required { }
```

---

## Database Schema

### 테이블 구조

```sql
-- ============================================
-- layouts 테이블 (신규)
-- ============================================
CREATE TABLE layouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT,

  -- 메타데이터
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 제약조건
  CONSTRAINT unique_layout_name_per_project UNIQUE (project_id, name)
);

-- ============================================
-- pages 테이블 수정
-- ============================================
ALTER TABLE pages
ADD COLUMN layout_id UUID REFERENCES layouts(id) ON DELETE SET NULL;

-- Layout 삭제 시 Page의 layout_id는 NULL이 됨
-- Page는 유지되고 Layout 없이 동작

-- ============================================
-- elements 테이블 수정
-- ============================================
ALTER TABLE elements
ADD COLUMN layout_id UUID REFERENCES layouts(id) ON DELETE CASCADE,
ADD COLUMN slot_name TEXT;

-- 제약조건: page_id와 layout_id 중 하나만 설정
ALTER TABLE elements
ADD CONSTRAINT check_element_owner
CHECK (
  (page_id IS NOT NULL AND layout_id IS NULL) OR
  (page_id IS NULL AND layout_id IS NOT NULL)
);

-- 제약조건: slot_name은 Page element에만 설정 가능
ALTER TABLE elements
ADD CONSTRAINT check_slot_name_page_only
CHECK (
  slot_name IS NULL OR page_id IS NOT NULL
);

-- ============================================
-- 인덱스
-- ============================================
CREATE INDEX idx_layouts_project ON layouts(project_id);
CREATE INDEX idx_elements_layout ON elements(layout_id) WHERE layout_id IS NOT NULL;
CREATE INDEX idx_elements_slot ON elements(slot_name) WHERE slot_name IS NOT NULL;
CREATE INDEX idx_pages_layout ON pages(layout_id) WHERE layout_id IS NOT NULL;

-- ============================================
-- RLS (Row Level Security)
-- ============================================
ALTER TABLE layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view layouts in their projects"
  ON layouts FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage layouts in their projects"
  ON layouts FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- ============================================
-- Trigger: updated_at 자동 갱신
-- ============================================
CREATE OR REPLACE FUNCTION update_layout_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_layout_updated_at
  BEFORE UPDATE ON layouts
  FOR EACH ROW
  EXECUTE FUNCTION update_layout_updated_at();
```

### 데이터 관계도

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│  projects   │──1:N─│   layouts   │──1:N─│  elements   │
│             │      │             │      │ (layout_id) │
└─────────────┘      └─────────────┘      └─────────────┘
       │                    │
       │                    │
       │              1:N (optional)
       │                    │
       │              ┌─────┴─────┐
       │              │   pages   │
       └──────1:N─────│(layout_id)│──1:N─┌─────────────┐
                      └───────────┘      │  elements   │
                                         │ (page_id +  │
                                         │  slot_name) │
                                         └─────────────┘
```

---

## Type Definitions

### 파일: `src/types/builder/layout.types.ts`

```typescript
/**
 * Layout/Slot System Type Definitions
 */

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
  created_at?: string;
  updated_at?: string;
}

/**
 * Layout 생성 시 필요한 필드
 */
export type LayoutCreate = Pick<Layout, 'name' | 'project_id'> & {
  description?: string;
};

/**
 * Layout 업데이트 시 필요한 필드
 */
export type LayoutUpdate = Partial<Pick<Layout, 'name' | 'description'>>;

// ============================================
// Slot (Element의 특수 형태)
// ============================================

/**
 * Slot props 타입 (Element.props에 저장)
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
  name: string;
  required: boolean;
  description?: string;
  elementId: string;  // Slot Element의 ID
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
  errorType: 'REQUIRED_SLOT_EMPTY' | 'INVALID_SLOT_NAME';
  message: string;
}

// ============================================
// Edit Mode
// ============================================

/**
 * 편집 모드 타입
 */
export type EditMode = 'page' | 'layout';

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
  getLayoutUsage: (id: string) => Promise<Page[]>;
  validateLayoutDelete: (id: string) => Promise<{ canDelete: boolean; usedByPages: Page[] }>;
}

/**
 * 완전한 Layout Store 타입
 */
export type LayoutsStore = LayoutsStoreState & LayoutsStoreActions;
```

### 파일: `src/types/builder/unified.types.ts` (수정)

```typescript
// 기존 Element 타입에 추가
import type { ElementLayoutFields } from './layout.types';

export interface Element extends ElementLayoutFields {
  id: string;
  tag: string;
  props: Record<string, unknown>;
  page_id: string | null;      // Layout element면 null
  parent_id: string | null;
  order_num: number;
  customId?: string;
  dataBinding?: DataBinding;
  events?: ElementEvent[];
  style?: React.CSSProperties;
  computedStyle?: React.CSSProperties;

  // Layout 관련 (ElementLayoutFields)
  layout_id?: string | null;   // Layout element면 Layout ID
  slot_name?: string | null;   // Page element가 들어갈 Slot 이름
}

// 기존 Page 타입에 추가
import type { PageLayoutFields } from './layout.types';

export interface Page extends PageLayoutFields {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  order_num: number;
  project_id: string;

  // Layout 관련 (PageLayoutFields)
  layout_id?: string | null;   // 적용할 Layout ID
}
```

---

## Store Architecture

### 파일 구조

```
src/builder/stores/
├── layouts.ts                    # Main store
├── editMode.ts                   # Edit mode store
└── utils/
    ├── layoutActions.ts          # Layout CRUD actions (Factory)
    └── layoutHelpers.ts          # Layout utility functions
```

### 파일: `src/builder/stores/utils/layoutActions.ts`

```typescript
/**
 * Layout Store Actions - Factory Pattern
 */

import type { StateCreator } from "zustand";
import type { LayoutsStore, Layout, LayoutCreate, LayoutUpdate, SlotInfo } from "../../../types/builder/layout.types";
import type { Element, Page } from "../../../types/builder/unified.types";
import { supabase } from "../../../lib/supabase";

type SetState = Parameters<StateCreator<LayoutsStore>>[0];
type GetState = Parameters<StateCreator<LayoutsStore>>[1];

// ============================================
// Fetch Layouts
// ============================================

export const createFetchLayouts = (set: SetState, _get: GetState) =>
  async (projectId: string): Promise<void> => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('layouts')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ layouts: data || [], isLoading: false });
    } catch (error) {
      set({ error: error as Error, isLoading: false });
      throw error;
    }
  };

// ============================================
// Create Layout
// ============================================

export const createCreateLayout = (set: SetState, get: GetState) =>
  async (data: LayoutCreate): Promise<Layout> => {
    const newLayout = {
      name: data.name,
      project_id: data.project_id,
      description: data.description || null,
    };

    const { data: created, error } = await supabase
      .from('layouts')
      .insert(newLayout)
      .select()
      .single();

    if (error) throw error;
    if (!created) throw new Error('Failed to create layout');

    // Memory state 업데이트
    set((state) => ({
      layouts: [created, ...state.layouts]
    }));

    // 기본 Slot element 생성 (content)
    const defaultSlot: Partial<Element> = {
      tag: 'Slot',
      layout_id: created.id,
      page_id: null,
      parent_id: null,
      order_num: 0,
      props: {
        name: 'content',
        required: true,
        description: 'Main content area'
      }
    };

    await supabase.from('elements').insert(defaultSlot);

    return created;
  };

// ============================================
// Update Layout
// ============================================

export const createUpdateLayout = (set: SetState, _get: GetState) =>
  async (id: string, updates: LayoutUpdate): Promise<void> => {
    const { error } = await supabase
      .from('layouts')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    set((state) => ({
      layouts: state.layouts.map(layout =>
        layout.id === id ? { ...layout, ...updates } : layout
      )
    }));
  };

// ============================================
// Delete Layout
// ============================================

export const createDeleteLayout = (set: SetState, get: GetState) =>
  async (id: string): Promise<void> => {
    // 삭제 전 검증
    const { usedByPages } = await get().validateLayoutDelete(id);

    if (usedByPages.length > 0) {
      console.warn(`Layout is used by ${usedByPages.length} pages. They will lose their layout.`);
    }

    const { error } = await supabase
      .from('layouts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    set((state) => ({
      layouts: state.layouts.filter(layout => layout.id !== id),
      currentLayoutId: state.currentLayoutId === id ? null : state.currentLayoutId
    }));
  };

// ============================================
// Duplicate Layout
// ============================================

export const createDuplicateLayout = (set: SetState, get: GetState) =>
  async (id: string): Promise<Layout> => {
    const source = get().layouts.find(l => l.id === id);
    if (!source) throw new Error('Layout not found');

    // Layout 복제
    const duplicated = await get().createLayout({
      name: `${source.name} (Copy)`,
      project_id: source.project_id,
      description: source.description || undefined,
    });

    // Layout elements 복제
    const { data: sourceElements } = await supabase
      .from('elements')
      .select('*')
      .eq('layout_id', id);

    if (sourceElements && sourceElements.length > 0) {
      // ID 매핑 (parent_id 참조 유지)
      const idMap = new Map<string, string>();

      const elementsToInsert = sourceElements.map(el => {
        const newId = crypto.randomUUID();
        idMap.set(el.id, newId);
        return {
          ...el,
          id: newId,
          layout_id: duplicated.id,
          page_id: null
        };
      });

      // parent_id 업데이트
      elementsToInsert.forEach(el => {
        if (el.parent_id && idMap.has(el.parent_id)) {
          el.parent_id = idMap.get(el.parent_id)!;
        }
      });

      await supabase.from('elements').insert(elementsToInsert);
    }

    return duplicated;
  };

// ============================================
// Get Layout Slots
// ============================================

export const createGetLayoutSlots = (_set: SetState, _get: GetState) =>
  (layoutId: string, elements: Element[]): SlotInfo[] => {
    // Layout의 Slot elements 찾기
    const slotElements = elements.filter(
      el => el.layout_id === layoutId && el.tag === 'Slot'
    );

    return slotElements.map(el => ({
      name: (el.props?.name as string) || 'unnamed',
      required: (el.props?.required as boolean) || false,
      description: el.props?.description as string | undefined,
      elementId: el.id
    }));
  };

// ============================================
// Validate Layout Delete
// ============================================

export const createValidateLayoutDelete = (_set: SetState, _get: GetState) =>
  async (id: string): Promise<{ canDelete: boolean; usedByPages: Page[] }> => {
    const { data: pages } = await supabase
      .from('pages')
      .select('*')
      .eq('layout_id', id);

    return {
      canDelete: true,
      usedByPages: pages || []
    };
  };

// ============================================
// Get Layout Usage
// ============================================

export const createGetLayoutUsage = (_set: SetState, _get: GetState) =>
  async (id: string): Promise<Page[]> => {
    const { data } = await supabase
      .from('pages')
      .select('*')
      .eq('layout_id', id);

    return data || [];
  };

// ============================================
// Get Layout By ID
// ============================================

export const createGetLayoutById = (_set: SetState, get: GetState) =>
  (id: string): Layout | undefined => {
    return get().layouts.find(l => l.id === id);
  };
```

### 파일: `src/builder/stores/layouts.ts`

```typescript
/**
 * Layouts Zustand Store
 */

import { create } from 'zustand';
import type { LayoutsStore } from '../../types/builder/layout.types';

import {
  createFetchLayouts,
  createCreateLayout,
  createUpdateLayout,
  createDeleteLayout,
  createDuplicateLayout,
  createGetLayoutSlots,
  createValidateLayoutDelete,
  createGetLayoutUsage,
  createGetLayoutById
} from './utils/layoutActions';

export const useLayoutsStore = create<LayoutsStore>((set, get) => ({
  // State
  layouts: [],
  currentLayoutId: null,
  isLoading: false,
  error: null,

  // CRUD Actions
  fetchLayouts: createFetchLayouts(set, get),
  createLayout: createCreateLayout(set, get),
  updateLayout: createUpdateLayout(set, get),
  deleteLayout: createDeleteLayout(set, get),
  duplicateLayout: createDuplicateLayout(set, get),

  // Selection
  setCurrentLayout: (layoutId: string | null) => {
    set({ currentLayoutId: layoutId });
  },

  // Utilities
  getLayoutById: createGetLayoutById(set, get),
  getLayoutSlots: (layoutId: string) => {
    // elements는 외부에서 전달받아야 함 (useStore에서)
    // 이 함수는 Hook에서 사용
    return [];
  },
  getLayoutUsage: createGetLayoutUsage(set, get),
  validateLayoutDelete: createValidateLayoutDelete(set, get)
}));
```

### 파일: `src/builder/stores/editMode.ts`

```typescript
/**
 * Edit Mode Store
 */

import { create } from 'zustand';
import type { EditMode, EditContext } from '../../types/builder/layout.types';

interface EditModeState {
  mode: EditMode;
  context: EditContext;

  // Actions
  setPageMode: (pageId: string) => void;
  setLayoutMode: (layoutId: string) => void;
  clearMode: () => void;
}

export const useEditModeStore = create<EditModeState>((set) => ({
  mode: 'page',
  context: { mode: 'page', pageId: null, layoutId: null },

  setPageMode: (pageId: string) => {
    set({
      mode: 'page',
      context: { mode: 'page', pageId, layoutId: null }
    });
  },

  setLayoutMode: (layoutId: string) => {
    set({
      mode: 'layout',
      context: { mode: 'layout', pageId: null, layoutId }
    });
  },

  clearMode: () => {
    set({
      mode: 'page',
      context: { mode: 'page', pageId: null, layoutId: null }
    });
  }
}));
```

---

## Component Implementation

### 파일: `src/builder/components/Slot.tsx`

```tsx
/**
 * Slot Component
 *
 * Layout 내에서 Page 내용을 받는 위치 마커.
 * Builder에서는 Placeholder 표시, Preview에서는 Page 내용으로 교체.
 */

import React from 'react';
import { tv } from 'tailwind-variants';
import { Layers } from 'lucide-react';

// ============================================
// Styles
// ============================================

const slotStyles = tv({
  base: 'react-aria-Slot',
  variants: {
    required: {
      true: 'required',
      false: ''
    },
    isEmpty: {
      true: 'empty',
      false: ''
    },
    isEditing: {
      true: 'editing',
      false: ''
    }
  }
});

// ============================================
// Props
// ============================================

export interface SlotProps {
  /** Slot 식별자 */
  name: string;

  /** 필수 Slot 여부 */
  required?: boolean;

  /** Slot 설명 */
  description?: string;

  /** 편집 모드 여부 (Builder에서만 true) */
  isEditing?: boolean;

  /** 자식 요소 (Preview에서 Page 내용이 들어옴) */
  children?: React.ReactNode;

  /** 추가 className */
  className?: string;

  /** 추가 style */
  style?: React.CSSProperties;
}

// ============================================
// Component
// ============================================

export function Slot({
  name,
  required = false,
  description,
  isEditing = false,
  children,
  className,
  style
}: SlotProps) {
  const hasChildren = React.Children.count(children) > 0;
  const isEmpty = !hasChildren;

  return (
    <div
      className={slotStyles({ required, isEmpty, isEditing, className })}
      data-slot-name={name}
      data-slot-required={required}
      data-slot-empty={isEmpty}
      style={style}
    >
      {/* Builder Mode: Slot 정보 표시 */}
      {isEditing && (
        <div className="react-aria-Slot-header">
          <Layers size={14} className="react-aria-Slot-icon" />
          <span className="react-aria-Slot-name">
            {name}
            {required && <span className="react-aria-Slot-required">*</span>}
          </span>
          {description && (
            <span className="react-aria-Slot-description">{description}</span>
          )}
        </div>
      )}

      {/* Content Area */}
      <div className="react-aria-Slot-content">
        {hasChildren ? (
          children
        ) : isEditing ? (
          <div className="react-aria-Slot-placeholder">
            <span className="react-aria-Slot-placeholder-text">
              Slot: {name}
            </span>
            <span className="react-aria-Slot-placeholder-hint">
              Pages will fill this area
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
```

### 파일: `src/builder/components/styles/Slot.css`

```css
/**
 * Slot Component Styles
 */

@layer components {
  /* ============================================
   * Slot Container
   * ============================================ */
  .react-aria-Slot {
    position: relative;
    min-height: 60px;
  }

  /* ============================================
   * Slot Header (편집 모드)
   * ============================================ */
  .react-aria-Slot-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--color-primary-50);
    border: 1px solid var(--color-primary-200);
    border-bottom: none;
    border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    font-size: var(--text-xs);
  }

  .react-aria-Slot-icon {
    color: var(--color-primary-500);
    flex-shrink: 0;
  }

  .react-aria-Slot-name {
    font-weight: 600;
    color: var(--color-primary-700);
  }

  .react-aria-Slot-required {
    color: var(--color-error);
    margin-left: 2px;
  }

  .react-aria-Slot-description {
    color: var(--color-primary-500);
    margin-left: auto;
    font-size: var(--text-xs);
  }

  /* ============================================
   * Slot Content
   * ============================================ */
  .react-aria-Slot-content {
    min-height: inherit;
  }

  /* ============================================
   * Empty State (편집 모드)
   * ============================================ */
  .react-aria-Slot.editing.empty .react-aria-Slot-content {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 80px;
    border: 2px dashed var(--color-primary-300);
    border-radius: 0 0 var(--radius-md) var(--radius-md);
    background: var(--color-primary-25);
  }

  .react-aria-Slot-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-md);
    text-align: center;
  }

  .react-aria-Slot-placeholder-text {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--color-primary-600);
  }

  .react-aria-Slot-placeholder-hint {
    font-size: var(--text-xs);
    color: var(--color-primary-400);
  }

  /* ============================================
   * Required Slot Empty Warning
   * ============================================ */
  .react-aria-Slot.required.empty .react-aria-Slot-content {
    border-color: var(--color-warning-400);
    background: var(--color-warning-50);
  }

  .react-aria-Slot.required.empty .react-aria-Slot-placeholder-text {
    color: var(--color-warning-700);
  }

  /* ============================================
   * Editing Mode Hover
   * ============================================ */
  .react-aria-Slot.editing {
    outline: 2px solid transparent;
    outline-offset: 2px;
    transition: outline-color 150ms;
  }

  .react-aria-Slot.editing:hover {
    outline-color: var(--color-primary-300);
  }

  .react-aria-Slot.editing:focus-within {
    outline-color: var(--color-primary-500);
  }

  /* ============================================
   * Drag Over State
   * ============================================ */
  .react-aria-Slot[data-drag-over="true"] {
    outline-color: var(--color-success-500);
  }

  .react-aria-Slot[data-drag-over="true"] .react-aria-Slot-content {
    background: var(--color-success-50);
    border-color: var(--color-success-400);
  }
}
```

### 파일: `src/builder/components/metadata.ts` (추가)

```typescript
// 기존 componentMetadata에 추가

import { Layers } from 'lucide-react';

export const componentMetadata = {
  // ... 기존 컴포넌트

  Slot: {
    displayName: "Slot",
    description: "Page content placeholder within Layout",
    category: "Layout",
    icon: Layers,
    inspector: {
      groups: ["general"],
    },
    hasChildren: true,
    // Layout 편집 모드에서만 추가 가능
    placement: "layout-only",
    // Slot의 기본 props
    defaultProps: {
      name: "content",
      required: false
    }
  },
};
```

---

## Preview Rendering Engine

### 파일: `src/builder/preview/utils/layoutResolver.ts`

```typescript
/**
 * Layout Resolver
 *
 * Layout + Page를 합성하여 최종 Element 트리 생성.
 * 재귀적 트리 탐색으로 중첩된 Slot 처리.
 */

import type {
  Element,
  Page,
  Layout,
  ResolvedElement,
  ResolvedSlotContent,
  SlotValidationError,
  LayoutResolutionResult
} from '../../../types/builder/unified.types';

// ============================================
// Main Resolver
// ============================================

/**
 * Page에 Layout을 적용하여 최종 Element 트리 생성
 */
export function resolveLayoutForPage(
  page: Page | null,
  layout: Layout | null,
  allElements: Element[]
): LayoutResolutionResult {
  // Layout 없으면 기존 방식
  if (!layout || !page?.layout_id) {
    const pageElements = allElements.filter(el => el.page_id === page?.id);
    return {
      resolvedTree: buildElementTree(pageElements, null),
      slotContents: new Map(),
      validationErrors: [],
      hasLayout: false
    };
  }

  // Layout elements
  const layoutElements = allElements.filter(el => el.layout_id === layout.id);

  // Page elements (slot_name별로 그룹화)
  const pageElements = allElements.filter(
    el => el.page_id === page.id && !el.layout_id
  );

  // Slot 정보 추출
  const slots = layoutElements.filter(el => el.tag === 'Slot');

  // Page elements를 slot_name별로 그룹화
  const slotContents = groupElementsBySlot(pageElements, slots);

  // 유효성 검사
  const validationErrors = validateSlots(slots, slotContents);

  // Layout 트리 구축 + Slot 교체
  const resolvedTree = buildResolvedTree(layoutElements, slotContents);

  return {
    resolvedTree,
    slotContents,
    validationErrors,
    hasLayout: true
  };
}

// ============================================
// Element Grouping
// ============================================

function groupElementsBySlot(
  pageElements: Element[],
  slots: Element[]
): Map<string, ResolvedSlotContent> {
  const slotContents = new Map<string, ResolvedSlotContent>();

  // 각 Slot에 대해 초기화
  slots.forEach(slot => {
    const slotName = (slot.props?.name as string) || 'unnamed';
    slotContents.set(slotName, {
      slotName,
      slotElementId: slot.id,
      pageElements: [],
      isEmpty: true
    });
  });

  // Page elements를 해당 Slot에 할당
  // Root elements만 (parent_id가 null이거나 parent가 Page element가 아닌 것)
  const rootPageElements = pageElements.filter(el => {
    if (!el.parent_id) return true;
    // parent가 Page element인지 확인
    return !pageElements.some(p => p.id === el.parent_id);
  });

  rootPageElements.forEach(element => {
    const slotName = element.slot_name || 'content';

    const content = slotContents.get(slotName);
    if (content) {
      content.pageElements.push(element);
      content.isEmpty = false;
    } else {
      // 유효하지 않은 slot_name → 기본 content에 추가
      const defaultContent = slotContents.get('content');
      if (defaultContent) {
        defaultContent.pageElements.push(element);
        defaultContent.isEmpty = false;
      }
    }
  });

  // 각 Slot의 elements를 order_num으로 정렬
  slotContents.forEach(content => {
    content.pageElements.sort((a, b) => a.order_num - b.order_num);
  });

  return slotContents;
}

// ============================================
// Validation
// ============================================

function validateSlots(
  slots: Element[],
  slotContents: Map<string, ResolvedSlotContent>
): SlotValidationError[] {
  const errors: SlotValidationError[] = [];

  slots.forEach(slot => {
    const slotName = (slot.props?.name as string) || 'unnamed';
    const required = slot.props?.required as boolean;

    if (required) {
      const content = slotContents.get(slotName);
      if (!content || content.isEmpty) {
        errors.push({
          slotName,
          errorType: 'REQUIRED_SLOT_EMPTY',
          message: `Required slot "${slotName}" is empty`
        });
      }
    }
  });

  return errors;
}

// ============================================
// Tree Building (재귀)
// ============================================

function buildResolvedTree(
  layoutElements: Element[],
  slotContents: Map<string, ResolvedSlotContent>
): ResolvedElement[] {
  // Root elements (parent_id가 null)
  const roots = layoutElements.filter(el => !el.parent_id);

  return roots
    .sort((a, b) => a.order_num - b.order_num)
    .map(el => buildResolvedElement(el, layoutElements, slotContents));
}

function buildResolvedElement(
  element: Element,
  allLayoutElements: Element[],
  slotContents: Map<string, ResolvedSlotContent>
): ResolvedElement {
  // Slot인 경우: Page elements로 교체
  if (element.tag === 'Slot') {
    const slotName = (element.props?.name as string) || 'unnamed';
    const content = slotContents.get(slotName);

    if (content && !content.isEmpty) {
      // Slot을 Page elements로 교체
      const pageElementTree = buildElementTree(content.pageElements, null);

      return {
        element,
        children: pageElementTree,
        isSlotReplaced: true
      };
    }

    // 비어있는 Slot
    return {
      element,
      children: [],
      isSlotReplaced: false
    };
  }

  // 일반 Element: 자식 재귀 처리
  const children = allLayoutElements
    .filter(el => el.parent_id === element.id)
    .sort((a, b) => a.order_num - b.order_num)
    .map(child => buildResolvedElement(child, allLayoutElements, slotContents));

  return {
    element,
    children,
    isSlotReplaced: false
  };
}

function buildElementTree(
  elements: Element[],
  parentId: string | null
): ResolvedElement[] {
  return elements
    .filter(el => el.parent_id === parentId)
    .sort((a, b) => a.order_num - b.order_num)
    .map(el => ({
      element: el,
      children: buildElementTree(elements, el.id),
      isSlotReplaced: false
    }));
}

// ============================================
// Utility Functions
// ============================================

/**
 * Layout element 여부 확인
 */
export function isLayoutElement(element: Element): boolean {
  return !!element.layout_id && !element.page_id;
}

/**
 * Page element 여부 확인
 */
export function isPageElement(element: Element): boolean {
  return !!element.page_id && !element.layout_id;
}

/**
 * Slot element 여부 확인
 */
export function isSlotElement(element: Element): boolean {
  return element.tag === 'Slot';
}
```

### 파일: `src/builder/preview/hooks/useLayoutResolution.ts`

```typescript
/**
 * useLayoutResolution Hook
 *
 * Preview에서 Layout + Page 합성을 관리하는 Hook.
 */

import { useMemo } from 'react';
import { useStore } from '../../stores';
import { useLayoutsStore } from '../../stores/layouts';
import { resolveLayoutForPage } from '../utils/layoutResolver';
import type { LayoutResolutionResult } from '../../../types/builder/layout.types';

export function useLayoutResolution(pageId: string | null): LayoutResolutionResult {
  const elements = useStore((state) => state.elements);
  const pages = useStore((state) => state.pages);
  const layouts = useLayoutsStore((state) => state.layouts);

  return useMemo(() => {
    if (!pageId) {
      return {
        resolvedTree: [],
        slotContents: new Map(),
        validationErrors: [],
        hasLayout: false
      };
    }

    const page = pages.find(p => p.id === pageId);
    if (!page) {
      return {
        resolvedTree: [],
        slotContents: new Map(),
        validationErrors: [],
        hasLayout: false
      };
    }

    const layout = page.layout_id
      ? layouts.find(l => l.id === page.layout_id) || null
      : null;

    return resolveLayoutForPage(page, layout, elements);
  }, [pageId, elements, pages, layouts]);
}
```

---

## Inspector UI

### 파일: `src/builder/inspector/properties/editors/SlotEditor.tsx`

```tsx
/**
 * Slot Editor
 */

import React from 'react';
import { PropertyInput, PropertySwitch, PropertyCustomId } from '../../components';
import { Layers, FileText } from 'lucide-react';
import { useStore } from '../../../stores';
import type { PropertyEditorProps } from '../types/editorTypes';

export function SlotEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
  const element = useStore((state) => state.elements.find(el => el.id === elementId));
  const customId = element?.customId || '';

  return (
    <div className="react-aria-SlotEditor">
      <PropertyCustomId
        label="ID"
        value={customId}
        elementId={elementId}
        placeholder="slot_main"
      />

      <fieldset className="properties-group">
        <legend>
          <Layers size={14} />
          Slot Settings
        </legend>

        <PropertyInput
          label="Name"
          value={String(currentProps.name || '')}
          onChange={(value) => onUpdate({ name: value })}
          placeholder="content"
          icon={FileText}
          description="Unique identifier (e.g., content, sidebar, navigation)"
        />

        <PropertyInput
          label="Description"
          value={String(currentProps.description || '')}
          onChange={(value) => onUpdate({ description: value })}
          placeholder="Main content area"
          icon={FileText}
        />

        <PropertySwitch
          label="Required"
          isSelected={Boolean(currentProps.required)}
          onChange={(checked) => onUpdate({ required: checked })}
          description="Pages must provide content for this slot"
        />
      </fieldset>
    </div>
  );
}
```

### 파일: `src/builder/inspector/properties/editors/ElementSlotSelector.tsx`

```tsx
/**
 * Element Slot Selector
 *
 * Page Element가 어떤 Slot에 들어갈지 선택하는 UI.
 * Layout이 적용된 Page의 root Element Inspector에 표시.
 */

import React, { useMemo } from 'react';
import { PropertySelect } from '../../components';
import { Layers } from 'lucide-react';
import { useLayoutsStore } from '../../../stores/layouts';
import { useStore } from '../../../stores';
import type { SlotInfo } from '../../../../types/builder/layout.types';

interface ElementSlotSelectorProps {
  elementId: string;
  currentSlotName: string | null;
  onSlotChange: (slotName: string) => void;
}

export function ElementSlotSelector({
  elementId,
  currentSlotName,
  onSlotChange
}: ElementSlotSelectorProps) {
  const element = useStore((state) => state.elements.find(el => el.id === elementId));
  const elements = useStore((state) => state.elements);
  const pages = useStore((state) => state.pages);
  const layouts = useLayoutsStore((state) => state.layouts);

  // Element의 Page → Layout → Slots 찾기
  const slots = useMemo((): SlotInfo[] => {
    if (!element?.page_id) return [];

    const page = pages.find(p => p.id === element.page_id);
    if (!page?.layout_id) return [];

    // Layout의 Slot elements 찾기
    const slotElements = elements.filter(
      el => el.layout_id === page.layout_id && el.tag === 'Slot'
    );

    return slotElements.map(el => ({
      name: (el.props?.name as string) || 'unnamed',
      required: (el.props?.required as boolean) || false,
      description: el.props?.description as string | undefined,
      elementId: el.id
    }));
  }, [element, elements, pages]);

  // Layout이 없거나 Slot이 없으면 표시 안함
  if (slots.length === 0) return null;

  // Root element만 Slot 선택 가능
  const isRootElement = !element?.parent_id ||
    !elements.some(el => el.id === element.parent_id && el.page_id === element.page_id);

  if (!isRootElement) return null;

  const defaultSlot = slots.find(s => s.required) || slots[0];

  return (
    <fieldset className="properties-group">
      <legend>
        <Layers size={14} />
        Slot Assignment
      </legend>

      <PropertySelect
        label="Target Slot"
        value={currentSlotName || defaultSlot?.name || 'content'}
        onChange={onSlotChange}
        options={slots.map(slot => ({
          value: slot.name,
          label: `${slot.name}${slot.required ? ' *' : ''}`
        }))}
        icon={Layers}
        description="Choose which slot this element fills"
      />
    </fieldset>
  );
}
```

### 파일: `src/builder/inspector/properties/editors/PageLayoutSelector.tsx`

```tsx
/**
 * Page Layout Selector
 *
 * Page Inspector에서 Layout 선택.
 */

import React, { useEffect, useMemo } from 'react';
import { PropertySelect } from '../../components';
import { LayoutDashboard, AlertTriangle, Layers } from 'lucide-react';
import { useLayoutsStore } from '../../../stores/layouts';
import { useStore } from '../../../stores';

interface PageLayoutSelectorProps {
  pageId: string;
  currentLayoutId: string | null;
  onLayoutChange: (layoutId: string | null) => void;
}

export function PageLayoutSelector({
  pageId,
  currentLayoutId,
  onLayoutChange
}: PageLayoutSelectorProps) {
  const layouts = useLayoutsStore((state) => state.layouts);
  const fetchLayouts = useLayoutsStore((state) => state.fetchLayouts);
  const currentProjectId = useStore((state) => state.currentProjectId);
  const elements = useStore((state) => state.elements);

  // Layouts 로드
  useEffect(() => {
    if (currentProjectId) {
      fetchLayouts(currentProjectId);
    }
  }, [currentProjectId, fetchLayouts]);

  // 선택된 Layout의 Slots
  const selectedLayoutSlots = useMemo(() => {
    if (!currentLayoutId) return [];

    return elements
      .filter(el => el.layout_id === currentLayoutId && el.tag === 'Slot')
      .map(el => ({
        name: (el.props?.name as string) || 'unnamed',
        required: (el.props?.required as boolean) || false
      }));
  }, [currentLayoutId, elements]);

  const handleChange = (value: string) => {
    onLayoutChange(value || null);
  };

  return (
    <fieldset className="properties-group">
      <legend>
        <LayoutDashboard size={14} />
        Layout
      </legend>

      <PropertySelect
        label="Page Layout"
        value={currentLayoutId || ''}
        onChange={handleChange}
        options={[
          { value: '', label: 'None (No Layout)' },
          ...layouts.map(layout => ({
            value: layout.id,
            label: layout.name
          }))
        ]}
        icon={LayoutDashboard}
      />

      {/* 선택된 Layout의 Slot 정보 */}
      {currentLayoutId && selectedLayoutSlots.length > 0 && (
        <div className="react-aria-PageLayoutSelector-info">
          <div className="react-aria-PageLayoutSelector-slots">
            <Layers size={12} />
            <span>Slots:</span>
            {selectedLayoutSlots.map(slot => (
              <span key={slot.name} className="react-aria-PageLayoutSelector-slot">
                {slot.name}
                {slot.required && <span className="required">*</span>}
              </span>
            ))}
          </div>

          {selectedLayoutSlots.some(s => s.required) && (
            <div className="react-aria-PageLayoutSelector-warning">
              <AlertTriangle size={12} />
              <span>* Required slots must have content</span>
            </div>
          )}
        </div>
      )}
    </fieldset>
  );
}
```

---

## Edit Mode System

### 파일: `src/builder/hooks/useLayoutEditMode.ts`

```typescript
/**
 * useLayoutEditMode Hook
 *
 * Layout 편집 모드 관리.
 */

import { useCallback, useMemo } from 'react';
import { useStore } from '../stores';
import { useLayoutsStore } from '../stores/layouts';
import { useEditModeStore } from '../stores/editMode';
import type { Element } from '../../types/builder/unified.types';

export function useLayoutEditMode() {
  const mode = useEditModeStore((state) => state.mode);
  const context = useEditModeStore((state) => state.context);
  const setPageMode = useEditModeStore((state) => state.setPageMode);
  const setLayoutMode = useEditModeStore((state) => state.setLayoutMode);

  const elements = useStore((state) => state.elements);
  const layouts = useLayoutsStore((state) => state.layouts);

  // 현재 편집 중인 Layout
  const currentLayout = useMemo(() => {
    if (mode !== 'layout' || !context.layoutId) return null;
    return layouts.find(l => l.id === context.layoutId) || null;
  }, [mode, context.layoutId, layouts]);

  // 현재 모드에서 표시할 Elements
  const visibleElements = useMemo((): Element[] => {
    if (mode === 'layout' && context.layoutId) {
      // Layout 모드: Layout elements만
      return elements.filter(el => el.layout_id === context.layoutId);
    }

    if (mode === 'page' && context.pageId) {
      // Page 모드: Page elements만
      return elements.filter(el => el.page_id === context.pageId);
    }

    return [];
  }, [mode, context, elements]);

  // Layout의 Slot 목록
  const layoutSlots = useMemo(() => {
    if (!context.layoutId) return [];

    return elements
      .filter(el => el.layout_id === context.layoutId && el.tag === 'Slot')
      .map(el => ({
        name: (el.props?.name as string) || 'unnamed',
        required: (el.props?.required as boolean) || false,
        description: el.props?.description as string | undefined,
        elementId: el.id
      }));
  }, [context.layoutId, elements]);

  // Layout 편집 모드 진입
  const enterLayoutEditMode = useCallback((layoutId: string) => {
    setLayoutMode(layoutId);
  }, [setLayoutMode]);

  // Page 편집 모드로 복귀
  const exitLayoutEditMode = useCallback((pageId: string) => {
    setPageMode(pageId);
  }, [setPageMode]);

  // Element 생성 시 context 정보
  const getElementCreationContext = useCallback(() => {
    if (mode === 'layout' && context.layoutId) {
      return {
        layout_id: context.layoutId,
        page_id: null,
        slot_name: null
      };
    }

    if (mode === 'page' && context.pageId) {
      // 기본 slot_name 설정 (Layout이 있으면)
      const defaultSlot = layoutSlots.find(s => s.required) || layoutSlots[0];

      return {
        layout_id: null,
        page_id: context.pageId,
        slot_name: defaultSlot?.name || null
      };
    }

    return { layout_id: null, page_id: null, slot_name: null };
  }, [mode, context, layoutSlots]);

  return {
    mode,
    context,
    currentLayout,
    visibleElements,
    layoutSlots,
    isLayoutMode: mode === 'layout',
    isPageMode: mode === 'page',
    enterLayoutEditMode,
    exitLayoutEditMode,
    getElementCreationContext
  };
}
```

---

## Preview Canvas

### Page 모드 vs Layout 모드

Preview Canvas는 현재 Edit Mode에 따라 다르게 표시.

```
┌─────────────────────────────────────────────────────────────┐
│ [Page Mode] Home - using MainLayout                         │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ header (Layout - 읽기 전용)                     🔒     │ │
│ │  Logo | Navigation                                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Slot[content] 영역                              ✏️     │ │
│ │  ┌───────────────────────────────────────────────────┐  │ │
│ │  │ Hero Section (Page element)                      │  │ │
│ │  └───────────────────────────────────────────────────┘  │ │
│ │  ┌───────────────────────────────────────────────────┐  │ │
│ │  │ Features Grid (Page element)                     │  │ │
│ │  └───────────────────────────────────────────────────┘  │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ footer (Layout - 읽기 전용)                     🔒     │ │
│ │  Copyright 2025                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

🔒 = Layout 영역 (클릭 불가, 회색 오버레이)
✏️ = 편집 가능 영역 (Page elements)
```

```
┌─────────────────────────────────────────────────────────────┐
│ [Layout Mode] Editing: MainLayout                           │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ header (편집 가능)                              ✏️     │ │
│ │  Logo | Navigation                                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔲 Slot[content] *                              ✏️     │ │
│ │  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │ │
│ │    Pages will fill this area                           │ │
│ │  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ footer (편집 가능)                              ✏️     │ │
│ │  Copyright 2025                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

🔲 = Slot placeholder (점선 테두리)
✏️ = 모든 요소 편집 가능
```

### 시각적 구분

```css
/* Page 모드: Layout 영역 표시 */
.react-aria-LayoutRegion {
  position: relative;
}

.react-aria-LayoutRegion::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--color-gray-500);
  opacity: 0.1;
  pointer-events: none;
}

.react-aria-LayoutRegion-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: var(--text-xs);
  color: var(--color-gray-500);
}

/* Layout 모드: Slot placeholder */
.react-aria-Slot.editing {
  border: 2px dashed var(--color-primary-400);
  background: var(--color-primary-50);
}
```

---

## Component Palette

### Edit Mode별 컴포넌트 필터링

Component Palette는 현재 Edit Mode에 따라 다른 컴포넌트 표시.

```
┌─────────────────────────────────┐
│ Components                      │
├─────────────────────────────────┤
│                                 │
│ [Page Mode]                     │
│ ├─ Layout                       │
│ │  └─ (Slot 표시 안 함)         │  ← Slot은 Layout 모드에서만
│ ├─ Buttons                      │
│ ├─ Forms                        │
│ ├─ Data Display                 │
│ └─ ...                          │
│                                 │
│ [Layout Mode]                   │
│ ├─ Layout                       │
│ │  └─ 🔲 Slot                   │  ← Layout 모드에서만 표시
│ ├─ Structure                    │
│ │  ├─ div                       │
│ │  ├─ header                    │
│ │  ├─ footer                    │
│ │  ├─ aside                     │
│ │  ├─ main                      │
│ │  └─ section                   │
│ ├─ Buttons                      │
│ ├─ Navigation                   │
│ └─ ...                          │
│                                 │
└─────────────────────────────────┘
```

### 컴포넌트 필터링 로직

```typescript
// Component Palette 필터링
function getAvailableComponents(mode: EditMode): ComponentDefinition[] {
  const allComponents = getAllComponents();

  return allComponents.filter(component => {
    // Slot은 Layout 모드에서만
    if (component.tag === 'Slot') {
      return mode === 'layout';
    }

    // Layout 전용 컴포넌트
    if (component.placement === 'layout-only') {
      return mode === 'layout';
    }

    // 나머지는 모두 표시
    return true;
  });
}
```

### Element 추가 시 자동 설정

```typescript
// Element 추가 시 context 자동 설정
function addElementWithContext(tag: string) {
  const { mode, context } = useEditModeStore.getState();

  const newElement = {
    tag,
    // Layout 모드: layout_id 설정
    layout_id: mode === 'layout' ? context.layoutId : null,
    page_id: mode === 'page' ? context.pageId : null,
    // Page 모드: 기본 slot_name 설정
    slot_name: mode === 'page' ? getDefaultSlotName() : null,
  };

  addElement(newElement);
}

function getDefaultSlotName(): string {
  // Page에 적용된 Layout의 첫 번째 required slot
  const layout = getCurrentPageLayout();
  if (!layout) return 'content';

  const requiredSlot = layout.slots.find(s => s.required);
  return requiredSlot?.name || 'content';
}
```

---

## Responsive Layout

### 브레이크포인트 정의

표준 브레이크포인트 시스템 도입.

```typescript
// src/types/builder/responsive.types.ts

/**
 * 브레이크포인트 정의
 */
export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

export const BREAKPOINTS: Record<Breakpoint, { min: number; max: number; label: string }> = {
  desktop: { min: 1280, max: Infinity, label: 'Desktop (≥1280px)' },
  tablet: { min: 768, max: 1279, label: 'Tablet (768-1279px)' },
  mobile: { min: 0, max: 767, label: 'Mobile (<768px)' }
};

/**
 * 반응형 값 타입 - 브레이크포인트별 다른 값
 */
export type ResponsiveValue<T> = T | {
  desktop?: T;
  tablet?: T;
  mobile?: T;
};
```

### Slot 반응형 표시/숨김

Slot에 `visibility` prop 추가하여 브레이크포인트별 표시/숨김 제어.

```typescript
// Slot props 확장
export interface SlotProps {
  name: string;
  required?: boolean;
  description?: string;

  // 반응형 표시 제어
  visibility?: ResponsiveValue<boolean>;
  // 예: { desktop: true, tablet: true, mobile: false }
  // 또는 단순히: true (모든 브레이크포인트)
}
```

**사용 예시:**

```
Layout "MainLayout"
├─ header                              [all]
├─ div.container
│  ├─ Slot[sidebar]                    [desktop, tablet] ← 모바일에서 숨김
│  └─ Slot[content]                    [all]
└─ footer                              [all]

Desktop (≥1280px):    Header | Sidebar | Content | Footer
Tablet (768-1279px):  Header | Sidebar | Content | Footer
Mobile (<768px):      Header | Content | Footer (Sidebar 숨김)
```

### Layout Element 반응형 속성

Layout의 모든 Element에 반응형 속성 지원.

```typescript
// Element props 확장
export interface ElementResponsiveProps {
  // 표시/숨김
  visibility?: ResponsiveValue<boolean>;

  // 순서 변경 (CSS order)
  order?: ResponsiveValue<number>;

  // 크기
  width?: ResponsiveValue<string>;
  height?: ResponsiveValue<string>;

  // Grid/Flex 속성
  gridColumn?: ResponsiveValue<string>;
  gridRow?: ResponsiveValue<string>;
  flexDirection?: ResponsiveValue<'row' | 'column'>;
}
```

**사용 예시:**

```typescript
// 3열 → 2열 → 1열 반응형 레이아웃
const containerElement = {
  tag: 'div',
  props: {
    className: 'layout-container',
    style: {
      display: 'grid',
      gridTemplateColumns: {
        desktop: '250px 1fr 200px',  // 3열
        tablet: '200px 1fr',          // 2열
        mobile: '1fr'                 // 1열
      },
      gap: {
        desktop: '24px',
        tablet: '16px',
        mobile: '12px'
      }
    }
  }
};
```

### 반응형 Layout 패턴

#### 패턴 1: Sidebar 숨김 (가장 일반적)

```
Desktop/Tablet:
┌─────────────────────────────────────┐
│ header                              │
├─────────┬───────────────────────────┤
│ sidebar │ content                   │
├─────────┴───────────────────────────┤
│ footer                              │
└─────────────────────────────────────┘

Mobile:
┌─────────────────────────────────────┐
│ header                              │
├─────────────────────────────────────┤
│ content                             │
├─────────────────────────────────────┤
│ footer                              │
└─────────────────────────────────────┘
```

**구현:**
```typescript
// Sidebar Slot - 모바일에서 숨김
{ tag: 'Slot', props: { name: 'sidebar', visibility: { desktop: true, tablet: true, mobile: false } } }
```

#### 패턴 2: 순서 변경

```
Desktop:
┌─────────┬───────────────────────────┐
│ sidebar │ content                   │
└─────────┴───────────────────────────┘

Mobile:
┌─────────────────────────────────────┐
│ content                             │
├─────────────────────────────────────┤
│ sidebar (아래로 이동)               │
└─────────────────────────────────────┘
```

**구현:**
```typescript
// Container - 모바일에서 세로 방향
{ tag: 'div', props: {
  style: {
    display: 'flex',
    flexDirection: { desktop: 'row', mobile: 'column' }
  }
}}

// Content - 모바일에서 먼저 표시
{ tag: 'Slot', props: { name: 'content', order: { desktop: 2, mobile: 1 } } }

// Sidebar - 모바일에서 나중에 표시
{ tag: 'Slot', props: { name: 'sidebar', order: { desktop: 1, mobile: 2 } } }
```

#### 패턴 3: Grid 열 변경

```
Desktop (4열):
┌───────┬───────┬───────┬───────┐
│ slot1 │ slot2 │ slot3 │ slot4 │
└───────┴───────┴───────┴───────┘

Tablet (2열):
┌───────────────┬───────────────┐
│ slot1         │ slot2         │
├───────────────┼───────────────┤
│ slot3         │ slot4         │
└───────────────┴───────────────┘

Mobile (1열):
┌───────────────────────────────┐
│ slot1                         │
├───────────────────────────────┤
│ slot2                         │
├───────────────────────────────┤
│ slot3                         │
├───────────────────────────────┤
│ slot4                         │
└───────────────────────────────┘
```

**구현:**
```typescript
{ tag: 'div', props: {
  style: {
    display: 'grid',
    gridTemplateColumns: {
      desktop: 'repeat(4, 1fr)',
      tablet: 'repeat(2, 1fr)',
      mobile: '1fr'
    }
  }
}}
```

### CSS 생성 로직

반응형 값을 CSS 미디어 쿼리로 변환.

```typescript
// src/builder/utils/responsiveCSS.ts

/**
 * ResponsiveValue를 CSS로 변환
 */
export function generateResponsiveCSS(
  selector: string,
  property: string,
  value: ResponsiveValue<string | number>
): string {
  if (typeof value !== 'object' || value === null) {
    // 단일 값
    return `${selector} { ${property}: ${value}; }`;
  }

  // 브레이크포인트별 CSS
  let css = '';

  // Desktop (기본값)
  if (value.desktop !== undefined) {
    css += `${selector} { ${property}: ${value.desktop}; }\n`;
  }

  // Tablet
  if (value.tablet !== undefined) {
    css += `@media (max-width: 1279px) {
      ${selector} { ${property}: ${value.tablet}; }
    }\n`;
  }

  // Mobile
  if (value.mobile !== undefined) {
    css += `@media (max-width: 767px) {
      ${selector} { ${property}: ${value.mobile}; }
    }\n`;
  }

  return css;
}

/**
 * Element의 반응형 스타일을 CSS로 변환
 */
export function generateElementResponsiveCSS(
  elementId: string,
  style: Record<string, ResponsiveValue<unknown>>
): string {
  const selector = `[data-element-id="${elementId}"]`;
  let css = '';

  for (const [property, value] of Object.entries(style)) {
    css += generateResponsiveCSS(selector, property, value as ResponsiveValue<string>);
  }

  return css;
}
```

### Preview 브레이크포인트 테스트

Preview에서 브레이크포인트별 미리보기 지원.

```
┌─────────────────────────────────────────────────────────────┐
│ Preview                    [🖥️ Desktop] [📱 Tablet] [📱 Mobile] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │    (현재 브레이크포인트에 맞는 레이아웃 표시)       │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  현재: Desktop (1280px)                                     │
└─────────────────────────────────────────────────────────────┘
```

```typescript
// Preview 브레이크포인트 상태
interface PreviewState {
  breakpoint: Breakpoint;
  width: number;
}

// 브레이크포인트 전환
const handleBreakpointChange = (breakpoint: Breakpoint) => {
  const widths: Record<Breakpoint, number> = {
    desktop: 1440,
    tablet: 1024,
    mobile: 375
  };

  setPreviewState({
    breakpoint,
    width: widths[breakpoint]
  });
};
```

### Inspector UI - 반응형 편집

Slot/Element 속성 편집 시 브레이크포인트별 값 설정.

```
┌─────────────────────────────────────┐
│ Slot: sidebar                       │
├─────────────────────────────────────┤
│                                     │
│ Visibility                          │
│ ┌─────────┬─────────┬─────────┐     │
│ │ 🖥️ ✅   │ 📱 ✅   │ 📱 ❌   │     │
│ │ Desktop │ Tablet  │ Mobile  │     │
│ └─────────┴─────────┴─────────┘     │
│                                     │
│ ℹ️ Hidden on Mobile                 │
│                                     │
└─────────────────────────────────────┘
```

```tsx
// ResponsiveVisibilityEditor.tsx
export function ResponsiveVisibilityEditor({
  value,
  onChange
}: {
  value: ResponsiveValue<boolean>;
  onChange: (value: ResponsiveValue<boolean>) => void;
}) {
  const breakpoints: Breakpoint[] = ['desktop', 'tablet', 'mobile'];

  const getValue = (bp: Breakpoint): boolean => {
    if (typeof value === 'boolean') return value;
    return value[bp] ?? true;
  };

  const handleToggle = (bp: Breakpoint) => {
    const current = getValue(bp);
    const newValue = typeof value === 'boolean'
      ? { desktop: value, tablet: value, mobile: value, [bp]: !current }
      : { ...value, [bp]: !current };
    onChange(newValue);
  };

  return (
    <div className="react-aria-ResponsiveVisibilityEditor">
      {breakpoints.map(bp => (
        <button
          key={bp}
          className={getValue(bp) ? 'active' : 'inactive'}
          onClick={() => handleToggle(bp)}
        >
          {bp === 'desktop' ? '🖥️' : '📱'}
          {getValue(bp) ? '✅' : '❌'}
          <span>{bp}</span>
        </button>
      ))}
    </div>
  );
}
```

### Type Definitions 추가

```typescript
// src/types/builder/responsive.types.ts

export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

export const BREAKPOINTS = {
  desktop: { min: 1280, max: Infinity, label: 'Desktop' },
  tablet: { min: 768, max: 1279, label: 'Tablet' },
  mobile: { min: 0, max: 767, label: 'Mobile' }
} as const;

export type ResponsiveValue<T> = T | Partial<Record<Breakpoint, T>>;

// Slot props 확장
export interface SlotResponsiveProps {
  visibility?: ResponsiveValue<boolean>;
  order?: ResponsiveValue<number>;
}

// Element style 확장
export interface ResponsiveStyle {
  display?: ResponsiveValue<string>;
  flexDirection?: ResponsiveValue<'row' | 'column' | 'row-reverse' | 'column-reverse'>;
  gridTemplateColumns?: ResponsiveValue<string>;
  gridTemplateRows?: ResponsiveValue<string>;
  gap?: ResponsiveValue<string>;
  padding?: ResponsiveValue<string>;
  margin?: ResponsiveValue<string>;
  width?: ResponsiveValue<string>;
  height?: ResponsiveValue<string>;
  order?: ResponsiveValue<number>;
}
```

### Preview Rendering 수정

```typescript
// layoutResolver.ts 수정

export function resolveLayoutForPage(
  page: Page | null,
  layout: Layout | null,
  allElements: Element[],
  currentBreakpoint: Breakpoint  // 추가
): LayoutResolutionResult {
  // ...

  // Slot visibility 체크
  const isSlotVisible = (slot: Element): boolean => {
    const visibility = slot.props?.visibility as ResponsiveValue<boolean> | undefined;

    if (visibility === undefined) return true;
    if (typeof visibility === 'boolean') return visibility;

    return visibility[currentBreakpoint] ?? true;
  };

  // 보이는 Slot만 처리
  const visibleSlots = slots.filter(isSlotVisible);

  // ...
}
```

### Database 변경 없음

반응형 속성은 기존 `props` JSONB 필드에 저장.

```json
// Element props 예시
{
  "name": "sidebar",
  "required": false,
  "visibility": {
    "desktop": true,
    "tablet": true,
    "mobile": false
  }
}
```

---

## History Integration

History 시스템은 기존 History Store를 활용하여 Layout 작업도 Undo/Redo 지원.

### Layout 관련 History Entry 타입

```typescript
// Layout CRUD
type: 'CREATE_LAYOUT' | 'UPDATE_LAYOUT' | 'DELETE_LAYOUT' | 'DUPLICATE_LAYOUT'

// Layout Element 작업 (기존 Element history 재사용)
type: 'ADD_ELEMENT' | 'UPDATE_ELEMENT' | 'REMOVE_ELEMENT'
// → layout_id 필드로 Layout element 구분
```

---

## Validation System

### 파일: `src/builder/utils/layoutValidation.ts`

```typescript
/**
 * Layout Validation Utilities
 */

import type { Element, SlotValidationError } from '../../types/builder/unified.types';

/**
 * Page의 Slot 유효성 검사
 */
export function validatePageSlots(
  layoutElements: Element[],
  pageElements: Element[]
): SlotValidationError[] {
  const errors: SlotValidationError[] = [];

  // Layout의 Slot 목록
  const slots = layoutElements.filter(el => el.tag === 'Slot');

  slots.forEach(slot => {
    const slotName = (slot.props?.name as string) || 'unnamed';
    const required = slot.props?.required as boolean;

    if (required) {
      // Page elements 중 이 Slot을 채우는 요소 확인
      const hasContent = pageElements.some(el => el.slot_name === slotName);

      if (!hasContent) {
        errors.push({
          slotName,
          errorType: 'REQUIRED_SLOT_EMPTY',
          message: `Required slot "${slotName}" has no content`
        });
      }
    }
  });

  // 유효하지 않은 slot_name 검사
  const validSlotNames = new Set(
    slots.map(el => (el.props?.name as string) || 'unnamed')
  );

  pageElements.forEach(el => {
    if (el.slot_name && !validSlotNames.has(el.slot_name)) {
      errors.push({
        slotName: el.slot_name,
        errorType: 'INVALID_SLOT_NAME',
        message: `Element references non-existent slot "${el.slot_name}"`
      });
    }
  });

  return errors;
}

/**
 * Slot 이름 유효성 검사
 */
export function validateSlotName(name: string): string | null {
  if (!name || name.trim() === '') {
    return 'Slot name is required';
  }

  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
    return 'Slot name must start with a letter and contain only letters, numbers, hyphens, underscores';
  }

  const reserved = ['children', 'props', 'style', 'className', 'key', 'ref'];
  if (reserved.includes(name)) {
    return `"${name}" is a reserved name`;
  }

  return null;
}

/**
 * 사용자 친화적 에러 메시지
 */
export function formatValidationError(error: SlotValidationError): string {
  switch (error.errorType) {
    case 'REQUIRED_SLOT_EMPTY':
      return `The "${error.slotName}" slot requires content.`;
    case 'INVALID_SLOT_NAME':
      return `Slot "${error.slotName}" doesn't exist in the layout.`;
    default:
      return error.message;
  }
}
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2) 🔴 Critical

| Task | Files |
|------|-------|
| Database Schema | SQL migrations |
| Type Definitions | `layout.types.ts`, `unified.types.ts` |
| Layouts Store | `layouts.ts`, `layoutActions.ts` |
| Edit Mode Store | `editMode.ts` |
| Slot Component | `Slot.tsx`, `Slot.css` |

**완료 기준:**
- [ ] layouts 테이블 생성
- [ ] elements에 layout_id, slot_name 추가
- [ ] pages에 layout_id 추가
- [ ] Layout CRUD 작동
- [ ] Slot 컴포넌트 렌더링

### Phase 2: Preview Rendering (Week 3) 🟡 High

| Task | Files |
|------|-------|
| Layout Resolver | `layoutResolver.ts` |
| useLayoutResolution | `useLayoutResolution.ts` |
| Preview Integration | `preview/index.tsx` 수정 |
| Renderer Updates | `renderers/*.tsx` 수정 |

**완료 기준:**
- [ ] Layout + Page 합성 렌더링
- [ ] 중첩된 Slot 처리
- [ ] Layout 없는 Page 정상 작동

### Phase 3: Inspector UI (Week 4) 🟡 High

| Task | Files |
|------|-------|
| Slot Editor | `SlotEditor.tsx` |
| Page Layout Selector | `PageLayoutSelector.tsx` |
| Element Slot Selector | `ElementSlotSelector.tsx` |
| Layout Manager Panel | `LayoutsPanel.tsx` |

**완료 기준:**
- [ ] Layout 선택 UI
- [ ] Slot 속성 편집
- [ ] Element의 Slot 선택
- [ ] Layout 관리 패널

### Phase 4: Nodes Panel & Edit Mode (Week 5) 🟢 Medium

| Task | Files |
|------|-------|
| Nodes Panel 탭 분리 | `NodesPanel.tsx`, `NodesPanelTabs.tsx` |
| Pages 탭 | `PagesTab/*.tsx` |
| Layouts 탭 | `LayoutsTab/*.tsx` |
| useLayoutEditMode | `useLayoutEditMode.ts` |
| Validation UI | 각 Editor에 경고 표시 |

**완료 기준:**
- [ ] Pages / Layouts 탭 분리
- [ ] 탭 전환 시 Edit Mode 자동 전환
- [ ] Page element에 slot_name 뱃지 표시
- [ ] Layout element에 Slot 아이콘 표시
- [ ] Required Slot 경고

### Phase 5: Polish & Templates (Week 6) 🟢 Low

| Task | Files |
|------|-------|
| Layout Templates | `layoutTemplates.ts` |
| Preview Canvas Mode 표시 | `preview/index.tsx` |
| Component Palette 필터링 | `ComponentPalette.tsx` |

**완료 기준:**
- [ ] 기본 Layout 템플릿 (3단, 2단, 대시보드 등)
- [ ] Preview에서 Layout 영역 시각적 구분
- [ ] Layout 모드에서만 Slot 컴포넌트 추가 가능

### Phase 6: Responsive Layout (Week 7-8) 🟡 High

| Task | Files |
|------|-------|
| Responsive Types | `responsive.types.ts` |
| Breakpoint Context | `BreakpointProvider.tsx`, `useBreakpoint.ts` |
| Responsive CSS Generator | `responsiveCSS.ts` |
| Slot Visibility Editor | `ResponsiveVisibilityEditor.tsx` |
| Element Responsive Props | `ResponsivePropsEditor.tsx` |
| Preview Breakpoint Tester | `BreakpointTester.tsx` |

**완료 기준:**
- [ ] 3단계 Breakpoint 지원 (desktop ≥1280px, tablet 768-1279px, mobile <768px)
- [ ] Slot visibility per breakpoint
- [ ] Element responsive props (flexDirection, gridTemplateColumns 등)
- [ ] CSS 미디어 쿼리 자동 생성
- [ ] Preview에서 breakpoint 테스트 UI
- [ ] Inspector에서 responsive 값 편집 UI

**Responsive 패턴 지원:**
- [ ] Sidebar 숨김 (tablet/mobile에서 navigation slot hide)
- [ ] 순서 변경 (CSS order property)
- [ ] Grid 컬럼 변화 (desktop: 3열 → mobile: 1열)

---

## File Structure

```
src/
├── types/
│   └── builder/
│       ├── layout.types.ts              # Layout/Slot 타입
│       └── responsive.types.ts          # Responsive 타입 (NEW)
│
├── builder/
│   ├── stores/
│   │   ├── layouts.ts                   # Layouts Store
│   │   ├── editMode.ts                  # Edit Mode Store
│   │   └── utils/
│   │       ├── layoutActions.ts         # Layout Actions
│   │       └── layoutHelpers.ts         # Helpers
│   │
│   ├── components/
│   │   ├── Slot.tsx                     # Slot Component
│   │   └── styles/
│   │       └── Slot.css                 # Slot Styles
│   │
│   ├── sidebar/                         # Nodes Panel (NEW)
│   │   ├── NodesPanel.tsx               # 메인 패널 (탭 컨테이너)
│   │   ├── NodesPanelTabs.tsx           # 탭 UI (Pages / Layouts)
│   │   ├── PagesTab/
│   │   │   ├── PagesTab.tsx             # Pages 탭 컨테이너
│   │   │   ├── PageTreeItem.tsx         # Page 항목
│   │   │   └── PageElementItem.tsx      # Page element 항목
│   │   ├── LayoutsTab/
│   │   │   ├── LayoutsTab.tsx           # Layouts 탭 컨테이너
│   │   │   ├── LayoutTreeItem.tsx       # Layout 항목
│   │   │   ├── LayoutElementItem.tsx    # Layout element 항목
│   │   │   └── SlotItem.tsx             # Slot 특별 표시
│   │   └── styles/
│   │       └── NodesPanel.css           # Nodes Panel 스타일
│   │
│   ├── preview/
│   │   ├── utils/
│   │   │   ├── layoutResolver.ts        # Layout Resolution
│   │   │   └── responsiveCSS.ts         # Responsive CSS Generator (NEW)
│   │   ├── hooks/
│   │   │   ├── useLayoutResolution.ts   # Resolution Hook
│   │   │   └── useBreakpoint.ts         # Breakpoint Hook (NEW)
│   │   └── components/                  # (NEW)
│   │       ├── BreakpointProvider.tsx   # Breakpoint Context
│   │       └── BreakpointTester.tsx     # Preview Breakpoint UI
│   │
│   ├── panels/
│   │   └── properties/
│   │       └── editors/
│   │           ├── SlotEditor.tsx
│   │           ├── PageLayoutSelector.tsx
│   │           ├── ElementSlotSelector.tsx
│   │           ├── PageBodyEditor.tsx              # Page body 전용 (NEW)
│   │           ├── LayoutBodyEditor.tsx            # Layout body 전용 (NEW)
│   │           ├── LayoutPresetSelector/           # 프리셋 폴더 (NEW)
│   │           │   ├── index.tsx                   # 메인 컴포넌트
│   │           │   ├── presetDefinitions.ts        # 프리셋 정의
│   │           │   ├── PresetPreview.tsx           # 썸네일 미리보기
│   │           │   └── usePresetApply.ts           # Slot 자동 생성 훅
│   │           ├── ResponsiveVisibilityEditor.tsx  # (NEW)
│   │           └── ResponsivePropsEditor.tsx       # (NEW)
│   │
│   ├── hooks/
│   │   └── useLayoutEditMode.ts
│   │
│   └── utils/
│       └── layoutValidation.ts
│
└── services/
    └── api/
        └── LayoutsApiService.ts
```

---

## Implementation Progress (2025-11-21)

### ✅ Phase 1: Core Infrastructure - COMPLETED
- [x] Database Schema - `layouts` table 생성
- [x] Type Definitions - `Layout`, `Slot`, `LayoutSlot` 타입 정의
- [x] Zustand Store - `layoutStore.ts` 구현
- [x] API Service - `LayoutsApiService.ts` CRUD 구현

### ✅ Phase 2: Builder UI - COMPLETED
- [x] Nodes Panel Layouts Tab - Layout 목록/생성/삭제 UI
- [x] Slot Component - React Aria 기반 Slot 컴포넌트
- [x] Slot Editor - Inspector에서 Slot props 편집

### ✅ Phase 3: Page-Layout Integration - COMPLETED
- [x] BodyEditor 업데이트 - Page에 Layout 선택 UI
- [x] Element Inspector 업데이트 - `slot_name` 선택 UI
- [x] Preview Rendering - Layout + Page 합성 렌더링

### ✅ Phase 4: Complex Component Support - COMPLETED (Bug Fix)
- [x] `ComponentCreationContext`에 `layoutId` 필드 추가
- [x] `ComponentFactory.createComplexComponent()`에 `layoutId` 전달
- [x] Definition 파일 업데이트 (11개 함수):
  - `SelectionComponents.ts`: Select, ComboBox, ListBox, GridList
  - `GroupComponents.ts`: Group, ToggleButtonGroup, CheckboxGroup, RadioGroup, TagGroup, Breadcrumbs
  - `LayoutComponents.ts`: Tabs, Tree
  - `FormComponents.ts`: TextField
  - `TableComponents.ts`: Table, ColumnGroup

### ✅ Phase 5: Preview Rendering Bug Fix - COMPLETED (2025-11-24)
- [x] Layout 전용 모드 / Layout + Page 모드 명확한 분리
- [x] body padding 이중 적용 버그 수정
- [x] Preview에서 body 요소 직접 클릭 선택 가능하도록 개선

**문제:**
1. Layout Tab에서 body에 padding 적용 시 두 번 적용됨
   - 루트 컨테이너에서 한 번
   - layout-body wrapper에서 한 번
2. Preview에서 body를 클릭해서 선택할 수 없음 (Layout 트리에서만 선택 가능)

**해결:**
- 루트 컨테이너는 중립적 wrapper로만 사용 (style 적용 안함)
- body element를 `renderElementsTree()`에서 직접 렌더링
- `hasPageElements`, `hasLayoutElements` 체크로 모드 구분

**수정 파일:**
- `src/builder/preview/index.tsx`
  - `renderElementsTree()`: body를 div로 직접 렌더링 (line 343-353)
  - `containerProps`: style, data-element-id, data-original-tag 제거 (line 563-571)

### 🔄 Phase 6: Edit Mode System & BodyEditor 분리 - IN PROGRESS

> **Last Updated:** 2025-11-25
> **Status:** 상세 설계 완료, 구현 대기

---

#### 6.0 Executive Summary

**핵심 문제:**
- Page body와 Layout body가 동일한 BodyEditor를 사용하여 UI 충돌 발생
- Page → Layout 선택, Layout → 프리셋/Slot 생성으로 기능이 완전히 다름

**해결 전략:**
1. **동적 Editor 라우팅** - `layout_id` 유무로 Editor 자동 선택
2. **BodyEditor 분리** - PageBodyEditor / LayoutBodyEditor
3. **프리셋 시스템** - 썸네일 선택 → Slot 일괄 생성
4. **기존 Slot 처리** - 덮어쓰기/병합/취소 선택 UI
5. **History 통합** - 프리셋 적용을 단일 Undo 엔트리로 기록

---

#### 6.1 BodyEditor 분리 아키텍처

##### 6.1.1 동적 Editor 라우팅 메커니즘

**현재 시스템 분석:**
```typescript
// src/builder/inspector/editors/registry.ts
// 현재는 element.type만으로 Editor 결정
export async function getEditor(type: string) {
  const metadata = componentMetadata.find((c) => c.type === type);
  if (!metadata?.inspector.hasCustomEditor) return null;
  return await importEditor(metadata.inspector.editorName);
}
```

**문제점:**
- `type: "body"`에 대해 항상 `BodyEditor` 반환
- `layout_id` 존재 여부를 고려하지 않음

**해결 방안 A: Registry 확장 (권장)**

```typescript
// src/builder/inspector/editors/registry.ts 수정

/**
 * 에디터 조회 (자동 로딩) - 확장 버전
 *
 * @param type - 요소 타입
 * @param context - 추가 컨텍스트 (layout_id 등)
 */
export async function getEditor(
  type: string,
  context?: { layoutId?: string | null; pageId?: string | null }
): Promise<ComponentType<ComponentEditorProps> | null> {
  // 🎯 Special case: body 타입은 context에 따라 다른 Editor 반환
  if (type === 'body') {
    const editorName = context?.layoutId ? 'LayoutBodyEditor' : 'PageBodyEditor';

    // 캐시 키에 context 포함
    const cacheKey = `body:${context?.layoutId ? 'layout' : 'page'}`;
    if (editorCache.has(cacheKey)) {
      return editorCache.get(cacheKey)!;
    }

    const editor = await importEditor(editorName);
    if (editor) {
      editorCache.set(cacheKey, editor);
    }
    return editor;
  }

  // 기존 로직 유지
  if (editorCache.has(type)) {
    return editorCache.get(type)!;
  }

  const metadata = componentMetadata.find((c) => c.type === type);
  // ... 나머지 동일
}
```

**PropertyEditorWrapper 수정:**

```typescript
// src/builder/panels/properties/PropertiesPanel.tsx
// PropertyEditorWrapper 내부 수정

const PropertyEditorWrapper = memo(function PropertyEditorWrapper({
  selectedElement,
}: {
  selectedElement: SelectedElement;
}) {
  const [Editor, setEditor] = useState<ComponentType<ComponentEditorProps> | null>(null);
  const [loading, setLoading] = useState(true);

  // ⭐ 요소에서 layout_id 가져오기
  const elementContext = useMemo(() => {
    const element = useStore.getState().elementsMap.get(selectedElement.id);
    return {
      layoutId: element?.layout_id || null,
      pageId: element?.page_id || null,
    };
  }, [selectedElement.id]);

  useEffect(() => {
    let isMounted = true;

    if (!selectedElement) {
      Promise.resolve().then(() => {
        if (isMounted) {
          setEditor(null);
          setLoading(false);
        }
      });
      return;
    }

    Promise.resolve().then(() => {
      if (!isMounted) return;
      setLoading(true);

      // ⭐ context 전달
      getEditor(selectedElement.type, elementContext)
        .then((editor) => {
          if (isMounted) {
            setEditor(() => editor);
            setLoading(false);
          }
        })
        .catch((error) => {
          // ... 에러 처리
        });
    });

    return () => { isMounted = false; };
  }, [selectedElement.type, elementContext.layoutId]); // ⭐ layoutId 의존성 추가

  // ... 나머지 동일
});
```

##### 6.1.2 Editor 비교표

| 항목 | PageBodyEditor | LayoutBodyEditor |
|------|----------------|------------------|
| **대상** | `page_id` 있는 body | `layout_id` 있는 body |
| **주요 기능** | Layout 선택 드롭다운 | 프리셋 선택 + Slot 생성 |
| **섹션 구성** | Basic, Layout Selection, Layout, Accessibility | Basic, Preset Selection, Container, Layout, Accessibility |
| **상태 관리** | pages store 연동 | layouts store + elements store 연동 |

##### 6.1.3 파일 구조

```
src/builder/panels/properties/editors/
├─ BodyEditor.tsx               # 삭제 예정 (deprecated)
│
├─ PageBodyEditor.tsx           # Page body 전용 (NEW)
│  ├─ PropertySection: Basic
│  │   └─ PropertyCustomId
│  ├─ PageLayoutSelector        # 기존 컴포넌트 재사용
│  ├─ PropertySection: Layout
│  │   └─ PropertyInput (className)
│  └─ PropertySection: Accessibility
│      ├─ PropertyInput (aria-label)
│      └─ PropertyInput (aria-labelledby)
│
├─ LayoutBodyEditor.tsx         # Layout body 전용 (NEW)
│  ├─ PropertySection: Basic
│  │   └─ PropertyCustomId
│  ├─ LayoutPresetSelector/     # 프리셋 UI
│  ├─ PropertySection: Container
│  │   ├─ PropertyInput (maxWidth)
│  │   ├─ PropertyInput (padding)
│  │   └─ PropertySwitch (centerContent)
│  ├─ PropertySection: Layout
│  │   └─ PropertyInput (className)
│  └─ PropertySection: Accessibility
│      ├─ PropertyInput (aria-label)
│      └─ PropertyInput (aria-labelledby)
│
├─ LayoutPresetSelector/        # 프리셋 시스템 (NEW)
│  ├─ index.tsx                 # 메인 컴포넌트
│  ├─ types.ts                  # 타입 정의
│  ├─ presetDefinitions.ts      # 프리셋 정의
│  ├─ PresetCard.tsx            # 개별 프리셋 카드
│  ├─ PresetPreview.tsx         # SVG 썸네일 렌더러
│  ├─ ExistingSlotDialog.tsx    # 기존 Slot 처리 다이얼로그
│  └─ usePresetApply.ts         # Slot 생성 훅
│
└─ PageLayoutSelector.tsx       # 기존 유지
```

---

#### 6.2 PageBodyEditor 구현

```typescript
// src/builder/panels/properties/editors/PageBodyEditor.tsx

import { memo, useCallback, useMemo } from "react";
import { Type, Layout, Hash } from "lucide-react";
import { PropertyCustomId, PropertyInput, PropertySection } from "../../common";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";
import { PageLayoutSelector } from "./PageLayoutSelector";

/**
 * PageBodyEditor - Page의 body 요소 전용 에디터
 *
 * Page body의 핵심 기능: Layout 선택
 * - PageLayoutSelector를 통해 Layout 템플릿 적용
 * - className, aria 속성 편집
 */
export const PageBodyEditor = memo(function PageBodyEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  // 최적화: customId와 pageId를 현재 시점에만 가져오기
  const { customId, pageId } = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return {
      customId: element?.customId || "",
      pageId: element?.page_id || null,
    };
  }, [elementId]);

  // 각 필드별 onChange 함수 메모이제이션
  const handleClassNameChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, className: value || undefined });
  }, [currentProps, onUpdate]);

  const handleAriaLabelChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, "aria-label": value || undefined });
  }, [currentProps, onUpdate]);

  const handleAriaLabelledbyChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, "aria-labelledby": value || undefined });
  }, [currentProps, onUpdate]);

  return (
    <>
      {/* Basic Section */}
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          placeholder="body"
        />
      </PropertySection>

      {/* ⭐ Page 전용: Layout 선택 */}
      {pageId && <PageLayoutSelector pageId={pageId} />}

      {/* Layout Section */}
      <PropertySection title="Layout">
        <PropertyInput
          label="Class Name"
          value={String(currentProps.className || "")}
          onChange={handleClassNameChange}
          placeholder="page-container"
          icon={Layout}
        />
      </PropertySection>

      {/* Accessibility Section */}
      <PropertySection title="Accessibility">
        <PropertyInput
          label={PROPERTY_LABELS.ARIA_LABEL}
          value={String(currentProps["aria-label"] || "")}
          onChange={handleAriaLabelChange}
          icon={Type}
          placeholder="Main page content"
        />
        <PropertyInput
          label={PROPERTY_LABELS.ARIA_LABELLEDBY}
          value={String(currentProps["aria-labelledby"] || "")}
          onChange={handleAriaLabelledbyChange}
          icon={Hash}
          placeholder="ID of labeling element"
        />
      </PropertySection>
    </>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.elementId === nextProps.elementId &&
    JSON.stringify(prevProps.currentProps) === JSON.stringify(nextProps.currentProps)
  );
});

export default PageBodyEditor;
```

---

#### 6.3 LayoutBodyEditor 구현

```typescript
// src/builder/panels/properties/editors/LayoutBodyEditor.tsx

import { memo, useCallback, useMemo } from "react";
import { Type, Layout, Hash, Maximize2, AlignCenter } from "lucide-react";
import { PropertyCustomId, PropertyInput, PropertySection, PropertySwitch } from "../../common";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";
import { LayoutPresetSelector } from "./LayoutPresetSelector";

/**
 * LayoutBodyEditor - Layout의 body 요소 전용 에디터
 *
 * Layout body의 핵심 기능: 프리셋 선택 + Slot 자동 생성
 * - LayoutPresetSelector를 통해 레이아웃 구조 선택
 * - Container 설정 (maxWidth, padding, centerContent)
 * - className, aria 속성 편집
 */
export const LayoutBodyEditor = memo(function LayoutBodyEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  // 최적화: customId와 layoutId를 현재 시점에만 가져오기
  const { customId, layoutId } = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return {
      customId: element?.customId || "",
      layoutId: element?.layout_id || null,
    };
  }, [elementId]);

  // style 객체 가져오기
  const currentStyle = useMemo(() => {
    return (currentProps.style as Record<string, unknown>) || {};
  }, [currentProps.style]);

  // 각 필드별 onChange 함수
  const handleClassNameChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, className: value || undefined });
  }, [currentProps, onUpdate]);

  const handleMaxWidthChange = useCallback((value: string) => {
    const newStyle = { ...currentStyle, maxWidth: value || undefined };
    onUpdate({ ...currentProps, style: newStyle });
  }, [currentProps, currentStyle, onUpdate]);

  const handlePaddingChange = useCallback((value: string) => {
    const newStyle = { ...currentStyle, padding: value || undefined };
    onUpdate({ ...currentProps, style: newStyle });
  }, [currentProps, currentStyle, onUpdate]);

  const handleCenterContentChange = useCallback((checked: boolean) => {
    const newStyle = {
      ...currentStyle,
      marginLeft: checked ? "auto" : undefined,
      marginRight: checked ? "auto" : undefined,
    };
    onUpdate({ ...currentProps, style: newStyle });
  }, [currentProps, currentStyle, onUpdate]);

  const handleAriaLabelChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, "aria-label": value || undefined });
  }, [currentProps, onUpdate]);

  const handleAriaLabelledbyChange = useCallback((value: string) => {
    onUpdate({ ...currentProps, "aria-labelledby": value || undefined });
  }, [currentProps, onUpdate]);

  // centerContent 계산
  const isCentered = currentStyle.marginLeft === "auto" && currentStyle.marginRight === "auto";

  return (
    <>
      {/* Basic Section */}
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          placeholder="layout-body"
        />
      </PropertySection>

      {/* ⭐ Layout 전용: 프리셋 선택 */}
      {layoutId && (
        <LayoutPresetSelector
          layoutId={layoutId}
          bodyElementId={elementId}
        />
      )}

      {/* Container Settings Section */}
      <PropertySection title="Container" icon={Maximize2}>
        <PropertyInput
          label="Max Width"
          value={String(currentStyle.maxWidth || "")}
          onChange={handleMaxWidthChange}
          placeholder="1200px, 80rem, 100%"
          icon={Maximize2}
        />
        <PropertyInput
          label="Padding"
          value={String(currentStyle.padding || "")}
          onChange={handlePaddingChange}
          placeholder="16px, 1rem 2rem"
          icon={Layout}
        />
        <PropertySwitch
          label="Center Content"
          isSelected={isCentered}
          onChange={handleCenterContentChange}
          icon={AlignCenter}
        />
      </PropertySection>

      {/* Layout Section */}
      <PropertySection title="Layout">
        <PropertyInput
          label="Class Name"
          value={String(currentProps.className || "")}
          onChange={handleClassNameChange}
          placeholder="layout-container"
          icon={Layout}
        />
      </PropertySection>

      {/* Accessibility Section */}
      <PropertySection title="Accessibility">
        <PropertyInput
          label={PROPERTY_LABELS.ARIA_LABEL}
          value={String(currentProps["aria-label"] || "")}
          onChange={handleAriaLabelChange}
          icon={Type}
          placeholder="Layout content area"
        />
        <PropertyInput
          label={PROPERTY_LABELS.ARIA_LABELLEDBY}
          value={String(currentProps["aria-labelledby"] || "")}
          onChange={handleAriaLabelledbyChange}
          icon={Hash}
          placeholder="ID of labeling element"
        />
      </PropertySection>
    </>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.elementId === nextProps.elementId &&
    JSON.stringify(prevProps.currentProps) === JSON.stringify(nextProps.currentProps)
  );
});

export default LayoutBodyEditor;
```

---

#### 6.4 Layout Preset 시스템

##### 6.4.1 타입 정의

```typescript
// src/builder/panels/properties/editors/LayoutPresetSelector/types.ts

export interface SlotDefinition {
  name: string;
  required: boolean;
  description?: string;
  defaultStyle?: React.CSSProperties;
}

export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  category: 'basic' | 'sidebar' | 'complex' | 'dashboard';
  slots: SlotDefinition[];
  /** CSS Grid 또는 Flexbox 스타일 */
  containerStyle?: React.CSSProperties;
  /** SVG 미리보기용 영역 정의 */
  previewAreas: PreviewArea[];
}

export interface PreviewArea {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isSlot: boolean;
  required?: boolean;
}

export type PresetApplyMode = 'replace' | 'merge' | 'cancel';

export interface ExistingSlotInfo {
  slotName: string;
  elementId: string;
  hasChildren: boolean;
}
```

##### 6.4.2 프리셋 정의

```typescript
// src/builder/panels/properties/editors/LayoutPresetSelector/presetDefinitions.ts

import type { LayoutPreset } from './types';

export const LAYOUT_PRESETS: Record<string, LayoutPreset> = {
  // ========== Basic Presets ==========
  'vertical-2': {
    id: 'vertical-2',
    name: '수직 2단',
    description: 'Header + Content',
    category: 'basic',
    slots: [
      { name: 'header', required: false, description: '상단 헤더 영역' },
      { name: 'content', required: true, description: '메인 콘텐츠 영역' },
    ],
    containerStyle: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
    },
    previewAreas: [
      { name: 'header', x: 0, y: 0, width: 100, height: 15, isSlot: true },
      { name: 'content', x: 0, y: 15, width: 100, height: 85, isSlot: true, required: true },
    ],
  },

  'vertical-3': {
    id: 'vertical-3',
    name: '수직 3단',
    description: 'Header + Content + Footer',
    category: 'basic',
    slots: [
      { name: 'header', required: false, description: '상단 헤더 영역' },
      { name: 'content', required: true, description: '메인 콘텐츠 영역' },
      { name: 'footer', required: false, description: '하단 푸터 영역' },
    ],
    containerStyle: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
    },
    previewAreas: [
      { name: 'header', x: 0, y: 0, width: 100, height: 12, isSlot: true },
      { name: 'content', x: 0, y: 12, width: 100, height: 76, isSlot: true, required: true },
      { name: 'footer', x: 0, y: 88, width: 100, height: 12, isSlot: true },
    ],
  },

  // ========== Sidebar Presets ==========
  'sidebar-left': {
    id: 'sidebar-left',
    name: '좌측 사이드바',
    description: 'Sidebar + Content',
    category: 'sidebar',
    slots: [
      { name: 'sidebar', required: false, description: '좌측 사이드바', defaultStyle: { width: '250px' } },
      { name: 'content', required: true, description: '메인 콘텐츠' },
    ],
    containerStyle: {
      display: 'flex',
      flexDirection: 'row',
      minHeight: '100vh',
    },
    previewAreas: [
      { name: 'sidebar', x: 0, y: 0, width: 25, height: 100, isSlot: true },
      { name: 'content', x: 25, y: 0, width: 75, height: 100, isSlot: true, required: true },
    ],
  },

  'sidebar-right': {
    id: 'sidebar-right',
    name: '우측 사이드바',
    description: 'Content + Sidebar',
    category: 'sidebar',
    slots: [
      { name: 'content', required: true, description: '메인 콘텐츠' },
      { name: 'sidebar', required: false, description: '우측 사이드바', defaultStyle: { width: '250px' } },
    ],
    containerStyle: {
      display: 'flex',
      flexDirection: 'row',
      minHeight: '100vh',
    },
    previewAreas: [
      { name: 'content', x: 0, y: 0, width: 75, height: 100, isSlot: true, required: true },
      { name: 'sidebar', x: 75, y: 0, width: 25, height: 100, isSlot: true },
    ],
  },

  // ========== Complex Presets ==========
  'holy-grail': {
    id: 'holy-grail',
    name: 'Holy Grail',
    description: 'Header + (Sidebar + Content + Aside) + Footer',
    category: 'complex',
    slots: [
      { name: 'header', required: false },
      { name: 'sidebar', required: false, defaultStyle: { width: '200px' } },
      { name: 'content', required: true },
      { name: 'aside', required: false, defaultStyle: { width: '200px' } },
      { name: 'footer', required: false },
    ],
    containerStyle: {
      display: 'grid',
      gridTemplateAreas: `
        "header header header"
        "sidebar content aside"
        "footer footer footer"
      `,
      gridTemplateColumns: '200px 1fr 200px',
      gridTemplateRows: 'auto 1fr auto',
      minHeight: '100vh',
    },
    previewAreas: [
      { name: 'header', x: 0, y: 0, width: 100, height: 12, isSlot: true },
      { name: 'sidebar', x: 0, y: 12, width: 20, height: 76, isSlot: true },
      { name: 'content', x: 20, y: 12, width: 60, height: 76, isSlot: true, required: true },
      { name: 'aside', x: 80, y: 12, width: 20, height: 76, isSlot: true },
      { name: 'footer', x: 0, y: 88, width: 100, height: 12, isSlot: true },
    ],
  },

  'complex-3col': {
    id: 'complex-3col',
    name: '3열 레이아웃',
    description: 'Header + 3 Columns + Footer',
    category: 'complex',
    slots: [
      { name: 'header', required: false },
      { name: 'left', required: false },
      { name: 'content', required: true },
      { name: 'right', required: false },
      { name: 'footer', required: false },
    ],
    containerStyle: {
      display: 'grid',
      gridTemplateAreas: `
        "header header header"
        "left content right"
        "footer footer footer"
      `,
      gridTemplateColumns: '1fr 2fr 1fr',
      gridTemplateRows: 'auto 1fr auto',
      minHeight: '100vh',
    },
    previewAreas: [
      { name: 'header', x: 0, y: 0, width: 100, height: 12, isSlot: true },
      { name: 'left', x: 0, y: 12, width: 25, height: 76, isSlot: true },
      { name: 'content', x: 25, y: 12, width: 50, height: 76, isSlot: true, required: true },
      { name: 'right', x: 75, y: 12, width: 25, height: 76, isSlot: true },
      { name: 'footer', x: 0, y: 88, width: 100, height: 12, isSlot: true },
    ],
  },

  // ========== Dashboard Presets ==========
  'dashboard': {
    id: 'dashboard',
    name: '대시보드',
    description: 'Navigation + Sidebar + Main Content',
    category: 'dashboard',
    slots: [
      { name: 'navigation', required: false, description: '상단 네비게이션' },
      { name: 'sidebar', required: false, description: '좌측 메뉴', defaultStyle: { width: '240px' } },
      { name: 'content', required: true, description: '대시보드 콘텐츠' },
    ],
    containerStyle: {
      display: 'grid',
      gridTemplateAreas: `
        "navigation navigation"
        "sidebar content"
      `,
      gridTemplateColumns: '240px 1fr',
      gridTemplateRows: 'auto 1fr',
      minHeight: '100vh',
    },
    previewAreas: [
      { name: 'navigation', x: 0, y: 0, width: 100, height: 10, isSlot: true },
      { name: 'sidebar', x: 0, y: 10, width: 24, height: 90, isSlot: true },
      { name: 'content', x: 24, y: 10, width: 76, height: 90, isSlot: true, required: true },
    ],
  },

  'dashboard-widgets': {
    id: 'dashboard-widgets',
    name: '대시보드 (위젯)',
    description: 'Header + Sidebar + Main + Widgets Panel',
    category: 'dashboard',
    slots: [
      { name: 'header', required: false },
      { name: 'sidebar', required: false },
      { name: 'content', required: true },
      { name: 'widgets', required: false },
    ],
    containerStyle: {
      display: 'grid',
      gridTemplateAreas: `
        "header header header"
        "sidebar content widgets"
      `,
      gridTemplateColumns: '200px 1fr 280px',
      gridTemplateRows: 'auto 1fr',
      minHeight: '100vh',
    },
    previewAreas: [
      { name: 'header', x: 0, y: 0, width: 100, height: 10, isSlot: true },
      { name: 'sidebar', x: 0, y: 10, width: 20, height: 90, isSlot: true },
      { name: 'content', x: 20, y: 10, width: 52, height: 90, isSlot: true, required: true },
      { name: 'widgets', x: 72, y: 10, width: 28, height: 90, isSlot: true },
    ],
  },

  // ========== Minimal Presets ==========
  'fullscreen': {
    id: 'fullscreen',
    name: '전체화면',
    description: '단일 전체 화면 콘텐츠',
    category: 'basic',
    slots: [
      { name: 'content', required: true, description: '전체 화면 콘텐츠' },
    ],
    containerStyle: {
      display: 'flex',
      minHeight: '100vh',
    },
    previewAreas: [
      { name: 'content', x: 0, y: 0, width: 100, height: 100, isSlot: true, required: true },
    ],
  },
};

// 카테고리별 그룹핑
export const PRESET_CATEGORIES = {
  basic: { label: '기본', icon: 'Layout' },
  sidebar: { label: '사이드바', icon: 'Columns2' },
  complex: { label: '복합', icon: 'LayoutGrid' },
  dashboard: { label: '대시보드', icon: 'LayoutDashboard' },
};

// 프리셋 ID 목록
export const PRESET_ORDER = [
  'fullscreen',
  'vertical-2',
  'vertical-3',
  'sidebar-left',
  'sidebar-right',
  'holy-grail',
  'complex-3col',
  'dashboard',
  'dashboard-widgets',
];
```

##### 6.4.3 PresetPreview 컴포넌트 (SVG 썸네일)

```typescript
// src/builder/panels/properties/editors/LayoutPresetSelector/PresetPreview.tsx

import { memo, useMemo } from 'react';
import type { PreviewArea } from './types';

interface PresetPreviewProps {
  areas: PreviewArea[];
  width?: number;
  height?: number;
  selectedSlot?: string;
}

/**
 * PresetPreview - SVG 기반 레이아웃 썸네일
 *
 * 성능 최적화:
 * - memo로 불필요한 리렌더링 방지
 * - useMemo로 SVG 요소 캐싱
 * - 단순 SVG rect만 사용하여 가벼운 렌더링
 */
export const PresetPreview = memo(function PresetPreview({
  areas,
  width = 120,
  height = 80,
  selectedSlot,
}: PresetPreviewProps) {
  // SVG rect 요소 캐싱
  const rectElements = useMemo(() => {
    return areas.map((area) => {
      const isSelected = selectedSlot === area.name;
      const isRequired = area.required;

      // 색상 결정
      let fill: string;
      if (isSelected) {
        fill = 'var(--color-primary-200)';
      } else if (isRequired) {
        fill = 'var(--color-primary-100)';
      } else if (area.isSlot) {
        fill = 'var(--color-gray-100)';
      } else {
        fill = 'var(--color-gray-50)';
      }

      return (
        <g key={area.name}>
          <rect
            x={`${area.x}%`}
            y={`${area.y}%`}
            width={`${area.width}%`}
            height={`${area.height}%`}
            fill={fill}
            stroke={isSelected ? 'var(--color-primary-500)' : 'var(--color-gray-300)'}
            strokeWidth={isSelected ? 2 : 1}
            rx={2}
          />
          {/* Slot 이름 표시 (영역이 충분히 크면) */}
          {area.width >= 20 && area.height >= 15 && (
            <text
              x={`${area.x + area.width / 2}%`}
              y={`${area.y + area.height / 2}%`}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--color-gray-600)"
              fontSize="8"
              fontFamily="var(--font-sans)"
            >
              {area.name}
            </text>
          )}
          {/* Required 표시 */}
          {isRequired && area.width >= 15 && (
            <text
              x={`${area.x + area.width - 2}%`}
              y={`${area.y + 4}%`}
              textAnchor="end"
              fill="var(--color-primary-600)"
              fontSize="8"
              fontWeight="bold"
            >
              *
            </text>
          )}
        </g>
      );
    });
  }, [areas, selectedSlot]);

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="preset-preview-svg"
      style={{
        border: '1px solid var(--color-gray-200)',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: 'var(--color-white)',
      }}
    >
      {rectElements}
    </svg>
  );
});
```

##### 6.4.4 ExistingSlotDialog (기존 Slot 처리)

```typescript
// src/builder/panels/properties/editors/LayoutPresetSelector/ExistingSlotDialog.tsx

import { memo, useCallback } from 'react';
import { AlertTriangle, Trash2, Merge, X } from 'lucide-react';
import { Button } from '../../../../components';
import { Dialog, DialogTrigger, Modal, Heading } from 'react-aria-components';
import type { ExistingSlotInfo, PresetApplyMode } from './types';

interface ExistingSlotDialogProps {
  isOpen: boolean;
  existingSlots: ExistingSlotInfo[];
  presetName: string;
  onConfirm: (mode: PresetApplyMode) => void;
  onClose: () => void;
}

/**
 * ExistingSlotDialog - 기존 Slot 처리 확인 다이얼로그
 *
 * 프리셋 적용 시 기존 Slot이 있으면:
 * - 덮어쓰기: 기존 Slot 삭제 후 새로 생성
 * - 병합: 기존 Slot 유지, 없는 Slot만 추가
 * - 취소: 프리셋 적용 취소
 */
export const ExistingSlotDialog = memo(function ExistingSlotDialog({
  isOpen,
  existingSlots,
  presetName,
  onConfirm,
  onClose,
}: ExistingSlotDialogProps) {
  const hasChildrenSlots = existingSlots.some((slot) => slot.hasChildren);

  const handleReplace = useCallback(() => {
    onConfirm('replace');
  }, [onConfirm]);

  const handleMerge = useCallback(() => {
    onConfirm('merge');
  }, [onConfirm]);

  const handleCancel = useCallback(() => {
    onConfirm('cancel');
    onClose();
  }, [onConfirm, onClose]);

  if (!isOpen) return null;

  return (
    <DialogTrigger isOpen={isOpen}>
      <Modal isDismissable onOpenChange={(open) => !open && onClose()}>
        <Dialog className="react-aria-Dialog existing-slot-dialog">
          <Heading slot="title" className="dialog-title">
            <AlertTriangle className="icon-warning" />
            기존 Slot이 있습니다
          </Heading>

          <div className="dialog-content">
            <p className="dialog-description">
              "{presetName}" 프리셋을 적용하려면 기존 Slot을 어떻게 처리할지 선택하세요.
            </p>

            <div className="existing-slots-list">
              <p className="list-title">현재 Slot ({existingSlots.length}개):</p>
              <ul>
                {existingSlots.map((slot) => (
                  <li key={slot.elementId}>
                    <span className="slot-name">{slot.slotName}</span>
                    {slot.hasChildren && (
                      <span className="slot-warning">(콘텐츠 있음)</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {hasChildrenSlots && (
              <div className="warning-box">
                <AlertTriangle size={16} />
                <span>일부 Slot에 콘텐츠가 있습니다. 덮어쓰기 시 삭제됩니다.</span>
              </div>
            )}
          </div>

          <div className="dialog-actions">
            <Button
              variant="default"
              onPress={handleCancel}
            >
              <X size={16} />
              취소
            </Button>
            <Button
              variant="secondary"
              onPress={handleMerge}
            >
              <Merge size={16} />
              병합 (새 Slot만 추가)
            </Button>
            <Button
              variant="primary"
              onPress={handleReplace}
            >
              <Trash2 size={16} />
              덮어쓰기
            </Button>
          </div>
        </Dialog>
      </Modal>
    </DialogTrigger>
  );
});
```

##### 6.4.5 usePresetApply 훅 (핵심 로직)

```typescript
// src/builder/panels/properties/editors/LayoutPresetSelector/usePresetApply.ts

import { useCallback, useMemo } from 'react';
import { useStore } from '../../../../stores';
import { historyManager } from '../../../../stores/history';
import { LAYOUT_PRESETS } from './presetDefinitions';
import type { PresetApplyMode, ExistingSlotInfo, SlotDefinition } from './types';
import type { Element } from '../../../../../types/core/store.types';

interface UsePresetApplyOptions {
  layoutId: string;
  bodyElementId: string;
}

interface UsePresetApplyReturn {
  /** 현재 Layout의 기존 Slot 목록 */
  existingSlots: ExistingSlotInfo[];
  /** 프리셋 적용 함수 */
  applyPreset: (presetKey: string, mode: PresetApplyMode) => Promise<void>;
  /** 적용 중 여부 */
  isApplying: boolean;
}

/**
 * usePresetApply - 프리셋 적용 훅
 *
 * 핵심 기능:
 * 1. 기존 Slot 감지
 * 2. 모드별 처리 (replace/merge/cancel)
 * 3. Slot 일괄 생성 (addComplexElement 패턴)
 * 4. History 단일 엔트리 기록
 */
export function usePresetApply({
  layoutId,
  bodyElementId,
}: UsePresetApplyOptions): UsePresetApplyReturn {
  // Store actions
  const elements = useStore((state) => state.elements);
  const addComplexElement = useStore((state) => state.addComplexElement);
  const removeElement = useStore((state) => state.removeElement);
  const updateElementProps = useStore((state) => state.updateElementProps);

  // 현재 Layout의 기존 Slot 목록
  const existingSlots = useMemo((): ExistingSlotInfo[] => {
    return elements
      .filter((el) => el.layout_id === layoutId && el.tag === 'Slot')
      .map((slot) => {
        // Slot의 자식 요소 확인 (다른 Layout에서 이 Slot에 할당된 Page element)
        const hasChildren = elements.some(
          (el) => el.parent_id === slot.id || el.props?.slot_name === slot.props?.name
        );
        return {
          slotName: (slot.props?.name as string) || 'unnamed',
          elementId: slot.id,
          hasChildren,
        };
      });
  }, [elements, layoutId]);

  // 프리셋 적용 함수
  const applyPreset = useCallback(
    async (presetKey: string, mode: PresetApplyMode): Promise<void> => {
      if (mode === 'cancel') return;

      const preset = LAYOUT_PRESETS[presetKey];
      if (!preset) {
        console.error(`[usePresetApply] Unknown preset: ${presetKey}`);
        return;
      }

      console.log(`[Preset] Applying "${preset.name}" to layout ${layoutId.slice(0, 8)}...`);

      try {
        // ============================================
        // Step 1: 기존 Slot 처리
        // ============================================
        if (mode === 'replace' && existingSlots.length > 0) {
          console.log(`[Preset] Removing ${existingSlots.length} existing slots...`);

          // ⭐ History: 삭제할 Slot들 기록
          const slotsToRemove = existingSlots.map((s) => {
            const element = elements.find((el) => el.id === s.elementId);
            return element;
          }).filter((el): el is Element => el !== undefined);

          // 삭제 실행
          await Promise.all(
            existingSlots.map((slot) => removeElement(slot.elementId))
          );

          console.log(`[Preset] Removed ${existingSlots.length} existing slots`);
        }

        // ============================================
        // Step 2: 새 Slot 생성 준비
        // ============================================
        const existingSlotNames = new Set(existingSlots.map((s) => s.slotName));
        const slotsToCreate: SlotDefinition[] = mode === 'merge'
          ? preset.slots.filter((s) => !existingSlotNames.has(s.name))
          : preset.slots;

        if (slotsToCreate.length === 0) {
          console.log('[Preset] No new slots to create (all already exist)');
          return;
        }

        console.log(`[Preset] Creating ${slotsToCreate.length} new slots...`);

        // ============================================
        // Step 3: Slot Element 배열 생성
        // ============================================
        let orderNum = 1;
        const slotElements: Element[] = slotsToCreate.map((slotDef) => ({
          id: crypto.randomUUID(),
          tag: 'Slot',
          props: {
            name: slotDef.name,
            required: slotDef.required,
            description: slotDef.description,
            style: slotDef.defaultStyle,
          },
          parent_id: bodyElementId,
          layout_id: layoutId,
          page_id: null,
          order_num: orderNum++,
        }));

        // ============================================
        // Step 4: Body에 containerStyle 적용 (있으면)
        // ============================================
        if (preset.containerStyle) {
          const body = elements.find((el) => el.id === bodyElementId);
          if (body) {
            const currentStyle = (body.props?.style as Record<string, unknown>) || {};
            const mergedStyle = { ...currentStyle, ...preset.containerStyle };
            await updateElementProps(bodyElementId, { style: mergedStyle });
            console.log('[Preset] Applied container style to body');
          }
        }

        // ============================================
        // Step 5: Slot 일괄 생성 (단일 History 엔트리)
        // ============================================
        if (slotElements.length > 0) {
          // ⭐ 첫 번째 Slot을 "parent"로, 나머지를 "children"으로 처리
          // addComplexElement가 단일 History 엔트리 생성
          const [firstSlot, ...restSlots] = slotElements;
          await addComplexElement(firstSlot, restSlots);

          console.log(`✅ [Preset] Created ${slotElements.length} slots with single history entry`);
        }

        console.log(`✅ [Preset] "${preset.name}" applied successfully`);
      } catch (error) {
        console.error('[Preset] Failed to apply preset:', error);
        throw error;
      }
    },
    [layoutId, bodyElementId, existingSlots, elements, addComplexElement, removeElement, updateElementProps]
  );

  return {
    existingSlots,
    applyPreset,
    isApplying: false, // TODO: 비동기 상태 추가
  };
}
```

##### 6.4.6 LayoutPresetSelector 메인 컴포넌트

```typescript
// src/builder/panels/properties/editors/LayoutPresetSelector/index.tsx

import { memo, useState, useCallback, useMemo } from 'react';
import { LayoutGrid, Check } from 'lucide-react';
import { PropertySection } from '../../../common';
import { Button } from '../../../../components';
import { PresetPreview } from './PresetPreview';
import { ExistingSlotDialog } from './ExistingSlotDialog';
import { usePresetApply } from './usePresetApply';
import { LAYOUT_PRESETS, PRESET_CATEGORIES, PRESET_ORDER } from './presetDefinitions';
import type { PresetApplyMode } from './types';
import './styles.css';

interface LayoutPresetSelectorProps {
  layoutId: string;
  bodyElementId: string;
}

/**
 * LayoutPresetSelector - 레이아웃 프리셋 선택 UI
 *
 * 기능:
 * - 카테고리별 프리셋 그리드 표시
 * - 현재 적용된 프리셋 하이라이트
 * - 기존 Slot 감지 및 처리 다이얼로그
 * - 썸네일 hover 시 상세 정보 표시
 */
export const LayoutPresetSelector = memo(function LayoutPresetSelector({
  layoutId,
  bodyElementId,
}: LayoutPresetSelectorProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [pendingPreset, setPendingPreset] = useState<string | null>(null);

  const { existingSlots, applyPreset } = usePresetApply({
    layoutId,
    bodyElementId,
  });

  // 프리셋 선택 핸들러
  const handlePresetSelect = useCallback((presetKey: string) => {
    if (existingSlots.length > 0) {
      // 기존 Slot이 있으면 다이얼로그 표시
      setPendingPreset(presetKey);
      setShowDialog(true);
    } else {
      // 기존 Slot이 없으면 바로 적용
      applyPreset(presetKey, 'replace');
      setSelectedPreset(presetKey);
    }
  }, [existingSlots, applyPreset]);

  // 다이얼로그 확인 핸들러
  const handleDialogConfirm = useCallback(async (mode: PresetApplyMode) => {
    if (pendingPreset && mode !== 'cancel') {
      await applyPreset(pendingPreset, mode);
      setSelectedPreset(pendingPreset);
    }
    setShowDialog(false);
    setPendingPreset(null);
  }, [pendingPreset, applyPreset]);

  // 카테고리별 프리셋 그룹핑
  const presetsByCategory = useMemo(() => {
    const grouped: Record<string, typeof LAYOUT_PRESETS[string][]> = {};

    PRESET_ORDER.forEach((presetKey) => {
      const preset = LAYOUT_PRESETS[presetKey];
      if (preset) {
        if (!grouped[preset.category]) {
          grouped[preset.category] = [];
        }
        grouped[preset.category].push(preset);
      }
    });

    return grouped;
  }, []);

  return (
    <PropertySection title="Layout Preset" icon={LayoutGrid}>
      <div className="preset-selector">
        {Object.entries(presetsByCategory).map(([category, presets]) => (
          <div key={category} className="preset-category">
            <h4 className="preset-category-title">
              {PRESET_CATEGORIES[category as keyof typeof PRESET_CATEGORIES]?.label || category}
            </h4>
            <div className="preset-grid">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  className={`preset-card ${selectedPreset === preset.id ? 'selected' : ''}`}
                  onClick={() => handlePresetSelect(preset.id)}
                  title={preset.description}
                >
                  <PresetPreview areas={preset.previewAreas} />
                  <span className="preset-name">{preset.name}</span>
                  {selectedPreset === preset.id && (
                    <span className="preset-check">
                      <Check size={12} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* 현재 Slot 정보 표시 */}
        {existingSlots.length > 0 && (
          <div className="current-slots-info">
            <span className="info-label">현재 Slot:</span>
            <span className="slot-badges">
              {existingSlots.map((slot) => (
                <span key={slot.elementId} className="slot-badge">
                  {slot.slotName}
                  {slot.hasChildren && <span className="has-content">●</span>}
                </span>
              ))}
            </span>
          </div>
        )}
      </div>

      {/* 기존 Slot 처리 다이얼로그 */}
      <ExistingSlotDialog
        isOpen={showDialog}
        existingSlots={existingSlots}
        presetName={pendingPreset ? LAYOUT_PRESETS[pendingPreset]?.name || '' : ''}
        onConfirm={handleDialogConfirm}
        onClose={() => setShowDialog(false)}
      />
    </PropertySection>
  );
});

export default LayoutPresetSelector;
```

##### 6.4.7 CSS 스타일

```css
/* src/builder/panels/properties/editors/LayoutPresetSelector/styles.css */

@layer components {
  .preset-selector {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .preset-category {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .preset-category-title {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--color-gray-500);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
  }

  .preset-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: var(--spacing-sm);
  }

  .preset-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    border: 1px solid var(--color-gray-200);
    border-radius: var(--radius-md);
    background: var(--color-white);
    cursor: pointer;
    transition: all 150ms ease;
    position: relative;
  }

  .preset-card:hover {
    border-color: var(--color-primary-300);
    background: var(--color-primary-50);
  }

  .preset-card.selected {
    border-color: var(--color-primary-500);
    background: var(--color-primary-50);
  }

  .preset-name {
    font-size: var(--text-xs);
    color: var(--color-gray-700);
    text-align: center;
    line-height: 1.2;
  }

  .preset-check {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-primary-500);
    color: white;
    border-radius: var(--radius-full);
  }

  /* Current Slots Info */
  .current-slots-info {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--color-gray-50);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
  }

  .info-label {
    color: var(--color-gray-500);
    flex-shrink: 0;
  }

  .slot-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .slot-badge {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 2px 6px;
    background: var(--color-gray-200);
    border-radius: var(--radius-sm);
    color: var(--color-gray-700);
  }

  .slot-badge .has-content {
    color: var(--color-primary-500);
    font-size: 8px;
  }

  /* Preview SVG */
  .preset-preview-svg {
    transition: transform 150ms ease;
  }

  .preset-card:hover .preset-preview-svg {
    transform: scale(1.02);
  }

  /* Dialog Styles */
  .existing-slot-dialog {
    padding: var(--spacing-lg);
    max-width: 480px;
  }

  .existing-slot-dialog .dialog-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin: 0 0 var(--spacing-md) 0;
    font-size: var(--text-lg);
  }

  .existing-slot-dialog .icon-warning {
    color: var(--color-warning-500);
  }

  .existing-slot-dialog .dialog-content {
    margin-bottom: var(--spacing-lg);
  }

  .existing-slot-dialog .dialog-description {
    color: var(--color-gray-600);
    margin: 0 0 var(--spacing-md) 0;
  }

  .existing-slot-dialog .existing-slots-list {
    background: var(--color-gray-50);
    padding: var(--spacing-sm);
    border-radius: var(--radius-sm);
  }

  .existing-slot-dialog .list-title {
    font-weight: 500;
    margin: 0 0 var(--spacing-xs) 0;
  }

  .existing-slot-dialog ul {
    margin: 0;
    padding-left: var(--spacing-lg);
  }

  .existing-slot-dialog li {
    margin: var(--spacing-xs) 0;
  }

  .existing-slot-dialog .slot-name {
    font-weight: 500;
  }

  .existing-slot-dialog .slot-warning {
    color: var(--color-warning-600);
    font-size: var(--text-xs);
    margin-left: var(--spacing-xs);
  }

  .existing-slot-dialog .warning-box {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: var(--color-warning-50);
    border: 1px solid var(--color-warning-200);
    border-radius: var(--radius-sm);
    color: var(--color-warning-700);
    font-size: var(--text-sm);
    margin-top: var(--spacing-md);
  }

  .existing-slot-dialog .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--spacing-sm);
  }
}
```

---

#### 6.5 History 통합 상세

##### 6.5.1 프리셋 적용 History 패턴

프리셋 적용 시 다음 작업이 단일 Undo 엔트리로 기록됩니다:

```
프리셋 적용 = [
  1. 기존 Slot 삭제 (mode: replace인 경우)
  2. Body containerStyle 업데이트
  3. 새 Slot 일괄 생성
]

⭐ Undo 시 모든 작업이 함께 롤백됨
```

##### 6.5.2 addComplexElement 활용

```typescript
// 핵심: addComplexElement는 단일 History 엔트리 생성
// src/builder/stores/utils/elementCreation.ts 참조

// 프리셋 적용 시:
const [firstSlot, ...restSlots] = slotElements;
await addComplexElement(firstSlot, restSlots);

// History 엔트리:
{
  type: "add",
  elementId: firstSlot.id,
  data: {
    element: firstSlot,
    childElements: restSlots,
  },
}

// Undo 시: firstSlot + restSlots 모두 삭제
// Redo 시: firstSlot + restSlots 모두 복원
```

---

#### 6.6 성능 최적화

##### 6.6.1 PresetPreview 최적화

```typescript
// 1. memo로 불필요한 리렌더링 방지
export const PresetPreview = memo(function PresetPreview(...) {
  // 2. useMemo로 SVG 요소 캐싱
  const rectElements = useMemo(() => {
    return areas.map(...);
  }, [areas, selectedSlot]);

  // 3. 단순 SVG rect만 사용 (DOM 노드 최소화)
  return <svg>...</svg>;
});
```

##### 6.6.2 프리셋 그리드 성능

- **Lazy Loading 불필요**: 프리셋 개수가 제한적 (10개 미만)
- **가상화 불필요**: 한 화면에 모두 표시 가능
- **메모이제이션**: 카테고리별 그룹핑 useMemo로 캐싱

##### 6.6.3 다이얼로그 최적화

```typescript
// 조건부 렌더링으로 불필요한 DOM 방지
if (!isOpen) return null;

return <DialogTrigger isOpen={isOpen}>...</DialogTrigger>;
```

---

#### 6.7 에러 처리

##### 6.7.1 프리셋 적용 실패 시

```typescript
try {
  await applyPreset(presetKey, mode);
} catch (error) {
  console.error('[Preset] Failed to apply preset:', error);

  // TODO: Toast 알림 표시
  // showToast({
  //   type: 'error',
  //   message: '프리셋 적용에 실패했습니다.',
  //   description: error.message,
  // });

  // 상태 롤백은 History가 자동 처리
  // (실패한 작업 전 상태로 유지됨)
}
```

##### 6.7.2 Slot 생성 부분 실패 시

```typescript
// addComplexElement는 트랜잭션처럼 동작
// - 성공: 모든 Slot 생성 + 단일 History 엔트리
// - 실패: 어떤 Slot도 생성되지 않음 (메모리 상태 정합성 유지)
```

---

#### 6.8 마이그레이션 계획

##### 6.8.1 기존 BodyEditor 처리

```typescript
// 1단계: PageBodyEditor, LayoutBodyEditor 생성
// 2단계: registry.ts 수정 (context 기반 라우팅)
// 3단계: 기존 BodyEditor.tsx를 deprecated 표시
// 4단계: 테스트 후 BodyEditor.tsx 삭제
```

##### 6.8.2 호환성 유지

```typescript
// registry.ts - 기존 API 호환 유지
export async function getEditor(
  type: string,
  context?: { layoutId?: string | null; pageId?: string | null }
) {
  // context가 없으면 기존 동작 유지 (BodyEditor 반환)
  // context가 있으면 새 로직 (PageBodyEditor/LayoutBodyEditor)
}
```

---

#### 6.9 테스트 체크리스트

**Unit Tests:**
- [ ] PageBodyEditor 렌더링
- [ ] LayoutBodyEditor 렌더링
- [ ] PresetPreview SVG 생성
- [ ] usePresetApply 훅 - replace 모드
- [ ] usePresetApply 훅 - merge 모드
- [ ] ExistingSlotDialog 동작

**Integration Tests:**
- [ ] Page body 선택 → PageBodyEditor 표시
- [ ] Layout body 선택 → LayoutBodyEditor 표시
- [ ] 프리셋 선택 → Slot 생성 확인
- [ ] 기존 Slot 있을 때 다이얼로그 표시
- [ ] 프리셋 적용 후 Undo/Redo

**E2E Tests:**
- [ ] Layout 생성 → 프리셋 선택 → Preview 확인
- [ ] 프리셋 변경 → 기존 Slot 덮어쓰기
- [ ] 프리셋 변경 → 병합 모드

---

#### 6.10 Edit Mode 기타 항목

- [ ] Layout 모드에서 Page elements 숨김
- [ ] Page 모드에서 Layout elements 읽기 전용
- [ ] Edit Mode 전환 시 UI 상태 동기화
- [x] BodyEditor 분리 설계 완료

---

#### 6.11 예상 문제 & 해결책 (Edge Cases)

##### 6.11.1 Slot Visibility 불일치

**문제:**
Layout에서 breakpoint마다 Slot hide 설정이 Page 데이터와 어긋나면 렌더링 불일치 발생.

```
예시:
- Layout에서 sidebar Slot을 mobile에서 숨김 설정
- Page A의 sidebar 콘텐츠가 mobile에서 렌더링됨 (불일치)
```

**해결책:**
```typescript
// Inspector에서 slot visibility 저장/적용 시
// Layout 요소의 layout_id 기준으로만 계산하고, Page 전용 요소는 필터링

function getSlotVisibility(slotName: string, breakpoint: Breakpoint, layoutId: string) {
  // Layout 요소만 필터링
  const layoutElements = elements.filter(el => el.layout_id === layoutId);
  const slot = layoutElements.find(el => el.tag === 'Slot' && el.props?.name === slotName);

  if (!slot) return true; // 기본값: visible

  // Slot의 responsive visibility 확인
  const responsiveProps = slot.props?.responsiveProps as ResponsiveProps | undefined;
  return responsiveProps?.[breakpoint]?.visibility !== 'hidden';
}
```

##### 6.11.2 Responsive Props 우선순위 충돌

**문제:**
Layout 기본 스타일과 responsive override 간 className/style 덮어쓰기 충돌.

```css
/* 충돌 예시 */
.layout-sidebar { width: 250px; }  /* Layout 기본 */
@media (max-width: 768px) {
  .layout-sidebar { width: 100%; }  /* Page override */
}
/* ❌ 어떤 스타일이 적용될지 불명확 */
```

**해결책:**
```typescript
// responsiveCSS.ts
// breakpoint별 CSS를 별도 scope(class)로 생성

function generateResponsiveCSS(element: Element, breakpoints: Breakpoint[]) {
  const rules: string[] = [];

  breakpoints.forEach(bp => {
    const responsiveProps = element.props?.responsiveProps?.[bp.name];
    if (responsiveProps?.style) {
      // 브레이크포인트별 클래스로 스코핑
      rules.push(`
        .breakpoint-${bp.name} [data-element-id="${element.id}"] {
          ${styleObjectToCSS(responsiveProps.style)}
        }
      `);
    }
  });

  return rules.join('\n');
}

// Preview/Canvas에서 현재 breakpoint 클래스를 루트에 부여
function PreviewContainer({ currentBreakpoint }: Props) {
  return (
    <div className={`preview-root breakpoint-${currentBreakpoint}`}>
      {children}
    </div>
  );
}
```

##### 6.11.3 Preview/Inspector 상태 탈동기화

**문제:**
Breakpoint 스위처 조작 시 Preview와 Inspector가 다른 breakpoint를 바라보면 값이 꼬임.

```
시나리오:
1. Preview: tablet 뷰로 전환
2. Inspector: 여전히 desktop 값 표시
3. 사용자가 Inspector에서 값 수정
4. ❌ desktop 값이 변경됨 (의도와 다름)
```

**해결책:**
```typescript
// BreakpointProvider를 전역 context로 올리기

// src/builder/providers/BreakpointProvider.tsx
interface BreakpointContextValue {
  currentBreakpoint: Breakpoint;
  setCurrentBreakpoint: (bp: Breakpoint) => void;
  breakpoints: Breakpoint[];
}

const BreakpointContext = createContext<BreakpointContextValue | null>(null);

export function BreakpointProvider({ children }: { children: React.ReactNode }) {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>(
    BREAKPOINTS.desktop
  );

  return (
    <BreakpointContext.Provider value={{
      currentBreakpoint,
      setCurrentBreakpoint,
      breakpoints: Object.values(BREAKPOINTS),
    }}>
      {children}
    </BreakpointContext.Provider>
  );
}

// Preview와 Inspector 모두 동일 provider 구독
export function useBreakpoint() {
  const context = useContext(BreakpointContext);
  if (!context) throw new Error('useBreakpoint must be used within BreakpointProvider');
  return context;
}
```

**컴포넌트 트리:**
```
<BreakpointProvider>           ← 전역 Provider
  <BuilderHeader>
    <BreakpointSwitcher />     ← setCurrentBreakpoint 호출
  </BuilderHeader>
  <Preview />                   ← currentBreakpoint 구독
  <Inspector />                 ← currentBreakpoint 구독 (동기화!)
</BreakpointProvider>
```

##### 6.11.4 Slot 삭제/추가 시 Responsive 메타 잔존

**문제:**
Slot을 삭제하거나 이름을 변경하면 이전 responsive visibility 메타가 남아 reference error 유발.

```typescript
// 문제 시나리오
const responsiveVisibility = {
  'sidebar': { mobile: 'hidden', tablet: 'visible' },
  'content': { mobile: 'visible' },
};

// sidebar Slot 삭제 후에도 responsiveVisibility['sidebar'] 참조 시도
// ❌ Orphaned metadata
```

**해결책:**
```typescript
// Slot 삭제 훅에서 관련 responsive visibility/props 메타 정리

// src/builder/stores/utils/slotCleanup.ts
export async function cleanupSlotMetadata(
  slotId: string,
  slotName: string,
  layoutId: string
) {
  const { elements, updateElement } = useStore.getState();

  // 1. Layout body의 responsiveVisibility에서 해당 slot 제거
  const body = elements.find(
    el => el.layout_id === layoutId && el.tag === 'body'
  );

  if (body?.props?.responsiveVisibility) {
    const { [slotName]: removed, ...remainingVisibility } =
      body.props.responsiveVisibility as Record<string, unknown>;

    await updateElement(body.id, {
      props: {
        ...body.props,
        responsiveVisibility: remainingVisibility,
      },
    });

    console.log(`[SlotCleanup] Removed responsive visibility for slot: ${slotName}`);
  }

  // 2. 해당 Slot에 할당된 Page elements의 slot_name 정리
  const pageElements = elements.filter(
    el => el.page_id && el.props?.slot_name === slotName
  );

  await Promise.all(
    pageElements.map(el =>
      updateElement(el.id, {
        props: { ...el.props, slot_name: undefined },
      })
    )
  );

  if (pageElements.length > 0) {
    console.log(`[SlotCleanup] Cleared slot_name from ${pageElements.length} page elements`);
  }
}

// removeElement 시 자동 호출
export const createRemoveElementAction = (set, get) => async (elementId: string) => {
  const element = get().elementsMap.get(elementId);

  // Slot 삭제 시 cleanup 의무 호출
  if (element?.tag === 'Slot' && element.layout_id) {
    await cleanupSlotMetadata(
      elementId,
      element.props?.name as string,
      element.layout_id
    );
  }

  // 기존 삭제 로직...
};
```

##### 6.11.5 템플릿/프리셋 반영 지연 (깜빡임)

**문제:**
프리셋으로 Slot이 추가된 뒤 responsive 초기값이 없는 상태에서 Preview가 즉시 렌더링되면 깜빡임 발생.

```
시나리오:
1. 프리셋 선택 → Slot 생성 시작
2. Preview가 Slot 감지 → 즉시 렌더링 시도
3. responsive props 아직 없음 → 기본값으로 렌더링
4. responsive props 생성 완료 → 다시 렌더링
5. ❌ 깜빡임 발생
```

**해결책:**
```typescript
// usePresetApply.ts 수정
// 프리셋 적용 시 기본 responsive props를 함께 생성

const applyPreset = useCallback(async (presetKey: string, mode: PresetApplyMode) => {
  // ... 기존 로직 ...

  // ============================================
  // Step 3: Slot Element 배열 생성 (responsive props 포함)
  // ============================================
  const slotElements: Element[] = slotsToCreate.map((slotDef) => ({
    id: crypto.randomUUID(),
    tag: 'Slot',
    props: {
      name: slotDef.name,
      required: slotDef.required,
      description: slotDef.description,
      style: slotDef.defaultStyle,
      // ⭐ 기본 responsive props 포함
      responsiveProps: {
        desktop: { visibility: 'visible' },
        tablet: { visibility: 'visible' },
        mobile: { visibility: slotDef.hideOnMobile ? 'hidden' : 'visible' },
      },
    },
    parent_id: bodyElementId,
    layout_id: layoutId,
    page_id: null,
    order_num: orderNum++,
  }));

  // ... 기존 로직 ...
}, [...]);

// Preview는 해당 생성 promise 완료 후 렌더링
// useIframeMessenger.ts
useEffect(() => {
  // ⭐ Slot 생성 완료 후에만 Preview 업데이트
  const hasAllResponsiveProps = elements
    .filter(el => el.tag === 'Slot' && el.layout_id)
    .every(slot => slot.props?.responsiveProps !== undefined);

  if (hasAllResponsiveProps) {
    sendElementsToIframe(elements);
  }
}, [elements]);
```

**대안: 로딩 상태 표시**
```typescript
// Preview에서 Slot 초기화 중 로딩 표시
function SlotRenderer({ slot }: { slot: Element }) {
  const hasResponsiveProps = slot.props?.responsiveProps !== undefined;

  if (!hasResponsiveProps) {
    return (
      <div className="slot-initializing">
        <Spinner size="sm" />
      </div>
    );
  }

  return <SlotContent slot={slot} />;
}
```

##### 6.11.6 Slot 이름 중복 (Cross-Layout Collision)

**문제:**
다른 Layout에서 동일한 Slot 이름을 사용할 때, Page가 Layout을 전환하면 기존 `slot_name` 매핑이 의도치 않게 새 Layout의 Slot에 연결됨.

```
시나리오:
1. Layout A: Slot[sidebar], Slot[content]
2. Layout B: Slot[sidebar], Slot[main]  ← 동일한 "sidebar" 이름
3. Page X: Layout A 사용, element.slot_name = "sidebar"
4. Page X: Layout B로 전환
5. ❌ 기존 sidebar 요소가 Layout B의 sidebar에 자동 매핑 (의도와 다를 수 있음)
```

**해결책 A: Layout ID Prefix (권장)**
```typescript
// slot_name에 Layout ID prefix 포함
// Format: "{layoutId}:{slotName}" 또는 명시적 분리

interface ElementSlotAssignment {
  layoutId: string;
  slotName: string;
}

// Element props 확장
interface ElementProps {
  // 기존: slot_name?: string;
  slotAssignment?: ElementSlotAssignment;  // NEW: 명시적 Layout-Slot 매핑
}

// Preview 렌더링 시 검증
function resolveSlotContent(
  slot: Element,
  pageElements: Element[],
  currentLayoutId: string
) {
  return pageElements.filter(el => {
    const assignment = el.props?.slotAssignment as ElementSlotAssignment | undefined;

    // 새 방식: slotAssignment 사용
    if (assignment) {
      return assignment.layoutId === currentLayoutId &&
             assignment.slotName === slot.props?.name;
    }

    // 레거시 호환: slot_name만 있는 경우 (Layout 전환 시 경고)
    if (el.props?.slot_name === slot.props?.name) {
      console.warn(
        `[Slot] Legacy slot_name mapping detected. ` +
        `Consider migrating to slotAssignment for element ${el.id}`
      );
      return true;
    }

    return false;
  });
}
```

**해결책 B: Layout 전환 시 확인 다이얼로그**
```typescript
// PageLayoutSelector.tsx에서 Layout 전환 시 검증

async function handleLayoutChange(newLayoutId: string) {
  const currentLayoutId = page?.layout_id;
  if (!currentLayoutId || currentLayoutId === newLayoutId) {
    return applyLayout(newLayoutId);
  }

  // 기존 slot_name 매핑 검사
  const assignedElements = pageElements.filter(el => el.props?.slot_name);
  if (assignedElements.length === 0) {
    return applyLayout(newLayoutId);
  }

  // 새 Layout의 Slot 이름 가져오기
  const newLayoutSlots = layoutElements
    .filter(el => el.layout_id === newLayoutId && el.tag === 'Slot')
    .map(el => el.props?.name as string);

  // 매핑 충돌 검사
  const conflicts = assignedElements.filter(el => {
    const slotName = el.props?.slot_name as string;
    return newLayoutSlots.includes(slotName);  // 동일 이름 존재 = 잠재적 충돌
  });

  if (conflicts.length > 0) {
    const confirmed = await showConfirmDialog({
      title: 'Slot 매핑 확인',
      message: `${conflicts.length}개 요소가 새 Layout의 동일 이름 Slot에 매핑됩니다. 계속하시겠습니까?`,
      details: conflicts.map(el => `• ${el.tag} → ${el.props?.slot_name}`),
      actions: ['유지', '매핑 해제', '취소'],
    });

    if (confirmed === '취소') return;
    if (confirmed === '매핑 해제') {
      await clearSlotAssignments(conflicts);
    }
  }

  return applyLayout(newLayoutId);
}
```

**해결책 C: Slot 이름 자동 네임스페이싱**
```typescript
// Layout 생성 시 Slot 이름에 자동 prefix

function createSlotElement(layoutId: string, slotName: string): Element {
  // Short hash of layoutId for human-readable prefix
  const layoutPrefix = layoutId.slice(0, 4);

  return {
    id: crypto.randomUUID(),
    tag: 'Slot',
    props: {
      name: slotName,                           // UI 표시용: "sidebar"
      internalName: `${layoutPrefix}_${slotName}`,  // 내부 매핑용: "a1b2_sidebar"
    },
    layout_id: layoutId,
    // ...
  };
}

// slot_name 할당 시 internalName 사용
function assignToSlot(element: Element, slot: Element) {
  return {
    ...element,
    props: {
      ...element.props,
      slot_name: slot.props?.internalName,  // "a1b2_sidebar"
    },
  };
}
```

##### 6.11.7 History Undo 시 Responsive 메타 복원 실패

**문제:**
Slot 삭제 시 `cleanupSlotMetadata`가 실행되어 responsive visibility 메타가 삭제됨.
Undo 실행 시 Slot Element는 복원되지만 cleanup된 메타데이터는 복원되지 않음.

```
시나리오:
1. sidebar Slot 존재, responsiveProps: { mobile: 'hidden' }
2. sidebar Slot 삭제 → cleanupSlotMetadata 실행
   - body.props.responsiveVisibility.sidebar 삭제됨
3. Undo 실행
4. sidebar Slot 복원됨 ✓
5. ❌ responsiveVisibility.sidebar는 복원 안됨 (데이터 불일치)
```

**해결책: History Entry에 Cleanup 메타데이터 스냅샷 포함**
```typescript
// src/builder/stores/utils/elementRemoval.ts

interface SlotRemovalHistoryData {
  element: Element;
  cleanupSnapshot: {
    bodyId: string;
    responsiveVisibility?: Record<string, unknown>;
    affectedPageElements: Array<{
      elementId: string;
      previousSlotName: string;
    }>;
  };
}

export const createRemoveElementAction = (set, get) => async (elementId: string) => {
  const element = get().elementsMap.get(elementId);
  if (!element) return;

  // Slot 삭제 시 cleanup 전 스냅샷 저장
  let cleanupSnapshot: SlotRemovalHistoryData['cleanupSnapshot'] | undefined;

  if (element.tag === 'Slot' && element.layout_id) {
    const slotName = element.props?.name as string;
    const body = get().elements.find(
      el => el.layout_id === element.layout_id && el.tag === 'body'
    );

    // 스냅샷 생성 (cleanup 전)
    cleanupSnapshot = {
      bodyId: body?.id || '',
      responsiveVisibility: body?.props?.responsiveVisibility
        ? { [slotName]: body.props.responsiveVisibility[slotName] }
        : undefined,
      affectedPageElements: get().elements
        .filter(el => el.page_id && el.props?.slot_name === slotName)
        .map(el => ({
          elementId: el.id,
          previousSlotName: slotName,
        })),
    };

    // Cleanup 실행
    await cleanupSlotMetadata(elementId, slotName, element.layout_id);
  }

  // History entry에 스냅샷 포함
  set(produce((state) => {
    historyManager.addEntry({
      type: 'remove',
      elementId: element.id,
      data: {
        element: { ...element },
        cleanupSnapshot,  // ⭐ Undo 시 복원에 사용
      },
    });

    // 요소 삭제
    state.elements = state.elements.filter(el => el.id !== elementId);
  }));
};
```

**Undo Handler 확장:**
```typescript
// src/builder/stores/history/historyActions.ts

export const createUndoAction = (set, get) => async () => {
  const entry = historyManager.undo();
  if (!entry) return;

  switch (entry.type) {
    case 'remove': {
      const { element, cleanupSnapshot } = entry.data as SlotRemovalHistoryData;

      // 1. 요소 복원
      set(produce((state) => {
        state.elements.push(element);
      }));

      // 2. ⭐ Slot인 경우 cleanup된 메타데이터 복원
      if (element.tag === 'Slot' && cleanupSnapshot) {
        const { bodyId, responsiveVisibility, affectedPageElements } = cleanupSnapshot;

        // Body의 responsiveVisibility 복원
        if (bodyId && responsiveVisibility) {
          const body = get().elementsMap.get(bodyId);
          if (body) {
            await get().updateElement(bodyId, {
              props: {
                ...body.props,
                responsiveVisibility: {
                  ...(body.props?.responsiveVisibility as Record<string, unknown> || {}),
                  ...responsiveVisibility,
                },
              },
            });
          }
        }

        // Page elements의 slot_name 복원
        await Promise.all(
          affectedPageElements.map(({ elementId, previousSlotName }) =>
            get().updateElement(elementId, {
              props: {
                ...get().elementsMap.get(elementId)?.props,
                slot_name: previousSlotName,
              },
            })
          )
        );

        console.log(`[Undo] Restored Slot metadata for: ${element.props?.name}`);
      }

      break;
    }
    // ... 다른 case들
  }
};
```

**Redo Handler도 동일하게 처리:**
```typescript
case 'remove': {
  const { element, cleanupSnapshot } = entry.data as SlotRemovalHistoryData;

  // Redo 시 다시 cleanup 실행
  if (element.tag === 'Slot' && element.layout_id) {
    await cleanupSlotMetadata(
      element.id,
      element.props?.name as string,
      element.layout_id
    );
  }

  // 요소 삭제
  set(produce((state) => {
    state.elements = state.elements.filter(el => el.id !== element.id);
  }));

  break;
}
```

##### 6.11.8 Slot 이름 변경 시 기존 매핑 유실

**문제:**
Layout에서 Slot 이름을 변경하면 해당 Slot에 할당된 Page elements의 `slot_name`이 더 이상 매칭되지 않음.

```
시나리오:
1. Layout: Slot[sidebar]
2. Page: element.slot_name = "sidebar"
3. Layout에서 Slot 이름을 "leftPanel"로 변경
4. ❌ Page element가 orphan 상태 (slot_name="sidebar"는 더 이상 존재하지 않음)
```

**해결책: Slot 이름 변경 시 cascade 업데이트**
```typescript
// src/builder/panels/properties/editors/SlotEditor.tsx

const handleSlotNameChange = useCallback(async (newName: string) => {
  const oldName = currentProps.name as string;
  if (oldName === newName) return;

  // 이름 중복 체크
  const existingSlot = elements.find(
    el => el.layout_id === layoutId &&
          el.tag === 'Slot' &&
          el.props?.name === newName &&
          el.id !== elementId
  );

  if (existingSlot) {
    showError(`Slot name "${newName}" already exists in this layout`);
    return;
  }

  // 1. Slot 이름 변경
  await onUpdate({ ...currentProps, name: newName });

  // 2. ⭐ 해당 Layout을 사용하는 모든 Page의 elements 업데이트
  const pagesUsingLayout = pages.filter(p => p.layout_id === layoutId);

  const affectedElements = elements.filter(el =>
    el.page_id &&
    pagesUsingLayout.some(p => p.id === el.page_id) &&
    el.props?.slot_name === oldName
  );

  if (affectedElements.length > 0) {
    await Promise.all(
      affectedElements.map(el =>
        updateElementProps(el.id, { slot_name: newName })
      )
    );

    console.log(
      `[SlotRename] Updated ${affectedElements.length} elements: ` +
      `"${oldName}" → "${newName}"`
    );
  }

  // 3. Body의 responsiveVisibility 키 업데이트
  const body = elements.find(
    el => el.layout_id === layoutId && el.tag === 'body'
  );

  if (body?.props?.responsiveVisibility?.[oldName]) {
    const { [oldName]: oldValue, ...rest } = body.props.responsiveVisibility;
    await updateElementProps(body.id, {
      responsiveVisibility: {
        ...rest,
        [newName]: oldValue,
      },
    });
  }
}, [currentProps, layoutId, elements, pages, onUpdate, updateElementProps]);
```

---

#### 6.12 Edge Case 체크리스트

| # | 문제 | 해결책 | 테스트 항목 |
|---|------|--------|-------------|
| 1 | Slot visibility 불일치 | layout_id 기준 필터링 | Layout hide → Page 렌더링 확인 |
| 2 | Responsive props 충돌 | breakpoint 클래스 스코핑 | tablet에서 스타일 우선순위 확인 |
| 3 | Preview/Inspector 탈동기화 | BreakpointProvider 전역화 | breakpoint 전환 후 Inspector 값 확인 |
| 4 | Slot 삭제 시 메타 잔존 | cleanupSlotMetadata 의무 호출 | Slot 삭제 후 에러 없음 확인 |
| 5 | 프리셋 깜빡임 | 기본 responsive props 포함 생성 | 프리셋 적용 시 깜빡임 없음 확인 |
| 6 | Slot 이름 중복 | Layout ID prefix 또는 확인 다이얼로그 | Layout 전환 후 매핑 정확성 확인 |
| 7 | History Undo 메타 복원 | cleanupSnapshot 포함 저장 | Slot 삭제 → Undo → 메타 복원 확인 |
| 8 | Slot 이름 변경 매핑 유실 | cascade 업데이트 | 이름 변경 후 Page 요소 매핑 확인 |

---

#### 6.13 Edge Case 구현 우선순위

| 우선순위 | 문제 | 이유 |
|----------|------|------|
| 🔴 Critical | #3 Preview/Inspector 탈동기화 | 데이터 손상 가능 |
| 🔴 Critical | #7 History Undo 메타 복원 | 데이터 정합성 |
| 🟠 High | #4 Slot 삭제 메타 잔존 | Runtime error 유발 |
| 🟠 High | #8 Slot 이름 변경 매핑 유실 | 사용자 혼란 |
| 🟡 Medium | #1 Slot visibility 불일치 | UI 불일치 |
| 🟡 Medium | #5 프리셋 깜빡임 | UX 저하 |
| 🟢 Low | #2 Responsive props 충돌 | CSS 전문 지식 필요 |
| 🟢 Low | #6 Slot 이름 중복 | 드문 시나리오 |

### 📋 Phase 7: Advanced Features - PLANNED
- [ ] Responsive breakpoint 별 Slot visibility
- [ ] Layout 복제 기능
- [ ] Layout 사용 현황 표시
- [ ] Required Slot validation

### Key Code Changes

**ownerFields Pattern** (모든 Definition 파일에 적용):
```typescript
const ownerFields = layoutId
  ? { page_id: null, layout_id: layoutId }
  : { page_id: pageId, layout_id: null };

// parent와 children에 spread로 적용
parent: {
  tag: "ComponentName",
  props: { ... },
  ...ownerFields,  // page_id 또는 layout_id 설정
  parent_id: parentId,
  order_num: orderNum,
},
```

**Modified Files**:
- `src/builder/factories/types/index.ts` - `layoutId` 추가
- `src/builder/factories/ComponentFactory.ts` - `layoutId` 파라미터 전달
- `src/builder/hooks/useElementCreator.ts` - `layoutId` 전달
- `src/builder/factories/definitions/*.ts` - 모든 정의 함수 업데이트

---

## Success Criteria

### Technical

- [x] Zero TypeScript errors
- [x] All CSS uses `react-aria-*` naming (Slot.css)
- [x] Store follows Factory Pattern
- [x] Preview rendering handles nested Slots (재귀적)
- [x] Backward compatible (Layout 없는 Page 작동)
- [x] Preview에서 body 요소 직접 선택 가능
- [x] body style 단일 적용 (이중 적용 버그 수정)
- [ ] Responsive CSS 미디어 쿼리 자동 생성

### Functional

- [x] Layout 생성/편집/삭제/복제
- [x] 자유로운 Element 배치 in Layout
- [x] Slot 추가/편집 (name, required, description)
- [x] Page에 Layout 적용
- [x] Element에 target Slot 선택
- [x] Layout 전용 / Layout + Page 모드 구분
- [ ] Page/Layout 편집 모드 UI 분리
- [ ] BodyEditor 분리 (PageBodyEditor / LayoutBodyEditor)
- [ ] Layout Preset 기능 (프리셋 선택 → Slot 자동 생성)
- [ ] Required Slot validation
- [ ] Breakpoint별 Slot visibility 설정
- [ ] Breakpoint별 Element props 설정
- [ ] Preview에서 breakpoint 테스트

### Patterns Supported

- [x] 1-1: Header/Content/Footer
- [x] 1-2: Sidebar/Content
- [x] 1-3: Header/(Sidebar+Content)/Footer
- [x] 1-4: Header/(Sidebar+Content+Aside)/Footer
- [x] 1-5: 중첩 복합 (다중 Slot)
- [x] 대시보드 (다중 Slot)
- [x] 랜딩페이지 (전체 Slot)

### Responsive Patterns

- [ ] Sidebar 숨김 (tablet/mobile에서 navigation slot 숨김)
- [ ] 순서 변경 (CSS order로 요소 순서 조정)
- [ ] Grid 컬럼 변화 (desktop: 3열 → tablet: 2열 → mobile: 1열)
- [ ] Flex 방향 전환 (desktop: row → mobile: column)
- [ ] 조건부 Slot 표시 (특정 breakpoint에서만 표시)

---

## Preview Rendering Architecture (2025-11-24)

### 렌더링 모드 구분

Preview는 세 가지 모드로 렌더링됩니다:

| 모드 | 조건 | body 렌더링 위치 |
|------|------|-----------------|
| **Layout + Page** | `hasPageElements && hasLayoutElements` | `layout-body` wrapper |
| **Layout 전용** | `hasLayoutElements && !hasPageElements` | `renderElementsTree()` 내부 |
| **Page 전용** | `hasPageElements && !hasLayoutElements` | `renderElementsTree()` 내부 |

### 모드 감지 로직

```typescript
// renderElementsTree() 시작 부분
const hasPageElements = elements.some((el) => el.page_id !== null);
const hasLayoutElements = elements.some((el) => el.layout_id !== null);

if (pageInfo.layoutId && pageInfo.pageId && hasPageElements && hasLayoutElements) {
  // Layout + Page 모드: resolveLayoutForPage() 사용
} else {
  // Layout 전용 또는 Page 전용 모드: body 직접 렌더링
}
```

### body 렌더링 구조

```tsx
// Layout 전용 / Page 전용 모드
<div className={styles.main}>  {/* 루트 컨테이너 (중립적 wrapper) */}
  <div
    data-element-id={bodyElement.id}
    data-original-tag="body"
    style={bodyElement.props?.style}
    className="layout-body"
  >
    {bodyChildren.map((el) => renderElement(el, el.id))}
  </div>
</div>
```

### 핵심 원칙

1. **루트 컨테이너는 중립적**: style, data-element-id 적용 안함
2. **body는 항상 직접 렌더링**: Preview에서 클릭 선택 가능
3. **style 단일 적용**: body style은 한 곳에서만 적용

---

**작성:** Claude Sonnet 4.5
**버전:** 2.3 (Layout Preset & BodyEditor 분리 추가)
**최종 업데이트:** 2025-11-24
**예상 개발 기간:** 6-8주 (Phase 1-7)
