# WebGL 패널 토글 성능 최적화

> **상태**: 설계 완료, 구현 대기
> **작성일**: 2024-12-22
> **관련 파일**: `Workspace.tsx`, `BuilderCanvas.tsx`, `canvasSync.ts`

---

## 1. 문제 정의

### 1.1 증상

- 패널 토글 시 WebGL 모드에서 **100ms~300ms Long Task** 발생
- Chrome DevTools에서 `click handler took 170~185ms` 경고
- **iFrame 모드에서는 발생하지 않음** (WebGL 모드에서만)

### 1.2 사용자 영향

- 패널 열기/닫기 시 UI 응답 지연
- 부드러운 CSS transition이 끊기는 느낌

---

## 2. 근본 원인 분석

### 2.1 Long Task 발생 메커니즘

```
패널 토글 클릭
    ↓
레이아웃 폭 변화 (CSS transition)
    ↓
Workspace ResizeObserver 콜백 (동기 실행)
    ↓
setContainerSize() → React 렌더/커밋
    ↓
@pixi/react WebGL 트리 업데이트
    ↓
모든 작업이 같은 브라우저 task에 묶임 → Long Task
```

### 2.2 핵심 병목: React 구독을 통한 WebGL 트리 리렌더

| 파일 | ResizeObserver 위치 | 목적 |
|------|---------------------|------|
| `Workspace.tsx` | useEffect 내 | `containerSize` state 업데이트 |
| `BuilderCanvas.tsx` | `CanvasSmoothResizeBridge` 컴포넌트 | `app.renderer.resize()` 호출 |

**핵심 병목**:
- "옵저버 2개" 자체보다 **React state 구독으로 WebGL 트리 리렌더가 전파**되는 구조가 문제
- `useCanvasSyncStore((s) => s.containerSize)` 같은 React 구독이 @pixi/react 트리 업데이트를 유발
- **진짜로 제거해야 하는 것**: containerSize에 대한 React 컴포넌트 구독

### 2.3 iFrame에서 발생하지 않는 이유

- iFrame 내부 캔버스는 독립적인 DOM 트리
- WebGL 트리/@pixi/react 렌더링 경로가 없음
- 복잡한 요소 레이아웃 재계산이 없음

---

## 3. 이전 시도 및 실패 분석

| 시도 | 왜 실패했는가 |
|------|--------------|
| `requestIdleCallback` | WebGL resize만 지연, React 렌더/커밋은 여전히 동기 |
| `startTransition` | 우선순위만 낮춤, ResizeObserver 콜백 자체는 동기 |
| `subscribe` | Workspace의 `setContainerSize`가 여전히 React 리렌더링 유발 |
| `setTimeout/debounce` | 시각적 지연 발생 (깜빡임) |
| transition 이벤트 리스너 | 초기화 문제 발생 |

### 3.1 실패에서 얻은 교훈

1. **React state 업데이트는 피할 수 없는 비용** - ResizeObserver 콜백에서 state를 업데이트하면 React 리렌더링 발생
2. **비동기화만으로는 부족** - 클릭 이벤트와 같은 task에 묶이면 Long Task로 측정됨
3. **부작용 주의** - 최적화가 기존 동작을 깨뜨릴 수 있음

---

## 4. 추가 발견: 줌/팬 초기화 버그

### 4.1 현재 동작 (버그)

- 패널 resize 시 줌/팬이 초기화됨
- `containerSize` state 변경 → useEffect 트리거 → 줌/팬 재계산

### 4.2 정상 동작 (목표)

- 패널 resize 시 줌/팬 **유지**
- breakpoint 변경 시에만 줌/팬 초기화

---

## 5. 해결 방향

### 5.1 핵심 원칙

> **Workspace의 `containerSize` React state 업데이트를 패널 resize 시에는 제거**

### 5.2 방법: Ref + Zustand Store

1. `containerSize`를 React state → ref로 변경
2. canvasSync store에 `containerSize` 추가
3. % breakpoint일 때만 React state 업데이트
4. CanvasSmoothResizeBridge는 `subscribe`로 React 외부에서 처리

---

## 6. 구현 계획

### 6.1 수정 파일 요약

| 파일 | 변경 내용 |
|------|----------|
| `canvasSync.ts` | `containerSize` 필드/액션 추가 |
| `Workspace.tsx` | `containerSize` state → ref + 조건부 state |
| `BuilderCanvas.tsx` | `CanvasSmoothResizeBridge`를 subscribe 방식으로 변경 |

---

### 6.2 Phase별 구현 순서

#### Phase 1: canvasSync.ts - Store 확장 (의존성 없음)

**작업 내용**:
1. `containerSize` state 필드 추가
2. `setContainerSize` 액션 추가

**검증**:
- 타입 체크 통과
- 기존 기능 영향 없음 (추가만)

**롤백**: 이 파일만 revert

---

#### Phase 2: BuilderCanvas.tsx - Subscribe 패턴 전환

**선행 조건**: Phase 1 완료

**작업 내용**:
1. `CanvasSmoothResizeBridge` 내부 ResizeObserver 제거
2. `useCanvasSyncStore.subscribe()` 방식으로 변경
3. rAF 스로틀 + 동일값 Dedupe 적용
4. `containerEl` prop 제거

**검증**:
- 타입 체크 통과
- 캔버스 resize 동작 확인 (수동 테스트)
- React DevTools: containerSize 변경 시 CanvasSmoothResizeBridge 리렌더 없음

**롤백**: BuilderCanvas.tsx만 revert (Phase 1은 유지 가능)

---

#### Phase 3: Workspace.tsx - 핵심 최적화

**선행 조건**: Phase 1, 2 완료

**작업 내용**:
1. `containerSize` state → `containerSizeRef` 변경
2. `containerSizeForPercent` state 추가 (% breakpoint용)
3. `usesPercentBreakpointRef` 추가
4. ResizeObserver 콜백 수정:
   - `contentRect` 사용 (Forced Reflow 방지)
   - 동일값 Dedupe
   - store 업데이트 (`setContainerSize`)
   - 조건부 state 업데이트 (% breakpoint만)
5. 줌/팬 초기화 useEffect 수정:
   - `lastCenteredKeyRef` 가드 추가
   - 의존성에서 containerSize 제거
6. `zoomTo`, `zoomToFit` 함수: state → ref 참조로 변경
7. `canvasSize` useMemo: `containerSizeForPercent` 사용

**검증**:
- 타입 체크 통과
- 패널 토글 시 Long Task 경고 없음 (핵심 목표)
- 패널 resize 시 줌/팬 유지
- breakpoint 변경 시 줌/팬 초기화
- % breakpoint에서 canvasSize 정상 계산
- zoomTo, zoomToFit 정상 동작

**롤백**: Workspace.tsx만 revert

---

#### Phase 4: 통합 테스트 및 성능 측정

**작업 내용**:
1. 기능 테스트 (섹션 9.1 체크리스트)
2. 성능 메트릭 측정 (섹션 9.2)
3. React 구독 확인 (섹션 9.3)

**검증 기준**:
| 메트릭 | 목표 |
|--------|------|
| Long Task | 발생 안함 |
| React commit (패널 resize) | 0ms |
| renderer.resize 호출 | 토글당 1-3회 |

**실패 시**: Phase 3 → 2 → 1 순서로 롤백

---

### 6.3 코드 변경 상세: canvasSync.ts

```typescript
// State 추가
containerSize: { width: number; height: number };

// initialState
containerSize: { width: 0, height: 0 },

// Action
setContainerSize: (size) => set({ containerSize: size }),
```

### 6.4 코드 변경 상세: Workspace.tsx

**변경 전**:
```typescript
const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
```

**변경 후**:
```typescript
const containerSizeRef = useRef({ width: 0, height: 0 });
// % breakpoint용 state는 유지하되, 조건부로만 업데이트
const [containerSizeForPercent, setContainerSizeForPercent] = useState({ width: 0, height: 0 });
```

**ResizeObserver 콜백** (Forced Reflow 방지 + 동일값 Dedupe):
```typescript
// ⚠️ container.clientWidth/Height 직접 읽기는 Forced Reflow 유발
// ✅ ResizeObserverEntry.contentRect 사용으로 DOM 읽기 제거
// ✅ 동일값 Dedupe: 같은 크기면 store/state 업데이트 스킵

const lastSizeRef = useRef({ width: 0, height: 0 });

const resizeObserver = new ResizeObserver((entries) => {
  const entry = entries[0];
  if (!entry) return;

  // contentRect에서 크기 획득 (Forced Reflow 없음)
  const { width, height } = entry.contentRect;
  if (width <= 0 || height <= 0) return;

  // ✅ 동일값 Dedupe: 같은 크기면 모든 업데이트 스킵
  const last = lastSizeRef.current;
  if (last.width === width && last.height === height) return;
  lastSizeRef.current = { width, height };

  // ref 업데이트 (항상, 동기, 빠름)
  containerSizeRef.current = { width, height };

  // canvasSync store 업데이트 (항상, React 구독 없으면 빠름)
  useCanvasSyncStore.getState().setContainerSize({ width, height });

  // % breakpoint일 때만 React state 업데이트
  if (usesPercentBreakpointRef.current) {
    setContainerSizeForPercent({ width, height });
  }
});
```

**줌/팬 초기화 useEffect** (% breakpoint 엣지케이스 처리):
```typescript
// ⚠️ 문제: % breakpoint일 때 canvasSize가 패널 resize 중 계속 변함
// ⚠️ 추가 문제: breakpointId만 사용하면 "같은 ID지만 정의값이 변경된 경우" 미처리
// ✅ 해결: "id + 정의값" 조합 키로 1회만 센터링

const lastCenteredKeyRef = useRef<string | null>(null);

useEffect(() => {
  // ✅ 센터링 가드 키: breakpoint ID + 정의값 조합
  // 예: "bp-1:1920x1080" 또는 "bp-2:100%x100%"
  const breakpointKey = selectedBreakpoint
    ? `${selectedBreakpoint.id}:${selectedBreakpoint.max_width}x${selectedBreakpoint.max_height}`
    : null;

  // 같은 키면 센터링 스킵 (패널 resize로 인한 canvasSize 변화 무시)
  if (lastCenteredKeyRef.current === breakpointKey) return;
  lastCenteredKeyRef.current = breakpointKey;

  const { width, height } = containerSizeRef.current;
  if (width > 0 && height > 0) {
    // ... 줌/팬 초기화
  }
}, [selectedBreakpoint, canvasSize.width, canvasSize.height, setZoom, setPanOffset]);
```

**센터링 가드 키 설계 이유**:
- `breakpointId`만 사용 시: 같은 ID지만 정의값(max_width/max_height)이 외부에서 변경된 경우 센터링 안됨
- `id + 정의값` 조합: breakpoint 정의 자체가 변경되어도 정확히 1회 센터링 보장

**zoomTo, zoomToFit 함수**:
```typescript
// state 대신 ref 사용
const { width, height } = containerSizeRef.current;
```

### 6.5 코드 변경 상세: BuilderCanvas.tsx

```typescript
function CanvasSmoothResizeBridge() {
  const { app } = useApplication();

  useEffect(() => {
    if (!app?.renderer) return;

    // ⚠️ 문제: 패널 transition 동안 resize가 다발하면 GPU 리소스 재할당 비용 발생
    // ✅ 해결: rAF 1회/프레임 스로틀 + 동일값 Dedupe

    let rafId: number | null = null;
    let pendingSize: { width: number; height: number } | null = null;
    let lastAppliedSize = { width: 0, height: 0 }; // 동일값 Dedupe용

    const unsubscribe = useCanvasSyncStore.subscribe(
      (state) => state.containerSize,
      (size) => {
        if (size.width <= 0 || size.height <= 0) return;

        // 최신 크기 저장
        pendingSize = size;

        // 이미 예약된 rAF가 있으면 스킵 (1프레임에 1회만)
        if (rafId !== null) return;

        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (pendingSize && app.renderer) {
            // ✅ 동일값 Dedupe: 이미 적용된 크기와 같으면 resize 스킵
            if (
              lastAppliedSize.width === pendingSize.width &&
              lastAppliedSize.height === pendingSize.height
            ) {
              return;
            }
            lastAppliedSize = { ...pendingSize };
            app.renderer.resize(pendingSize.width, pendingSize.height);
          }
        });
      },
      { fireImmediately: true }
    );

    return () => {
      unsubscribe();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [app]);

  return null;
}
```

**호출 빈도 제어 전략**:
- `rAF 1회/프레임 스로틀`: 60fps 기준 최대 16.67ms당 1회
- transition 중 다발 호출 → 마지막 크기로 1회만 resize
- GPU 리소스 재할당/DPR 비용 최소화

**제거 항목**:
- `containerEl` prop
- 내부 ResizeObserver
- requestIdleCallback 로직
- lastSizeRef, pendingResizeRef, idleCallbackRef

---

## 7. 예상 효과

| 항목 | 변경 전 | 변경 후 |
|------|--------|--------|
| ResizeObserver 수 | 2개 | 1개 |
| 패널 resize 시 React 리렌더링 | 발생 | 발생 안함 (% breakpoint 아닌 경우) |
| 줌/팬 초기화 | 패널 resize마다 | breakpoint 변경 시에만 |
| WebGL resize | useEffect 트리거 | store subscribe (React 외부) |

---

## 8. 롤백 안전성

- 변경이 3개 파일에 국한됨
- canvasSync.ts는 추가만 (기존 코드 영향 없음)
- 문제 발생 시 3개 파일만 revert

---

## 9. 테스트 체크리스트

### 9.1 기능 테스트

- [ ] 패널 토글 시 Long Task 경고 없음
- [ ] 패널 resize 시 줌/팬 유지
- [ ] breakpoint 변경 시 줌/팬 초기화
- [ ] % breakpoint에서 canvasSize 정상 계산
- [ ] 요소 선택/드래그 정상 동작
- [ ] 초기 로드 시 깜빡임 없음
- [ ] zoomTo, zoomToFit 정상 동작

### 9.2 성능 메트릭 측정 (회귀 방지용)

> ⚠️ **주의**: `console.log`는 그 자체로 성능을 흔들 수 있음. 정확한 측정을 위해 `performance.mark/measure` API 또는 카운터 변수 사용 권장.

| 메트릭 | 측정 방법 | 목표 |
|--------|----------|------|
| ResizeObserver 콜백 횟수 | 카운터 변수 (let count = 0) | 토글당 10-15회 이하 |
| React commit 시간 | React DevTools Profiler | 패널 resize 시 0ms |
| renderer.resize 호출 횟수 | 카운터 변수 | 토글당 1-3회 이하 |
| renderer.resize 총 시간 | `performance.mark/measure` | 토글당 10ms 이하 |
| Long Task 발생 여부 | PerformanceObserver | 발생 안함 |

**측정 코드 예시**:
```typescript
// ❌ 잘못된 방법: console.log가 성능을 왜곡
console.log('resize called'); // 이 자체가 ~1ms 소요

// ✅ 올바른 방법: performance.mark/measure
performance.mark('resize-start');
app.renderer.resize(width, height);
performance.mark('resize-end');
performance.measure('resize-duration', 'resize-start', 'resize-end');

// 측정 후 결과 확인
const entries = performance.getEntriesByName('resize-duration');
console.log('Resize times:', entries.map(e => e.duration));
performance.clearMeasures('resize-duration');
```

### 9.3 핵심 확인 사항

- [ ] `useCanvasSyncStore((s) => s.containerSize)` 같은 React 구독이 없는지 확인
- [ ] containerSize 변경이 @pixi/react 트리 리렌더를 유발하지 않는지 확인

---

## 10. 플랜 B: 구조적 해결책 (UX 변경 감수)

현재 계획이 실패하거나 충분하지 않은 경우, 근본 원인을 구조적으로 제거하는 대안:

### 10.1 오버레이 레이아웃 (폭 불변)

**개념**: WebGL 모드에서 패널이 Workspace를 밀지 않고 오버레이로 뜨는 레이아웃

```
┌─────────────────────────────────────┐
│ Header                              │
├───────────────────────────────────┬─┤
│                                   │ │ ← 패널이 Canvas 위에 오버레이
│         Canvas (폭 불변)           │P│
│                                   │a│
│                                   │n│
│                                   │e│
│                                   │l│
└───────────────────────────────────┴─┘
```

**장점**:
- 패널 토글 시 Canvas 폭이 변하지 않음 → ResizeObserver 콜백 없음
- 근본 원인(resize 연쇄) 완전 제거
- CSS `position: absolute` + `z-index`로 간단 구현

**단점**:
- 캔버스 일부가 패널에 가려짐
- 기존 레이아웃과 UX 변경
- 사용자 혼란 가능성

**구현 난이도**: 낮음 (CSS 변경만)

### 10.2 적용 조건

- WebGL 모드에서만 오버레이 레이아웃 사용
- iFrame 모드는 기존 레이아웃 유지 (성능 문제 없음)
- 사용자 설정으로 선택 가능하게 할 수도 있음

---

## 11. PixiJS v8 Resize 관련 레퍼런스

### 11.1 Pixi 내장 ResizePlugin 분석

PixiJS v8은 `ResizePlugin`을 통해 권장 리사이즈 패턴을 제공:

```typescript
// 기본 패턴: resizeTo 옵션
await app.init({ resizeTo: window | HTMLElement });
// 또는 런타임에
app.resizeTo = containerRef.current;
```

**내부 구현** (`pixi.js/lib/app/ResizePlugin.js`):

| 메서드 | 동작 |
|--------|------|
| `resizeTo` 설정 시 | `globalThis.addEventListener("resize", ...)` 구독 |
| `queueResize()` | rAF로 다음 프레임에 1회만 resize 예약 (기존 예약 취소) |
| `resize()` | 크기 읽기 → `renderer.resize()` → `render()` 호출 |

**@pixi/react 지원**:
```tsx
<Application resizeTo={containerRef} />
```

### 11.2 핵심 한계: 윈도우 resize 이벤트만 감지

```
ResizePlugin 구현 (ResizePlugin.js:18):
  globalThis.addEventListener("resize", this.queueResize, false)
```

**문제**: 패널 토글처럼 **"윈도우 크기 불변 + 레이아웃만 변화"**는 감지 안됨

### 11.3 우리 접근법과 비교

| 항목 | Pixi ResizePlugin | 우리 구현 |
|------|-------------------|----------|
| **감지 방식** | window "resize" 이벤트 | ResizeObserver |
| **레이아웃 변화 감지** | ❌ 불가 | ✅ 가능 |
| **스로틀 방식** | `queueResize()` → rAF | rAF 1회/프레임 |
| **resize 호출** | `renderer.resize()` | `renderer.resize()` |
| **render 호출** | 자동 (`resize()` 내부) | @pixi/react가 처리 |

### 11.4 결론

> 💡 **Pixi 권장에 가장 가까운 대응**:
> - Pixi가 제공 안 하는 "레이아웃 변화 감지"를 **ResizeObserver로 보완**
> - 반영은 Pixi 방식처럼 **rAF 스로틀로 1프레임 1회**로 묶음
> - 동일값 Dedupe 추가로 불필요한 resize 스킵

우리 구현은 `ResizePlugin.queueResize()`와 동일한 스로틀 전략을 사용하면서, 윈도우 resize 이벤트의 한계를 ResizeObserver로 극복.

### 11.5 PixiJS v8 성능 개선 사항 (우리 최적화에 유리)

| 항목 | 설명 | 우리 최적화와의 관계 |
|------|------|---------------------|
| **Reactive Render Loop** | 변경된 요소만 업데이트 | resize 후 불필요한 전체 리렌더 방지 |
| **WebGL/WebGPU 듀얼 지원** | 같은 API로 두 렌더러 사용 가능 | 렌더러 타입 변경 시에도 코드 호환 |
| **cacheAsTexture()** | 정적 컨테이너를 텍스처로 캐싱 | resize 시 재렌더 비용 절감 가능 |

---

## 12. 참고 자료

### Web APIs
- [ResizeObserver API](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)
- [ResizeObserverEntry.contentRect](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserverEntry/contentRect)
- [Long Tasks API](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming)

### Zustand
- [Zustand subscribe](https://github.com/pmndrs/zustand#using-subscribe-for-side-effects)

### PixiJS v8 공식 문서
- [PixiJS v8 Renderers](https://pixijs.com/8.x/guides/components/renderers)
- [PixiJS v8 Performance Tips](https://pixijs.com/8.x/guides/concepts/performance-tips)
- [PixiJS v8 Launch Blog](https://pixijs.com/blog/pixi-v8-launches)

### PixiJS v8 소스 코드 (내부 구현 분석)
- `pixi.js/lib/app/ResizePlugin.js` - `queueResize()`, `resize()` 구현
- `pixi.js/lib/app/ResizePlugin.d.ts` - `resizeTo` 타입 정의
- `pixi.js/lib/app/ApplicationMixins.d.ts` - Application 믹스인 정의

### @pixi/react
- [@pixi/react README](https://github.com/pixijs/pixi-react) - `<Application resizeTo={...} />` 패턴
