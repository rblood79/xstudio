# GitHub Actions TypeScript 빌드 오류 수정 계획

## 결정 사항
1. **Page 타입:** `unified.types.ts`를 마스터로, 이름 필드는 `title`로 통일
2. **PixiJS 이벤트:** camelCase로 일괄 변환 (공식 권장 형식)
3. **Store 속성:** Store 타입에 필요한 속성 추가

---

## Page 타입 통합 배경

### 문제: 3곳에서 서로 다르게 정의된 Page 타입

#### 1. `src/types/builder/unified.types.ts` (마스터로 선정)
```typescript
export interface Page {
  id: string;
  title: string;         // ← 'title' 사용
  project_id: string;    // 필수
  slug: string;
  parent_id?: string | null;   // optional
  order_num?: number;          // optional
  created_at?: string;
  updated_at?: string;
  layout_id?: string | null;   // Layout/Slot 시스템 지원
}
```

#### 2. `src/services/api/PagesApiService.ts` (API 반환 타입)
```typescript
export interface Page {
  id: string;
  project_id: string;
  title: string;
  slug: string;
  order_num: number;     // ⚠️ 필수 (optional이 아님)
  created_at: string;    // ⚠️ 필수
  updated_at: string;    // ⚠️ 필수
  // parent_id 없음 ❌
  // layout_id 없음 ❌
}
```

#### 3. `src/builder/stores/elements.ts` (로컬 스토어 타입)
```typescript
interface Page {
  id: string;
  name: string;          // ⚠️ 'name' 사용 (다른 곳은 'title')
  slug: string;
  parent_id?: string | null;
  order_num?: number;
  project_id?: string;   // ⚠️ optional (다른 곳은 필수)
  layout_id?: string | null;
}
```

### 핵심 불일치 요약

| 필드 | unified.types | PagesApiService | elements.ts |
|------|---------------|-----------------|-------------|
| **이름 필드** | `title` | `title` | `name` ⚠️ |
| **project_id** | 필수 | 필수 | optional |
| **order_num** | optional | **필수** ⚠️ | optional |
| **parent_id** | optional | **없음** ⚠️ | optional |
| **layout_id** | optional | **없음** ⚠️ | optional |
| **created_at** | optional | **필수** ⚠️ | **없음** |

### 발생한 빌드 오류 예시
```
src/builder/hooks/usePageManager.ts(232,37): error TS2322:
Type 'unified.types.Page' is not assignable to type 'PagesApiService.Page'.
  Types of property 'order_num' are incompatible.
  Type 'number | undefined' is not assignable to type 'number'.

src/builder/sidebar/components/PageTreeRenderer.tsx(88,43): error TS2339:
Property 'name' does not exist on type 'Page'.
```

### `unified.types.ts`를 마스터로 선정한 이유

1. **가장 완전한 타입 정의**
   - Layout/Slot 시스템 지원 (`layout_id`, `parent_id`)
   - 모든 필요한 필드 포함

2. **프로젝트 전체에서 공통 사용**
   - `src/types/core/store.types.ts`에서 re-export
   - 대부분의 컴포넌트/훅에서 이미 참조 중

3. **유연한 타입 설계**
   - 타임스탬프 필드(`created_at`, `updated_at`)를 optional로 처리
   - API 응답과 내부 상태 모두 수용 가능

4. **이름 필드 표준화**
   - `title` 사용 (DB 스키마와 일치)
   - `name`은 elements.ts에서만 사용되던 비표준 필드

---

## 수정 작업 목록

### 1. Page 타입 통합
| 파일 | 수정 내용 |
|------|----------|
| `src/services/api/PagesApiService.ts` | `parent_id`, `layout_id` 필드 추가, `order_num` optional로 변경 |
| `src/builder/stores/elements.ts` | 로컬 Page 인터페이스 제거 → unified.types import |
| `src/builder/hooks/usePageManager.ts` | Page 타입 import 경로 수정 |
| `src/builder/sidebar/components/PageTreeRenderer.tsx` | `page.name` → `page.title` |

### 2. PixiJS 이벤트 핸들러 (일괄 변환)
```
onpointertap → onPointerTap
onpointerdown → onPointerDown
onpointerenter → onPointerEnter
onpointerleave → onPointerLeave
pointerdown → onPointerDown
pointerover → onPointerOver
pointerout → onPointerOut
```
**대상:** `src/builder/workspace/canvas/ui/Pixi*.tsx` (40+ 파일)

### 3. PixiJS 기타 수정
| 파일 | 수정 내용 |
|------|----------|
| `Pixi*.tsx` (8개) | `pixiContainer` → `Container` 타입 |
| `LayoutEngine.ts` 외 5개 | `fontWeight as TextStyleFontWeight` |
| `PixiCard.tsx`, `PixiMenu.tsx` | BorderConfig에 `alpha`, `style`, `radius` 추가 |
| `BuilderCanvas.tsx` | `stencil` 속성 제거 |

### 4. Store/상태 타입 수정
| 파일 | 수정 내용 |
|------|----------|
| `src/builder/stores/index.ts` | `lastApiResponse`, `dragState` 속성 추가 |
| `src/builder/inspector/types.ts` | SelectedElement에 `className` 추가 |

### 5. 함수 시그니처 수정
| 파일 | 수정 내용 |
|------|----------|
| `LayoutsTab.tsx` | `setElements` 호출 수정 (options 제거 또는 시그니처 수정) |
| `PageLayoutSelector.tsx` | 동일 |
| `layoutActions.ts` | 동일 |

### 6. 기타 수정
| 파일 | 수정 내용 |
|------|----------|
| `useIframeMessenger.ts` | `params` → `queryParams`, `body` → `bodyTemplate` |
| `DarkModeGenerator.tsx` | `useState`로 `setError` 정의 |
| `AIThemeGenerator.tsx` | `as ThemeGenerationResponse` 타입 단언 |
| `ModifiedStylesSection.tsx` | `[...readonly_array]` spread |
| 모듈 경로 오류 파일들 | `@/types/core` → 정확한 경로로 수정 |

---

## 실행 순서
1. Page 타입 통합 (PagesApiService.ts, elements.ts)
2. PixiJS 이벤트 핸들러 일괄 변환 (sed 사용)
3. 개별 파일 수정
4. `pnpm run type-check`로 검증
