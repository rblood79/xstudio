---
title: Component Lifecycle Pattern
impact: HIGH
impactDescription: 잘못된 생명주기 = 요소 누락, 고아 요소 발생
tags: [domain, component, lifecycle]
---

컴포넌트 생성/수정/삭제의 생명주기를 정의합니다.

## 생명주기 단계

```
생성: Definition → Element → Store → Index → History → DB → Preview
수정: Validate → History → Store → Index → DB → Preview
삭제: Cascade Check → History → Store → Index → DB → Preview
```

## 1. 생성 (Create)

```typescript
import { ComponentFactory } from '@/builder/factories/ComponentFactory';
import { createElementsFromDefinition } from '@/builder/factories/utils/elementCreation';

// ✅ 복합 컴포넌트 생성 (Tabs, Table 등)
const createComponent = async (tag: string, parentId: string, pageId: string) => {
  // 1. Factory에서 Definition 생성
  const result = await ComponentFactory.createComplexComponent(
    tag,
    parentElement,
    pageId,
    elements,
    layoutId
  );

  // 2. Element 객체 생성 (ID, customId, timestamps)
  const { parent, children } = createElementsFromDefinition(result.definition);

  // 3. Store 업데이트
  set({ elements: [...elements, parent, ...children] });
  get()._rebuildIndexes();

  // 4. History 기록
  historyManager.addEntry({
    type: 'add',
    elementId: parent.id,
    data: { element: parent, children },
  });

  // 5. DB 저장 (백그라운드)
  await persistElements([parent, ...children]);

  // 6. Preview 동기화
  deltaMessenger.sendElementAdded(parent, children);

  return parent;
};

// ✅ 단순 요소 생성
const createElement = (tag: string, parentId: string) => {
  const element: Element = {
    id: ElementUtils.generateId(),
    customId: generateCustomId(tag, elements),
    tag,
    parent_id: parentId,
    page_id: currentPageId,
    order_num: calculateNextOrderNum(parentId, elements),
    props: getDefaultProps(tag),
    created_at: new Date().toISOString(),
  };

  return addElement(element);
};
```

## 2. 수정 (Update)

```typescript
// ✅ Props 수정
const updateElementProps = (elementId: string, props: Partial<Props>) => {
  const element = getElementById(elementsMap, elementId);
  if (!element) return;

  // 변경 여부 확인 (불필요한 업데이트 방지)
  if (!hasShallowPatchChanges(element.props, props)) return;

  // History → Store → Index → DB → Preview
  historyManager.addDiffEntry('update', element, { ...element, props: { ...element.props, ...props } });

  set({ elements: elements.map(el =>
    el.id === elementId ? { ...el, props: { ...el.props, ...props } } : el
  )});
  get()._rebuildIndexes();

  persistElementUpdate(elementId, props);
  deltaMessenger.sendElementUpdated(elementId, props);
};

// ✅ 부모 변경 (이동)
const moveElement = (elementId: string, newParentId: string, newOrder: number) => {
  const element = getElementById(elementsMap, elementId);

  historyManager.addEntry({
    type: 'move',
    elementId,
    data: {
      prevParentId: element.parent_id,
      prevOrder: element.order_num,
      newParentId,
      newOrder,
    },
  });

  // 재배치 로직...
};
```

## 3. 삭제 (Delete)

```typescript
// ✅ 재귀 삭제 (자식 포함)
const removeElement = (elementId: string) => {
  const element = getElementById(elementsMap, elementId);
  if (!element) return;

  // 1. 모든 자손 ID 수집
  const descendantIds = collectDescendantIds(elementId, childrenMap);
  const allIdsToRemove = [elementId, ...descendantIds];

  // 2. History 기록 (복구용 데이터 포함)
  const elementsToRemove = allIdsToRemove.map(id => elementsMap.get(id)!);
  historyManager.addEntry({
    type: 'remove',
    elementId,
    elementIds: allIdsToRemove,
    data: { elements: elementsToRemove },
  });

  // 3. Store 업데이트
  set({ elements: elements.filter(el => !allIdsToRemove.includes(el.id)) });
  get()._rebuildIndexes();

  // 4. ⚠️ 선택 상태 정리 (selectedElementIds/Set 포함 필수)
  const removeSet = new Set(allIdsToRemove);
  const filteredSelectedIds = currentState.selectedElementIds.filter(
    (id: string) => !removeSet.has(id)
  );
  set({
    selectedElementId: null,
    selectedElementProps: {},
    selectedElementIds: filteredSelectedIds,
    selectedElementIdsSet: new Set(filteredSelectedIds),
  });

  // 5. DB 삭제 (백그라운드)
  deleteElementsFromDB(allIdsToRemove);

  // 6. Preview 동기화
  deltaMessenger.sendElementRemoved(elementId, descendantIds);
};

// ✅ 자손 ID 수집 (재귀)
function collectDescendantIds(
  parentId: string,
  childrenMap: Map<string, Element[]>
): string[] {
  const children = childrenMap.get(parentId) ?? [];
  const ids: string[] = [];

  for (const child of children) {
    ids.push(child.id);
    ids.push(...collectDescendantIds(child.id, childrenMap));
  }

  return ids;
}
```

## 참조 파일

- `apps/builder/src/builder/factories/ComponentFactory.ts` - 컴포넌트 팩토리
- `apps/builder/src/builder/factories/utils/elementCreation.ts` - 생성 유틸리티
- `apps/builder/src/builder/stores/utils/elementCreation.ts` - Store 액션
- `apps/builder/src/builder/stores/utils/elementRemoval.ts` - 삭제 액션
