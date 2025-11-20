# Layout/Slot System - 최적 구현 계획

**작성일:** 2025-11-20
**우선순위:** 🔴 Critical (Dataset보다 우선)
**목표:** JSP/PHP include 방식의 레이아웃 재사용 시스템 구현

---

## 목차

1. [현재 문제점](#현재-문제점)
2. [목표 아키텍처](#목표-아키텍처)
3. [다른 빌더 분석 요약](#다른-빌더-분석-요약)
4. [XStudio 최적 설계](#xstudio-최적-설계)
5. [구현 Phase](#구현-phase)
6. [기술 스펙](#기술-스펙)
7. [UI/UX 설계](#uiux-설계)
8. [Migration 전략](#migration-전략)

---

## 현재 문제점

### 구조적 문제

```
현재 XStudio:
Page "Home"
└─ Body
   ├─ Header (복사본 #1)
   ├─ Navigation (복사본 #1)
   ├─ Hero Section
   ├─ Content
   └─ Footer (복사본 #1)

Page "Products"
└─ Body
   ├─ Header (복사본 #2) ← 똑같은데 또 만들어야 함
   ├─ Navigation (복사본 #2)
   ├─ Product List
   └─ Footer (복사본 #2)

Page "About"
└─ Body
   ├─ Header (복사본 #3)
   ├─ Navigation (복사본 #3)
   ├─ About Content
   └─ Footer (복사본 #3)
```

**문제점:**
1. ❌ Header 수정 시 모든 페이지 수정 필요 (N번 반복)
2. ❌ 일관성 깨지기 쉬움 (한 페이지만 수정 놓치면 끝)
3. ❌ 데이터베이스 낭비 (같은 구조 N번 저장)
4. ❌ 개발 생산성 저하 (반복 작업)
5. ❌ 유지보수 지옥

### 다른 빌더들은 어떻게 해결했나?

**Webflow:** Components + Slots
**Framer:** Layout Templates
**Webstudio:** Slot Components
**Bubble:** Reusable Elements
**FlutterFlow:** Scaffold Structure

→ **모두 "한 번 정의, 여러 곳 재사용" 패턴**

---

## 목표 아키텍처

### 이상적인 구조

```
Layout "MainLayout"
├─ Header (한 번만 정의)
│  ├─ Logo
│  ├─ Navigation
│  └─ User Menu
├─ Slot "sidebar" (선택적)
├─ Slot "content" (필수) ← 페이지마다 다른 내용
└─ Footer (한 번만 정의)
   ├─ Links
   └─ Copyright

---

Page "Home"
└─ Layout: MainLayout
   └─ Fill Slot "content":
      ├─ Hero Section
      ├─ Features
      └─ CTA

Page "Products"
└─ Layout: MainLayout
   └─ Fill Slot "content":
      ├─ Product Grid
      └─ Pagination

Page "About"
└─ Layout: MainLayout
   └─ Fill Slot "content":
      └─ About Content
```

**장점:**
1. ✅ Header 수정 → Layout만 수정 → 모든 페이지 자동 반영
2. ✅ 일관성 보장 (레이아웃이 단일 소스)
3. ✅ 데이터베이스 효율 (공통 부분은 한 번만 저장)
4. ✅ 개발 속도 향상 (반복 작업 제거)
5. ✅ 유지보수 간편

---

## 다른 빌더 분석 요약

### 패턴 비교

| 빌더 | 레이아웃 개념 | Slot 개념 | 적용 방식 | 강점 |
|------|---------------|-----------|-----------|------|
| **Webflow** | Component | Slots | 컴포넌트 인스턴스에 삽입 | 가장 유연 (Slot에 Slot 가능) |
| **Framer** | Layout Template | Content Placeholder | 페이지 레벨 선택 | 애니메이션 공유 |
| **Webstudio** | Slot Component | N/A (전역 블록) | 인스턴스 배치 | 간단함 |
| **Bubble** | Reusable Element | N/A | 페이지에 배치 | All-in-one |
| **FlutterFlow** | Scaffold | AppBar/Body/Nav | 앱 구조 템플릿 | 모바일 최적화 |

### XStudio에 맞는 조합

**Webflow (Slots) + Framer (Layout Templates)** 하이브리드:

1. **Webflow의 Slots**: 유연한 placeholder 메커니즘
2. **Framer의 Layout Templates**: 페이지 레벨 적용
3. **React의 children prop**: 자연스러운 React 패턴

---

## XStudio 최적 설계

### 핵심 원칙

1. **단순함 우선**: 복잡한 기능보다 80% 사용 사례 해결
2. **React 친화적**: React children prop 개념 활용
3. **점진적 도입**: 기존 페이지 영향 없음 (opt-in)
4. **Type-safe**: TypeScript로 Slot 타입 체크

### 아키텍처 레이어

```
┌─────────────────────────────────────────────────────────┐
│ 1. Database Layer (Supabase)                           │
├─────────────────────────────────────────────────────────┤
│ layouts (NEW)           pages (UPDATE)                 │
│ ├─ id                   ├─ id                          │
│ ├─ name                 ├─ layout_id (NEW)             │
│ ├─ project_id           └─ ...                         │
│ ├─ slots: SlotDef[]                                    │
│ └─ created_at                                          │
│                                                         │
│ elements (UPDATE)                                       │
│ ├─ layout_id (NEW) ← Layout에 속한 요소               │
│ ├─ slot_name (NEW) ← Slot placeholder 식별            │
│ └─ ...                                                  │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Store Layer (Zustand)                               │
├─────────────────────────────────────────────────────────┤
│ layoutsStore (NEW)                                     │
│ ├─ layouts: Layout[]                                   │
│ ├─ createLayout()                                      │
│ ├─ updateLayout()                                      │
│ └─ deleteLayout()                                      │
│                                                         │
│ pagesStore (UPDATE)                                    │
│ └─ setPageLayout(pageId, layoutId)                    │
│                                                         │
│ elementsStore (UPDATE)                                 │
│ └─ Element에 layout_id, slot_name 추가                │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Component Layer (React)                             │
├─────────────────────────────────────────────────────────┤
│ <Layout> Component (NEW)                               │
│ ├─ 레이아웃 구조 정의                                   │
│ └─ Slot 위치 지정                                       │
│                                                         │
│ <Slot> Component (NEW)                                 │
│ ├─ name prop (식별자)                                  │
│ ├─ fallback content (기본 내용)                        │
│ └─ 페이지별 내용으로 교체됨                             │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Rendering Layer (Preview iframe)                   │
├─────────────────────────────────────────────────────────┤
│ 렌더링 로직:                                            │
│ 1. Page의 layout_id 확인                              │
│ 2. Layout 구조 로드                                    │
│ 3. Slot에 Page의 Element 삽입                         │
│ 4. 최종 HTML 렌더링                                    │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Inspector Layer (Property Editor)                  │
├─────────────────────────────────────────────────────────┤
│ Page Settings (UPDATE)                                 │
│ └─ Layout 선택 드롭다운                                 │
│                                                         │
│ Layout Editor (NEW)                                    │
│ ├─ Slot 추가/제거                                       │
│ ├─ Slot 이름 변경                                       │
│ └─ Fallback 컨텐츠 편집                                │
└─────────────────────────────────────────────────────────┘
```

---

## 구현 Phase

### Phase 1: 기본 인프라 (Week 1-2) 🔴 Critical

**목표**: Layout/Slot 컴포넌트 기본 동작

#### 1.1 Database Schema

```sql
-- layouts 테이블 생성
CREATE TABLE layouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT,
  slots JSONB DEFAULT '[]'::jsonb, -- [{ name: "content", required: true, fallback: null }]
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- pages 테이블에 layout_id 추가
ALTER TABLE pages
ADD COLUMN layout_id UUID REFERENCES layouts(id) ON DELETE SET NULL;

-- elements 테이블에 layout 관련 컬럼 추가
ALTER TABLE elements
ADD COLUMN layout_id UUID REFERENCES layouts(id) ON DELETE CASCADE,
ADD COLUMN slot_name TEXT;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX idx_elements_layout_id ON elements(layout_id);
CREATE INDEX idx_elements_slot_name ON elements(slot_name);
CREATE INDEX idx_pages_layout_id ON pages(layout_id);
```

#### 1.2 Type Definitions

**파일:** `src/types/builder/layout.types.ts`

```typescript
// Slot 정의 타입
export interface SlotDefinition {
  name: string;           // "content", "sidebar", "header"
  required: boolean;      // true면 페이지에서 반드시 채워야 함
  fallbackContent?: string; // 기본 내용 (Element ID 참조)
}

// Layout 타입
export interface Layout {
  id: string;
  name: string;
  project_id: string;
  description?: string;
  slots: SlotDefinition[];
  created_at?: string;
  updated_at?: string;
}

// Element 타입 확장 (기존 Element에 추가)
export interface Element {
  // ... 기존 필드
  layout_id?: string;     // 이 요소가 Layout에 속하면 Layout ID
  slot_name?: string;     // Slot placeholder면 Slot 이름
}

// Page 타입 확장 (기존 Page에 추가)
export interface Page {
  // ... 기존 필드
  layout_id?: string;     // 적용할 Layout ID (optional)
}
```

#### 1.3 Zustand Store

**파일:** `src/builder/stores/layouts.ts`

```typescript
import { create } from 'zustand';
import { supabase } from '../../lib/supabase';
import type { Layout, SlotDefinition } from '../../types/builder/layout.types';

interface LayoutsState {
  layouts: Layout[];
  currentLayoutId: string | null;

  // Actions
  fetchLayouts: (projectId: string) => Promise<void>;
  createLayout: (name: string, projectId: string) => Promise<Layout>;
  updateLayout: (id: string, updates: Partial<Layout>) => Promise<void>;
  deleteLayout: (id: string) => Promise<void>;
  addSlot: (layoutId: string, slot: SlotDefinition) => Promise<void>;
  removeSlot: (layoutId: string, slotName: string) => Promise<void>;
  setCurrentLayout: (layoutId: string | null) => void;
}

export const useLayoutsStore = create<LayoutsState>((set, get) => ({
  layouts: [],
  currentLayoutId: null,

  fetchLayouts: async (projectId: string) => {
    const { data, error } = await supabase
      .from('layouts')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    set({ layouts: data || [] });
  },

  createLayout: async (name: string, projectId: string) => {
    const newLayout: Partial<Layout> = {
      name,
      project_id: projectId,
      slots: [
        { name: 'content', required: true, fallbackContent: undefined }
      ]
    };

    const { data, error } = await supabase
      .from('layouts')
      .insert(newLayout)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create layout');

    set((state) => ({
      layouts: [data, ...state.layouts]
    }));

    return data;
  },

  updateLayout: async (id: string, updates: Partial<Layout>) => {
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
  },

  deleteLayout: async (id: string) => {
    const { error } = await supabase
      .from('layouts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    set((state) => ({
      layouts: state.layouts.filter(layout => layout.id !== id),
      currentLayoutId: state.currentLayoutId === id ? null : state.currentLayoutId
    }));
  },

  addSlot: async (layoutId: string, slot: SlotDefinition) => {
    const layout = get().layouts.find(l => l.id === layoutId);
    if (!layout) throw new Error('Layout not found');

    const updatedSlots = [...layout.slots, slot];
    await get().updateLayout(layoutId, { slots: updatedSlots });
  },

  removeSlot: async (layoutId: string, slotName: string) => {
    const layout = get().layouts.find(l => l.id === layoutId);
    if (!layout) throw new Error('Layout not found');

    const updatedSlots = layout.slots.filter(s => s.name !== slotName);
    await get().updateLayout(layoutId, { slots: updatedSlots });
  },

  setCurrentLayout: (layoutId: string | null) => {
    set({ currentLayoutId: layoutId });
  }
}));
```

#### 1.4 React Components

**파일:** `src/builder/components/Layout.tsx`

```tsx
import React from 'react';
import type { BaseElementProps } from '../../types/builder/unified.types';

export interface LayoutProps extends BaseElementProps {
  name?: string;
  description?: string;
}

/**
 * Layout Component
 *
 * Builder에서는 구조만 정의, Preview에서는 실제 렌더링
 */
export function Layout({ name, description, children, ...props }: LayoutProps) {
  return (
    <div
      className="react-aria-Layout"
      data-layout-name={name}
      {...props}
    >
      {children}
    </div>
  );
}
```

**파일:** `src/builder/components/Slot.tsx`

```tsx
import React from 'react';
import type { BaseElementProps } from '../../types/builder/unified.types';

export interface SlotProps extends BaseElementProps {
  name: string;           // Slot 식별자 (예: "content", "sidebar")
  required?: boolean;     // 필수 Slot 여부
  fallback?: React.ReactNode; // 기본 내용
}

/**
 * Slot Component
 *
 * Layout 안에서 페이지별 내용을 받을 placeholder
 */
export function Slot({ name, required, fallback, children, ...props }: SlotProps) {
  // Builder에서는 placeholder로만 표시
  // Preview에서는 실제 Page의 Element로 교체됨

  return (
    <div
      className="react-aria-Slot"
      data-slot-name={name}
      data-slot-required={required}
      {...props}
    >
      {children || fallback || (
        <div className="slot-placeholder">
          <div className="slot-placeholder__label">
            Slot: {name}
            {required && <span className="slot-required">*</span>}
          </div>
        </div>
      )}
    </div>
  );
}
```

**CSS:** `src/builder/components/styles/Slot.css`

```css
@layer components {
  .react-aria-Slot {
    min-height: 100px;
    border: 2px dashed var(--color-border-muted);
    border-radius: var(--radius-md);
    position: relative;
  }

  .slot-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100px;
    color: var(--color-text-muted);
    font-size: var(--text-sm);
  }

  .slot-placeholder__label {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }

  .slot-required {
    color: var(--color-error);
    font-weight: 600;
  }

  /* Builder mode - Slot 강조 표시 */
  .react-aria-Slot[data-builder-mode="true"] {
    border-color: var(--color-primary-500);
    background: var(--color-primary-50);
  }
}
```

#### 1.5 Component Factory

**파일:** `src/builder/factories/definitions/LayoutComponents.ts` (기존 파일 수정)

```typescript
import { ComponentDefinition, ComponentCreationContext } from '../types';

/**
 * Layout 컴포넌트 정의
 */
export function createLayoutDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  return {
    tag: "Layout",
    parent: {
      tag: "Layout",
      props: {
        name: "New Layout",
        description: "Reusable page layout"
      },
      page_id: pageId,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "Slot",
        props: {
          name: "content",
          required: true,
        },
        page_id: pageId,
        order_num: 1,
      }
    ]
  };
}

/**
 * Slot 컴포넌트 정의
 */
export function createSlotDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  return {
    tag: "Slot",
    parent: {
      tag: "Slot",
      props: {
        name: "unnamed-slot",
        required: false,
      },
      page_id: pageId,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: []
  };
}
```

**Component 등록:** `src/builder/components/metadata.ts`

```typescript
export const componentMetadata = {
  // ... 기존 컴포넌트

  Layout: {
    displayName: "Layout",
    description: "Reusable page layout with slots",
    category: "Layout",
    icon: LayoutDashboard,
    inspector: {
      groups: ["general"],
    },
    hasChildren: true,
    acceptedChildren: ["Slot", "*"],
  },

  Slot: {
    displayName: "Slot",
    description: "Placeholder for page-specific content",
    category: "Layout",
    icon: Square,
    inspector: {
      groups: ["general"],
    },
    hasChildren: true,
    parentRequired: "Layout", // Slot은 Layout 안에서만 사용 가능
  },
};
```

---

### Phase 2: Inspector UI (Week 3) 🟡 High

**목표**: Layout 생성/편집 UI, Page에 Layout 적용 UI

#### 2.1 Layout Manager Panel

**파일:** `src/builder/panels/layouts/LayoutsPanel.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { Plus, Trash, Edit, Copy } from 'lucide-react';
import { useLayoutsStore } from '../../stores/layouts';
import { useStore } from '../../stores';

export function LayoutsPanel({ isActive }: { isActive: boolean }) {
  const layouts = useLayoutsStore((state) => state.layouts);
  const fetchLayouts = useLayoutsStore((state) => state.fetchLayouts);
  const createLayout = useLayoutsStore((state) => state.createLayout);
  const deleteLayout = useLayoutsStore((state) => state.deleteLayout);
  const currentProjectId = useStore((state) => state.currentProjectId);

  useEffect(() => {
    if (isActive && currentProjectId) {
      fetchLayouts(currentProjectId);
    }
  }, [isActive, currentProjectId]);

  const handleCreate = async () => {
    if (!currentProjectId) return;

    const name = prompt('Layout name:');
    if (!name) return;

    await createLayout(name, currentProjectId);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this layout? Pages using it will lose the layout.')) return;
    await deleteLayout(id);
  };

  if (!isActive) return null;

  return (
    <div className="layouts-panel">
      <div className="panel-header">
        <h2>Layouts</h2>
        <Button size="sm" onPress={handleCreate}>
          <Plus size={16} />
          New Layout
        </Button>
      </div>

      <div className="layouts-list">
        {layouts.length === 0 ? (
          <div className="empty-state">
            <p>No layouts yet</p>
            <Button onPress={handleCreate}>Create First Layout</Button>
          </div>
        ) : (
          layouts.map((layout) => (
            <div key={layout.id} className="layout-item">
              <div className="layout-info">
                <h3>{layout.name}</h3>
                <p className="layout-description">{layout.description}</p>
                <div className="layout-slots">
                  {layout.slots.map((slot) => (
                    <span key={slot.name} className="slot-badge">
                      {slot.name}
                      {slot.required && <span className="required">*</span>}
                    </span>
                  ))}
                </div>
              </div>
              <div className="layout-actions">
                <Button size="sm" variant="ghost" onPress={() => {}}>
                  <Edit size={16} />
                </Button>
                <Button size="sm" variant="ghost" onPress={() => {}}>
                  <Copy size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => handleDelete(layout.id)}
                >
                  <Trash size={16} />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

#### 2.2 Page Editor - Layout Selection

**파일:** `src/builder/inspector/properties/editors/PageEditor.tsx` (기존 파일 수정)

```tsx
import { PropertySelect } from '../../components';
import { useLayoutsStore } from '../../../stores/layouts';
import { LayoutDashboard } from 'lucide-react';

export function PageEditor({ pageId, currentProps, onUpdate }: EditorProps) {
  const layouts = useLayoutsStore((state) => state.layouts);
  const currentProjectId = useStore((state) => state.currentProjectId);

  useEffect(() => {
    if (currentProjectId) {
      useLayoutsStore.getState().fetchLayouts(currentProjectId);
    }
  }, [currentProjectId]);

  return (
    <div className="page-editor">
      {/* 기존 필드들 */}

      <fieldset className="properties-group">
        <legend>Layout</legend>

        <PropertySelect
          label="Page Layout"
          value={currentProps.layout_id || ""}
          onChange={(value) => onUpdate({ layout_id: value || null })}
          options={[
            { value: "", label: "None (No Layout)" },
            ...layouts.map(layout => ({
              value: layout.id,
              label: layout.name
            }))
          ]}
          icon={LayoutDashboard}
        />

        {currentProps.layout_id && (
          <div className="layout-info">
            <p className="help-text">
              This page uses the "{layouts.find(l => l.id === currentProps.layout_id)?.name}" layout.
              Page content will fill the layout's slots.
            </p>
          </div>
        )}
      </fieldset>
    </div>
  );
}
```

#### 2.3 Layout Editor

**파일:** `src/builder/inspector/properties/editors/LayoutEditor.tsx`

```tsx
import React from 'react';
import { PropertyInput, PropertySwitch } from '../../components';
import { Plus, Trash } from 'lucide-react';
import { Button } from '../../../components/Button';

export function LayoutEditor({ elementId, currentProps, onUpdate }: EditorProps) {
  const handleAddSlot = () => {
    const slotName = prompt('Slot name (e.g., "sidebar", "footer"):');
    if (!slotName) return;

    // Slot 추가는 Layout Store를 통해 처리
    // 여기서는 UI만 표시
  };

  return (
    <div className="layout-editor">
      <fieldset className="properties-group">
        <legend>Layout Settings</legend>

        <PropertyInput
          label="Layout Name"
          value={String(currentProps.name || "")}
          onChange={(value) => onUpdate({ name: value })}
          placeholder="Main Layout"
        />

        <PropertyInput
          label="Description"
          value={String(currentProps.description || "")}
          onChange={(value) => onUpdate({ description: value })}
          placeholder="Default layout for all pages"
        />
      </fieldset>

      <fieldset className="properties-group">
        <legend>Slots</legend>

        <div className="slots-list">
          {/* Slot 목록 표시 */}
          <div className="help-text">
            Add Slot components to this Layout to define content areas.
          </div>
        </div>

        <Button size="sm" onPress={handleAddSlot}>
          <Plus size={16} />
          Add Slot
        </Button>
      </fieldset>
    </div>
  );
}
```

#### 2.4 Slot Editor

**파일:** `src/builder/inspector/properties/editors/SlotEditor.tsx`

```tsx
import React from 'react';
import { PropertyInput, PropertySwitch } from '../../components';

export function SlotEditor({ elementId, currentProps, onUpdate }: EditorProps) {
  return (
    <div className="slot-editor">
      <fieldset className="properties-group">
        <legend>Slot Settings</legend>

        <PropertyInput
          label="Slot Name"
          value={String(currentProps.name || "")}
          onChange={(value) => onUpdate({ name: value })}
          placeholder="content"
          description="Unique identifier for this slot"
        />

        <PropertySwitch
          label="Required"
          isSelected={Boolean(currentProps.required)}
          onChange={(checked) => onUpdate({ required: checked })}
          description="Pages must fill this slot"
        />
      </fieldset>

      <fieldset className="properties-group">
        <legend>Fallback Content</legend>

        <div className="help-text">
          Add child elements to this Slot to define fallback content
          shown when a page doesn't provide content for this slot.
        </div>
      </fieldset>
    </div>
  );
}
```

---

### Phase 3: Preview Rendering (Week 4) 🟡 High

**목표**: Preview iframe에서 Layout + Page 합성 렌더링

#### 3.1 Layout Resolver

**파일:** `src/builder/preview/utils/layoutResolver.ts`

```typescript
import type { Element, Page, Layout } from '../../../types/builder/unified.types';

/**
 * Page에 Layout을 적용하여 최종 Element 트리 생성
 */
export function resolveLayoutForPage(
  page: Page,
  layout: Layout | null,
  pageElements: Element[],
  layoutElements: Element[]
): Element[] {
  // Layout 없으면 기존 방식대로
  if (!layout) {
    return pageElements;
  }

  // 1. Layout의 Element 트리 복사
  const layoutTree = cloneElements(layoutElements);

  // 2. 각 Slot에 Page의 Element 삽입
  const resolvedTree = layoutTree.map(element => {
    if (element.tag === 'Slot' && element.props.name) {
      const slotName = element.props.name;

      // 이 Slot에 들어갈 Page Element 찾기
      const slotContent = pageElements.filter(el =>
        el.slot_name === slotName
      );

      // Slot을 실제 내용으로 교체
      return {
        ...element,
        children: slotContent
      };
    }

    return element;
  });

  return resolvedTree;
}

function cloneElements(elements: Element[]): Element[] {
  return elements.map(el => ({ ...el }));
}
```

#### 3.2 Preview Renderer 수정

**파일:** `src/builder/preview/index.tsx` (기존 파일 수정)

```tsx
import { resolveLayoutForPage } from './utils/layoutResolver';
import { useLayoutsStore } from '../stores/layouts';

export function Preview() {
  const page = useStore((state) => state.currentPage);
  const elements = useStore((state) => state.elements);
  const layouts = useLayoutsStore((state) => state.layouts);

  // Page의 Layout 찾기
  const pageLayout = page?.layout_id
    ? layouts.find(l => l.id === page.layout_id)
    : null;

  // Layout Element 가져오기
  const layoutElements = pageLayout
    ? elements.filter(el => el.layout_id === pageLayout.id)
    : [];

  // Page Element 가져오기
  const pageElements = elements.filter(el =>
    el.page_id === page?.id && !el.layout_id
  );

  // Layout + Page 합성
  const finalElements = resolveLayoutForPage(
    page,
    pageLayout,
    pageElements,
    layoutElements
  );

  return (
    <div className="preview">
      {renderElements(finalElements)}
    </div>
  );
}
```

---

### Phase 4: Workflow Enhancements (Week 5-6) 🟢 Medium

**목표**: 사용자 경험 향상, 편의 기능

#### 4.1 Layout 복제

```typescript
// layoutsStore.ts에 추가
duplicateLayout: async (sourceId: string) => {
  const source = get().layouts.find(l => l.id === sourceId);
  if (!source) throw new Error('Layout not found');

  const duplicate = {
    ...source,
    id: undefined,
    name: `${source.name} (Copy)`,
    created_at: undefined,
  };

  return get().createLayout(duplicate.name, source.project_id);
}
```

#### 4.2 Layout Template Library

미리 만들어진 Layout 템플릿 제공:

```typescript
// src/builder/templates/layoutTemplates.ts
export const layoutTemplates = [
  {
    name: "Simple Header + Content + Footer",
    slots: [
      { name: "header", required: false },
      { name: "content", required: true },
      { name: "footer", required: false }
    ]
  },
  {
    name: "Sidebar + Content",
    slots: [
      { name: "sidebar", required: false },
      { name: "content", required: true }
    ]
  },
  {
    name: "Dashboard (Header + Sidebar + Content)",
    slots: [
      { name: "header", required: true },
      { name: "sidebar", required: false },
      { name: "content", required: true }
    ]
  }
];
```

#### 4.3 Layout Usage Tracking

어떤 페이지가 어떤 Layout을 사용하는지 추적:

```typescript
// layoutsStore.ts에 추가
getLayoutUsage: (layoutId: string) => {
  const pages = useStore.getState().pages;
  return pages.filter(page => page.layout_id === layoutId);
}
```

Inspector에 표시:

```tsx
<div className="layout-usage">
  <h4>Used by {usageCount} pages:</h4>
  <ul>
    {usedPages.map(page => (
      <li key={page.id}>{page.title}</li>
    ))}
  </ul>
</div>
```

#### 4.4 Slot Content Preview

Builder에서 Slot에 어떤 내용이 들어갈지 미리보기:

```tsx
// Slot Component에 추가
{isBuilderMode && (
  <div className="slot-preview">
    <small>Pages using this slot:</small>
    {/* Slot 내용 프리뷰 표시 */}
  </div>
)}
```

---

### Phase 5: Advanced Features (Future) 🟢 Low

#### 5.1 Nested Layouts

Layout 안에 Layout (상속):

```
BaseLayout
├─ Slot "header"
└─ Slot "content"

DashboardLayout (extends BaseLayout)
└─ Fill Slot "content":
   ├─ Sidebar
   └─ Slot "dashboard-content"
```

#### 5.2 Conditional Layouts

디바이스/권한에 따라 다른 Layout:

```typescript
page.layout_rules = [
  { condition: "device === 'mobile'", layout_id: "mobile-layout" },
  { condition: "user.role === 'admin'", layout_id: "admin-layout" },
  { condition: "default", layout_id: "main-layout" }
];
```

#### 5.3 Layout Variants

같은 Layout의 변형:

```
MainLayout
├─ Variant "default"
├─ Variant "wide"
└─ Variant "compact"
```

---

## 기술 스펙

### Database Schema (상세)

```sql
-- layouts 테이블
CREATE TABLE layouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT,
  slots JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_layout_name_per_project UNIQUE (project_id, name)
);

-- Slot 정의 JSON 스키마
-- slots: [
--   {
--     "name": "content",
--     "required": true,
--     "fallbackContent": null
--   },
--   {
--     "name": "sidebar",
--     "required": false,
--     "fallbackContent": "element-id-123"
--   }
-- ]

-- pages 테이블 수정
ALTER TABLE pages
ADD COLUMN layout_id UUID REFERENCES layouts(id) ON DELETE SET NULL;

-- elements 테이블 수정
ALTER TABLE elements
ADD COLUMN layout_id UUID REFERENCES layouts(id) ON DELETE CASCADE,
ADD COLUMN slot_name TEXT;

-- 제약조건: Slot은 Layout 안에서만
ALTER TABLE elements
ADD CONSTRAINT check_slot_in_layout
CHECK (
  (tag != 'Slot') OR (parent_id IN (
    SELECT id FROM elements WHERE tag = 'Layout'
  ))
);

-- 인덱스
CREATE INDEX idx_layouts_project ON layouts(project_id);
CREATE INDEX idx_elements_layout ON elements(layout_id);
CREATE INDEX idx_elements_slot ON elements(slot_name);
CREATE INDEX idx_pages_layout ON pages(layout_id);

-- RLS (Row Level Security)
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
```

### API Service

**파일:** `src/services/api/LayoutsApiService.ts`

```typescript
import { supabase } from '../../lib/supabase';
import type { Layout, SlotDefinition } from '../../types/builder/layout.types';

export class LayoutsApiService {
  static async getLayouts(projectId: string): Promise<Layout[]> {
    const { data, error } = await supabase
      .from('layouts')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getLayout(id: string): Promise<Layout> {
    const { data, error } = await supabase
      .from('layouts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Layout not found');
    return data;
  }

  static async createLayout(layout: Partial<Layout>): Promise<Layout> {
    const { data, error } = await supabase
      .from('layouts')
      .insert(layout)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create layout');
    return data;
  }

  static async updateLayout(id: string, updates: Partial<Layout>): Promise<void> {
    const { error } = await supabase
      .from('layouts')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  static async deleteLayout(id: string): Promise<void> {
    const { error } = await supabase
      .from('layouts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async getLayoutElements(layoutId: string): Promise<Element[]> {
    const { data, error } = await supabase
      .from('elements')
      .select('*')
      .eq('layout_id', layoutId)
      .order('order_num', { ascending: true });

    if (error) throw error;
    return data || [];
  }
}
```

---

## UI/UX 설계

### Layout Manager Panel

```
┌────────────────────────────────────────────┐
│ 📊 Layouts                    [+ New]      │
├────────────────────────────────────────────┤
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ Main Layout                   [⋯ Menu]│ │
│ │ Default layout for all pages          │ │
│ │ Slots: header content footer          │ │
│ │ Used by: 12 pages                     │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ Dashboard Layout              [⋯ Menu]│ │
│ │ Admin dashboard with sidebar          │ │
│ │ Slots: sidebar content                │ │
│ │ Used by: 3 pages                      │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ Blog Layout                   [⋯ Menu]│ │
│ │ Blog posts with comments              │ │
│ │ Slots: content comments               │ │
│ │ Used by: 25 pages                     │ │
│ └────────────────────────────────────────┘ │
│                                            │
└────────────────────────────────────────────┘
```

### Page Inspector - Layout Selection

```
┌────────────────────────────────────────────┐
│ Page Settings                              │
├────────────────────────────────────────────┤
│                                            │
│ Name                                       │
│ ┌────────────────────────────────────────┐ │
│ │ Home Page                              │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ Slug                                       │
│ ┌────────────────────────────────────────┐ │
│ │ /home                                  │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ Layout                                     │
│ ┌────────────────────────────────────────┐ │
│ │ Main Layout                      ▼    │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ℹ️ This page uses the "Main Layout".      │
│   Content will fill these slots:          │
│   • header (optional)                     │
│   • content (required) *                  │
│   • footer (optional)                     │
│                                            │
└────────────────────────────────────────────┘
```

### Layout Editor Mode

```
Builder Canvas (Layout 편집 중):

┌────────────────────────────────────────────┐
│ 🔧 Editing: Main Layout                    │
├────────────────────────────────────────────┤
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ [Slot: header]                         │ │ ← Placeholder
│ │ Drag elements here or set fallback     │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ [Slot: content] *                      │ │ ← Required
│ │ Pages must provide content here        │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ Footer Element (fallback)              │ │ ← Fallback content
│ │ Copyright 2025                         │ │
│ └────────────────────────────────────────┘ │
│                                            │
└────────────────────────────────────────────┘
```

### Page Editor Mode (Layout 적용된 페이지)

```
Builder Canvas (Page 편집 중):

┌────────────────────────────────────────────┐
│ 📄 Page: Home (using Main Layout)          │
├────────────────────────────────────────────┤
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ [Layout: header]                       │ │ ← Layout 영역 (읽기 전용)
│ │ Logo | Navigation | User Menu          │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ ✏️ Hero Section                        │ │ ← Page content (편집 가능)
│ │ Welcome to Our Site                    │ │
│ │ [CTA Button]                           │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ ✏️ Features Grid                       │ │ ← Page content
│ │ [Card] [Card] [Card]                   │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ [Layout: footer]                       │ │ ← Layout 영역 (읽기 전용)
│ │ Links | Social | Copyright             │ │
│ └────────────────────────────────────────┘ │
│                                            │
└────────────────────────────────────────────┘
```

---

## Migration 전략

### 기존 페이지에 영향 없음 (Opt-in)

```typescript
// Phase 1: 기존 페이지는 그대로 작동
Page without layout_id:
└─ Body
   └─ ... (기존 방식 유지)

// Phase 2: 신규 페이지만 Layout 사용
Page with layout_id:
└─ Layout applied
   └─ Slots filled with page content

// Phase 3: 점진적 마이그레이션
Convert existing page to use layout:
1. Create Layout from existing page structure
2. Assign layout_id to page
3. Move page elements to appropriate slots
```

### Migration Helper

**파일:** `src/builder/utils/layoutMigration.ts`

```typescript
/**
 * 기존 페이지를 Layout 기반으로 변환
 */
export async function convertPageToLayout(
  pageId: string,
  layoutName: string
): Promise<void> {
  // 1. 현재 페이지 구조 분석
  const page = await getPage(pageId);
  const elements = await getPageElements(pageId);

  // 2. 공통 패턴 찾기 (header, footer 등)
  const patterns = analyzePageStructure(elements);

  // 3. Layout 생성
  const layout = await createLayout({
    name: layoutName,
    project_id: page.project_id,
    slots: patterns.slots
  });

  // 4. Element를 Layout과 Slot으로 분리
  const layoutElements = patterns.layoutElements;
  const slotContents = patterns.slotContents;

  // 5. Layout Element 저장
  await saveLayoutElements(layout.id, layoutElements);

  // 6. Page에 Layout 적용
  await updatePage(pageId, { layout_id: layout.id });

  // 7. Page Element를 Slot에 매핑
  await mapElementsToSlots(pageId, slotContents);
}
```

---

## 성공 지표

### Phase 1 완료 기준

- [ ] Layout, Slot 컴포넌트 생성 가능
- [ ] Database에 Layout 저장/로드
- [ ] Layout Store 작동
- [ ] Component Palette에 표시

### Phase 2 완료 기준

- [ ] Layout Manager Panel에서 Layout CRUD
- [ ] Page Inspector에서 Layout 선택
- [ ] Layout/Slot Editor UI 작동

### Phase 3 완료 기준

- [ ] Preview에서 Layout + Page 합성 렌더링
- [ ] Slot에 Page content 정확히 삽입
- [ ] Layout 없는 페이지도 정상 작동 (backward compatible)

### Phase 4 완료 기준

- [ ] Layout 복제 기능
- [ ] Layout Template Library
- [ ] Layout 사용 현황 추적

---

## 참고 자료

**다른 빌더 분석:**
- `docs/WEB_BUILDER_DATA_ARCHITECTURE_ANALYSIS.md` (2025-11-20)

**XStudio 관련 문서:**
- `CLAUDE.md` - 프로젝트 아키텍처
- `src/types/builder/unified.types.ts` - 타입 정의
- `src/builder/factories/` - 컴포넌트 생성 로직

**React Patterns:**
- React Context API (Slot content 전달)
- React Portal (Layout 렌더링)
- Compound Components (Layout + Slot)

---

## 다음 단계

1. ✅ **이 문서 리뷰** - 팀 검토 및 피드백
2. 🔴 **Phase 1 구현 시작** - Database + Store + Components
3. 🟡 **Phase 2 구현** - Inspector UI
4. 🟡 **Phase 3 구현** - Preview Rendering
5. 🟢 **Phase 4 구현** - Enhancements
6. 📊 **Dataset 시스템** - Layout 완료 후 시작

---

**작성:** AI Assistant (Claude Sonnet 4.5)
**검토 필요:** XStudio 개발팀
**예상 개발 기간:** 4-6주 (Phase 1-3)
