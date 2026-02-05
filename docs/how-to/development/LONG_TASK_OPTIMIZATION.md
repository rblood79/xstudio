# WebGL Canvas Long Task 최적화 실행 계획

> 작성일: 2025-12-23
> 상태: 계획 완료, 실행 대기

## 1. 현재 성능 문제 분석 결과

### 1.1 측정 환경
- 브라우저: Chrome (MCP Extension 사용)
- 캔버스 크기: 3622 x 2410 (고해상도)
- DOM 노드: 1,867개
- JS Heap: 141.8 MB

### 1.2 성능 측정 결과

| 항목 | 측정값 | 목표 | 심각도 |
|------|--------|------|--------|
| 드래그 작업 | **1,239ms** | < 100ms | 🔴 심각 |
| 인스펙터 업데이트 | **232ms** | < 50ms | 🔴 심각 |
| 선택 렌더링 (frame2) | **177ms** | < 50ms | 🟠 높음 |
| Long Task 최대 | **870ms** | < 50ms | 🔴 매우 심각 |
| Long Task 총 횟수 | 56회 | < 5회 | 🔴 심각 |
| Long Task 누적 시간 | 9.3초 | < 0.5초 | 🔴 심각 |

### 1.3 시나리오별 성능

| 시나리오 | 소요 시간 | Long Task 수 | 비고 |
|----------|----------|--------------|------|
| 드래그 (10단계) | 1,239ms | 6회 | 최대 224ms |
| 다중선택 (Cmd+Click) | 231ms | 0회 | |
| 빠른 연속 클릭 (20회) | 401ms | 0회 | |

### 1.4 인스펙터 패널 복잡도

| 항목 | 값 |
|------|-----|
| 자식 노드 | 566개 |
| React Aria 컴포넌트 | 93개 |
| 중첩 깊이 | 16단계 |
| CSS 클래스 | 122개 |
| DOM Mutations/선택 변경 | 62개 |

---

## 2. 원인 분석

### 2.1 드래그 성능 병목 (1,239ms)

```
드래그 이벤트 플로우:
pointerdown → pointermove (반복) → pointerup
     ↓
useDragInteraction.ts: updateDrag()
     ↓
Zustand store 업데이트
     ↓
React 리렌더링 (SelectionLayer, ElementSprite)
     ↓
PixiJS 렌더링
```

**문제점**:
- 매 pointermove마다 store 업데이트 → 전체 리렌더링
- SelectionBox가 React 상태에 의존 → 느린 업데이트

### 2.2 선택 변경 렌더링 병목 (177ms)

```
프로파일링 결과:
- mousedown: 0.20ms ✅
- mouseup: 0.20ms ✅
- render-frame1: 34.80ms ⚠️
- render-frame2: 177.20ms ❌ ← 병목
```

**문제점**:
- `startTransition` 이후 deferred 상태 업데이트에서 대량 리렌더링 발생
- SelectionLayer가 `selectedElementIds` 변경마다 리렌더링
- 각 ElementSprite selector 재평가

### 2.3 인스펙터 업데이트 병목 (232ms)

**문제점**:
- 566개 자식 노드 전체 리렌더링
- 93개 React Aria 컴포넌트 동시 업데이트
- 62개 DOM mutation 발생

### 2.4 Long Task 870ms 원인

**추정 원인**:
- 페이지 초기 로드 또는 대규모 레이아웃 재계산
- Yoga 레이아웃 엔진 동기 계산
- 여러 store 업데이트 연쇄 반응

---

## 3. 최적화 실행 계획

### 타이밍 상수 정의

```typescript
// src/builder/constants/timing.ts (신규)
export const TIMING = {
  INSPECTOR_DEBOUNCE: 100,    // 선택 → 인스펙터 (ms)
  INPUT_DEBOUNCE: 150,        // 입력 → store (ms)
  DRAG_THROTTLE: 16,          // 드래그 프레임 (60fps)
} as const;
```

### Phase 1: 드래그 성능 최적화 (최우선)

**목표**: 1,239ms → < 100ms

#### 1.1 드래그 중 상태 업데이트 분리

**파일**: `apps/builder/src/builder/workspace/canvas/selection/useDragInteraction.ts`

```typescript
// Before: 매 move마다 store 업데이트
const updateDrag = (position) => {
  setDragState({ ...state, currentPosition: position }); // store 업데이트
};

// After: 로컬 ref + throttle
const localPositionRef = useRef({ x: 0, y: 0 });
const lastUpdateTime = useRef(0);

const updateDrag = (position) => {
  localPositionRef.current = position;

  // 16ms throttle (60fps)
  const now = performance.now();
  if (now - lastUpdateTime.current < TIMING.DRAG_THROTTLE) return;
  lastUpdateTime.current = now;

  // PixiJS 직접 업데이트 (React 리렌더링 없음)
  selectionBoxRef.current?.updatePosition(position);
};
```

#### 1.2 SelectionBox PixiJS 직접 조작

**파일**: `apps/builder/src/builder/workspace/canvas/selection/SelectionBox.tsx`

```typescript
// PixiJS Graphics ref를 직접 조작
const graphicsRef = useRef<PixiGraphics>(null);

// 드래그 중 위치 업데이트 (React 리렌더링 없이)
useImperativeHandle(ref, () => ({
  updatePosition: (pos) => {
    if (graphicsRef.current) {
      graphicsRef.current.position.set(pos.x, pos.y);
    }
  }
}));
```

#### 1.3 드래그 프리뷰 레이어 분리

**파일**: `apps/builder/src/builder/workspace/canvas/selection/DragPreview.tsx` (신규)

- 드래그 프리뷰를 별도 PixiJS Container로 분리
- React 상태와 완전히 독립적으로 동작

---

### Phase 2: 선택 변경 렌더링 최적화

**목표**: 177ms → < 50ms

#### 2.1 SelectionLayer 구독 최소화

**파일**: `apps/builder/src/builder/workspace/canvas/selection/SelectionLayer.tsx`

```typescript
// Before: 배열 구독
const selectedElementIds = useStore((state) => state.selectedElementIds);

// After: Set만 구독 + shallow compare
const selectedElementIdsSet = useStore(
  (state) => state.selectedElementIdsSet,
  shallow
);
```

#### 2.2 selectionBounds 계산 지연

```typescript
// Before: 즉시 계산
const selectionBounds = useMemo(() => {
  return calculateBounds(selectedElements);
}, [selectedElements]);

// After: requestIdleCallback으로 지연
const [selectionBounds, setSelectionBounds] = useState(null);
useEffect(() => {
  requestIdleCallback(() => {
    setSelectionBounds(calculateBounds(selectedElements));
  });
}, [selectedElements]);
```

#### 2.3 ElementSprite 선택 시각화 최적화

**파일**: `apps/builder/src/builder/workspace/canvas/sprites/ElementSprite.tsx`

- `isSelected` 변경 시 PixiJS tint만 변경 (리렌더링 없이)
- 선택 테두리는 SelectionLayer에서만 렌더링

---

### Phase 3: 인스펙터 패널 최적화

**목표**: 232ms → < 50ms

#### 3.1 인스펙터 업데이트 디바운스

**파일**: `src/builder/sidebar/index.tsx`

```typescript
import { TIMING } from '../constants/timing';
import { useDebouncedCallback } from 'use-debounce';

// 명시적 debounce - 예측 가능하고 테스트 용이
const [inspectorElementId, setInspectorElementId] = useState<string | null>(null);

const debouncedUpdateInspector = useDebouncedCallback(
  (elementId: string | null) => {
    setInspectorElementId(elementId);
  },
  TIMING.INSPECTOR_DEBOUNCE
);

// 선택 변경 시
useEffect(() => {
  debouncedUpdateInspector(selectedElementId);
}, [selectedElementId]);
```

#### 3.2 섹션 조건부 렌더링

**파일**: `src/builder/inspector/InspectorPanel.tsx`

```typescript
// 접힌 섹션은 렌더링하지 않음
{isTransformExpanded && <TransformSection />}
{isLayoutExpanded && <LayoutSection />}
{isAppearanceExpanded && <AppearanceSection />}
```

#### 3.3 입력 필드 로컬 상태

```typescript
// Before: 직접 store 업데이트
const handleChange = (value) => {
  updateElementProps(elementId, { style: { width: value } });
};

// After: 로컬 상태 + 디바운스된 store 업데이트
const [localValue, setLocalValue] = useState(value);
const debouncedUpdate = useDebouncedCallback((v) => {
  updateElementProps(elementId, { style: { width: v } });
}, 150);

const handleChange = (value) => {
  setLocalValue(value); // 즉시 반영
  debouncedUpdate(value); // 지연 저장
};
```

---

### Phase 4: Long Task 분할

**목표**: 870ms → 여러 개의 < 50ms 작업

#### 4.1 Yoga 레이아웃 계산 분할

**파일**: `apps/builder/src/builder/workspace/canvas/layout/calculateLayout.ts`

```typescript
// Before: 동기 계산
const layoutResult = calculateLayout(elements, pageId);

// After: 청크 분할 + scheduler
async function calculateLayoutAsync(elements, pageId) {
  const chunks = chunkArray(elements, 50);
  const results = [];

  for (const chunk of chunks) {
    await scheduler.yield(); // 또는 requestIdleCallback
    results.push(calculateChunk(chunk));
  }

  return mergeResults(results);
}
```

#### 4.2 Store 업데이트 배치 처리

**파일**: `src/builder/stores/elements.ts`

```typescript
import { unstable_batchedUpdates } from 'react-dom';

// 여러 업데이트를 단일 배치로
unstable_batchedUpdates(() => {
  setSelectedElement(elementId);
  setSelectedElementProps(props);
  updateInspectorState(state);
});
```

---

### Phase 5: 캔버스 렌더링 최적화

**목표**: 전반적 FPS 향상

#### 5.1 동적 해상도 조정

**파일**: `apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx`

```typescript
// 드래그/줌 중에는 해상도 낮춤
const [resolution, setResolution] = useState(window.devicePixelRatio);

useEffect(() => {
  if (isDragging || isZooming) {
    setResolution(1); // 낮은 해상도
  } else {
    setResolution(Math.max(window.devicePixelRatio, 2)); // 고해상도 복원
  }
}, [isDragging, isZooming]);
```

#### 5.2 WebGL 컨텍스트 최적화

**파일**: `apps/builder/src/builder/workspace/canvas/pixiSetup.ts`

```typescript
// Application 생성 시 최적화 옵션
const app = new Application({
  powerPreference: 'high-performance',
  antialias: !isLowEndDevice(),
  resolution: dynamicResolution,
});
```

---

## 4. 수정 대상 파일 목록

### Phase 1 (드래그)
- `apps/builder/src/builder/workspace/canvas/selection/useDragInteraction.ts`
- `apps/builder/src/builder/workspace/canvas/selection/SelectionBox.tsx`
- `apps/builder/src/builder/workspace/canvas/selection/DragPreview.tsx` (신규)

### Phase 2 (선택 렌더링)
- `apps/builder/src/builder/workspace/canvas/selection/SelectionLayer.tsx`
- `apps/builder/src/builder/workspace/canvas/sprites/ElementSprite.tsx`
- `src/builder/stores/selection.ts`

### Phase 3 (인스펙터)
- `src/builder/sidebar/index.tsx`
- `src/builder/inspector/InspectorPanel.tsx`
- `src/builder/inspector/components/*.tsx`

### Phase 4 (Long Task)
- `apps/builder/src/builder/workspace/canvas/layout/calculateLayout.ts`
- `apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx`
- `src/builder/stores/elements.ts`

### Phase 5 (캔버스)
- `apps/builder/src/builder/workspace/canvas/pixiSetup.ts`

---

## 5. 예상 결과

| Phase | 작업 | 현재 | 목표 | 예상 개선율 |
|-------|------|------|------|------------|
| Phase 1 | 드래그 최적화 | 1,239ms | 80ms | 93% |
| Phase 2 | 선택 렌더링 | 177ms | 40ms | 77% |
| Phase 3 | 인스펙터 | 232ms | 50ms | 78% |
| Phase 4 | Long Task 분할 | 870ms | 50ms | 94% |
| Phase 5 | 캔버스 렌더링 | - | - | FPS 향상 |

---

## 6. 실행 순서 및 일정

1. **Phase 1**: 드래그 최적화 (가장 심각, 최우선)
2. **Phase 2**: 선택 렌더링 최적화
3. **Phase 3**: 인스펙터 패널 최적화
4. **Phase 4-5**: 병렬 진행 가능

---

## 7. 테스트 계획

각 Phase 완료 후:
1. 브라우저 Performance 탭에서 Long Task 측정
2. `scripts/perf-test-click.ts` 실행
3. Chrome DevTools Performance 프로파일링
4. 목표 수치 달성 여부 확인

---

## 8. 롤백 계획

각 Phase는 독립적으로 롤백 가능:
- Git branch 별도 관리
- Feature flag로 신규 코드 활성화/비활성화
