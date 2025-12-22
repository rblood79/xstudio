# WebGL 패널 토글 성능 최적화 - 실행 계획 v3

> **상태**: 검토 완료, 실행 대기
> **작성일**: 2024-12-22
> **최종 수정**: 2024-12-22 (문제점 추가 발견)
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

## 1. 발견된 문제점 (총 5개)

### 문제 1: 초기 resize에 크기 비교 없음 ⭐ Critical

**파일**: `BuilderCanvas.tsx:269-270`

```typescript
const attach = () => {
  // ...
  // 🔴 크기 비교 없이 무조건 resize 호출!
  renderer.resize(containerEl.clientWidth, containerEl.clientHeight);
  lastSizeRef.current = { width, height };
};

// useEffect 의존성: [app, containerEl]
// app 또는 containerEl 변경 시 → attach() 재호출 → resize 호출
```

**영향**: useEffect 재실행 시 크기가 같아도 resize 호출됨

---

### 문제 2: 줌/팬 초기화 useEffect가 containerSize 의존

**파일**: `Workspace.tsx:134-154`

```typescript
useEffect(() => {
  if (containerSize.width > 0 && containerSize.height > 0) {
    // 줌/팬 초기화 (매번!)
    setZoom(fitZoom);
    setPanOffset({...});
  }
}, [
  canvasSize.width,
  canvasSize.height,
  containerSize.width,   // ← containerSize 변경 시 초기화!
  containerSize.height,
  setZoom,
  setPanOffset,
]);
```

**영향**: containerSize 변경 시 줌/팬이 매번 초기화됨

---

### 문제 3: clientWidth 직접 읽기 (Forced Reflow 가능)

**파일**: `Workspace.tsx:170-172`

```typescript
const updateSize = () => {
  const width = container.clientWidth;   // ← Forced Reflow
  const height = container.clientHeight;
  // ...
};
```

**영향**: ResizeObserver 콜백에서 Forced Reflow 발생 가능

---

### 문제 4: 이중 ResizeObserver

| 파일 | 관찰 대상 | 목적 |
|------|----------|------|
| `Workspace.tsx:192` | `.workspace` | containerSize state 업데이트 |
| `BuilderCanvas.tsx:312` | `.canvas-container` | renderer.resize() 호출 |

**영향**: 두 observer가 동시에 동작하며 리소스 낭비

---

### 문제 5: ResizeObserver 콜백에서 scheduleIdleResize 호출

**파일**: `BuilderCanvas.tsx:297-310`

```typescript
observer = new ResizeObserver((entries) => {
  const { width, height } = entry.contentRect;

  // 크기 비교
  const prev = lastSizeRef.current;
  if (prev && prev.width === width && prev.height === height) return;

  // 🔴 크기가 다르면 resize 예약
  scheduleIdleResize();
});
```

**문제**: 패널이 오버레이인데 왜 크기가 다른가?
- 가능성 1: 서브픽셀 차이
- 가능성 2: 브라우저 레이아웃 재계산 시 미세한 변화
- 가능성 3: CSS 변수 변화

---

## 2. 해결 방향

### 핵심 원칙

```
패널이 Canvas 위에 오버레이
    ↓
패널 토글 시 Canvas 크기 불변
    ↓
resize 호출 불필요
    ↓
resize 0회 달성
```

---

## Phase 1: canvasSync Store 확장

### 1.1 목적

containerSize를 React state 대신 Zustand store로 관리하여 React 리렌더링 최소화

### 1.2 변경 파일

`src/builder/workspace/canvas/canvasSync.ts`

### 1.3 변경 내용

```typescript
// State 타입 추가
containerSize: { width: number; height: number };

// Initial state
containerSize: { width: 0, height: 0 },

// Action 추가
setContainerSize: (size: { width: number; height: number }) => void;

// 구현
setContainerSize: (size) => {
  set({ containerSize: size });
},
```

### 1.4 체크리스트

- [ ] CanvasSyncState interface에 containerSize 추가
- [ ] initialState에 containerSize 추가
- [ ] setContainerSize 액션 추가
- [ ] 타입 체크 통과

---

## Phase 2: Workspace.tsx 최적화

### 2.1 목적

- containerSize React state 제거
- 줌/팬 초기화를 breakpoint 변경 시에만 실행
- Forced Reflow 방지

### 2.2 변경 사항

#### 2.2.1 containerSize 관리 방식 변경

```typescript
// 기존
const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

// 변경
const containerSizeRef = useRef({ width: 0, height: 0 });
const [containerSizeForPercent, setContainerSizeForPercent] = useState({ width: 0, height: 0 });
const usesPercentBreakpointRef = useRef(false);
```

#### 2.2.2 ResizeObserver 콜백 최적화

```typescript
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  let rafId: number | null = null;

  const resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;

    // ✅ contentRect 사용 (Forced Reflow 방지)
    const { width, height } = entry.contentRect;
    if (width <= 0 || height <= 0) return;

    // ✅ 동일값 스킵
    const prev = containerSizeRef.current;
    if (prev.width === width && prev.height === height) return;

    // ✅ RAF 스로틀
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;

      // ref 업데이트 (React 리렌더 없음)
      containerSizeRef.current = { width, height };

      // store 업데이트
      useCanvasSyncStore.getState().setContainerSize({ width, height });

      // % breakpoint일 때만 React state 업데이트
      if (usesPercentBreakpointRef.current) {
        setContainerSizeForPercent({ width, height });
      }
    });
  });

  resizeObserver.observe(container);

  return () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    resizeObserver.disconnect();
  };
}, []);
```

#### 2.2.3 줌/팬 초기화 보호

```typescript
const lastCenteredKeyRef = useRef<string | null>(null);

useEffect(() => {
  // breakpoint ID + 정의값 조합 키
  const breakpointKey = selectedBreakpoint
    ? `${selectedBreakpoint.id}:${selectedBreakpoint.max_width}x${selectedBreakpoint.max_height}`
    : null;

  // 같은 키면 센터링 스킵 (패널 resize 무시)
  if (lastCenteredKeyRef.current === breakpointKey) return;
  lastCenteredKeyRef.current = breakpointKey;

  // ... 줌/팬 초기화
}, [selectedBreakpoint, canvasSize.width, canvasSize.height, setZoom, setPanOffset]);
```

### 2.3 체크리스트

- [ ] containerSize useState → useRef로 변경
- [ ] containerSizeForPercent state 추가 (% breakpoint용)
- [ ] usesPercentBreakpointRef 추가
- [ ] ResizeObserver 콜백에서 contentRect 사용
- [ ] 줌/팬 초기화 useEffect에 lastCenteredKeyRef 가드 추가
- [ ] zoomTo, zoomToFit 함수에서 ref 사용

---

## Phase 3: BuilderCanvas.tsx 리팩토링 ⭐ 핵심

### 3.1 목적

- **초기 resize에 크기 비교 추가** (문제 1 해결)
- ResizeObserver 제거, Zustand subscribe로 변경
- 패널 토글 시 resize 0회 달성

### 3.2 CanvasSmoothResizeBridge 완전 리팩토링

```typescript
function CanvasSmoothResizeBridge() {
  const { app } = useApplication();
  const lastSizeRef = useRef<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!app?.renderer) return;

    const renderer = app.renderer;

    // ✅ 초기 크기 동기화 (크기 비교 포함!)
    const applyResizeIfNeeded = (width: number, height: number) => {
      if (width <= 0 || height <= 0) return;

      // ✅ 크기 비교 - 같으면 스킵
      const prev = lastSizeRef.current;
      if (prev && prev.width === width && prev.height === height) return;

      lastSizeRef.current = { width, height };
      renderer.resize(width, height);
    };

    // 초기 동기화
    const initialSize = useCanvasSyncStore.getState().containerSize;
    if (initialSize.width > 0 && initialSize.height > 0) {
      applyResizeIfNeeded(initialSize.width, initialSize.height);
    }

    // ✅ Zustand subscribe (React 외부에서 처리)
    const unsubscribe = useCanvasSyncStore.subscribe(
      (state) => state.containerSize,
      (size) => {
        applyResizeIfNeeded(size.width, size.height);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [app]);

  return null;
}
```

### 3.3 제거 항목

```diff
- containerEl prop
- 내부 ResizeObserver
- requestIdleCallback 로직
- setTimeout polyfill
- pendingResizeRef, idleCallbackRef
- attach() 함수
```

### 3.4 컴포넌트 호출 변경

```diff
- <CanvasSmoothResizeBridge containerEl={containerEl} />
+ <CanvasSmoothResizeBridge />
```

### 3.5 체크리스트

- [ ] CanvasSmoothResizeBridge에서 containerEl prop 제거
- [ ] 내부 ResizeObserver 제거
- [ ] Zustand subscribe 패턴 적용
- [ ] 초기 resize에 크기 비교 추가
- [ ] requestIdleCallback 로직 제거
- [ ] attach() 함수 제거

---

## Phase 4: 통합 테스트

### 4.1 기능 테스트

- [ ] 패널 토글 시 resize 호출 0회 확인
- [ ] 패널 토글 시 줌/팬 유지
- [ ] breakpoint 변경 시 줌/팬 초기화
- [ ] % breakpoint에서 canvasSize 정상 계산
- [ ] 윈도우 resize 시 정상 동작
- [ ] 초기 로드 시 정상 동작

### 4.2 성능 테스트

```typescript
// 테스트 코드
console.log('[RESIZE] before:', lastSizeRef.current);
console.log('[RESIZE] after:', { width, height });
console.log('[RESIZE] skipped:', prev?.width === width && prev?.height === height);
```

| 메트릭 | Before | After (목표) |
|--------|--------|--------------|
| 패널 토글 시 resize | 10-20회 | **0회** |
| Long Task | 150ms+ | **없음** |
| 줌/팬 초기화 | 매번 | breakpoint 변경 시만 |

---

## 3. 예상 효과

| 항목 | 변경 전 | 변경 후 |
|------|--------|--------|
| ResizeObserver 수 | 2개 | 1개 (Workspace만) |
| 패널 토글 시 resize | 10-20회 | **0회** |
| 패널 토글 시 줌/팬 | 초기화됨 | **유지** |
| React 리렌더링 | containerSize 변경마다 | % breakpoint만 |
| Forced Reflow | 발생 가능 | **없음** |

---

## 4. 구현 순서

| 순서 | Phase | 파일 | 의존성 |
|------|-------|------|--------|
| 1 | Phase 1 | canvasSync.ts | 없음 |
| 2 | Phase 2 | Workspace.tsx | Phase 1 |
| 3 | Phase 3 | BuilderCanvas.tsx | Phase 1, 2 |
| 4 | Phase 4 | 테스트 | 모두 |

---

## 5. 롤백 전략

| Phase | 롤백 조건 | 롤백 액션 |
|-------|----------|----------|
| 1 | 타입 에러 | canvasSync.ts revert |
| 2 | 줌/팬 이상 | Workspace.tsx revert |
| 3 | resize 이상 | BuilderCanvas.tsx revert |

---

## 6. 핵심 변경 요약

```
문제: 패널 오버레이인데 resize 호출됨
    ↓
원인 1: 초기 resize에 크기 비교 없음 (attach 함수)
원인 2: containerSize 변경 시 줌/팬 초기화
원인 3: 이중 ResizeObserver
    ↓
해결:
1. 초기 resize에 크기 비교 추가
2. 줌/팬 초기화를 breakpoint 변경 시만
3. BuilderCanvas의 ResizeObserver 제거 → Zustand subscribe
    ↓
결과: 패널 토글 시 resize 0회
```
