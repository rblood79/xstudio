---
title: Async Pipeline Pattern
impact: CRITICAL
impactDescription: 파이프라인 순서 오류 = UI 불일치, 데이터 유실
tags: [domain, async, pipeline]
---

요소 변경 시 비동기 파이프라인 순서를 준수합니다.

## 파이프라인 순서

```
1. Memory Update (즉시) → UI 반응
2. Index Rebuild (즉시) → 검색 가능
3. History Record (즉시) → Undo 가능
4. IndexedDB Persist (백그라운드) → 영구 저장
5. Preview Sync (백그라운드) → iframe 동기화
```

## Incorrect

```typescript
// ❌ DB 저장 완료까지 대기 (UI 블로킹)
const addElement = async (element: Element) => {
  const db = await getDB();
  await db.elements.insert(element);  // 블로킹!
  set({ elements: [...elements, element] });
};

// ❌ 인덱스 재구성 누락
set({ elements: newElements });
// _rebuildIndexes() 호출 안 함 → elementsMap 불일치

// ❌ Preview 동기화를 동기적으로 처리
const updateElement = (id, props) => {
  set({ ... });
  messenger.sendElementUpdated(id, props);  // 동기 처리
  await waitForPreviewAck();  // 불필요한 대기
};
```

## Correct

```typescript
// ✅ 올바른 파이프라인 순서
export const createAddElementAction = (set, get) => async (element: Element) => {
  const state = get();

  // 1. Memory Update (즉시) - UI 즉시 반응
  set({ elements: [...state.elements, element] });

  // 2. Index Rebuild (즉시) - O(1) 검색 보장
  get()._rebuildIndexes();

  // 3. History Record (즉시) - Undo 즉시 가능
  historyManager.addEntry({
    type: 'add',
    elementId: element.id,
    data: { element: structuredClone(element) },
  });

  // 4. IndexedDB Persist (백그라운드) - 비블로킹
  setTimeout(async () => {
    const db = await getDB();
    await db.elements.insert(sanitizeElement(element));
  }, 0);

  // 5. Preview Sync (백그라운드) - WebGL 모드가 아닐 때만
  if (!isWebGLCanvas()) {
    setTimeout(() => {
      deltaMessenger.sendElementAdded(element);
    }, 0);
  }
};

// ✅ 배치 작업도 동일 패턴
export const batchUpdateElements = (updates: Update[]) => {
  // 1-3: 동기 작업 (즉시)
  set({ elements: applyUpdates(elements, updates) });
  get()._rebuildIndexes();
  historyManager.addBatchEntry(updates);

  // 4-5: 비동기 작업 (백그라운드)
  queueMicrotask(async () => {
    await persistUpdates(updates);
    syncToPreview(updates);
  });
};
```

## 주의사항

```typescript
// ✅ structuredClone으로 히스토리용 복사 (참조 분리)
historyManager.addEntry({
  data: { element: structuredClone(element) }  // 깊은 복사
});

// ✅ sanitizeElement로 DB 저장 전 정리
await db.elements.insert(sanitizeElement(element));
```

## 참조 파일

- `apps/builder/src/builder/stores/utils/elementCreation.ts` - 추가 파이프라인
- `apps/builder/src/builder/stores/utils/elementUpdate.ts` - 업데이트 파이프라인
- `apps/builder/src/builder/utils/canvasDeltaMessenger.ts` - Delta 동기화
