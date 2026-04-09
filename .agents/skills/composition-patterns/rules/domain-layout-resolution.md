---
title: Layout Resolution Pattern
impact: HIGH
impactDescription: 잘못된 레이아웃 합성 = 페이지 렌더링 오류
tags: [domain, layout, page]
---

Page와 Layout의 합성 규칙을 정의합니다.

## Layout 시스템 구조

```typescript
// Layout: 재사용 가능한 템플릿 (Header, Footer, Sidebar 등)
interface Layout {
  id: string;
  name: string;
  // Layout 내 Slot 정의
}

// Page: 실제 콘텐츠
interface Page {
  id: string;
  title: string;
  layout_id?: string | null;  // 선택적 Layout 적용
}

// Slot: Layout 내 Page 콘텐츠 삽입 위치
interface Element {
  slot_name?: string | null;  // Page 요소가 삽입될 슬롯
}
```

## Incorrect

```typescript
// ❌ Layout과 Page 요소 혼합 렌더링
const allElements = [...layoutElements, ...pageElements];
render(allElements);  // 슬롯 매핑 없이 단순 병합

// ❌ page_id와 layout_id 동시 사용
const element: Element = {
  page_id: 'page-1',
  layout_id: 'layout-1',  // 상호 배타적 위반
};

// ❌ 슬롯 없는 Layout에 Page 요소 삽입 시도
const pageElement: Element = {
  slot_name: 'content',  // Layout에 해당 슬롯 없음
  page_id: 'page-1',
};
```

## Correct

```typescript
import { resolveLayoutForPage } from '@/preview/utils/layoutResolver';

// ✅ Layout + Page 합성
const renderPage = (page: Page, layout: Layout | null, allElements: Element[]) => {
  const resolution = resolveLayoutForPage(page, layout, allElements);

  if (resolution.mode === 'layout') {
    // Layout 모드: Layout 요소 렌더링 + 슬롯에 Page 요소 삽입
    return (
      <LayoutRenderer
        layoutElements={resolution.layoutElements}
        slotMapping={resolution.slotMapping}
      />
    );
  } else {
    // Page 모드: Page 요소만 렌더링
    return <PageRenderer elements={resolution.pageElements} />;
  }
};

// ✅ 슬롯 매핑
interface SlotMapping {
  [slotName: string]: Element[];  // 슬롯별 Page 요소들
}

// ✅ 요소 컨텍스트 구분
function getElementContext(element: Element): 'page' | 'layout' {
  if (element.page_id) return 'page';
  if (element.layout_id) return 'layout';
  throw new Error('Element must have page_id or layout_id');
}

// ✅ Body 요소 찾기 (컨텍스트 기반)
import { findBodyByContext } from '@/builder/stores/utils/elementHelpers';

const bodyElement = findBodyByContext(
  elements,
  pageId,    // Page 컨텍스트
  layoutId   // Layout 컨텍스트 (둘 중 하나만 유효)
);
```

## Layout Resolution 흐름

```
1. Page에 layout_id가 있는가?
   ├─ Yes → Layout 모드
   │   ├─ Layout 요소 로드
   │   ├─ Page 요소를 slot_name별로 그룹화
   │   └─ Layout의 Slot 위치에 Page 요소 삽입
   └─ No → Page 모드
       └─ Page 요소만 렌더링
```

## 참조 파일

- `apps/builder/src/preview/utils/layoutResolver.ts` - Layout 합성 로직
- `apps/builder/src/types/builder/layout.types.ts` - Layout/Slot 타입
- `apps/builder/src/builder/stores/utils/elementHelpers.ts` - findBodyByContext
