# WebGL 패널 토글 성능 최적화 - 실행 계획 v4

> **상태**: ✅ 구현 완료
> **작성일**: 2024-12-22
> **최종 수정**: 2024-12-23 (구현 완료, 추가 기능 포함)
> **관련 문서**: `11-canvas-resize-optimization.md`, `WEBGL_PANEL_TOGGLE_OPTIMIZATION.md`

---

## 0. 근본 원인 (확정)

### 0.1 검증된 사실

| 테스트 | 결과 |
|--------|------|
| `renderer.resize()` 주석 처리 | 성능 저하 없음 ✅ |
| canvas `display:none` | 성능 저하 없음 ✅ |
| 패널이 Canvas 위에 오버레이 | **Canvas 크기 불변** |

→ **`renderer.resize()`가 불필요하게 호출되고 있음**

### 0.2 현재 레이아웃 구조

```
┌──────────────────────────────────────────────┐
│        Workspace (position: fixed, 100vw)    │  ← 패널과 무관
│  ┌─────────┐                    ┌─────────┐  │
│  │ Panel L │                    │ Panel R │  │  ← z-index 오버레이
│  │ z-index │                    │ z-index │  │
│  └─────────┘                    └─────────┘  │
└──────────────────────────────────────────────┘
```

**패널이 오버레이이므로 Canvas 크기는 변하지 않음 → resize 호출 불필요**

---

## 1. 발견된 문제점 (총 5개) - 모두 해결됨 ✅

### 문제 1: 초기 resize에 크기 비교 없음 ⭐ Critical ✅ 해결

**파일**: `BuilderCanvas.tsx`

**해결**: Zustand subscribe 패턴으로 변경, 크기 비교 로직 추가

---

### 문제 2: 줌/팬 초기화 useEffect가 containerSize 의존 ✅ 해결

**파일**: `Workspace.tsx`

**해결**: `lastCenteredKeyRef` 가드 추가, breakpoint 변경 시에만 초기화

---

### 문제 3: clientWidth 직접 읽기 (Forced Reflow 가능) ✅ 해결

**파일**: `Workspace.tsx`

**해결**: ResizeObserver의 `contentRect` 사용

---

### 문제 4: 이중 ResizeObserver ✅ 해결

**해결**: BuilderCanvas의 ResizeObserver 제거, Workspace만 유지

---

### 문제 5: ResizeObserver 콜백에서 scheduleIdleResize 호출 ✅ 해결

**해결**: Zustand subscribe 패턴으로 대체

---

## 2. 구현 완료 내역

### Phase 1: canvasSync Store 확장 ✅

**파일**: `src/builder/workspace/canvas/canvasSync.ts`

```typescript
// State 타입 추가
containerSize: { width: number; height: number };

// Initial state
containerSize: { width: 0, height: 0 },

// Action 추가
setContainerSize: (size: { width: number; height: number }) => void;
```

**체크리스트**:
- [x] CanvasSyncState interface에 containerSize 추가
- [x] initialState에 containerSize 추가
- [x] setContainerSize 액션 추가
- [x] 타입 체크 통과

---

### Phase 2: Workspace.tsx 최적화 ✅

**변경 사항**:

1. **containerSize 관리 방식 변경**
```typescript
// 기존
const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

// 변경
const containerSizeRef = useRef({ width: 0, height: 0 });
const [containerSizeForPercent, setContainerSizeForPercent] = useState({ width: 0, height: 0 });
const usesPercentBreakpointRef = useRef(false);
```

2. **ResizeObserver 콜백 최적화**
   - `contentRect` 사용 (Forced Reflow 방지)
   - 동일값 스킵
   - RAF 스로틀

3. **줌/팬 초기화 보호**
   - `lastCenteredKeyRef` 가드 추가
   - breakpoint 변경 시에만 초기화

**체크리스트**:
- [x] containerSize useState → useRef로 변경
- [x] containerSizeForPercent state 추가 (% breakpoint용)
- [x] usesPercentBreakpointRef 추가
- [x] ResizeObserver 콜백에서 contentRect 사용
- [x] 줌/팬 초기화 useEffect에 lastCenteredKeyRef 가드 추가
- [x] zoomTo, zoomToFit 함수에서 ref 사용

---

### Phase 3: BuilderCanvas.tsx 리팩토링 ✅

**변경 사항**:

1. **CanvasSmoothResizeBridge 리팩토링**
   - containerEl prop 제거
   - ResizeObserver 제거 → Zustand subscribe 패턴
   - 크기 비교 로직 추가

2. **제거된 항목**:
   - containerEl prop
   - 내부 ResizeObserver
   - requestIdleCallback 로직
   - attach() 함수

**체크리스트**:
- [x] CanvasSmoothResizeBridge에서 containerEl prop 제거
- [x] 내부 ResizeObserver 제거
- [x] Zustand subscribe 패턴 적용
- [x] 초기 resize에 크기 비교 추가

---

## 3. 추가 구현 기능

### 3.1 Fit 모드 추적 (리사이즈 시 center 유지) ✅

**파일**: `Workspace.tsx`

**목적**: zoom이 100% fit 상태일 때 브라우저 리사이즈 시 center 유지

**구현**:
```typescript
// Fit 모드 추적 ref
const isFitModeRef = useRef(true); // 초기 로드 시 fit 모드로 시작

// zoomTo() - 수동 zoom 변경 시 fit 모드 해제
const zoomTo = useCallback((level: number) => {
  isFitModeRef.current = false;
  // ...
}, [...]);

// zoomToFit() - Fit 버튼 클릭 시 fit 모드 활성화
const zoomToFit = useCallback(() => {
  isFitModeRef.current = true;
  // ...
}, [...]);

// ResizeObserver - fit 모드일 때 센터링 재계산
if (isInitialLoad || isFitModeRef.current) {
  centerCanvasRef.current();
}
```

**동작 방식**:
- 초기 로드 → fit 모드 활성 → 리사이즈 시 center 유지
- Fit 버튼 (Scan 아이콘) 클릭 → fit 모드 활성 → 리사이즈 시 center 유지
- 수동 zoom 변경 (`+`, `-`, 프리셋) → fit 모드 해제 → 리사이즈 시 현재 위치 유지

---

### 3.2 Canvas 전체 그리드 (GridLayer 자체 구독) ✅

**파일**: `GridLayer.tsx`, `BuilderCanvas.tsx`

**목적**: 그리드를 page 내부가 아닌 canvas 전체에 표시, 성능 저하 없이

**구현**:

1. **GridLayer 자체 구독** (BuilderCanvas 리렌더링 방지)
```typescript
// GridLayer.tsx
const containerSize = useCanvasSyncStore((state) => state.containerSize);
const { width, height } = containerSize;
```

2. **Camera 밖으로 이동** (화면 고정)
```tsx
// BuilderCanvas.tsx
{/* Grid Layer - Camera 밖, 화면 고정 (자체 containerSize 구독) */}
{showGrid && (
  <GridLayer
    zoom={zoom}
    showGrid={showGrid}
    gridSize={gridSize}
  />
)}

{/* Camera/Viewport */}
<pixiContainer label="Camera" ref={cameraRef}>
  {/* ... */}
</pixiContainer>
```

3. **Props 변경**
```typescript
// 기존
interface GridLayerProps {
  width: number;
  height: number;
  zoom: number;
  // ...
}

// 변경 (width, height 제거)
interface GridLayerProps {
  zoom: number;
  showGrid?: boolean;
  showSnapGrid?: boolean;
  gridSize?: number;
  snapSize?: number;
}
```

---

### 3.3 그리드 중앙선 스타일 변경 ✅

**파일**: `GridLayer.tsx`

**변경 내용**:
```typescript
// 기존
const CENTER_LINE_COLOR = 0x94a3b8; // slate-400
const CENTER_LINE_ALPHA = 0.5;
const CENTER_LINE_WIDTH = 2;

// 변경
const CENTER_LINE_COLOR = 0x475569; // slate-600 (더 진한 색상)
const CENTER_LINE_ALPHA = 0.6;
const CENTER_LINE_WIDTH = 1;
```

---

## 4. 성능 테스트 결과

| 메트릭 | Before | After |
|--------|--------|-------|
| 패널 토글 시 resize | 10-20회 | **0회** ✅ |
| Long Task | 150ms+ | **없음** ✅ |
| 줌/팬 초기화 | 매번 | breakpoint 변경 시만 ✅ |
| GridLayer 리렌더링 | BuilderCanvas와 함께 | **독립적** ✅ |

---

## 5. 최종 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                      Workspace.tsx                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  ResizeObserver (contentRect)                           ││
│  │       ↓                                                 ││
│  │  containerSizeRef (React 리렌더 없음)                   ││
│  │       ↓                                                 ││
│  │  useCanvasSyncStore.setContainerSize()                  ││
│  │       ↓                                                 ││
│  │  isFitModeRef → centerCanvasRef.current() (조건부)      ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    canvasSync Store                         │
│  containerSize: { width, height }                           │
└─────────────────────────────────────────────────────────────┘
          ↓                              ↓
┌──────────────────────┐    ┌──────────────────────────────────┐
│   BuilderCanvas.tsx  │    │        GridLayer.tsx             │
│  ┌──────────────────┐│    │  ┌────────────────────────────┐  │
│  │CanvasSmoothResize││    │  │ 자체 구독 (isolated)       │  │
│  │Bridge (subscribe)││    │  │ containerSize → draw()     │  │
│  │  ↓               ││    │  └────────────────────────────┘  │
│  │ renderer.resize()││    └──────────────────────────────────┘
│  │ (크기 비교 후)   ││
│  └──────────────────┘│
└──────────────────────┘
```

---

## 6. 관련 커밋

- `ab170eeb` - Add fit mode tracking for resize centering and canvas-wide grid
- `095b2c7c` - Refactor Workspace and BuilderCanvas for optimized resize handling

---

## 7. 핵심 변경 요약

```
문제: 패널 오버레이인데 resize 호출됨 + 리사이즈 시 center 유실
    ↓
해결:
1. 초기 resize에 크기 비교 추가
2. 줌/팬 초기화를 breakpoint 변경 시만
3. BuilderCanvas의 ResizeObserver 제거 → Zustand subscribe
4. Fit 모드 추적 → 리사이즈 시 center 유지
5. GridLayer 자체 구독 → 성능 저하 없이 canvas 전체 그리드
    ↓
결과:
- 패널 토글 시 resize 0회 ✅
- Fit 모드에서 리사이즈 시 center 유지 ✅
- Canvas 전체 그리드 (성능 저하 없음) ✅
```
