# 성능 최적화 계획: 이벤트 핸들러 지연 해결

## 문제 요약

- `pointerdown` 핸들러: 290-469ms
- `click` 핸들러: 172-492ms
- `message` 핸들러: 245-635ms
- Chrome 기준 50ms 초과 = Long Task violation

**목표**: 모든 핸들러 50ms 이하로 최적화

---

## 측정 방법

```typescript
// Long Task Observer (dev 모드)
if (import.meta.env.DEV) {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.warn(`[LongTask] ${entry.duration.toFixed(1)}ms`, entry);
    }
  });
  observer.observe({ entryTypes: ['longtask'] });
}

// 핸들러 내부 측정
performance.mark('handler-start');
// ... handler logic ...
performance.mark('handler-end');
performance.measure('handler-duration', 'handler-start', 'handler-end');
```

---

## Phase 1-11 완료 현황 (2025-12-17)

| Phase | 내용 | 상태 | 예상 개선 |
|-------|------|------|----------|
| **1** | Immer → 함수형 업데이트 | ✅ 완료 | 150-200ms |
| **2** | JSON → structuredClone | ✅ 완료 | 50-100ms |
| **3** | O(n²) → Set 기반 조회 | ✅ 완료 | 70-140ms |
| **4** | elementsMap O(1) 조회 | ✅ 완료 | 5-10ms |
| **5** | InspectorSync 조기 종료 | ✅ 완료 | 20-50ms |
| **6** | postMessage 파이프라인 | ✅ 완료 | 30-200ms |
| **7** | SelectionOverlay RAF 배치 | ✅ 완료 | 10-60ms |
| **8** | Store no-op 스킵 | ✅ 완료 | 10-60ms |
| **9** | 측정 인프라 | ✅ 완료 | - |
| **10** | 패널 리사이즈 분석 | ✅ 완료 | - |
| **11** | WebGL 모드 최적화 | ✅ 완료 | 3-5ms/변경 |

### 변경된 파일

| 파일 | Phase | 변경 내용 |
|------|-------|----------|
| `elements.ts` | 1 | Immer 제거, 10개 함수 변환 |
| `selection.ts` | 1 | Immer 제거, 7개 함수 변환 |
| `elementCreation.ts` | 1 | addElement/addComplexElement 변환 |
| `elementUpdate.ts` | 1 | 4개 함수 변환 |
| `elementRemoval.ts` | 1 | removeElement 변환 |
| `historyActions.ts` | 1, 2 | Immer 제거, cloneForHistory 헬퍼 |
| `useIframeMessenger.ts` | 3, 11 | Set 기반 조회, WebGL 스킵 |
| `useSyncWithBuilder.ts` | 4 | elementsMap O(1) 조회 |
| `useMessageCoalescing.ts` | 6.1 | 메시지 코얼레싱 + RAF 배치 (신규) |
| `computedStyleExtractor.ts` | 6.2 | computedStyle 화이트리스트 (신규) |
| `useOverlayRAF.ts` | 7.1 | RAF 스케줄러 (신규) |
| `longTaskMonitor.ts` | 9.1 | Long Task 모니터링 (신규) |
| `postMessageMonitor.ts` | 9.2 | postMessage 모니터링 (신규) |

---

## Phase 12-14: 추가 최적화 계획 (2025-12-18)

### 현재 문제

Phase 1-11 완료 후에도 요소 선택 시 여전히 지연 발생:

```
[Violation] 'pointerdown' handler took 320-469ms
[Violation] 'click' handler took 288-492ms
[Violation] 'message' handler took 635ms
```

### 근본 원인: JSON.stringify 과다 호출

| 위치 | 호출 횟수 | 비용 |
|------|----------|------|
| InspectorSync 참조비교 | 5회 | 10-20ms |
| InspectorSync JSON비교 | 10회 | 30-50ms |
| PropertyEditorWrapper memo | 4회 | 15-25ms |
| **총합** | **19회+** | **55-95ms** |

### requestIdleCallback 50ms 지연 문제

- InspectorSync와 useSyncWithBuilder에서 `{ timeout: 50 }` 사용
- 참조가 다르면 무조건 50ms 대기 후 JSON 비교
- 연속 선택 시 callback 취소/재등록 반복

---

### Phase 12: InspectorSync JSON 비교 제거 (P0)

**파일**: `src/builder/inspector/InspectorSync.tsx`

**현재 문제**:
```typescript
// 현재: requestIdleCallback + JSON.stringify (15회+)
idleCallbackRef.current = requestIdleCallback(() => {
  // JSON.stringify 비교 10회+
  const currentPropsJson = JSON.stringify(currentProps, ...);
  const newPropsJson = JSON.stringify(newProps, ...);
  if (currentPropsJson !== newPropsJson) hasChanges = true;
  // ... style, dataBinding, computedStyle, events 각각 비교
}, { timeout: 50 });
```

**변경 내용**:
1. requestIdleCallback 제거 → 즉시 동기화
2. JSON.stringify 비교 → 필드별 얕은 비교
3. 참조가 같으면 즉시 스킵 (현재 동작 유지)
4. 참조가 다르면 필드별 얕은 비교 후 즉시 업데이트

**목표 코드**:
```typescript
// 참조 비교만 수행 (JSON.stringify 제거)
if (
  currentProps === newProps &&
  currentDataBinding === newDataBinding &&
  currentStyle === newStyle &&
  currentComputedStyle === newComputedStyle &&
  currentEvents === newEvents
) {
  return; // 변경 없음
}

// 참조가 다르면 즉시 업데이트 (JSON 비교 없이)
setSelectedElement(mappedElement);
```

**예상 효과**: 50-100ms 개선

---

### Phase 13: useSyncWithBuilder JSON 비교 최적화 (P0)

**파일**: `src/builder/inspector/hooks/useSyncWithBuilder.ts`

**현재 문제**:
```typescript
// 현재: requestIdleCallback + JSON.stringify
idleCallbackRef.current = requestIdleCallback(() => {
  const inspectorElementJson = JSON.stringify(inspectorData);
  const storeElementJson = JSON.stringify(storeData);
  if (inspectorElementJson === storeElementJson) return;
  // ... 동기화 로직
}, { timeout: 50 });
```

**변경 내용**:
1. requestIdleCallback timeout 축소 (50ms → 16ms) 또는 제거
2. JSON.stringify 비교 → 필드별 얕은 비교
3. 변경된 필드만 업데이트 (전체 동기화 X)

**목표 코드**:
```typescript
// 필드별 얕은 비교
const hasChanges =
  inspectorData.customId !== storeData.customId ||
  inspectorData.properties !== storeData.properties ||
  inspectorData.style !== storeData.style ||
  inspectorData.dataBinding !== storeData.dataBinding ||
  inspectorData.events !== storeData.events;

if (!hasChanges) return;

// 즉시 동기화 (지연 없음)
updateElement(selectedElement.id, elementUpdate);
```

**예상 효과**: 30-50ms 개선

---

### Phase 14: PropertyEditorWrapper Memo 최적화 (P1)

**파일**: `src/builder/panels/properties/PropertiesPanel.tsx`

**현재 문제**:
```typescript
// React.memo 비교 함수에서 JSON.stringify 4회
const PropertyEditorWrapper = memo(({ ... }) => {
  // ...
}, (prevProps, nextProps) => {
  // JSON.stringify로 깊은 비교
  return JSON.stringify(prevProps.currentProps) === JSON.stringify(nextProps.currentProps) &&
         JSON.stringify(prevProps.dataBinding) === JSON.stringify(nextProps.dataBinding);
});
```

**변경 내용**:
1. memo 비교 함수에서 Early Return 추가
2. 자주 변경되지 않는 필드 먼저 비교 (id, type)
3. JSON.stringify → shallowEqual 또는 필드별 비교

**목표 코드**:
```typescript
const PropertyEditorWrapper = memo(({ ... }) => {
  // ...
}, (prevProps, nextProps) => {
  // 1. 빠른 비교 먼저 (primitive)
  if (prevProps.elementId !== nextProps.elementId) return false;
  if (prevProps.elementType !== nextProps.elementType) return false;

  // 2. 참조 비교 (대부분의 경우 여기서 종료)
  if (prevProps.currentProps === nextProps.currentProps &&
      prevProps.dataBinding === nextProps.dataBinding) {
    return true;
  }

  // 3. 참조가 다를 때만 얕은 비교
  return shallowEqual(prevProps.currentProps, nextProps.currentProps) &&
         shallowEqual(prevProps.dataBinding, nextProps.dataBinding);
});
```

**예상 효과**: 15-25ms 개선

---

## Phase 12-14 우선순위

| 순서 | Phase | 예상 효과 | 리스크 | 소요 시간 |
|------|-------|----------|--------|----------|
| 1 | Phase 12 | 50-100ms | 낮음 | 1-2시간 |
| 2 | Phase 13 | 30-50ms | 낮음 | 1시간 |
| 3 | Phase 14 | 15-25ms | 중간 | 1-2시간 |

**Phase 12-14 완료 시**: 95-175ms 개선 → 목표 달성 가능

---

## 이미 완료된 최적화 (참고)

### Sidebar 가상화
- `@tanstack/react-virtual` 적용 완료
- `VirtualizedLayerTree.tsx`, `VirtualizedTree.tsx`

### useDeferredValue
- `sidebar/index.tsx`에 부분 적용

### elementsMap O(1) 조회
- `useSyncWithBuilder.ts`에 적용 완료

---

## 부록 A: 최적화 방법론 가이드

### 핵심 원칙

**이벤트 기반(Event-driven) > 시간 기반(Time-based)**

상태 동기화에서 "언제" 처리할지 시간으로 추측하는 것보다, "무엇이" 변경됐을 때 처리하는 것이 정확하고 효율적입니다.

### 방법론 비교

#### 시간 기반 접근 (권장하지 않음)

| 방식 | 문제점 | 정확도 |
|------|--------|--------|
| **debounce/setTimeout** | 시간 추측, 지연 발생 | ❌ 낮음 |
| **RAF** | 변경 없어도 매 프레임 체크 | 🔶 중간 |
| **setInterval** | 무조건 주기적 실행 | ❌ 낮음 |

#### 이벤트 기반 접근 (권장)

| 방식 | 장점 | 정확도 |
|------|------|--------|
| **Zustand subscribe** | 변경 시에만 실행, 참조 비교 O(1) | ✅ 높음 |
| **Microtask batching** | 동기 코드 완료 직후 실행 | ✅ 높음 |
| **Delta Protocol** | 변경분만 전송 | ✅ 높음 |

### 권장 패턴

```typescript
// ✅ 최적 패턴: Zustand subscribe + Delta + Microtask
useStore.subscribe((state, prevState) => {
  // 1. 참조 비교 (O(1))
  if (state.elements === prevState.elements) return;

  // 2. Microtask로 배치
  queueMicrotask(() => {
    const changes = extractChanges(prevState.elements, state.elements);
    if (changes.length > 0) {
      sendDelta(changes);
    }
  });
});
```

### 시나리오별 권장 방법

| 시나리오 | 권장 방법 |
|----------|----------|
| **상태 동기화** | Zustand subscribe + Microtask |
| **Delta 전송** | subscribe + extractChanges |
| **애니메이션** | RAF (시각적 요소만) |
| **사용자 입력** | debounce (검색 입력 등) |
| **스크롤 이벤트** | throttle + RAF |

---

**문서 최종 업데이트**: 2025-12-18
**다음 단계**: Phase 12 (InspectorSync JSON 비교 제거) 구현
