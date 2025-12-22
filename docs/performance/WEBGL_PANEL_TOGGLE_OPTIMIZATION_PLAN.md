# WebGL 패널 토글 성능 최적화 - 실행 계획 v2

> **상태**: 검토 완료, 실행 대기
> **작성일**: 2024-12-22
> **관련 문서**: `11-canvas-resize-optimization.md`, `WEBGL_PANEL_TOGGLE_OPTIMIZATION.md`

---

## 0. 근본 원인 (확정)

### 0.1 검증된 원인

| 원인 | 파일 | 문제점 | 영향도 |
|------|------|--------|--------|
| **1. renderer.resize()** | `BuilderCanvas.tsx:244-327` | GPU 버퍼 재할당 → 150ms+ Long Task | **Critical** |
| **2. React state 구독** | `Workspace.tsx:75` | `containerSize` useState → @pixi/react 전체 리렌더 | **High** |
| **3. 이중 ResizeObserver** | 두 파일 모두 | 동기 작업 중첩, 리소스 낭비 | **Medium** |

### 0.2 검증 방법

```
canvas 영역 display:none 설정 → 성능 저하 없음
renderer.resize() 주석 처리 → 성능 저하 없음
→ renderer.resize()가 직접적인 원인
```

### 0.3 현재 상태 확인

- [x] `Workspace.css`: `position: fixed` 이미 적용 ✅
- [ ] `Workspace.tsx`: containerSize useState 사용 중 ❌
- [ ] `BuilderCanvas.tsx`: requestIdleCallback + setTimeout polyfill 사용 중 ❌
- [ ] `canvasSync.ts`: containerSize 필드 없음 ❌

---

## Phase 1: canvasSync Store 확장

### 1.1 목적

containerSize를 React 외부(Zustand)에서 관리할 기반 마련

### 1.2 변경 파일

`src/builder/workspace/canvas/canvasSync.ts`

### 1.3 변경 내용

```typescript
// State 타입 추가 (CanvasSyncState interface)
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

### 1.4 완성도 검토

| 항목 | 상태 | 비고 |
|------|------|------|
| 타입 안전성 | ✅ | TypeScript interface 확장 |
| 기존 코드 영향 | ✅ 없음 | 추가만, 수정 없음 |
| 초기값 | ✅ | `{ width: 0, height: 0 }` |
| 롤백 용이성 | ✅ | 파일 1개만 revert |

### 1.5 엣지 케이스

- **Q**: 초기 로드 시 containerSize가 0,0인 경우?
- **A**: 기존 동작과 동일. ResizeObserver가 첫 콜백에서 업데이트.

---

## Phase 2: Workspace.tsx 최적화

### 2.1 목적

- React state 구독으로 인한 리렌더링 제거
- 패널 resize 시 줌/팬 유지

### 2.2 변경 파일

`src/builder/workspace/Workspace.tsx`

### 2.3 핵심 변경 사항

#### 2.3.1 containerSize 관리 방식 변경

```typescript
// 기존: React state (매번 리렌더)
const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

// 변경: ref + store (React 리렌더 없음)
const containerSizeRef = useRef({ width: 0, height: 0 });

// % breakpoint용 state (조건부 업데이트)
const [containerSizeForPercent, setContainerSizeForPercent] = useState({ width: 0, height: 0 });

// % breakpoint 사용 여부 추적
const usesPercentBreakpointRef = useRef(false);
```

#### 2.3.2 ResizeObserver 콜백 최적화

```typescript
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  let rafId: number | null = null;
  const lastSizeRef = { width: 0, height: 0 };

  const resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;

    // ✅ contentRect 사용 (Forced Reflow 방지)
    const { width, height } = entry.contentRect;
    if (width <= 0 || height <= 0) return;

    // ✅ 동일값 스킵
    if (lastSizeRef.width === width && lastSizeRef.height === height) return;
    lastSizeRef.width = width;
    lastSizeRef.height = height;

    // ✅ RAF 스로틀 (1프레임에 1회)
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;

      // ref 업데이트 (항상, React 리렌더 없음)
      containerSizeRef.current = { width, height };

      // store 업데이트 (React 구독 없으면 빠름)
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

#### 2.3.3 % breakpoint 감지

```typescript
// canvasSize useMemo 내부 또는 별도 useEffect
useEffect(() => {
  if (!breakpoint || !breakpoints || breakpoints.length === 0) {
    usesPercentBreakpointRef.current = false;
    return;
  }

  const selectedId = Array.from(breakpoint)[0] as string;
  const selectedBreakpoint = breakpoints.find((bp) => bp.id === selectedId);

  if (!selectedBreakpoint) {
    usesPercentBreakpointRef.current = false;
    return;
  }

  const widthStr = String(selectedBreakpoint.max_width);
  const heightStr = String(selectedBreakpoint.max_height);
  usesPercentBreakpointRef.current = widthStr.includes('%') || heightStr.includes('%');
}, [breakpoint, breakpoints]);
```

#### 2.3.4 canvasSize 계산 수정

```typescript
const canvasSize = useMemo(() => {
  // ... 기존 로직

  // % breakpoint일 때만 containerSizeForPercent 사용
  const containerDimension = usesPercentBreakpointRef.current
    ? containerSizeForPercent
    : containerSizeRef.current;

  const parseSize = (value: string | number, dimension: number): number => {
    // ... 기존 로직
  };

  return {
    width: parseSize(selectedBreakpoint.max_width, containerDimension.width),
    height: parseSize(selectedBreakpoint.max_height, containerDimension.height),
  };
}, [breakpoint, breakpoints, containerSizeForPercent]);
```

#### 2.3.5 줌/팬 초기화 보호

```typescript
const lastCenteredKeyRef = useRef<string | null>(null);

useEffect(() => {
  // 센터링 가드 키: breakpoint ID + 정의값 조합
  const breakpointKey = selectedBreakpoint
    ? `${selectedBreakpoint.id}:${selectedBreakpoint.max_width}x${selectedBreakpoint.max_height}`
    : null;

  // 같은 키면 센터링 스킵 (패널 resize 무시)
  if (lastCenteredKeyRef.current === breakpointKey) return;
  lastCenteredKeyRef.current = breakpointKey;

  const { width, height } = containerSizeRef.current;
  if (width > 0 && height > 0) {
    // 줌/팬 초기화 로직
    const scaleX = width / canvasSize.width;
    const scaleY = height / canvasSize.height;
    const fitZoom = Math.min(scaleX, scaleY) * 0.9;

    setZoom(fitZoom);
    setPanOffset({
      x: (width - canvasSize.width * fitZoom) / 2,
      y: (height - canvasSize.height * fitZoom) / 2,
    });
  }
}, [selectedBreakpoint, canvasSize.width, canvasSize.height, setZoom, setPanOffset]);
```

#### 2.3.6 zoomTo, zoomToFit 함수 수정

```typescript
const zoomTo = useCallback((level: number) => {
  // state 대신 ref 사용
  const { width, height } = containerSizeRef.current;
  if (width === 0 || height === 0) {
    setZoom(level);
    return;
  }
  // ... 나머지 로직
}, [zoom, panOffset, setZoom, setPanOffset]);

const zoomToFit = useCallback(() => {
  // state 대신 ref 사용
  const { width, height } = containerSizeRef.current;
  if (width === 0 || height === 0) return;
  // ... 나머지 로직
}, [canvasSize, setZoom, setPanOffset]);
```

### 2.4 완성도 검토

| 항목 | 상태 | 비고 |
|------|------|------|
| React 리렌더 제거 | ✅ | % breakpoint 아닌 경우 0회 |
| % breakpoint 지원 | ✅ | 조건부 state 업데이트 |
| 줌/팬 유지 | ✅ | breakpoint 변경 시에만 초기화 |
| Forced Reflow 방지 | ✅ | contentRect 사용 |
| 초기 로드 | ✅ | 첫 ResizeObserver 콜백에서 정상 동작 |
| 윈도우 resize | ✅ | ResizeObserver가 감지 |

### 2.5 엣지 케이스

| 케이스 | 처리 방법 |
|--------|----------|
| 초기 로드 시 containerSize 0,0 | ResizeObserver 첫 콜백에서 업데이트 |
| % → px breakpoint 전환 | usesPercentBreakpointRef 업데이트, 다음 resize에서 state 업데이트 안함 |
| px → % breakpoint 전환 | usesPercentBreakpointRef 업데이트, 다음 resize에서 state 업데이트 |
| breakpoint 정의 자체 변경 | lastCenteredKeyRef에 정의값 포함하여 센터링 1회 보장 |

---

## Phase 3: BuilderCanvas.tsx 리팩토링

### 3.1 목적

- setTimeout/requestIdleCallback 제거
- React 구독 대신 Zustand subscribe 패턴 사용
- **RAF + Settle Detection**으로 transition 중 resize 방지

### 3.2 변경 파일

`src/builder/workspace/canvas/BuilderCanvas.tsx`

### 3.3 핵심 변경 사항

#### 3.3.1 CanvasSmoothResizeBridge 완전 리팩토링

```typescript
/**
 * 🚀 RAF + Settle Detection Strategy
 *
 * setTimeout 없이 transition 종료 감지:
 * 1. ResizeObserver → containerSize 변경 감지
 * 2. pendingSize 업데이트 + lastChangeTime 기록
 * 3. RAF 루프에서 "마지막 변경 후 SETTLE_THRESHOLD(50ms) 경과" 체크
 * 4. 경과 시 resize 1회 실행
 *
 * transition 중: 크기가 계속 변하므로 settle 안됨 → resize 0회
 * transition 후: 크기 변화 멈춤 → 50ms 후 resize 1회
 */
function CanvasSmoothResizeBridge() {
  const { app } = useApplication();

  useEffect(() => {
    if (!app?.renderer) return;

    let settleCheckId: number | null = null;
    let pendingSize: { width: number; height: number } | null = null;
    let lastAppliedSize = { width: 0, height: 0 };
    let lastChangeTime = 0;

    const SETTLE_THRESHOLD = 50; // ms - 크기 변화 멈춤 감지 임계값

    const applyResize = () => {
      if (!pendingSize || !app.renderer) return;

      // 동일값 스킵
      if (lastAppliedSize.width === pendingSize.width &&
          lastAppliedSize.height === pendingSize.height) return;

      lastAppliedSize = { ...pendingSize };
      app.renderer.resize(pendingSize.width, pendingSize.height);
    };

    const scheduleSettleCheck = () => {
      if (settleCheckId !== null) cancelAnimationFrame(settleCheckId);

      settleCheckId = requestAnimationFrame(() => {
        const elapsed = performance.now() - lastChangeTime;

        if (elapsed >= SETTLE_THRESHOLD) {
          // 크기 변화가 멈춤 → resize 실행
          applyResize();
          settleCheckId = null;
        } else {
          // 아직 변화 중 → 다시 체크
          scheduleSettleCheck();
        }
      });
    };

    // ✅ Zustand subscribe (React 외부에서 처리)
    const unsubscribe = useCanvasSyncStore.subscribe(
      (state) => state.containerSize,
      (size) => {
        if (size.width <= 0 || size.height <= 0) return;

        pendingSize = size;
        lastChangeTime = performance.now();

        // settle 체크 시작/재시작
        scheduleSettleCheck();
      },
      { fireImmediately: true }
    );

    return () => {
      unsubscribe();
      if (settleCheckId !== null) cancelAnimationFrame(settleCheckId);
    };
  }, [app]);

  return null;
}
```

#### 3.3.2 제거 항목

```diff
- containerEl prop
- 내부 ResizeObserver
- requestIdleCallback 로직
- setTimeout polyfill (L256-258)
- lastSizeRef, pendingResizeRef, idleCallbackRef
```

#### 3.3.3 컴포넌트 호출 변경

```diff
- <CanvasSmoothResizeBridge containerEl={containerEl} />
+ <CanvasSmoothResizeBridge />
```

### 3.4 Settle Detection 동작 원리

```
패널 토글 클릭
    ↓
CSS transition 시작 (300ms)
    ↓
[매 프레임 ~60회]
ResizeObserver → Workspace → store.setContainerSize
    ↓
subscribe 콜백 호출
    ↓
pendingSize 업데이트 + lastChangeTime = now
    ↓
scheduleSettleCheck() 호출
    ↓
RAF 콜백: elapsed < 50ms → 다시 scheduleSettleCheck()
    ↓
[transition 중에는 계속 변경 발생 → lastChangeTime 갱신 → settle 안됨]
    ↓
transition 끝 (300ms 경과)
    ↓
크기 변화 멈춤
    ↓
RAF 콜백: elapsed >= 50ms → applyResize() 1회 실행
```

### 3.5 완성도 검토

| 항목 | 상태 | 비고 |
|------|------|------|
| setTimeout 제거 | ✅ | RAF만 사용 |
| transition 중 resize | ✅ 0회 | Settle Detection |
| transition 후 resize | ✅ 1회 | 50ms 후 실행 |
| 동일값 스킵 | ✅ | lastAppliedSize 비교 |
| 초기 로드 | ✅ | fireImmediately: true |
| 메모리 누수 방지 | ✅ | cleanup에서 unsubscribe + cancelAnimationFrame |

### 3.6 엣지 케이스

| 케이스 | 처리 방법 |
|--------|----------|
| 빠른 연속 토글 | 최신 pendingSize로 settle 후 resize |
| transition 중간에 취소 | 마지막 크기로 settle 후 resize |
| 윈도우 resize | 50ms settle 후 resize (transition과 동일) |
| WebGL context lost | app.renderer null 체크 |
| 컴포넌트 언마운트 | cleanup에서 정리 |

### 3.7 SETTLE_THRESHOLD 튜닝

| 값 | 장점 | 단점 |
|----|------|------|
| 16ms (1프레임) | 빠른 반응 | transition 중 resize 가능 |
| **50ms** | transition 안정적 감지 | 약간의 지연 |
| 100ms | 확실한 안정 | 체감 지연 |
| 300ms+ (transition 길이) | 확실히 transition 후 | 지연 체감됨 |

**50ms 선택 이유**: CSS transition(300ms) 중에는 16.67ms마다 크기 변경 → 50ms 동안 변경 없으면 transition 종료로 간주

---

## Phase 4: 통합 테스트 및 검증

### 4.1 기능 테스트 체크리스트

#### 4.1.1 패널 토글 테스트

- [ ] 좌측 패널 토글 → Long Task 없음
- [ ] 우측 패널 토글 → Long Task 없음
- [ ] 좌+우 패널 동시 토글 → Long Task 없음
- [ ] 하단 패널 토글 → Long Task 없음

#### 4.1.2 줌/팬 유지 테스트

- [ ] 패널 토글 후 줌 레벨 유지
- [ ] 패널 토글 후 팬 위치 유지
- [ ] breakpoint 변경 시 줌/팬 초기화
- [ ] 같은 breakpoint 재선택 시 줌/팬 유지

#### 4.1.3 % breakpoint 테스트

- [ ] 100%x100% breakpoint에서 패널 토글 → canvasSize 정상 계산
- [ ] px breakpoint → % breakpoint 전환 → 정상 동작
- [ ] % breakpoint → px breakpoint 전환 → 정상 동작

#### 4.1.4 기타 기능 테스트

- [ ] zoomTo (프리셋 선택) 정상 동작
- [ ] zoomToFit (Fit 버튼) 정상 동작
- [ ] 요소 선택/드래그 정상 동작
- [ ] 텍스트 편집 정상 동작
- [ ] 초기 로드 시 깜빡임 없음

### 4.2 성능 메트릭 측정

| 메트릭 | 측정 방법 | Before | After (목표) |
|--------|----------|--------|--------------|
| Long Task | PerformanceObserver | 발생 | **없음** |
| renderer.resize 호출 | 카운터 변수 | 10-20회/토글 | **1회/토글** |
| React commit (패널 resize) | React DevTools | 매번 | **0회** (% 아닌 경우) |
| 프레임 드랍 | DevTools Performance | 심각 | **없음** |

### 4.3 측정 코드

```typescript
// 성능 측정 (개발 환경에서만)
if (process.env.NODE_ENV === 'development') {
  performance.mark('resize-start');
  app.renderer.resize(width, height);
  performance.mark('resize-end');
  performance.measure('resize-duration', 'resize-start', 'resize-end');

  const entries = performance.getEntriesByName('resize-duration');
  console.log('[Resize]', entries[entries.length - 1]?.duration.toFixed(2), 'ms');
  performance.clearMeasures('resize-duration');
}
```

### 4.4 React 구독 확인

- [ ] `useCanvasSyncStore((s) => s.containerSize)` 형태의 React 구독이 없는지 확인
- [ ] containerSize 변경 시 @pixi/react 트리 리렌더가 없는지 React DevTools로 확인

---

## 5. 구현 순서

| 순서 | Phase | 의존성 | 롤백 영향 |
|------|-------|--------|----------|
| 1 | Phase 1 (canvasSync) | 없음 | 독립적 |
| 2 | Phase 2 (Workspace) | Phase 1 | Phase 1 유지 가능 |
| 3 | Phase 3 (BuilderCanvas) | Phase 1, 2 | Phase 1, 2 유지 가능 |
| 4 | Phase 4 (테스트) | 모두 | - |

---

## 6. 롤백 전략

| Phase | 롤백 조건 | 롤백 액션 |
|-------|----------|----------|
| 1 | 타입 에러 | `canvasSync.ts` revert |
| 2 | 줌/팬 동작 이상, % breakpoint 깨짐 | `Workspace.tsx` revert |
| 3 | Canvas resize 문제, 깜빡임 | `BuilderCanvas.tsx` revert |

---

## 7. 예상 효과

| 항목 | 변경 전 | 변경 후 |
|------|--------|--------|
| ResizeObserver 수 | 2개 | 1개 (Workspace만) |
| 패널 resize 시 React 리렌더 | 매번 | % breakpoint 아닌 경우 0회 |
| 줌/팬 초기화 | 패널 resize마다 | breakpoint 변경 시에만 |
| renderer.resize 트리거 | React useEffect | Zustand subscribe |
| transition 중 resize | 10-20회 | **0회** |
| transition 후 resize | - | **1회** (50ms settle) |
