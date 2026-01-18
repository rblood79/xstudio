---
title: O(1) Lookup Pattern
impact: CRITICAL
impactDescription: O(n) 검색 = 성능 저하, 대규모 데이터 처리 실패
tags: [domain, performance, indexing]
---

Element 조회 시 O(1) 인덱스 기반 검색을 사용합니다.

## Store 인덱스 구조

```typescript
interface ElementsState {
  elements: Element[];              // 원본 배열 (순서 보존)
  elementsMap: Map<string, Element>; // O(1) ID 검색
  childrenMap: Map<string, Element[]>; // O(1) 부모→자식 검색
  pageIndex: PageElementIndex;      // O(1) 페이지별 검색
}
```

## Incorrect

```typescript
// ❌ 배열 순회 (O(n))
const element = elements.find(el => el.id === elementId);

// ❌ 자식 검색에 filter 사용 (O(n))
const children = elements.filter(el => el.parent_id === parentId);

// ❌ 페이지 요소 검색에 filter 사용 (O(n))
const pageElements = elements.filter(el => el.page_id === pageId);

// ❌ 중첩 순회 (O(n²))
elements.forEach(el => {
  const parent = elements.find(p => p.id === el.parent_id);
});
```

## Correct

```typescript
// ✅ Map 기반 O(1) 검색
import { getElementById, getChildElements } from '@/builder/stores/utils/elementHelpers';

// ID로 요소 검색 - O(1)
const element = getElementById(elementsMap, elementId);
// 또는 직접 Map 접근
const element = elementsMap.get(elementId);

// 자식 요소 검색 - O(1)
const children = getChildElements(childrenMap, parentId);
// 또는 직접 Map 접근
const children = childrenMap.get(parentId) ?? [];

// 페이지 요소 검색 - O(1)
import { getPageElementsFromIndex } from '@/builder/stores/utils/elementIndexer';

const pageElementIds = pageIndex.elementsByPage.get(pageId);
const pageElements = pageElementIds
  ? Array.from(pageElementIds).map(id => elementsMap.get(id)!)
  : [];

// ✅ 컴포넌트에서 사용
const element = useStore(state => state.elementsMap.get(elementId));
const children = useStore(state => state.childrenMap.get(parentId) ?? []);
```

## 인덱스 재구성

```typescript
// 요소 변경 후 인덱스 재구성 필수
set({ elements: newElements });
get()._rebuildIndexes();  // elementsMap, childrenMap, pageIndex 갱신
```

## 참조 파일

- `apps/builder/src/builder/stores/elements.ts` - 인덱스 정의
- `apps/builder/src/builder/stores/utils/elementHelpers.ts` - O(1) 헬퍼
- `apps/builder/src/builder/stores/utils/elementIndexer.ts` - 페이지 인덱스
