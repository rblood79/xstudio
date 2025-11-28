# Nested Routes & Slug System Design

**Status:** Draft
**Created:** 2025-11-28
**Updated:** 2025-11-29
**Author:** Claude
**Related:** Layout/Slot System, Page Management

---

## 1. Overview

### 1.1 Problem Statement

현재 XStudio의 페이지 라우팅 시스템:
- 페이지 생성 시 slug가 `/page-1`, `/page-2` 형태로 자동 생성
- 중첩 경로 (`/products/category/item`) 지원 없음
- Layout과 URL 구조의 연관성 없음

### 1.2 Goal

`/products/shoes/nike` 같은 중첩 라우트를 지원하면서, Layout 시스템과 자연스럽게 통합

### 1.3 Design Principle

**Case 2 (계층 기반)를 기본으로, Layout slug는 선택적 옵션**

```
┌─────────────────────────────────────────────┐
│         Case 2 (계층 기반 - Superset)         │
│                                             │
│   ┌─────────────────────────────────────┐   │
│   │  Case 1 (Layout 기반 URL)           │   │
│   │  + 자유로운 URL                      │   │
│   └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

**Rationale:**
- Layout의 본질 = 반복을 줄이기 위한 미리 정의된 구조
- 같은 Layout을 쓰는 페이지들 = 같은 섹션/카테고리 = 같은 URL 패턴
- 하지만 다양한 고객 요구를 위해 자유로운 URL도 지원 필요
- **Case 2는 Case 1을 포함하는 상위 집합**

---

## 2. Data Structure Changes

### 2.1 Layout Type (변경)

```typescript
// src/types/builder/layout.types.ts

export interface Layout {
  id: string;
  name: string;
  project_id: string;
  description?: string;

  // ✅ NEW FIELDS
  order_num?: number;     // 정렬 순서
  slug?: string;          // URL base path (e.g., "/products")

  created_at?: string;
  updated_at?: string;
}
```

### 2.2 LayoutCreate, LayoutUpdate 타입 (변경)

```typescript
// src/types/builder/layout.types.ts

/**
 * Layout 생성 시 필요한 필드
 */
export type LayoutCreate = Pick<Layout, "name" | "project_id"> & {
  description?: string;
  order_num?: number;  // ✅ 추가
  slug?: string;       // ✅ 추가
};

/**
 * Layout 업데이트 시 필요한 필드
 */
export type LayoutUpdate = Partial<Pick<Layout, "name" | "description" | "slug">>;  // ✅ slug 추가
```

### 2.3 Page Type (기존 유지)

```typescript
// src/types/builder/unified.types.ts (기존)

export interface Page {
  id: string;
  title: string;           // 페이지 제목
  project_id: string;
  slug: string;            // URL 경로 - 절대경로(/로 시작) 또는 상대경로
  parent_id?: string | null;
  order_num?: number;
  layout_id?: string | null;
  created_at?: string;
  updated_at?: string;
}
```

**⚠️ 중요: slug 필드 사용 규칙**

| 상황 | slug 값 | 최종 URL |
|------|---------|----------|
| 절대 경로 | `/products/shoes` | `/products/shoes` (그대로 사용) |
| Layout 있음 + 상대 경로 | `nike` | `{Layout.slug}/nike` |
| parent_id 있음 + 상대 경로 | `nike` | `{부모 URL}/nike` |
| 상대 경로만 | `page-1` | `/page-1` |

### 2.4 Database Migration (Supabase)

```sql
-- supabase/migrations/YYYYMMDD_add_layout_slug.sql

-- 1. Layout 테이블에 필드 추가
ALTER TABLE layouts
  ADD COLUMN order_num INTEGER DEFAULT 0,
  ADD COLUMN slug TEXT;

-- 2. Unique constraint (프로젝트 내 slug 고유)
CREATE UNIQUE INDEX idx_layout_slug_project
  ON layouts(project_id, slug)
  WHERE slug IS NOT NULL;

-- 3. order_num 인덱스
CREATE INDEX idx_layout_order
  ON layouts(project_id, order_num);
```

### 2.5 IndexedDB Schema Update

```typescript
// src/lib/db/indexedDB/adapter.ts

// ⚠️ DB_VERSION 증가 필요 (현재 5 → 6)
const DB_VERSION = 6;

// onupgradeneeded 핸들러 내부
// ✅ 버전 6: layouts 스토어에 order_num, slug 인덱스 추가
if (!db.objectStoreNames.contains('layouts')) {
  const layoutsStore = db.createObjectStore('layouts', { keyPath: 'id' });
  layoutsStore.createIndex('project_id', 'project_id', { unique: false });
  layoutsStore.createIndex('name', 'name', { unique: false });
  layoutsStore.createIndex('order_num', 'order_num', { unique: false });  // ✅ 추가
  layoutsStore.createIndex('slug', 'slug', { unique: false });            // ✅ 추가
  console.log('[IndexedDB] Created store: layouts with order_num, slug indexes');
} else {
  // 기존 스토어에 인덱스 추가
  const transaction = (event.target as IDBOpenDBRequest).transaction;
  if (transaction) {
    const layoutsStore = transaction.objectStore('layouts');
    if (!layoutsStore.indexNames.contains('order_num')) {
      layoutsStore.createIndex('order_num', 'order_num', { unique: false });
      console.log('[IndexedDB] Added index: layouts.order_num');
    }
    if (!layoutsStore.indexNames.contains('slug')) {
      layoutsStore.createIndex('slug', 'slug', { unique: false });
      console.log('[IndexedDB] Added index: layouts.slug');
    }
  }
}

// ✅ layouts API 타입 수정 (인라인 타입 → Layout 타입 import)
import type { Layout } from '../../../types/builder/layout.types';

layouts = {
  insert: async (layout: Layout) => {
    const now = new Date().toISOString();
    const layoutWithTimestamps: Layout = {
      ...layout,
      created_at: layout.created_at || now,
      updated_at: layout.updated_at || now,
    };
    await this.putToStore('layouts', layoutWithTimestamps);
    return layoutWithTimestamps;
  },

  update: async (id: string, updates: Partial<Layout>) => {
    const existing = await this.layouts.getById(id);
    if (!existing) {
      throw new Error(`Layout ${id} not found`);
    }
    const updated: Layout = { ...existing, ...updates, updated_at: new Date().toISOString() };
    await this.putToStore('layouts', updated);
    return updated;
  },

  delete: async (id: string): Promise<void> => {
    await this.deleteFromStore('layouts', id);
  },

  getById: async (id: string): Promise<Layout | null> => {
    return this.getFromStore<Layout>('layouts', id);
  },

  getByProject: async (projectId: string): Promise<Layout[]> => {
    return this.getAllByIndex<Layout>('layouts', 'project_id', projectId);
  },

  getAll: async (): Promise<Layout[]> => {
    return this.getAllFromStore<Layout>('layouts');
  },
};
```

---

## 3. URL Generation Logic

### 3.1 URL 결정 우선순위

```
1. Page.slug가 절대 경로 (/ 로 시작)인 경우 → 그대로 사용
2. Layout.slug가 있는 경우 → Layout.slug + "/" + Page.slug
3. parent_id가 있는 경우 → 부모 URL + "/" + Page.slug
4. 그 외 → "/" + Page.slug
```

### 3.2 예시 시나리오

**Scenario A: Layout 기반 URL**

```
Layout: { slug: "/products" }
Page: { slug: "shoes/nike", layout_id: "layout-1" }  // 상대 경로
→ Final URL: /products/shoes/nike
```

**Scenario B: 계층 기반 URL**

```
Page 1: { slug: "/products", parent_id: null }      // 절대 경로
Page 2: { slug: "shoes", parent_id: "page-1" }      // 상대 경로 → /products/shoes
Page 3: { slug: "nike", parent_id: "page-2" }       // 상대 경로 → /products/shoes/nike
```

**Scenario C: 자유 URL (Layout 없음)**

```
Page: { slug: "/promo-summer-2024", layout_id: null }  // 절대 경로
→ Final URL: /promo-summer-2024
```

**Scenario D: 절대 경로는 Layout slug 무시**

```
Layout: { slug: "/blog" }
Page: { slug: "/special-post", layout_id: "layout-1" }  // 절대 경로
→ Final URL: /special-post (Layout slug 무시)
```

### 3.3 URL 생성 유틸리티

```typescript
// src/utils/urlGenerator.ts

import type { Page } from '../types/builder/unified.types';
import type { Layout } from '../types/builder/layout.types';

interface GeneratePageUrlParams {
  page: Page;
  layout?: Layout | null;
  allPages?: Page[];
}

/**
 * 페이지의 최종 URL을 생성합니다.
 *
 * @param page - 대상 페이지
 * @param layout - 페이지에 적용된 Layout (optional)
 * @param allPages - 전체 페이지 목록 (parent_id 기반 URL 생성 시 필요)
 */
export function generatePageUrl({ page, layout, allPages }: GeneratePageUrlParams): string {
  // 1. 절대 경로인 경우 그대로 반환
  if (page.slug.startsWith('/')) {
    return page.slug;
  }

  // 2. Layout slug가 있는 경우
  if (layout?.slug) {
    return normalizeUrl(`${layout.slug}/${page.slug}`);
  }

  // 3. parent_id가 있는 경우 (계층 기반)
  if (page.parent_id && allPages) {
    const parentUrl = buildParentPath(page.parent_id, allPages);
    return normalizeUrl(`${parentUrl}/${page.slug}`);
  }

  // 4. 기본값: 상대 경로를 절대 경로로 변환
  return normalizeUrl(`/${page.slug}`);
}

/**
 * 부모 페이지 경로를 재귀적으로 구성합니다.
 */
function buildParentPath(parentId: string, allPages: Page[]): string {
  const parent = allPages.find(p => p.id === parentId);
  if (!parent) return '';

  // 부모가 절대 경로면 그대로 반환
  if (parent.slug.startsWith('/')) {
    return parent.slug;
  }

  // 부모도 parent_id가 있으면 재귀
  if (parent.parent_id) {
    return `${buildParentPath(parent.parent_id, allPages)}/${parent.slug}`;
  }

  return `/${parent.slug}`;
}

/**
 * URL 정규화 (연속 슬래시 제거)
 */
function normalizeUrl(url: string): string {
  return url.replace(/\/+/g, '/');
}

/**
 * 순환 참조 검증
 *
 * @param pageId - 검증 대상 페이지 ID
 * @param newParentId - 설정하려는 새 parent_id
 * @param allPages - 전체 페이지 목록
 * @returns true면 순환 참조 발생
 */
export function hasCircularReference(
  pageId: string,
  newParentId: string | null,
  allPages: Page[]
): boolean {
  if (!newParentId) return false;

  let currentId: string | null = newParentId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === pageId) return true;  // 순환 발견
    if (visited.has(currentId)) return true; // 이미 방문 (무한 루프 방지)
    visited.add(currentId);

    const parent = allPages.find(p => p.id === currentId);
    currentId = parent?.parent_id || null;
  }

  return false;
}

/**
 * 중첩 깊이 계산
 */
export function getNestingDepth(pageId: string, allPages: Page[]): number {
  let depth = 0;
  let currentId: string | null = pageId;

  while (currentId) {
    const page = allPages.find(p => p.id === currentId);
    if (!page?.parent_id) break;
    depth++;
    currentId = page.parent_id;
  }

  return depth;
}
```

---

## 4. Page Creation Flow

### 4.1 Current Flow

```
현재:
1. "Add Page" 버튼 클릭
2. 자동으로 페이지 생성 (title: "Page N", slug: "/page-N")
3. 편집 불가
```

### 4.2 New Flow

```
개선:
1. "Add Page" 버튼 클릭
2. 다이얼로그 표시:
   ┌─────────────────────────────────┐
   │  Add New Page                   │
   ├─────────────────────────────────┤
   │  Title: [Page 4        ]        │  ← 기본값: "Page {N}"
   │  Slug:  [/page-4       ]        │  ← 기본값: "/page-{N}"
   │                                 │
   │  Layout: [None         ▼]       │  ← 선택적
   │  Parent: [None         ▼]       │  ← 선택적 (계층 구조)
   │                                 │
   │  [Cancel]          [Create]     │
   └─────────────────────────────────┘
3. 사용자가 값 수정 또는 기본값 사용
4. 페이지 생성
```

### 4.3 usePageManager 수정

```typescript
// src/builder/hooks/usePageManager.ts

// ✅ 새로운 타입 정의
export interface AddPageParams {
  projectId: string;
  title: string;
  slug: string;
  layoutId?: string | null;
  parentId?: string | null;
}

// ✅ 기본값 생성 함수 (다이얼로그에서 사용)
export function generatePageDefaults(existingPages: Page[]): { title: string; slug: string } {
  const nextNum = existingPages.length + 1;
  return {
    title: `Page ${nextNum}`,
    slug: `/page-${nextNum}`  // 절대 경로로 기본 생성
  };
}

// ✅ addPage 함수 시그니처 변경
const addPage = async (params: AddPageParams): Promise<ApiResult<ApiPage>> => {
  const { projectId, title, slug, layoutId, parentId } = params;

  // 순환 참조 검증
  if (parentId) {
    const { pages } = useStore.getState();
    if (hasCircularReference('', parentId, pages)) {
      return { success: false, error: new Error('Circular reference detected') };
    }
  }

  try {
    const currentPages = useStore.getState().pages;
    const maxOrderNum = currentPages.reduce((max, page) =>
      Math.max(max, page.order_num || 0), -1
    );

    const db = await getDB();
    const newPageData = {
      id: ElementUtils.generateId(),
      project_id: projectId,
      name: title,
      slug: slug,
      parent_id: parentId || null,
      layout_id: layoutId || null,
      order_num: maxOrderNum + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const newPage = await db.pages.insert(newPageData);
    // ... rest of the implementation
  } catch (error) {
    return { success: false, error: error as Error };
  }
};
```

### 4.4 Slug Validation Rules

```typescript
// src/utils/slugValidator.ts

export interface SlugValidationResult {
  valid: boolean;
  error?: string;
}

export function validateSlug(slug: string): SlugValidationResult {
  // 1. 빈 값 체크
  if (!slug.trim()) {
    return { valid: false, error: 'Slug cannot be empty' };
  }

  // 2. 유효 문자 체크 (영문, 숫자, 하이픈, 슬래시)
  if (!/^[a-z0-9\-\/]+$/i.test(slug)) {
    return { valid: false, error: 'Slug can only contain letters, numbers, hyphens, and slashes' };
  }

  // 3. 연속 슬래시 체크
  if (/\/\/+/.test(slug)) {
    return { valid: false, error: 'Slug cannot contain consecutive slashes' };
  }

  // 4. 끝 슬래시 체크
  if (slug.endsWith('/') && slug !== '/') {
    return { valid: false, error: 'Slug cannot end with a slash' };
  }

  return { valid: true };
}

/**
 * slug 자동 생성 (title → slug)
 */
export function generateSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')  // 특수문자 제거
    .replace(/\s+/g, '-')           // 공백 → 하이픈
    .replace(/-+/g, '-')            // 연속 하이픈 제거
    .replace(/^-|-$/g, '');         // 앞뒤 하이픈 제거
}
```

---

## 5. Property Editor Integration

### 5.1 Page Property Editor

```
┌─────────────────────────────────────────┐
│  Page Properties                        │
├─────────────────────────────────────────┤
│  📄 Basic                               │
│  ├─ Title: [Nike Shoes      ]          │
│  ├─ Slug:  [nike-shoes      ]          │  ← 상대 경로
│  │         ↳ Preview: /products/shoes/nike-shoes
│  │                                      │
│  📐 Layout                              │
│  ├─ Layout: [Products Layout ▼]         │
│  │          Base URL: /products         │
│  │                                      │
│  🌲 Hierarchy                           │
│  ├─ Parent: [Shoes Category  ▼]         │
│  │   ⚠️ Nesting depth: 3 (SEO warning)  │  ← 깊은 중첩 경고
│  └─ Order:  [3              ]           │
└─────────────────────────────────────────┘
```

### 5.2 Page Editor Component

```typescript
// src/builder/inspector/properties/editors/PageEditor.tsx

import { useMemo } from 'react';
import { useLayoutsStore } from '../../../stores/layouts';
import { useStore } from '../../../stores';
import { generatePageUrl, getNestingDepth, hasCircularReference } from '../../../../utils/urlGenerator';
import { PropertyInput, PropertySelect } from '../../components';

interface PageEditorProps {
  page: Page;
  onUpdate: (updates: Partial<Page>) => void;
}

export function PageEditor({ page, onUpdate }: PageEditorProps) {
  const layouts = useLayoutsStore((s) => s.layouts);
  const pages = useStore((s) => s.pages);
  const selectedLayout = layouts.find(l => l.id === page.layout_id);

  // URL 미리보기 계산
  const previewUrl = useMemo(() => {
    return generatePageUrl({ page, layout: selectedLayout, allPages: pages });
  }, [page, selectedLayout, pages]);

  // 중첩 깊이 계산
  const nestingDepth = useMemo(() => {
    return getNestingDepth(page.id, pages);
  }, [page.id, pages]);

  // Parent 변경 핸들러 (순환 참조 검증 포함)
  const handleParentChange = (newParentId: string | null) => {
    if (newParentId && hasCircularReference(page.id, newParentId, pages)) {
      // 순환 참조 경고 표시
      console.warn('Circular reference detected');
      return;
    }
    onUpdate({ parent_id: newParentId });
  };

  return (
    <div className="page-editor">
      {/* Basic Section */}
      <fieldset className="properties-group">
        <legend>Basic</legend>

        <PropertyInput
          label="Title"
          value={page.title}
          onChange={(value) => onUpdate({ title: value })}
          placeholder="Page Title"
        />

        <PropertyInput
          label="Slug"
          value={page.slug}
          onChange={(value) => onUpdate({ slug: value })}
          placeholder="/page-url or relative-path"
        />

        <div className="url-preview">
          Preview: <code>{previewUrl}</code>
        </div>
      </fieldset>

      {/* Layout Section */}
      <fieldset className="properties-group">
        <legend>Layout</legend>

        <PropertySelect
          label="Layout"
          value={page.layout_id || ''}
          onChange={(value) => onUpdate({ layout_id: value || null })}
          options={[
            { value: '', label: 'None' },
            ...layouts.map(l => ({
              value: l.id,
              label: `${l.name}${l.slug ? ` (${l.slug})` : ''}`
            }))
          ]}
        />

        {selectedLayout?.slug && (
          <div className="layout-slug-info">
            Base URL: <code>{selectedLayout.slug}</code>
          </div>
        )}
      </fieldset>

      {/* Hierarchy Section */}
      <fieldset className="properties-group">
        <legend>Hierarchy</legend>

        <PropertySelect
          label="Parent Page"
          value={page.parent_id || ''}
          onChange={(value) => handleParentChange(value || null)}
          options={[
            { value: '', label: 'None (Root)' },
            ...pages
              .filter(p => p.id !== page.id)  // 자기 자신 제외
              .map(p => ({ value: p.id, label: p.title }))
          ]}
        />

        {/* ✅ 깊은 중첩 경고 */}
        {nestingDepth >= 3 && (
          <div className="nesting-warning">
            ⚠️ Nesting depth: {nestingDepth} (may affect SEO)
          </div>
        )}
      </fieldset>
    </div>
  );
}
```

### 5.3 Layout Property Editor (slug 추가)

```typescript
// src/builder/inspector/properties/editors/LayoutEditor.tsx

import { PropertyInput } from '../../components';

interface LayoutEditorProps {
  layout: Layout;
  onUpdate: (updates: Partial<Layout>) => void;
}

export function LayoutEditor({ layout, onUpdate }: LayoutEditorProps) {
  return (
    <div className="layout-editor">
      <fieldset className="properties-group">
        <legend>Basic</legend>

        <PropertyInput
          label="Name"
          value={layout.name}
          onChange={(value) => onUpdate({ name: value })}
          placeholder="Layout Name"
        />

        <PropertyInput
          label="Description"
          value={layout.description || ''}
          onChange={(value) => onUpdate({ description: value })}
          placeholder="Optional description"
        />
      </fieldset>

      <fieldset className="properties-group">
        <legend>URL Settings</legend>

        <PropertyInput
          label="Base Slug"
          value={layout.slug || ''}
          onChange={(value) => onUpdate({ slug: value || undefined })}
          placeholder="/products (optional)"
        />

        <div className="slug-help">
          이 Layout을 사용하는 모든 페이지는<br/>
          <code>{layout.slug || '/'}</code> 하위 경로에 생성됩니다.
        </div>
      </fieldset>
    </div>
  );
}
```

---

## 6. Preview Integration

### 6.1 Preview Store 타입 수정

```typescript
// src/preview/store/types.ts

// ✅ Layout 타입 추가 (Preview용 최소 타입)
export interface PreviewLayout {
  id: string;
  name: string;
  slug?: string | null;
}

// ✅ PreviewStoreState에 layouts 추가
export interface PreviewStoreState extends StateHierarchy {
  // ... 기존 필드들 ...

  // ✅ Layouts 추가
  layouts: PreviewLayout[];
  setLayouts: (layouts: PreviewLayout[]) => void;
}
```

### 6.2 Preview Store 수정

```typescript
// src/preview/store/previewStore.ts

export const createPreviewStore = () => create<PreviewStoreState>((set, get) => ({
  // ... 기존 코드 ...

  // ============================================
  // Layouts (NEW)
  // ============================================
  layouts: [],
  setLayouts: (layouts: PreviewLayout[]) => set({ layouts }),

  // ... 기존 코드 ...
}));
```

### 6.3 postMessage 메시지 타입 추가

```typescript
// src/preview/messaging/types.ts (또는 적절한 위치)

// ✅ UPDATE_LAYOUTS 메시지 타입 추가
export interface UpdateLayoutsMessage {
  type: 'UPDATE_LAYOUTS';
  layouts: PreviewLayout[];
}

// 기존 메시지 유니온에 추가
export type PreviewMessage =
  | UpdateElementsMessage
  | UpdatePagesMessage
  | UpdateLayoutsMessage  // ✅ 추가
  | /* ... */;
```

### 6.4 Message Handler 수정

```typescript
// src/preview/utils/messageHandlers.ts

// ✅ UPDATE_LAYOUTS 핸들러 추가
case 'UPDATE_LAYOUTS': {
  const { layouts } = message;
  console.log('[Preview] Received layouts:', layouts.length);
  setLayouts(layouts);
  break;
}
```

### 6.5 Builder에서 layouts 전송

```typescript
// src/builder/hooks/useIframeMessenger.ts (또는 적절한 위치)

// Layout 변경 시 Preview에 전송
const sendLayoutsToPreview = useCallback((layouts: Layout[]) => {
  if (!iframeRef.current?.contentWindow) return;

  const previewLayouts: PreviewLayout[] = layouts.map(l => ({
    id: l.id,
    name: l.name,
    slug: l.slug,
  }));

  iframeRef.current.contentWindow.postMessage({
    type: 'UPDATE_LAYOUTS',
    layouts: previewLayouts,
  }, '*');
}, []);

// useLayoutsStore 구독하여 변경 시 전송
useEffect(() => {
  const unsubscribe = useLayoutsStore.subscribe(
    (state) => state.layouts,
    (layouts) => sendLayoutsToPreview(layouts)
  );
  return unsubscribe;
}, [sendLayoutsToPreview]);
```

### 6.6 PreviewRouter 업데이트

```typescript
// src/preview/router/PreviewRouter.tsx

import { useMemo } from 'react';
import { usePreviewStore } from '../store';
import { generatePageUrl } from '../../utils/urlGenerator';

export function PreviewRouter({ renderElements }: PreviewRouterProps) {
  const pages = usePreviewStore((s) => s.pages);
  const layouts = usePreviewStore((s) => s.layouts);  // ✅ layouts 추가

  // 각 페이지의 최종 URL 계산
  const routeConfigs = useMemo(() => {
    return pages.map(page => {
      const layout = layouts.find(l => l.id === page.layout_id);
      const finalUrl = generatePageUrl({
        page: { ...page, title: page.title },  // Page 타입 맞추기
        layout,
        allPages: pages.map(p => ({ ...p, title: p.title }))
      });

      return {
        pageId: page.id,
        path: finalUrl,
        layoutId: page.layout_id
      };
    });
  }, [pages, layouts]);

  return (
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        {routeConfigs.map(({ pageId, path }) => (
          <Route
            key={pageId}
            path={path}
            element={<PageRenderer pageId={pageId} renderElements={renderElements} />}
          />
        ))}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MemoryRouter>
  );
}
```

---

## 7. NodesPanel 계층 트리 표시

### 7.1 현재 vs 개선

```
현재 (평면 리스트):
📄 Page 1
📄 Page 2
📄 Page 3

개선 (계층 트리):
📁 Products (/products)
├─ 📄 Shoes (/products/shoes)
│   ├─ 📄 Nike (/products/shoes/nike)
│   └─ 📄 Adidas (/products/shoes/adidas)
└─ 📄 Clothes (/products/clothes)
📄 About (/about)
```

### 7.2 페이지 트리 구조 생성

```typescript
// src/builder/panels/nodes/utils/pageTreeBuilder.ts

import type { Page } from '../../../../types/builder/unified.types';

export interface PageTreeNode {
  page: Page;
  children: PageTreeNode[];
  depth: number;
}

/**
 * 평면 페이지 배열을 계층 트리로 변환
 */
export function buildPageTree(pages: Page[]): PageTreeNode[] {
  const nodeMap = new Map<string, PageTreeNode>();
  const roots: PageTreeNode[] = [];

  // 1. 모든 노드 생성
  pages.forEach(page => {
    nodeMap.set(page.id, { page, children: [], depth: 0 });
  });

  // 2. 부모-자식 관계 연결
  pages.forEach(page => {
    const node = nodeMap.get(page.id)!;

    if (page.parent_id && nodeMap.has(page.parent_id)) {
      const parentNode = nodeMap.get(page.parent_id)!;
      parentNode.children.push(node);
      node.depth = parentNode.depth + 1;
    } else {
      roots.push(node);
    }
  });

  // 3. order_num으로 정렬
  const sortNodes = (nodes: PageTreeNode[]) => {
    nodes.sort((a, b) => (a.page.order_num || 0) - (b.page.order_num || 0));
    nodes.forEach(node => sortNodes(node.children));
  };
  sortNodes(roots);

  return roots;
}
```

### 7.3 NodesPanel 수정

```typescript
// src/builder/panels/nodes/NodesPanel.tsx (일부)

import { buildPageTree } from './utils/pageTreeBuilder';

// 페이지 트리 렌더링
function PageTreeItem({ node, onSelect, selectedPageId }: PageTreeItemProps) {
  const { page, children, depth } = node;
  const isSelected = page.id === selectedPageId;

  return (
    <div className="page-tree-item" style={{ paddingLeft: `${depth * 16}px` }}>
      <button
        className={`page-item ${isSelected ? 'selected' : ''}`}
        onClick={() => onSelect(page.id)}
      >
        {children.length > 0 ? '📁' : '📄'} {page.title}
      </button>

      {children.map(child => (
        <PageTreeItem
          key={child.page.id}
          node={child}
          onSelect={onSelect}
          selectedPageId={selectedPageId}
        />
      ))}
    </div>
  );
}
```

---

## 8. Implementation Plan

### Phase 1: Foundation (기반 작업) - P0

| Task | File | Description |
|------|------|-------------|
| Layout 타입에 `order_num`, `slug` 추가 | `src/types/builder/layout.types.ts` | Layout, LayoutCreate, LayoutUpdate 수정 |
| IndexedDB 스키마 업데이트 | `src/lib/db/indexedDB/adapter.ts` | DB_VERSION 증가 (5→6), 인덱스 추가 |
| IndexedDB layouts API 타입 수정 | `src/lib/db/indexedDB/adapter.ts` | 인라인 타입 → Layout 타입 import |
| types.ts 타입 일치 확인 | `src/lib/db/types.ts` | Layout 타입 import 확인 |
| Supabase 마이그레이션 | `supabase/migrations/` | (Supabase 사용 시) |

### Phase 2: Page Creation UI - P1

| Task | File | Description |
|------|------|-------------|
| AddPageDialog 컴포넌트 | `src/builder/components/AddPageDialog.tsx` | 다이얼로그 UI |
| usePageManager 수정 | `src/builder/hooks/usePageManager.ts` | AddPageParams, generatePageDefaults 추가 |
| slug 검증 유틸리티 | `src/utils/slugValidator.ts` | validateSlug, generateSlugFromTitle |
| URL 생성 유틸리티 | `src/utils/urlGenerator.ts` | generatePageUrl, hasCircularReference, getNestingDepth |
| NodesPanel과 다이얼로그 연동 | `src/builder/panels/nodes/NodesPanel.tsx` | Add 버튼 → 다이얼로그 열기 |

### Phase 3: Property Editors - P1

| Task | File | Description |
|------|------|-------------|
| PageEditor 컴포넌트 생성 | `src/builder/inspector/properties/editors/PageEditor.tsx` | 페이지 속성 편집기 |
| LayoutEditor에 slug 필드 추가 | `src/builder/inspector/properties/editors/LayoutEditor.tsx` | Base Slug 입력 필드 |
| URL 미리보기 컴포넌트 | `src/builder/components/UrlPreview.tsx` | 실시간 URL 미리보기 |
| 깊은 중첩 경고 UI | `src/builder/inspector/` | nestingDepth >= 3 경고 |

### Phase 4: Preview & Router Integration - P1

| Task | File | Description |
|------|------|-------------|
| PreviewStoreState에 layouts 추가 | `src/preview/store/types.ts` | PreviewLayout 타입, layouts 배열 |
| Preview Store 수정 | `src/preview/store/previewStore.ts` | setLayouts 액션 |
| UPDATE_LAYOUTS 메시지 핸들러 | `src/preview/utils/messageHandlers.ts` | layouts 수신 처리 |
| Builder에서 layouts 전송 | `src/builder/hooks/useIframeMessenger.ts` | postMessage 전송 |
| PreviewRouter 업데이트 | `src/preview/router/PreviewRouter.tsx` | generatePageUrl 사용 |

### Phase 5: NodesPanel 트리 표시 - P1

| Task | File | Description |
|------|------|-------------|
| pageTreeBuilder 유틸리티 | `src/builder/panels/nodes/utils/pageTreeBuilder.ts` | buildPageTree 함수 |
| NodesPanel 트리 렌더링 | `src/builder/panels/nodes/NodesPanel.tsx` | 계층 구조 표시 |
| 트리 들여쓰기 CSS | `src/builder/panels/nodes/index.css` | depth 기반 padding |

### Phase 6: Testing & Polish - P2

| Task | Description |
|------|-------------|
| 단위 테스트 (urlGenerator) | generatePageUrl, hasCircularReference 테스트 |
| 단위 테스트 (slugValidator) | validateSlug, generateSlugFromTitle 테스트 |
| E2E 테스트 (페이지 생성 플로우) | 다이얼로그 → 페이지 생성 → URL 확인 |
| 기존 페이지 마이그레이션 스크립트 | 기존 절대 경로 페이지 하위 호환성 확인 |

---

## 9. UI Mockups

### 9.1 Add Page Dialog

```
┌────────────────────────────────────────────────┐
│  ➕ Add New Page                          [×]  │
├────────────────────────────────────────────────┤
│                                                │
│  Title                                         │
│  ┌──────────────────────────────────────────┐  │
│  │ Page 4                                   │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  URL Slug                                      │
│  ┌──────────────────────────────────────────┐  │
│  │ /page-4                                  │  │
│  └──────────────────────────────────────────┘  │
│  💡 Auto-generated from title. Edit if needed. │
│                                                │
│  Layout (Optional)                             │
│  ┌──────────────────────────────────────────┐  │
│  │ None                                   ▼ │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  Parent Page (Optional)                        │
│  ┌──────────────────────────────────────────┐  │
│  │ None (Root Level)                      ▼ │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  ─────────────────────────────────────────     │
│  Preview URL: /page-4                          │
│  ─────────────────────────────────────────     │
│                                                │
│                      [Cancel]    [Create Page] │
└────────────────────────────────────────────────┘
```

### 9.2 Page Properties Panel

```
┌────────────────────────────────────────┐
│  📄 Page: Nike Shoes                   │
├────────────────────────────────────────┤
│                                        │
│  ▼ Basic Information                   │
│  ┌────────────────────────────────────┐│
│  │ Title                              ││
│  │ ┌────────────────────────────────┐ ││
│  │ │ Nike Shoes                     │ ││
│  │ └────────────────────────────────┘ ││
│  │                                    ││
│  │ Slug                               ││
│  │ ┌────────────────────────────────┐ ││
│  │ │ nike-shoes                     │ ││
│  │ └────────────────────────────────┘ ││
│  └────────────────────────────────────┘│
│                                        │
│  ▼ Layout                              │
│  ┌────────────────────────────────────┐│
│  │ ┌────────────────────────────────┐ ││
│  │ │ Products Layout (/products)  ▼ │ ││
│  │ └────────────────────────────────┘ ││
│  │                                    ││
│  │ 📍 Final URL:                      ││
│  │ /products/shoes/nike-shoes         ││
│  └────────────────────────────────────┘│
│                                        │
│  ▼ Hierarchy                           │
│  ┌────────────────────────────────────┐│
│  │ Parent: Shoes Category           ▼ ││
│  │ Order:  3                          ││
│  │ ⚠️ Nesting depth: 3 (SEO warning)  ││
│  └────────────────────────────────────┘│
│                                        │
└────────────────────────────────────────┘
```

### 9.3 NodesPanel 계층 트리

```
┌────────────────────────────────────────┐
│  Pages                            [+]  │
├────────────────────────────────────────┤
│                                        │
│  📁 Products                           │
│  ├─ 📁 Shoes                          │
│  │   ├─ 📄 Nike                       │  ← 선택됨
│  │   └─ 📄 Adidas                     │
│  └─ 📄 Clothes                        │
│  📄 About                              │
│  📄 Contact                            │
│                                        │
└────────────────────────────────────────┘
```

---

## 10. Edge Cases

### 10.1 Slug 충돌

```
Layout A: { slug: "/products" }
Layout B: { slug: "/products" }  // ❌ 같은 프로젝트 내 중복 불가

해결: UNIQUE INDEX (project_id, slug) WHERE slug IS NOT NULL
```

### 10.2 순환 참조

```
Page A: { parent_id: "page-b" }
Page B: { parent_id: "page-a" }  // ❌ 순환 참조

해결: hasCircularReference() 함수로 검증
```

```typescript
// PageEditor에서 사용
const handleParentChange = (newParentId: string | null) => {
  if (newParentId && hasCircularReference(page.id, newParentId, pages)) {
    showToast('Cannot set parent: circular reference detected');
    return;
  }
  onUpdate({ parent_id: newParentId });
};
```

### 10.3 깊은 중첩

```
/level1/level2/level3/level4/level5/page  // ⚠️ SEO 비권장

해결: getNestingDepth() 함수로 깊이 계산, 3단계 이상 시 경고 표시
```

---

## 11. Migration Strategy

### 11.1 Existing Data Migration

```typescript
// 기존 페이지의 slug는 그대로 유지 (절대 경로)
// Layout에 slug를 추가해도 기존 페이지는 영향 없음

// 예시: 기존 데이터
{ id: 'p1', slug: '/page-1', layout_id: 'layout-1' }

// Layout에 slug 추가 후
Layout: { id: 'layout-1', slug: '/products' }

// 기존 페이지는 여전히 /page-1 으로 접근 가능
// (절대 경로이므로 Layout.slug 무시)
```

### 11.2 Backward Compatibility

- 절대 경로 (`/`로 시작)는 항상 그대로 사용
- Layout.slug는 선택적 (undefined 허용)
- 기존 페이지 수정 없이 동작
- IndexedDB 버전 업그레이드로 기존 데이터 유지

---

## 12. Success Criteria

### 필수 (P0/P1)
- [ ] Layout 타입에 order_num, slug 필드 추가 완료
- [ ] LayoutCreate, LayoutUpdate 타입 수정 완료
- [ ] IndexedDB layouts 스토어에 order_num, slug 인덱스 추가
- [ ] IndexedDB layouts API 타입 Layout으로 통일
- [ ] Page 생성 시 title/slug 입력 다이얼로그 표시
- [ ] usePageManager와 AddPageDialog 연동
- [ ] Property Editor에서 Page slug 편집 가능
- [ ] Property Editor에서 Layout slug 편집 가능
- [ ] URL 미리보기 실시간 표시
- [ ] Preview Store에 layouts 배열 추가
- [ ] postMessage로 layouts 전달 구현
- [ ] Preview Router에서 계층적 URL 정상 동작
- [ ] NodesPanel 계층 트리 표시
- [ ] 기존 페이지 하위 호환성 유지
- [ ] TypeScript 타입 오류 0개

### 권장 (P2)
- [ ] 순환 참조 검증 및 경고 표시
- [ ] 깊은 중첩 경고 UI (3단계 이상)
- [ ] 단위 테스트 작성
- [ ] E2E 테스트 작성

---

## 13. References

- [Next.js App Router](https://nextjs.org/docs/app/building-your-application/routing)
- [Framer Page Structure](https://janeui.com/articles/framer-page-structure)
- [React Router Nested Routes](https://reactrouter.com/start/declarative/routing)
- [XStudio Layout/Slot System](./LAYOUT_PRESET_SYSTEM.md)
