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

### ChildDefinition 재귀 타입

`ChildDefinition`은 `children?: ChildDefinition[]` optional 필드를 포함하는 재귀 타입으로, 무한 깊이의 중첩 컴포넌트 계층을 정의할 수 있습니다.

```typescript
// apps/builder/src/builder/factories/types/index.ts
export type ChildDefinition = Omit<Element, "id" | "created_at" | "updated_at" | "parent_id"> & {
  children?: ChildDefinition[];  // ← 재귀: 자식도 같은 타입
};

export interface ComponentDefinition {
  tag: string;
  parent: Omit<Element, "id" | "created_at" | "updated_at">;
  children: ChildDefinition[];   // ← 1레벨 자식 배열
}
```

- `id`, `created_at`, `updated_at`, `parent_id`는 생성 시 자동 할당되므로 Definition에서 제외
- `children` 필드가 optional이므로 리프 노드(Tag, Label 등)는 `children`을 생략

### createElementsFromDefinition 재귀 생성 패턴

내부 `processChildren()` 함수가 중첩 `children`을 재귀적으로 순회하며 Element 객체를 생성합니다.

```typescript
import { ComponentFactory } from '@/builder/factories/ComponentFactory';
import { createElementsFromDefinition } from '@/builder/factories/utils/elementCreation';

// apps/builder/src/builder/factories/utils/elementCreation.ts
export function createElementsFromDefinition(
  definition: ComponentDefinition
): { parent: Element; children: Element[] } {
  const parent: Element = { ...definition.parent, id: generateId(), ... };

  const allChildren: Element[] = [];

  // 재귀 함수: 중첩 children을 평탄화하여 allChildren에 추가
  function processChildren(childDefs: ChildDefinition[], parentId: string): void {
    childDefs.forEach((childDef) => {
      const { children: nestedChildren, ...elementDef } = childDef;
      const child: Element = {
        ...elementDef,
        id: generateId(),
        customId: generateCustomId(elementDef.tag, allElementsSoFar),
        parent_id: parentId,       // ← 재귀 호출 시 부모 ID가 바뀜
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      allChildren.push(child);

      // 중첩 children 재귀 처리
      if (nestedChildren && nestedChildren.length > 0) {
        processChildren(nestedChildren, child.id);  // ← child가 다음 레벨의 부모
      }
    });
  }

  processChildren(definition.children, parent.id);
  return { parent, children: allChildren };  // ← 모든 레벨의 자식이 평탄화된 배열
}
```

**핵심 포인트**:
- `processChildren()`은 `ChildDefinition[]`의 `children` 필드를 분리(destructure)한 후, 남은 필드로 Element를 생성
- 재귀 호출 시 `parentId`를 현재 생성된 child의 ID로 전달하여 올바른 부모-자식 관계 형성
- 최종 반환값은 **평탄화된** 배열 (`allChildren`)로, 모든 레벨의 자식이 포함됨

### TagGroup 3-level 계층 생성 예시

TagGroup은 3레벨 중첩 구조의 대표적 사례입니다.

```
TagGroup (column) → Label("Tag Group") + TagList (row wrap) → Tag x2
```

```typescript
// apps/builder/src/builder/factories/definitions/GroupComponents.ts
export function createTagGroupDefinition(context): ComponentDefinition {
  return {
    tag: "TagGroup",
    parent: {
      tag: "TagGroup",
      props: {
        label: "Tag Group",
        style: { display: "flex", flexDirection: "column", gap: 2, width: "fit-content" },
      },
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      // Level 2-A: Label (리프 노드 - children 없음)
      {
        tag: "Label",
        props: { children: "Tag Group", style: { fontSize: 12, fontWeight: 500 } },
        order_num: 1,
      },
      // Level 2-B: TagList (중간 컨테이너 - children으로 Tag 포함)
      {
        tag: "TagList",
        props: { style: { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 4 } },
        order_num: 2,
        children: [    // ← 재귀 중첩: Level 3
          {
            tag: "Tag",
            props: { children: "Tag 1" },
            order_num: 1,
          },
          {
            tag: "Tag",
            props: { children: "Tag 2" },
            order_num: 2,
          },
        ],
      },
    ],
  };
}
```

`createElementsFromDefinition()`이 이 Definition을 처리하면:
1. **TagGroup** (parent) 생성
2. `processChildren(children, tagGroup.id)` 호출
   - **Label** 생성 (`parent_id: tagGroup.id`)
   - **TagList** 생성 (`parent_id: tagGroup.id`)
   - TagList에 `children`이 있으므로 `processChildren(nestedChildren, tagList.id)` 재귀 호출
     - **Tag 1** 생성 (`parent_id: tagList.id`)
     - **Tag 2** 생성 (`parent_id: tagList.id`)
3. 반환: `{ parent: TagGroup, children: [Label, TagList, Tag1, Tag2] }`

### 복합 컴포넌트 생성 전체 흐름

```typescript
// ✅ 복합 컴포넌트 생성 (Tabs, Table, TagGroup 등)
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

  // 4. 선택 상태 정리 (selectedElementIds/Set 포함 필수)
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
- `apps/builder/src/builder/factories/types/index.ts` - ChildDefinition, ComponentDefinition 타입
- `apps/builder/src/builder/factories/utils/elementCreation.ts` - 재귀 생성 유틸리티
- `apps/builder/src/builder/factories/definitions/GroupComponents.ts` - TagGroup 3-level 정의
- `apps/builder/src/builder/stores/utils/elementCreation.ts` - Store 액션
- `apps/builder/src/builder/stores/utils/elementRemoval.ts` - 삭제 액션
