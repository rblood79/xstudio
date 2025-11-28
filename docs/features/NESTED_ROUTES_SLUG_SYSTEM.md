# Nested Routes & Slug System Design

**Status:** Draft
**Created:** 2025-11-28
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
│   ┌─────────────────────┐                   │
│   │  Case 1             │                   │
│   │  (Layout 기반 URL)   │   + 자유로운 URL   │
│   └─────────────────────┘                   │
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

### 2.2 Page Type (확인)

```typescript
// src/types/builder/unified.types.ts (기존)

export interface Page {
  id: string;
  title: string;           // 페이지 제목
  project_id: string;
  slug: string;            // URL 경로 (e.g., "/products/shoes")
  parent_id?: string | null;
  order_num?: number;
  layout_id?: string | null;
  created_at?: string;
  updated_at?: string;
}
```

### 2.3 Database Migration

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

### 2.4 IndexedDB Schema Update

```typescript
// src/lib/db/indexedDB/adapter.ts

// layouts store 생성 시
const layoutsStore = db.createObjectStore('layouts', { keyPath: 'id' });
layoutsStore.createIndex('project_id', 'project_id', { unique: false });
layoutsStore.createIndex('name', 'name', { unique: false });
layoutsStore.createIndex('order_num', 'order_num', { unique: false });  // ✅ 추가
layoutsStore.createIndex('slug', 'slug', { unique: false });            // ✅ 추가
```

---

## 3. URL Generation Logic

### 3.1 URL 결정 우선순위

```
1. Page.slug가 절대 경로 (/ 로 시작)인 경우 → 그대로 사용
2. Layout.slug가 있는 경우 → Layout.slug + "/" + Page.slug_suffix
3. parent_id가 있는 경우 → 부모 경로 + "/" + Page.slug_suffix
4. 그 외 → "/" + Page.slug_suffix
```

### 3.2 예시 시나리오

**Scenario A: Layout 기반 URL**

```
Layout: { slug: "/products" }
Page: { slug_suffix: "shoes/nike", layout_id: "layout-1" }
→ Final URL: /products/shoes/nike
```

**Scenario B: 계층 기반 URL**

```
Page 1: { slug: "/products", parent_id: null }
Page 2: { slug: "/products/shoes", parent_id: "page-1" }
Page 3: { slug: "/products/shoes/nike", parent_id: "page-2" }
```

**Scenario C: 자유 URL (Layout 없음)**

```
Page: { slug: "/promo-summer-2024", layout_id: null }
→ Final URL: /promo-summer-2024
```

**Scenario D: Layout + 자유 URL Override**

```
Layout: { slug: "/blog" }
Page: { slug: "/special-post", layout_id: "layout-1", use_layout_slug: false }
→ Final URL: /special-post (Layout slug 무시)
```

### 3.3 URL 생성 유틸리티

```typescript
// src/utils/urlGenerator.ts

interface GeneratePageUrlParams {
  page: Page;
  layout?: Layout | null;
  allPages?: Page[];
}

export function generatePageUrl({ page, layout, allPages }: GeneratePageUrlParams): string {
  // 1. 절대 경로인 경우 그대로 반환
  if (page.slug.startsWith('/')) {
    return page.slug;
  }

  // 2. Layout slug가 있는 경우
  if (layout?.slug) {
    return `${layout.slug}/${page.slug}`.replace(/\/+/g, '/');
  }

  // 3. parent_id가 있는 경우 (계층 기반)
  if (page.parent_id && allPages) {
    const parentUrl = buildParentPath(page.parent_id, allPages);
    return `${parentUrl}/${page.slug}`.replace(/\/+/g, '/');
  }

  // 4. 기본값
  return `/${page.slug}`.replace(/\/+/g, '/');
}

function buildParentPath(parentId: string, allPages: Page[]): string {
  const parent = allPages.find(p => p.id === parentId);
  if (!parent) return '';

  if (parent.parent_id) {
    return `${buildParentPath(parent.parent_id, allPages)}/${parent.slug}`;
  }
  return `/${parent.slug}`;
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

### 4.3 Default Value Generation

```typescript
// src/builder/hooks/usePageManager.ts

function generatePageDefaults(existingPages: Page[]): { title: string; slug: string } {
  const nextNum = existingPages.length + 1;

  return {
    title: `Page ${nextNum}`,
    slug: `/page-${nextNum}`
  };
}

// Layout 선택 시 slug 업데이트
function updateSlugForLayout(layout: Layout | null, currentSlug: string): string {
  if (!layout?.slug) return currentSlug;

  // Layout slug가 있으면 상대 경로로 변환
  const baseName = currentSlug.replace(/^\//, '').split('/').pop() || 'page';
  return baseName;  // "page-4" (Layout.slug + 이 값 조합)
}
```

### 4.4 Slug Validation Rules

```typescript
// src/utils/slugValidator.ts

export function validateSlug(slug: string): { valid: boolean; error?: string } {
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

// slug 자동 생성 (title → slug)
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
│  ├─ Slug:  [/products/shoes/nike]      │
│  │         ↳ Preview: /products/shoes/nike
│  │                                      │
│  📐 Layout                              │
│  ├─ Layout: [Products Layout ▼]         │
│  │          Base URL: /products         │
│  │                                      │
│  🌲 Hierarchy                           │
│  ├─ Parent: [Shoes Category  ▼]         │
│  └─ Order:  [3              ]           │
└─────────────────────────────────────────┘
```

### 5.2 Page Editor Component

```typescript
// src/builder/inspector/properties/editors/PageEditor.tsx

export function PageEditor({ page, onUpdate }: PageEditorProps) {
  const layouts = useLayoutsStore((s) => s.layouts);
  const pages = useStore((s) => s.pages);
  const selectedLayout = layouts.find(l => l.id === page.layout_id);

  // URL 미리보기 계산
  const previewUrl = useMemo(() => {
    return generatePageUrl({ page, layout: selectedLayout, allPages: pages });
  }, [page, selectedLayout, pages]);

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
          placeholder="/page-url"
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
          onChange={(value) => onUpdate({ parent_id: value || null })}
          options={[
            { value: '', label: 'None (Root)' },
            ...pages
              .filter(p => p.id !== page.id)  // 자기 자신 제외
              .map(p => ({ value: p.id, label: p.title }))
          ]}
        />
      </fieldset>
    </div>
  );
}
```

### 5.3 Layout Property Editor (slug 추가)

```typescript
// src/builder/inspector/properties/editors/LayoutEditor.tsx

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
          onChange={(value) => onUpdate({ slug: value || null })}
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

## 6. Preview Router Integration

### 6.1 Current Implementation

```typescript
// src/preview/router/PreviewRouter.tsx (현재)

{pages.map((page) => (
  <Route
    key={page.id}
    path={page.slug}  // 단순히 page.slug 사용
    element={<PageRenderer pageId={page.id} />}
  />
))}
```

### 6.2 Updated Implementation

```typescript
// src/preview/router/PreviewRouter.tsx (개선)

export function PreviewRouter({ renderElements }: PreviewRouterProps) {
  const pages = usePreviewStore((s) => s.pages);
  const layouts = usePreviewStore((s) => s.layouts);  // ✅ layouts 추가

  // 각 페이지의 최종 URL 계산
  const routeConfigs = useMemo(() => {
    return pages.map(page => {
      const layout = layouts.find(l => l.id === page.layout_id);
      const finalUrl = generatePageUrl({ page, layout, allPages: pages });

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

## 7. Implementation Plan

### Phase 1: Foundation (기반 작업)

| Task | File | Priority |
|------|------|----------|
| Layout 타입에 `order_num`, `slug` 추가 | `src/types/builder/layout.types.ts` | P0 |
| DB 마이그레이션 생성 | `supabase/migrations/` | P0 |
| IndexedDB 스키마 업데이트 | `src/lib/db/indexedDB/adapter.ts` | P0 |
| layoutActions.ts 타입 오류 수정 | `src/builder/stores/utils/layoutActions.ts` | P0 |

### Phase 2: Page Creation UI

| Task | File | Priority |
|------|------|----------|
| Page 생성 다이얼로그 컴포넌트 | `src/builder/components/AddPageDialog.tsx` | P1 |
| usePageManager 수정 (다이얼로그 연동) | `src/builder/hooks/usePageManager.ts` | P1 |
| slug 검증 유틸리티 | `src/utils/slugValidator.ts` | P1 |
| URL 생성 유틸리티 | `src/utils/urlGenerator.ts` | P1 |

### Phase 3: Property Editors

| Task | File | Priority |
|------|------|----------|
| PageEditor 컴포넌트 생성/수정 | `src/builder/inspector/properties/editors/PageEditor.tsx` | P1 |
| LayoutEditor에 slug 필드 추가 | `src/builder/inspector/properties/editors/LayoutEditor.tsx` | P1 |
| URL 미리보기 컴포넌트 | `src/builder/components/UrlPreview.tsx` | P2 |

### Phase 4: Router Integration

| Task | File | Priority |
|------|------|----------|
| PreviewRouter 업데이트 | `src/preview/router/PreviewRouter.tsx` | P1 |
| Preview Store에 layouts 추가 | `src/preview/stores/` | P1 |
| Navigation 연동 | `src/preview/router/` | P2 |

### Phase 5: Testing & Polish

| Task | Priority |
|------|----------|
| 단위 테스트 (slug 검증, URL 생성) | P2 |
| E2E 테스트 (페이지 생성 플로우) | P2 |
| 기존 페이지 마이그레이션 스크립트 | P2 |

---

## 8. UI Mockups

### 8.1 Add Page Dialog

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

### 8.2 Page Properties Panel

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
│  └────────────────────────────────────┘│
│                                        │
└────────────────────────────────────────┘
```

---

## 9. Migration Strategy

### 9.1 Existing Data Migration

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

### 9.2 Backward Compatibility

- 절대 경로 (`/`로 시작)는 항상 그대로 사용
- Layout.slug는 선택적 (null 허용)
- 기존 페이지 수정 없이 동작

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

해결: parent_id 설정 시 순환 참조 검증
```

### 10.3 깊은 중첩

```
/level1/level2/level3/level4/level5/page  // ⚠️ SEO 비권장

해결: 경고 표시 (3단계 이상 중첩 시)
```

---

## 11. Success Criteria

- [ ] Layout에 slug 필드 추가 완료
- [ ] Page 생성 시 title/slug 입력 다이얼로그 표시
- [ ] Property Editor에서 Page slug 편집 가능
- [ ] Property Editor에서 Layout slug 편집 가능
- [ ] URL 미리보기 실시간 표시
- [ ] Preview Router에서 계층적 URL 정상 동작
- [ ] 기존 페이지 하위 호환성 유지
- [ ] TypeScript 타입 오류 0개

---

## 12. References

- [Next.js App Router](https://nextjs.org/docs/app/building-your-application/routing)
- [Framer Page Structure](https://janeui.com/articles/framer-page-structure)
- [React Router Nested Routes](https://reactrouter.com/start/declarative/routing)
- [XStudio Layout/Slot System](./LAYOUT_PRESET_SYSTEM.md)
