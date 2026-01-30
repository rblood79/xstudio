# Canvas Scrollbar 설계 문서

> Figma 스타일 캔버스 스크롤바 — WebGL 캔버스 뷰포트 표시 및 이동

## 개요

### 목표
WebGL 캔버스(workspace) 우측과 하단에 Figma 스타일의 얇은 스크롤바를 추가하여:
1. 현재 뷰포트 위치를 시각적으로 표시
2. 스크롤바 thumb 드래그로 캔버스 이동
3. Track 클릭으로 뷰포트 점프

### 핵심 제약 조건

| 제약 | 설명 |
|------|------|
| **60fps 유지** | Pan/zoom 중 React 리렌더 없이 DOM 직접 조작 |
| **ViewportController 동기화** | Pan 드래그 중 Zustand store 미업데이트 → 별도 리스너 필요 |
| **패널 오버레이** | Workspace가 `position: fixed; inset`이고 패널이 오버레이 → 스크롤바 위치 동적 조정 |

### 관련 아키텍처

```
┌──────────────────────────────────────────────────────────────┐
│ Workspace (position: fixed, inset: 0)                        │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ BuilderCanvas (WebGL)                                     │ │
│ │   └─ Camera Container (zoom/pan 대상)                     │ │
│ │       ├─ BodyLayer                                        │ │
│ │       ├─ ElementsLayer                                    │ │
│ │       └─ SelectionLayer                                   │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ workspace-overlay (pointer-events: none)                  │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ CanvasScrollbar horizontal (bottom)          ← 신규       │ │
│ │ CanvasScrollbar vertical   (right)           ← 신규       │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
        ↑ aside.sidebar (왼쪽 패널, 오버레이)
        ↑ aside.inspector (오른쪽 패널, 오버레이)
```

---

## Phase 1: ViewportController 리스너 확장

### 배경

`ViewportController`는 Pan/Zoom 중 PixiJS Container를 직접 조작하며 React state(Zustand)를 업데이트하지 않습니다. 인터랙션 **종료** 시에만 `onStateSync` 콜백으로 Zustand store에 동기화합니다.

```
Pan 드래그 중:
  ViewportController.updatePan()
    → container.x/y 직접 조작 (React 리렌더 없음)
    → Zustand store 미업데이트
    → ❌ 스크롤바가 위치를 알 수 없음

Pan 종료:
  ViewportController.endPan()
    → onStateSync() → Zustand store 업데이트
    → ✅ 스크롤바 업데이트 가능 (하지만 너무 늦음)
```

### 해결: Update Listener 패턴

`ViewportController`에 옵저버 패턴을 추가하여 모든 상태 변경 시 외부 리스너에게 즉시 알림:

### 변경 파일

**`apps/builder/src/builder/workspace/canvas/viewport/ViewportController.ts`**

### 변경 내용

#### 1.1 새 멤버 변수

```typescript
// 기존 멤버 (isPanning, lastPanPoint) 아래에 추가
private updateListeners: Set<(state: ViewportState) => void> = new Set();
```

#### 1.2 새 메서드

```typescript
/**
 * 뷰포트 상태 변경 리스너 등록
 * 스크롤바 등 외부 컴포넌트가 pan/zoom 중 실시간으로 상태를 추적할 수 있게 함
 *
 * @returns cleanup 함수 (리스너 해제)
 */
addUpdateListener(listener: (state: ViewportState) => void): () => void {
  this.updateListeners.add(listener);
  return () => {
    this.updateListeners.delete(listener);
  };
}

/**
 * 모든 등록된 리스너에게 현재 상태 전달
 * pan/zoom/setPosition 호출 시 자동 실행
 */
private notifyUpdateListeners(): void {
  const state = this.currentState;
  for (const listener of this.updateListeners) {
    listener(state);
  }
}
```

#### 1.3 `notifyUpdateListeners()` 호출 위치

| 메서드 | 위치 | 트리거 상황 |
|--------|------|-------------|
| `updatePan()` | 메서드 끝 (`this.lastPanPoint = ...` 뒤) | Space+드래그 중 매 프레임 |
| `zoomAtPoint()` | 메서드 끝 (`this.currentState = ...` 뒤, syncImmediately 분기 밖) | Ctrl+휠 줌 |
| `setPosition()` | 메서드 끝 (`this.currentState = ...` 뒤) | 외부 상태 변경 (휠 팬, fit-to-screen 등) |

### 데이터 흐름 (변경 후)

```
Pan 드래그 중:
  ViewportController.updatePan()
    → container.x/y 직접 조작
    → notifyUpdateListeners() → 스크롤바에 즉시 알림
    → ✅ 스크롤바 실시간 업데이트

Ctrl+휠 줌:
  ViewportController.zoomAtPoint()
    → container.x/y/scale 직접 조작
    → notifyUpdateListeners() → 스크롤바에 즉시 알림
    → onStateSync() → Zustand store 동기화

휠 팬:
  useViewportControl handleWheel
    → ViewportController.setPosition() 호출
    → notifyUpdateListeners() → 스크롤바에 즉시 알림
    → setPanOffset() → Zustand store 동기화
```

### 성능 영향

- `notifyUpdateListeners()`는 단순 Set 순회 (O(n), n = 리스너 수 ≈ 2)
- 콜백 내부에서 실제 DOM 업데이트는 RAF로 throttle되므로 부하 없음
- 기존 코드 동작에 영향 없음 (순수 추가)

---

## Phase 2: World Bounds 계산

### 배경

스크롤바의 thumb 크기와 위치를 결정하려면 "전체 월드"의 범위를 알아야 합니다. Figma에서 스크롤바는 모든 콘텐츠 + 현재 뷰포트를 포함하는 가상의 "월드" 영역에 대한 비율로 표시됩니다.

### World Bounds 정의

```
World = union(
  Canvas 영역 (0,0 ~ canvasSize.width × canvasSize.height),
  모든 요소의 bounds 합집합,
  현재 Viewport 영역
) + 사방 500px 패딩
```

### 신규 파일

**`apps/builder/src/builder/workspace/scrollbar/calculateWorldBounds.ts`**

### 인터페이스

```typescript
export interface WorldBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;   // maxX - minX
  height: number;  // maxY - minY
}
```

### 함수 시그니처

```typescript
export function calculateWorldBounds(
  canvasSize: { width: number; height: number },
  viewportBounds: { x: number; y: number; width: number; height: number },
  padding?: number  // 기본값: 500
): WorldBounds
```

### 알고리즘

```
1. 초기값: min = (0, 0), max = (canvasSize.width, canvasSize.height)

2. ElementRegistry에서 모든 요소 ID 조회:
   for each id in getRegisteredElementIds():
     bounds = getElementBoundsSimple(id)
     if bounds:
       min = min(min, bounds.topLeft)
       max = max(max, bounds.bottomRight)

3. 현재 viewport 영역 포함:
   min = min(min, viewport.topLeft)
   max = max(max, viewport.bottomRight)

4. 패딩 추가:
   min -= padding
   max += padding

5. 반환: { minX, minY, maxX, maxY, width, height }
```

### 설계 결정

| 결정 | 이유 |
|------|------|
| **순수 함수** (React hook 아님) | RAF 콜백 내에서 직접 호출하기 위해 |
| **매 프레임 전체 재계산** | 요소 추가/삭제/이동 시 자동 반영, 캐싱 복잡도 회피 |
| **viewport 포함** | 사용자가 콘텐츠 밖으로 팬할 때도 스크롤바가 유효하게 |
| **500px 패딩** | 콘텐츠 경계 근처에서 자연스러운 여유 공간 |

### ElementRegistry 의존

```typescript
// elementRegistry.ts에서 사용하는 API:
getRegisteredElementIds(): string[]      // 모든 등록된 요소 ID
getElementBoundsSimple(id): ElementBounds | null  // 요소 bounds
```

- `getElementBoundsSimple()`은 `layoutBoundsRegistry` 우선 사용 (getBounds() 타이밍 문제 우회)
- ElementRegistry는 Module-level singleton Map이므로 import만으로 접근 가능

---

## Phase 3: CanvasScrollbar 컴포넌트

### 설계 원칙

```
🎯 핵심: React 리렌더 0회 (mount/unmount 제외)
- 모든 시각적 업데이트는 DOM 직접 조작
- useEffect 내부에서 리스너 등록 + 이벤트 바인딩
- Zustand subscribe + ViewportController listener로 변경 감지
```

### 신규 파일

**`apps/builder/src/builder/workspace/scrollbar/CanvasScrollbar.tsx`**

### 컴포넌트 인터페이스

```typescript
interface CanvasScrollbarProps {
  direction: 'horizontal' | 'vertical';
}
```

### 3.1 Viewport → World 좌표 변환

ViewportController의 `x`, `y`, `scale`에서 world 좌표계로 변환:

```
// ViewportController state: { x, y, scale }
// x, y = Camera Container의 화면상 위치 (pixel)
// scale = zoom level

// World 좌표로 변환:
viewportX = -state.x / state.scale    // 뷰포트 좌상단의 world X
viewportY = -state.y / state.scale    // 뷰포트 좌상단의 world Y
viewportW = containerSize.width / state.scale   // 뷰포트 너비 (world 단위)
viewportH = containerSize.height / state.scale  // 뷰포트 높이 (world 단위)
```

### 3.2 Thumb 크기 계산

```
trackLength = track DOM 요소의 clientWidth (horizontal) 또는 clientHeight (vertical)
worldSize = world.width (horizontal) 또는 world.height (vertical)
vpSize = viewportW (horizontal) 또는 viewportH (vertical)

thumbSize = max(30px, (vpSize / worldSize) × trackLength)
```

- 최소 30px: 너무 작아서 잡기 어려운 상황 방지
- 줌아웃 시 thumbSize 증가, 줌인 시 감소

### 3.3 Thumb 위치 계산

```
vpStart = viewportX - world.minX (horizontal) 또는 viewportY - world.minY (vertical)
scrollableWorld = worldSize - vpSize

ratio = vpStart / scrollableWorld    (0 ~ 1, clamp)
thumbPos = ratio × (trackLength - thumbSize)
```

- `ratio = 0`: 뷰포트가 world 시작 지점
- `ratio = 1`: 뷰포트가 world 끝 지점
- `scrollableWorld ≤ 0`: 뷰포트가 world보다 크면 ratio = 0 (스크롤 불필요)

### 3.4 DOM 업데이트 방식

```typescript
// Horizontal
thumb.style.width = `${thumbSize}px`;
thumb.style.transform = `translateX(${thumbPos}px)`;

// Vertical
thumb.style.height = `${thumbSize}px`;
thumb.style.transform = `translateY(${thumbPos}px)`;
```

- `transform` 사용: layout reflow 없이 GPU 가속 이동
- `will-change: transform` CSS로 compositing layer 생성

### 3.5 변경 감지 및 업데이트 스케줄링

두 소스에서 변경을 감지하고 RAF로 throttle:

```
소스 1: ViewportController.addUpdateListener()
  → pan 드래그, zoomAtPoint, setPosition 시 호출
  → React state 업데이트 없이 직접 호출됨

소스 2: useCanvasSyncStore.subscribe()
  → zoom, panOffset selector 구독
  → 외부 줌 변경 (버튼, fit-to-screen) 감지

두 소스 모두 → scheduleUpdate() 호출:
  if (rafId !== 0) return;  // 이미 예약됨
  rafId = requestAnimationFrame(() => {
    rafId = 0;
    updateThumb();   // DOM 업데이트
    showScrollbar();  // fade-in
  });
```

### 3.6 Thumb 드래그

```
1. thumb에 pointerdown 이벤트
   → e.preventDefault(), e.stopPropagation()
   → 드래그 시작 상태 캡처 (startPos, startViewportState)

2. window에 pointermove 이벤트
   → 마우스 delta → track 비율 변환 → world 이동량 계산
   → ViewportController.setPosition() 호출
   → useCanvasSyncStore.setPanOffset() 호출

3. window에 pointerup 이벤트
   → 드래그 종료, 리스너 해제
```

**드래그 좌표 변환 공식:**

```
delta = currentMousePos - startMousePos  (pixel, track 방향)

// Track 상의 비율 변환
scrollableTrack = trackLength - thumbSize
scrollableWorld = worldSize - vpSize
worldDelta = (delta / scrollableTrack) × scrollableWorld

// 새 pan offset 계산 (horizontal 예시)
newPanX = -(startViewportX + worldDelta) × scale
```

### 3.7 Track 클릭

```
1. track에 click 이벤트 (target이 thumb이면 무시)
2. 클릭 위치를 track 내 비율로 변환
3. 해당 비율의 world 좌표를 thumb 중앙으로 설정
4. ViewportController.setPosition() + setPanOffset() 호출
```

### 3.8 Fade 애니메이션

```
상태 변경 시:
  track.classList.add('canvas-scrollbar--visible')  → opacity: 1, pointer-events: auto
  fadeTimer = setTimeout(1000ms) → {
    if (!isDragging) {
      track.classList.remove('canvas-scrollbar--visible')  → opacity: 0
    }
  }

CSS:
  transition: opacity 0.2s ease
```

- 드래그 중에는 fade-out 방지 (`isDraggingRef` 체크)
- 초기 상태: `opacity: 0`, `pointer-events: none`

---

## Phase 4: 패널 오프셋 및 통합

### 4.1 패널 레이아웃 구조

```
┌───────────────────────────────────────────────────────────┐
│ Header (48px)                                              │
├──────┬────────────────────────────────────┬────────────────┤
│      │                                    │                │
│ side │         Workspace                  │   inspector    │
│ bar  │      (position: fixed,             │    (aside)     │
│(aside)│       top:48, inset:0)            │                │
│      │                                    │                │
│ ~288px│                                   │   ~233px       │
│      │                                    │                │
│      ├──────[H-Scrollbar]─────────────────┤                │
│      │                              [V]   │                │
└──────┴────────────────────────────────────┴────────────────┘
```

- Workspace: `position: fixed; top: 48px; left: 0; right: 0; bottom: 0`
- 패널은 CSS Grid (`aside.sidebar`, `aside.inspector`)로 오버레이
- 스크롤바는 Workspace 내부 `position: absolute`이므로 패널 뒤에 위치할 수 있음

### 4.2 패널 열림/닫힘 감지

`useStore`의 `panelLayout.showLeft` / `panelLayout.showRight` 구독:

```typescript
// useStore는 subscribeWithSelector 미사용 → 직접 비교
let prevShowLeft = useStore.getState().panelLayout.showLeft;
let prevShowRight = useStore.getState().panelLayout.showRight;

const unsubPanel = useStore.subscribe((state) => {
  const { showLeft, showRight } = state.panelLayout;
  if (showLeft !== prevShowLeft || showRight !== prevShowRight) {
    prevShowLeft = showLeft;
    prevShowRight = showRight;
    // 패널 애니메이션 후 측정 (200ms 대기)
    setTimeout(updatePanelOffset, 200);
  }
});
```

### 4.3 패널 너비 측정

패널 DOM 요소에서 직접 `offsetWidth` 측정:

```typescript
const updatePanelOffset = () => {
  const { panelLayout } = useStore.getState();

  if (isHorizontal) {
    const leftWidth = panelLayout.showLeft
      ? (document.querySelector('aside.sidebar') as HTMLElement)?.offsetWidth ?? 0
      : 0;
    const rightWidth = panelLayout.showRight
      ? (document.querySelector('aside.inspector') as HTMLElement)?.offsetWidth ?? 0
      : 0;
    track.style.left = `${leftWidth}px`;
    track.style.right = `${rightWidth}px`;
  } else {
    // vertical: right만 조정
    const rightWidth = panelLayout.showRight
      ? (document.querySelector('aside.inspector') as HTMLElement)?.offsetWidth ?? 0
      : 0;
    track.style.right = `${rightWidth}px`;
  }
};
```

### 4.4 스크롤바 위치 규칙

| 스크롤바 | 패널 열림 시 | 패널 닫힘 시 |
|----------|-------------|-------------|
| **Horizontal** | `left: sidebarWidth`, `right: inspectorWidth` | `left: 0`, `right: 0` |
| **Vertical** | `right: inspectorWidth` | `right: 0` |

- `bottom` 패널이 열리면 horizontal의 `bottom` 조정 필요 (향후 확장)

### 4.5 CSS 스타일 (CanvasScrollbar.css)

**신규 파일**: `apps/builder/src/builder/workspace/scrollbar/CanvasScrollbar.css`

```css
/* ============================================
 * Track (전체 영역)
 * ============================================ */
.canvas-scrollbar {
  position: absolute;
  z-index: 10;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.canvas-scrollbar--visible {
  opacity: 1;
  pointer-events: auto;
}

/* ============================================
 * 방향별 위치
 * left/right 값은 패널 상태에 따라 JS에서 동적 설정
 * ============================================ */
.canvas-scrollbar--horizontal {
  bottom: 0;
  left: 0;        /* JS에서 패널 너비로 조정 */
  right: 0;       /* JS에서 패널 너비로 조정 */
  height: 12px;
}

.canvas-scrollbar--vertical {
  top: 0;
  right: 0;       /* JS에서 패널 너비로 조정 */
  bottom: 12px;   /* 하단 수평 스크롤바와 겹침 방지 */
  width: 12px;
}

/* ============================================
 * Thumb
 * ============================================ */
.canvas-scrollbar__thumb {
  position: absolute;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.25);
  will-change: transform;
}

.canvas-scrollbar--horizontal .canvas-scrollbar__thumb {
  top: 2px;
  height: 8px;
  /* width, transform: JS에서 설정 */
}

.canvas-scrollbar--vertical .canvas-scrollbar__thumb {
  left: 2px;
  width: 8px;
  /* height, transform: JS에서 설정 */
}

/* ============================================
 * Thumb 상태
 * ============================================ */
.canvas-scrollbar__thumb:hover {
  background: rgba(0, 0, 0, 0.4);
}

.canvas-scrollbar__thumb:active,
.canvas-scrollbar__thumb--dragging {
  background: rgba(0, 0, 0, 0.55);
}
```

### 4.6 Workspace 통합

**수정 파일**: `apps/builder/src/builder/workspace/Workspace.tsx`

```tsx
// import 추가
import { CanvasScrollbar } from './scrollbar';

// return 블록 (WebGL 모드)
return (
  <main ref={containerRef} className="workspace">
    <BuilderCanvas ... />

    <div className="workspace-overlay">
      {/* TextEditOverlay */}
    </div>

    {/* Canvas Scrollbars (Figma-style) */}
    <CanvasScrollbar direction="horizontal" />
    <CanvasScrollbar direction="vertical" />

    {/* Status Indicator */}
    {(isContextLost || !isCanvasReady) && (
      <div className="workspace-status-indicator">...</div>
    )}
  </main>
);
```

**배치 위치**: `workspace-overlay` 밖에 배치 (overlay는 `pointer-events: none`이므로 내부에 넣으면 드래그 불가)

### 4.7 Export 파일

**신규 파일**: `apps/builder/src/builder/workspace/scrollbar/index.ts`

```typescript
export { CanvasScrollbar } from './CanvasScrollbar';
```

---

## Phase 5: 성능 최적화 및 검증

### 5.1 성능 최적화 전략

| 기법 | 적용 위치 | 효과 |
|------|----------|------|
| **React 리렌더 0회** | CanvasScrollbar 전체 | mount 후 DOM만 조작 |
| **RAF throttle** | scheduleUpdate() | 16ms 이내 중복 호출 제거 |
| **CSS will-change** | .canvas-scrollbar__thumb | GPU 컴포지팅 레이어 생성 |
| **CSS transition** | .canvas-scrollbar opacity | 부드러운 fade, 별도 JS 불필요 |
| **classList 조작** | fade in/out | style.opacity 대신 클래스 토글 |
| **포인터 이벤트 위임** | thumb → window | 드래그 중 요소 밖 이동 처리 |

### 5.2 메모리 관리

```
useEffect cleanup에서 모든 리소스 해제:
  - ViewportController 리스너 제거 (removeVCListener)
  - Zustand 구독 해제 (unsubSync, unsubPanel)
  - DOM 이벤트 해제 (pointerdown, click)
  - RAF 취소 (cancelAnimationFrame)
  - 타이머 정리 (clearTimeout)
```

### 5.3 주의사항

#### `useStore.subscribe` vs `useCanvasSyncStore.subscribe`

| Store | 미들웨어 | subscribe 사용법 |
|-------|---------|-----------------|
| `useStore` | 없음 (`create<Store>()` 직접) | `subscribe((state) => { ... })` + 직접 비교 |
| `useCanvasSyncStore` | `subscribeWithSelector` | `subscribe(selector, callback, { equalityFn })` |

#### Workspace 위치 특성

- `position: fixed` → `absolute` 자식 요소는 Workspace를 기준으로 배치
- 패널은 CSS Grid에서 별도 `aside`로 Workspace 위에 오버레이
- 스크롤바는 Workspace의 `absolute` 자식이므로 패널 뒤에 렌더링됨 → z-index: 10으로 패널 앞에 표시

### 5.4 검증 체크리스트

#### 빌드 검증
- [ ] `pnpm typecheck` — 타입 에러 없음
- [ ] `pnpm build` — 빌드 성공

#### 기능 검증 (`pnpm dev` 실행 후)

| # | 항목 | 검증 방법 |
|---|------|----------|
| 1 | **시각 확인** | 캔버스 하단/우측에 얇은 스크롤바 thumb이 표시되는지 |
| 2 | **Pan 동기화** | Space+드래그, 휠 스크롤 시 thumb이 실시간으로 따라가는지 |
| 3 | **Zoom 동기화** | Ctrl+휠 줌 시 thumb 크기와 위치가 변하는지 |
| 4 | **Thumb 드래그** | 스크롤바 thumb을 드래그하여 캔버스가 이동하는지 |
| 5 | **Track 클릭** | thumb 외 영역 클릭 시 해당 위치로 점프하는지 |
| 6 | **Fade** | idle 시 스크롤바가 fade out, 인터랙션 시 표시되는지 |
| 7 | **패널 연동** | Inspector/Sidebar 패널 열림/닫힘 시 스크롤바 위치가 패널 경계로 이동하는지 |
| 8 | **성능** | React DevTools Profiler에서 CanvasScrollbar 리렌더 없음 확인 |
| 9 | **이벤트 충돌** | 스크롤바 드래그가 canvas pan/zoom과 충돌하지 않는지 |

---

## 파일 변경 요약

| 파일 | 변경 유형 | Phase |
|------|----------|-------|
| `apps/builder/src/builder/workspace/canvas/viewport/ViewportController.ts` | 수정 | 1 |
| `apps/builder/src/builder/workspace/scrollbar/calculateWorldBounds.ts` | 신규 | 2 |
| `apps/builder/src/builder/workspace/scrollbar/CanvasScrollbar.tsx` | 신규 | 3 |
| `apps/builder/src/builder/workspace/scrollbar/CanvasScrollbar.css` | 신규 | 4 |
| `apps/builder/src/builder/workspace/scrollbar/index.ts` | 신규 | 4 |
| `apps/builder/src/builder/workspace/Workspace.tsx` | 수정 | 4 |
