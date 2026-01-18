---
title: History Integration Pattern
impact: CRITICAL
impactDescription: 히스토리 미기록 = Undo/Redo 불가, 사용자 데이터 손실
tags: [domain, history, undo-redo]
---

상태 변경 전 반드시 히스토리를 기록합니다.

## 히스토리 아키텍처

```typescript
// Hot Cache (메모리) - 최근 50개, 즉시 Undo/Redo
// Cold Storage (IndexedDB) - 전체 히스토리, 세션 복구

interface HistoryEntry {
  id: string;
  type: 'add' | 'update' | 'remove' | 'move' | 'batch';
  elementId: string;
  data: {
    element?: Element;      // add/remove용
    prevElement?: Element;  // update용 (이전 상태)
    diff?: SerializableElementDiff;  // diff 기반 (메모리 80% 절약)
  };
  timestamp: number;
}
```

## Incorrect

```typescript
// ❌ 히스토리 없이 상태 변경
const updateElement = (elementId: string, props: Props) => {
  set({
    elements: state.elements.map(el =>
      el.id === elementId ? { ...el, props: { ...el.props, ...props } } : el
    )
  });
  // 히스토리 기록 누락!
};

// ❌ 상태 변경 후 히스토리 기록 (순서 오류)
set({ elements: newElements });
historyManager.addEntry({ ... });  // 이미 변경된 후 기록
```

## Correct

```typescript
import { historyManager } from '@/builder/stores/history';

// ✅ 히스토리 기록 → 상태 변경 순서
const updateElementProps = (elementId: string, props: Props) => {
  const element = getElementById(get().elementsMap, elementId);
  if (!element) return;

  // 1. 변경 전 히스토리 기록 (diff 기반)
  historyManager.addDiffEntry(
    'update',
    structuredClone(element),  // 이전 상태
    { ...element, props: { ...element.props, ...props } }  // 새 상태
  );

  // 2. 상태 변경
  set({
    elements: state.elements.map(el =>
      el.id === elementId ? { ...el, props: { ...el.props, ...props } } : el
    )
  });

  // 3. 인덱스 재구성
  get()._rebuildIndexes();
};

// ✅ 요소 추가 시
const addElement = (element: Element) => {
  historyManager.addEntry({
    type: 'add',
    elementId: element.id,
    data: { element: structuredClone(element) },
  });

  set({ elements: [...state.elements, element] });
  get()._rebuildIndexes();
};

// ✅ 배치 작업 시
const batchUpdate = (updates: ElementUpdate[]) => {
  const prevElements = updates.map(u => structuredClone(getElementById(elementsMap, u.id)));

  historyManager.addBatchDiffEntry(prevElements, newElements);

  set({ elements: applyUpdates(elements, updates) });
};
```

## Undo/Redo 구현

```typescript
// historyActions.ts
export const createUndoAction = (set, get) => async () => {
  const entry = historyManager.undo();
  if (!entry) return;

  switch (entry.type) {
    case 'add':
      // 추가된 요소 제거
      removeElementFromState(entry.elementId);
      break;
    case 'update':
      // 이전 상태로 복원
      restoreElementState(entry.data.prevElement);
      break;
    case 'remove':
      // 제거된 요소 복원
      addElementToState(entry.data.element);
      break;
  }
};
```

## 참조 파일

- `apps/builder/src/builder/stores/history.ts` - HistoryManager
- `apps/builder/src/builder/stores/history/historyActions.ts` - Undo/Redo 액션
- `apps/builder/src/builder/stores/utils/elementUpdate.ts` - 히스토리 통합 예시
