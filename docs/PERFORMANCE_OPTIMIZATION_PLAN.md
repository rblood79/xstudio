# 성능 최적화 계획: 이벤트 핸들러 290ms-435ms 지연 해결

## 문제 요약
- `pointerdown` 핸들러: 290-338ms
- `click` 핸들러: 172-435ms
- `message` 핸들러: 245-260ms
- Chrome 기준 50ms 초과 = Long Task violation

---

## 근본 원인 분석

| 원인 | 위치 | 비중 | 예상 개선 |
|------|------|------|----------|
| Immer `produce()` 오버헤드 | elements.ts | 40-50% | 150-200ms |
| JSON.parse/stringify 깊은 복사 | elementUpdate.ts | 25-30% | 50-100ms |
| O(n²) 중복 검사 | useIframeMessenger.ts | 15-20% | 70-140ms |
| elements.find() 배열 순회 | useSyncWithBuilder.ts | 5-10% | 5-10ms |

---

## 추가 발견 (2025-12-17)

`message`/`pointerdown`/`click` Long Task는 Store 업데이트 비용 외에도 아래 경로에서 쉽게 재현됩니다.

| 원인 | 위치(예시) | 증상 | 예상 개선 |
|------|------------|------|----------|
| postMessage 핸들러에서 무거운 동기 작업 | Builder/Preview `window.addEventListener('message', ...)` | `message` handler 200ms+ | 50-150ms |
| 선택 시 computedStyle 동기 수집 | `src/canvas/utils/messageHandlers.ts` | 클릭/선택이 순간 멈춤 | 30-120ms |
| UPDATE_ELEMENTS “전체 재전송” 루프/중복 | `useIframeMessenger.ts` 등 | 클릭/편집 시 message 폭주 | 50-200ms |
| 오버레이 좌표 갱신 과다(레이아웃 쓰래시) | `src/builder/overlay/index.tsx` | 스크롤/드래그 시 버벅임 | 10-60ms |
| postMessage payload 과대(전체 props/elements) | Builder→Preview 동기화 | 직렬화/GC 증가 | 20-120ms |

---

# Phase 1: Immer → 함수형 업데이트 전환 (안전한 방식)

## 목표
- Immer의 `produce()` 오버헤드 제거
- **기능 안정성 유지**: read-then-modify 패턴에서 동시성 보장

## 파일
`src/builder/stores/elements.ts`

---

## ⚠️ Immer 제거 안정성 분석

### Immer가 제공하는 기능
1. **불변성 자동 보장**: 상태를 직접 변경하는 것처럼 작성해도 내부에서 새 객체 생성
2. **깊은 중첩 업데이트**: `state.a.b.c = value` 형태로 깊은 속성 수정 가능
3. **Proxy 기반 변경 감지**: 실제 변경된 부분만 새 객체로 생성

### Phase 1 대상 함수들의 특성

| 함수 | 업데이트 깊이 | 패턴 | Immer 제거 안전성 |
|------|-------------|------|------------------|
| `setSelectedElement` | 최상위 레벨 | 단순 할당 | ✅ **안전** |
| `setSelectedElements` | 최상위 레벨 | 단순 할당 | ✅ **안전** |
| `clearSelection` | 최상위 레벨 | 초기화 | ✅ **안전** |
| `selectTabElement` | 최상위 레벨 | 단순 할당 | ✅ **안전** |
| `setPages` | 최상위 레벨 | 배열 교체 | ✅ **안전** |
| `setCurrentPageId` | 최상위 레벨 | primitive | ✅ **안전** |
| `toggleElementInSelection` | 최상위 + read-then-modify | 조건부 업데이트 | ⚠️ **함수형 업데이트 필수** |
| `removeTabPair` | elements 배열 내부 | filter + 조건부 | ⚠️ **함수형 업데이트 필수** |
| `updateElementOrder` | elements 배열 내부 | find + 수정 | ⚠️ **함수형 업데이트 필수** |

### 안전한 이유

**1. 선택 관련 함수들 (setSelectedElement, setSelectedElements, clearSelection)**
```typescript
// 모든 업데이트가 최상위 레벨 속성
state.selectedElementId = elementId;        // primitive (string | null)
state.selectedElementIds = [elementId];     // 새 배열 생성
state.selectedElementProps = { ... };       // 새 객체 생성
state.multiSelectMode = false;              // primitive (boolean)
```
- **깊은 중첩이 없음**: `state.a.b.c` 형태의 깊은 수정이 없음
- **모두 새 값 할당**: 기존 객체를 변경(mutate)하지 않고 새 값으로 교체
- **Zustand의 shallow merge**: `set({ a: 1 })` 호출 시 Zustand가 자동으로 `{ ...oldState, a: 1 }` 처리

**2. Zustand 자체의 불변성 지원**
```typescript
// Zustand의 set() 함수는 이미 불변성을 보장
set({ selectedElementId: 'abc' });
// 내부적으로: setState(state => ({ ...state, selectedElementId: 'abc' }))
```

**3. 함수형 업데이트로 동시성 보장**
```typescript
// read-then-modify 패턴에서 Immer 대신 함수형 업데이트 사용
set((state) => {
  const newIds = state.selectedElementIds.filter(id => id !== elementId);
  return { selectedElementIds: newIds };
});
// 콜백의 state 파라미터가 항상 최신 상태 보장
```

### 제거하면 안 되는 경우 (주의)

**❌ elements 배열 내부 요소 직접 수정**
```typescript
// 이런 패턴은 Immer 없이 하면 위험!
set(produce((state) => {
  const element = state.elements.find(el => el.id === id);
  element.props.style.color = 'red';  // 깊은 중첩 수정
}));

// Immer 없이 하려면:
set((state) => ({
  elements: state.elements.map(el =>
    el.id === id
      ? { ...el, props: { ...el.props, style: { ...el.props.style, color: 'red' } } }
      : el
  )
}));
```

**그러나 Phase 1 대상 함수들은 이 패턴을 사용하지 않음!**
- 선택 관련 함수들은 `elements` 배열 자체를 수정하지 않음
- `elements` 배열 수정은 별도 함수(`updateElement`, `addElement` 등)에서 처리

### 결론: Phase 1 Immer 제거는 **안전함**

| 검증 항목 | 결과 |
|----------|------|
| 깊은 중첩 수정 여부 | ❌ 없음 (최상위 레벨만) |
| 기존 객체 직접 변경 여부 | ❌ 없음 (새 값 할당) |
| elements 배열 내부 수정 여부 | ❌ 없음 (선택 상태만 관리) |
| 동시성 보장 필요 여부 | ⚠️ 일부 함수 (함수형 업데이트로 대체) |
| Zustand 불변성 지원 | ✅ 자동 shallow merge |

**권장사항:**
1. **단순 할당 함수**: 직접 객체 전달 `set({ ... })`
2. **read-then-modify 함수**: 함수형 업데이트 `set((state) => { ... })`
3. **elements 배열 수정 함수**: Immer 유지 (별도 평가 필요)

---

## 변경 대상 함수

### 1.1 setSelectedElement (라인 242-277)

**현재 코드:**
```typescript
setSelectedElement: (elementId, props, style, computedStyle) => {
  let resolvedProps = props;

  if (elementId && !resolvedProps) {
    const { elementsMap, elements } = get();
    const element = elementsMap.get(elementId) ?? findElementById(elements, elementId);
    if (element) {
      resolvedProps = createCompleteProps(element);
    }
  }

  set(
    produce((state: ElementsState & { selectedElementIds: string[]; multiSelectMode: boolean }) => {
      state.selectedElementId = elementId;
      if (elementId && resolvedProps) {
        state.selectedElementProps = {
          ...resolvedProps,
          ...(style ? { style } : {}),
          ...(computedStyle ? { computedStyle } : {}),
        };
      } else if (!elementId) {
        state.selectedElementProps = {};
      }
      if (elementId) {
        state.selectedElementIds = [elementId];
        state.multiSelectMode = false;
      } else {
        state.selectedElementIds = [];
        state.multiSelectMode = false;
      }
    })
  );
}
```

**변경 후:**
```typescript
setSelectedElement: (elementId, props, style, computedStyle) => {
  let resolvedProps = props;

  if (elementId && !resolvedProps) {
    const { elementsMap, elements } = get();
    const element = elementsMap.get(elementId) ?? findElementById(elements, elementId);
    if (element) {
      resolvedProps = createCompleteProps(element);
    }
  }

  // Immer 제거 - 직접 객체 생성 (모두 최상위 속성이므로 안전)
  const newState: Partial<ElementsState & { selectedElementIds: string[]; multiSelectMode: boolean }> = {
    selectedElementId: elementId,
    multiSelectMode: false,
  };

  if (elementId && resolvedProps) {
    newState.selectedElementProps = {
      ...resolvedProps,
      ...(style ? { style } : {}),
      ...(computedStyle ? { computedStyle } : {}),
    };
    newState.selectedElementIds = [elementId];
  } else if (!elementId) {
    newState.selectedElementProps = {};
    newState.selectedElementIds = [];
  }

  set(newState);
}
```

**변경 이유:**
- 모든 업데이트가 **최상위 레벨 속성**이므로 깊은 복사 불필요
- `resolvedProps` 계산이 `set()` 호출 전에 완료되므로 동시성 문제 없음

---

### 1.2 setSelectedElements (라인 381-404)

**현재 코드:**
```typescript
setSelectedElements: (elementIds: string[]) =>
  set(
    produce((state: ElementsState & { selectedElementIds: string[]; multiSelectMode: boolean }) => {
      const resolveCompleteProps = (id: string) => {
        const { elementsMap, elements } = get();
        const element = elementsMap.get(id) ?? findElementById(elements, id);
        return element ? createCompleteProps(element) : null;
      };

      state.selectedElementIds = elementIds;
      state.multiSelectMode = elementIds.length > 1;

      if (elementIds.length > 0) {
        state.selectedElementId = elementIds[0];
        const nextProps = resolveCompleteProps(elementIds[0]);
        if (nextProps) state.selectedElementProps = nextProps;
      } else {
        state.selectedElementId = null;
        state.selectedElementProps = {};
      }
    })
  )
```

**변경 후:**
```typescript
setSelectedElements: (elementIds: string[]) => {
  // produce 외부에서 props 계산 (get() 호출 분리)
  let selectedElementProps: Record<string, unknown> = {};
  let selectedElementId: string | null = null;

  if (elementIds.length > 0) {
    selectedElementId = elementIds[0];
    const { elementsMap, elements } = get();
    const element = elementsMap.get(selectedElementId) ?? findElementById(elements, selectedElementId);
    if (element) {
      selectedElementProps = createCompleteProps(element);
    }
  }

  set({
    selectedElementIds: elementIds,
    multiSelectMode: elementIds.length > 1,
    selectedElementId,
    selectedElementProps,
  });
}
```

**변경 이유:**
- `get()` 호출을 `set()` 외부로 이동 (Zustand 권장 패턴)
- 단순 속성 할당이므로 Immer 불필요

---

### 1.3 toggleElementInSelection (라인 339-378)

**⚠️ 주의: read-then-modify 패턴 - 함수형 업데이트 필수**

**현재 코드:**
```typescript
toggleElementInSelection: (elementId: string) =>
  set(
    produce((state: ElementsState & { selectedElementIds: string[]; multiSelectMode: boolean }) => {
      const resolveCompleteProps = (id: string) => {
        const { elementsMap, elements } = get();
        const element = elementsMap.get(id) ?? findElementById(elements, id);
        return element ? createCompleteProps(element) : null;
      };

      const isAlreadySelected = state.selectedElementIds.includes(elementId);

      if (isAlreadySelected) {
        state.selectedElementIds = state.selectedElementIds.filter(id => id !== elementId);
        if (state.selectedElementIds.length === 0) {
          state.multiSelectMode = false;
          state.selectedElementId = null;
          state.selectedElementProps = {};
        } else {
          state.selectedElementId = state.selectedElementIds[0];
          const nextProps = resolveCompleteProps(state.selectedElementIds[0]);
          if (nextProps) state.selectedElementProps = nextProps;
        }
      } else {
        state.selectedElementIds.push(elementId);
        state.multiSelectMode = true;
        if (state.selectedElementIds.length === 1) {
          state.selectedElementId = elementId;
          const nextProps = resolveCompleteProps(elementId);
          if (nextProps) state.selectedElementProps = nextProps;
        }
      }
    })
  )
```

**변경 후:**
```typescript
toggleElementInSelection: (elementId: string) => {
  // 함수형 업데이트 (동시성 안전)
  set((state) => {
    const currentIds = state.selectedElementIds;
    const isAlreadySelected = currentIds.includes(elementId);

    // 새 selectedElementIds 계산
    const newSelectedIds = isAlreadySelected
      ? currentIds.filter(id => id !== elementId)
      : [...currentIds, elementId];

    // props 계산 (get() 대신 현재 state 사용)
    const { elementsMap, elements } = state;
    const resolveProps = (id: string) => {
      const element = elementsMap.get(id) ?? findElementById(elements, id);
      return element ? createCompleteProps(element) : null;
    };

    // 결과 상태 계산
    if (newSelectedIds.length === 0) {
      return {
        selectedElementIds: [],
        multiSelectMode: false,
        selectedElementId: null,
        selectedElementProps: {},
      };
    }

    const primaryId = newSelectedIds[0];
    const primaryProps = resolveProps(primaryId);

    return {
      selectedElementIds: newSelectedIds,
      multiSelectMode: newSelectedIds.length > 1,
      selectedElementId: primaryId,
      selectedElementProps: primaryProps || {},
    };
  });
}
```

**변경 이유:**
- **함수형 업데이트 `set((state) => ...)`** 사용으로 동시성 보장
- `get()` 대신 콜백의 `state` 파라미터 사용 (최신 상태 보장)
- Immer 없이도 불변성 유지 (새 객체/배열 생성)

---

### 1.4 clearSelection (라인 406-420)

**현재 코드:**
```typescript
clearSelection: () =>
  set(
    produce((state: ElementsState & { selectedElementIds: string[]; multiSelectMode: boolean }) => {
      state.selectedElementId = null;
      state.selectedElementProps = {};
      state.selectedElementIds = [];
      state.multiSelectMode = false;
    })
  )
```

**변경 후:**
```typescript
clearSelection: () => set({
  selectedElementId: null,
  selectedElementProps: {},
  selectedElementIds: [],
  multiSelectMode: false,
})
```

**변경 이유:**
- 단순 초기화이므로 함수형 업데이트도 불필요
- 직접 객체 전달이 가장 효율적

---

### 1.5 selectTabElement, setPages, setCurrentPageId, removeTabPair, updateElementOrder

**패턴:** 단순 속성 업데이트 → 직접 객체 전달

```typescript
// 변경 전
selectTabElement: (elementId, props, tabIndex) =>
  set(produce((state) => {
    state.selectedElementId = elementId;
    state.selectedElementProps = props;
    state.selectedTab = { parentId: elementId, tabIndex };
  }))

// 변경 후
selectTabElement: (elementId, props, tabIndex) => set({
  selectedElementId: elementId,
  selectedElementProps: props,
  selectedTab: { parentId: elementId, tabIndex },
})
```

---

## Phase 1 체크리스트

- [ ] `setSelectedElement` 변환
- [ ] `setSelectedElements` 변환
- [ ] `toggleElementInSelection` 함수형 업데이트로 변환
- [ ] `clearSelection` 변환
- [ ] `selectTabElement` 변환
- [ ] `setPages` 변환
- [ ] `setCurrentPageId` 변환
- [ ] `removeTabPair` 함수형 업데이트로 변환 (read-then-modify)
- [ ] `updateElementOrder` 함수형 업데이트로 변환 (read-then-modify)
- [ ] TypeScript 타입 체크 통과
- [ ] 기능 테스트: 요소 선택, 다중 선택, 선택 해제

---

# Phase 2: structuredClone으로 깊은 복사 최적화

## 목표
- `JSON.parse(JSON.stringify())` → `structuredClone()` 변환
- 히스토리 저장 성능 개선

## 파일
`src/builder/stores/utils/elementUpdate.ts`

## 변경 위치

### 2.1 createUpdateElementPropsAction (라인 68-70)

**현재:**
```typescript
const prevPropsClone = JSON.parse(JSON.stringify(element.props));
const newPropsClone = JSON.parse(JSON.stringify(props));
const prevElementClone = JSON.parse(JSON.stringify(element));
```

**변경 후:**
```typescript
const prevPropsClone = structuredClone(element.props);
const newPropsClone = structuredClone(props);
const prevElementClone = structuredClone(element);
```

### 2.2 createUpdateElementAction (라인 174-176)

동일한 패턴 적용

### 2.3 createBatchUpdateElementPropsAction (확인 필요)

배치 업데이트에서 반복문 내 깊은 복사가 있다면 동일하게 변환

## Phase 2 체크리스트

- [ ] `createUpdateElementPropsAction` 내 JSON 복사 → structuredClone
- [ ] `createUpdateElementAction` 내 JSON 복사 → structuredClone
- [ ] `createBatchUpdateElementPropsAction` 확인 및 변환
- [ ] TypeScript 타입 체크 통과
- [ ] 히스토리 기능 테스트: undo/redo 정상 작동

---

# Phase 3: O(n²) → O(n) 알고리즘 최적화

## 목표
- `filter().some()` 패턴을 `Set` 기반으로 변환

## 파일
`src/builder/hooks/useIframeMessenger.ts`

## 변경 위치

### 3.1 ADD_COLUMN_ELEMENTS 핸들러 (라인 479-505)

**현재:**
```typescript
if (event.data.type === "ADD_COLUMN_ELEMENTS" && event.data.payload?.columns) {
  const { elements } = useStore.getState();
  const newColumns = event.data.payload.columns;

  // ❌ O(n×m) 복잡도
  const columnsToAdd = newColumns.filter((col: Element) =>
    !elements.some(el => el.id === col.id)
  );
  // ...
}
```

**변경 후:**
```typescript
if (event.data.type === "ADD_COLUMN_ELEMENTS" && event.data.payload?.columns) {
  const { elements } = useStore.getState();
  const newColumns = event.data.payload.columns;

  // ✅ O(n+m) 복잡도
  const existingIds = new Set(elements.map(el => el.id));
  const columnsToAdd = newColumns.filter((col: Element) =>
    !existingIds.has(col.id)
  );
  // ...
}
```

### 3.2 ADD_FIELD_ELEMENTS 핸들러 (라인 508-536)

동일한 패턴 적용

## Phase 3 체크리스트

- [ ] `ADD_COLUMN_ELEMENTS` 핸들러 Set 변환
- [ ] `ADD_FIELD_ELEMENTS` 핸들러 Set 변환
- [ ] TypeScript 타입 체크 통과
- [ ] Table 컴포넌트 Column 자동 생성 테스트

---

# Phase 4: elementsMap 활용 (O(n) → O(1))

## 목표
- `elements.find()` → `elementsMap.get()` 변환

## 파일
`src/builder/inspector/hooks/useSyncWithBuilder.ts`

## 변경 위치

### 4.1 currentElementInStore 조회 (라인 44-46)

**현재:**
```typescript
const currentElementInStore = elements.find(
  (el) => el.id === selectedElement.id
);
```

**변경 후:**
```typescript
const elementsMap = useStore.getState().elementsMap;
const currentElementInStore = elementsMap.get(selectedElement.id);
```

### 4.2 childColumns 필터링 (라인 191-201) - 선택적

복잡한 필터링 로직이 있다면 인덱스 기반으로 최적화

## Phase 4 체크리스트

- [ ] `currentElementInStore` elementsMap 사용
- [ ] TypeScript 타입 체크 통과
- [ ] Inspector 동기화 테스트

---

# Phase 5: InspectorSync 조기 종료 최적화 (선택적)

## 목표
- `hasChanges` 플래그 제거, 첫 변경 감지 시 즉시 반환

## 파일
`src/builder/inspector/InspectorSync.tsx`

## 현재 상태
이미 참조 비교 최적화가 적용됨 (라인 122-131)

## 추가 최적화 (선택적)

```typescript
// 변경 감지 시 즉시 반환
if (currentProps !== newProps &&
    JSON.stringify(currentProps) !== JSON.stringify(newProps)) {
  setSelectedElement(mappedElement);
  return;
}
if (currentDataBinding !== newDataBinding &&
    JSON.stringify(currentDataBinding) !== JSON.stringify(newDataBinding)) {
  setSelectedElement(mappedElement);
  return;
}
// ... 나머지 필드도 동일 패턴
```

## Phase 5 체크리스트

- [ ] 조기 종료 패턴 적용 (선택적)
- [ ] TypeScript 타입 체크 통과

---

# 구현 순서 및 테스트 계획

## 순서
1. **Phase 1** (가장 효과적): elements.ts Immer 제거 → 150-200ms 개선
2. **Phase 2**: elementUpdate.ts structuredClone → 50-100ms 개선
3. **Phase 3**: useIframeMessenger.ts Set 변환 → 70-140ms 개선
4. **Phase 4**: useSyncWithBuilder.ts Map 활용 → 5-10ms 개선
5. **Phase 5**: InspectorSync.tsx 조기 종료 (선택적) → 20-50ms 개선

## 각 Phase 후 테스트

```bash
# TypeScript 타입 체크
npm run type-check

# 기능 테스트 (수동)
1. 요소 클릭 선택
2. Cmd+Click 다중 선택
3. 드래그 영역 선택
4. Undo/Redo
5. Table Column 자동 생성
6. Inspector 속성 편집
```

## 성능 측정

Chrome DevTools Performance 탭에서 측정:
- `pointerdown` 핸들러 시간
- `click` 핸들러 시간
- `message` 핸들러 시간

---

# 예상 결과

| 지표 | 현재 | Phase 1 후 | 전체 완료 후 |
|------|------|-----------|-------------|
| click 핸들러 | 290-435ms | 140-250ms | 80-150ms |
| pointerdown 핸들러 | 290-338ms | 140-180ms | 60-120ms |
| message 핸들러 | 245-260ms | 200-220ms | 80-120ms |

**총 예상 개선**: 60-70% (Chrome Long Task violation 대부분 해소)

---

# Phase 6: postMessage 파이프라인 최적화 (핵심)

## 목표
- `message` 핸들러에서 “동기적으로 무거운 작업”을 줄이고, 메시지 폭주 시에도 프레임을 양보
- Builder↔Preview 간 동기화에서 **Full Sync(UPDATE_ELEMENTS)** 의존도를 낮춤

## 개선안

### 6.1 메시지 처리 “코얼레싱(coalescing)” + 프레임 양보

**문제 패턴**
- `message` 이벤트는 한 번에 여러 개가 연속으로 들어오며(특히 드래그/편집), 각 핸들러가 store 업데이트/DOM 측정/직렬화를 동기 실행하면 Long Task가 발생

**개선 방향**
- 같은 타입의 최신 메시지만 남기고 버림(예: `UPDATE_ELEMENTS`는 최신 1개만)
- 실제 반영은 `requestAnimationFrame` 또는 `queueMicrotask`로 배치하여 이벤트 루프를 빨리 반환

**적용 후보**
- Builder 쪽 `window.addEventListener('message', ...)` 등록부(여러 곳에 분산) → 단일 디스패처로 통합하거나 최소한 “배치 처리” 계층을 둠

체크리스트
- [ ] `UPDATE_ELEMENTS`/`UPDATE_VARIABLES`/`UPDATE_LAYOUTS` 등 “최신 상태만 필요” 메시지 코얼레싱
- [ ] `ELEMENT_SELECTED`/`ELEMENT_COMPUTED_STYLE` 등 “연쇄 도착” 메시지 배치 처리(우선 rect/선택 먼저, 스타일은 나중)

### 6.2 `ELEMENT_SELECTED`에서 computedStyle 분리(이미지/텍스트 등은 지연 전송)

**문제 패턴**
- 선택 시 `getComputedStyle()` + 여러 속성 추출을 message handler 내에서 동기 실행 → 클릭/포인터다운이 멈춤

**개선 방향**
- 1차 메시지: rect + 최소 정보(tag, props 일부)만 즉시 전송
- 2차 메시지: computedStyle은 `requestIdleCallback`(없으면 `setTimeout(0)`)로 지연 전송

**적용 후보**
- `src/canvas/utils/messageHandlers.ts`의 `ELEMENT_SELECTED` 응답 로직

체크리스트
- [ ] `ELEMENT_SELECTED` payload에서 computedStyle 제거(or 옵션화)
- [ ] 별도 타입 `ELEMENT_COMPUTED_STYLE`로 분리 전송(Builder는 이미 별도 처리 경로가 있음)
- [ ] computedStyle 속성 “전체”가 아닌 Inspector에서 실제 사용하는 subset만 전송(예: layout/typography만)

### 6.3 Full Sync(UPDATE_ELEMENTS) → Delta Update 전환

**문제 패턴**
- 작은 변경에도 전체 elements 배열을 postMessage로 보내면: 직렬화/GC/React reconcile 비용이 커짐

**개선 방향**
- Builder→Preview: 가능한 한 `DELTA_ELEMENT_UPDATED`/`DELTA_BATCH_UPDATE` 사용
- 선택 편집/드래그 등 빈도가 높은 작업은 Delta 우선

체크리스트
- [ ] “props 일부 변경”은 `UPDATE_ELEMENT_PROPS(merge)` 또는 `DELTA_ELEMENT_UPDATED`로 통일
- [ ] “다중 선택/정렬”은 `DELTA_BATCH_UPDATE`로 묶어서 전송
- [ ] `UPDATE_ELEMENTS`는 초기 로드/리셋/대규모 변경에만 사용

---

# Phase 7: SelectionOverlay/레이아웃 쓰래시 줄이기

## 목표
- 스크롤/리사이즈/메시지 수신 시 오버레이 좌표 계산이 과다 실행되는 것을 방지

## 개선안

### 7.1 Multi-select 오버레이 업데이트 RAF 배치
- 다수 요소의 `querySelector` + `getBoundingClientRect`는 누적 비용이 커짐
- “동일 프레임 내 중복 호출”은 하나로 합치기

체크리스트
- [ ] multi-select overlay update는 전용 RAF 스케줄러로 코얼레싱
- [ ] (가능하면) `selectedElementIds`가 매우 큰 경우 chunk 처리(예: 200개씩)로 프레임 양보

### 7.2 body element 특수처리/로그 최소화
- 선택 상태 변화가 잦을 때 `console.log`는 Long Task를 키우는 원인이 됨(DevTools 오픈 시 더 큼)

체크리스트
- [ ] 선택/스크롤 핫패스에서 콘솔 로그 제거 또는 샘플링

---

# Phase 8: Store 업데이트 비용 추가 절감 (Preview/runtime 포함)

## 목표
- Preview runtime에서 자주 호출되는 `updateElementProps`가 전체 배열을 매번 순회하지 않도록 개선
- “변화 없음” 업데이트는 조기 종료하여 React 리렌더를 줄임

## 개선안
- 배열 전체 `map` 대신 “대상 element만 교체” (findIndex + slice)
- shallow patch 비교로 no-op 스킵
- (추가 여지) elements를 Map 인덱스로 유지하고, 렌더 단계에서 필요한 순서만 배열로 파생

체크리스트
- [ ] Preview runtime store: `updateElementProps` no-op 스킵
- [ ] 대량 업데이트는 batch API(단일 set) 사용

---

# Phase 9: 측정/가드레일(회귀 방지)

## 목표
- 최적화가 실제로 Long Task를 줄였는지 확인 가능한 “재현 시나리오 + 수치” 확보
- 추후 기능 추가로 다시 느려지는 것을 조기에 감지

## 개선안
- dev에서만 활성화되는 SLO/latency 측정(이미 `docs/performance`에 기반 있음)
- postMessage 처리 시간/빈도, payload 크기(대략 JSON length) 샘플링

체크리스트
- [ ] “선택/드래그/속성편집” 각 시나리오별 측정 절차 문서화
- [ ] `message`/`pointerdown`/`click` 핸들러 duration을 `performance.mark/measure`로 구간별 기록
- [ ] 12시간 회귀 테스트 리포트에 postMessage 지표 추가(선택)
