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
 * onStateSync 콜백 업데이트 (싱글톤에서 지연 설정용)
 */
setOnStateSync(callback: (state: ViewportState) => void): void {
  this.options.onStateSync = callback;
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

#### 1.3 싱글톤 인스턴스 공유 (버그 수정)

> **⚠️ 구현 중 발견된 버그**: `useViewportControl` 훅이 `new ViewportController()`로 별도 인스턴스를 생성하여 싱글톤(`getViewportController()`)과 불일치 발생. 스크롤바는 싱글톤을 구독하지만, 실제 pan/zoom 이벤트는 별도 인스턴스에서 발생하여 리스너가 호출되지 않았음.

**수정 파일**: `apps/builder/src/builder/workspace/canvas/viewport/useViewportControl.ts`

```typescript
// 변경 전: 별도 인스턴스 생성
const controller = useMemo(() => {
  if (!app?.stage) return null;
  return new ViewportController({ minZoom, maxZoom, onStateSync: handleStateSync });
}, [app, minZoom, maxZoom, handleStateSync]);

// 변경 후: 싱글톤 사용 + onStateSync 지연 바인딩
const controller = useMemo(() => {
  if (!app?.stage) return null;
  return getViewportController({ minZoom, maxZoom });
}, [app, minZoom, maxZoom]);

useEffect(() => {
  if (controller) {
    controller.setOnStateSync(handleStateSync);
  }
}, [controller, handleStateSync]);
```

이로써 스크롤바와 뷰포트 훅이 **동일한 싱글톤 인스턴스**를 공유하며, pan/zoom 이벤트가 스크롤바 리스너에 정상 전달됩니다.

#### 1.4 `notifyUpdateListeners()` 호출 위치

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
Content = union(
  Canvas 영역 (0,0 ~ canvasSize.width × canvasSize.height),
  모든 요소의 bounds 합집합 (world 좌표로 역변환)
) + 사방 200px 패딩

World = Content를 기본으로, Viewport가 Content를 넘으면 동적 확장
```

> **⚠️ 구현 중 발견된 버그**: 초기 설계에서는 Viewport를 항상 World에 포함시켰으나, 이 경우 팬할수록 World가 커져 thumb 비율(ratio)이 항상 ~0.5에 수렴하는 문제가 있었음. Content 기반으로 먼저 범위를 결정하고, Viewport 초과분만 확장하도록 수정.

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
  cameraState: { x: number; y: number; scale: number },
  padding?: number  // 기본값: 200
): WorldBounds
```

`canvasSize`와 `viewportBounds`는 모두 **world 좌표**(Camera transform 적용 전)입니다. 화면 px가 아닌 world 단위로 전달해야 합니다.
`cameraState`는 ElementRegistry bounds의 global → world 역변환에 필요합니다 (Phase 2 좌표계 주의 참조).

### 알고리즘

```
1. 초기값: min = (0, 0), max = (canvasSize.width, canvasSize.height)

2. ElementRegistry에서 모든 요소 ID 조회 + global→world 역변환:
   for each id in getRegisteredElementIds():
     globalBounds = getElementBoundsSimple(id)
     if globalBounds:
       worldBounds = toWorldBounds(globalBounds, cameraState)
       min = min(min, worldBounds.topLeft)
       max = max(max, worldBounds.bottomRight)

3. Content 기반 패딩 추가:
   min -= padding
   max += padding

4. Viewport가 Content+Padding을 넘으면 world 확장:
   min = min(min, viewportBounds.topLeft)
   max = max(max, viewportBounds.bottomRight)

5. 반환: { minX, minY, maxX, maxY, width, height }
```

> **순서 주의**: 패딩(3)을 먼저 적용하고 viewport 확장(4)을 나중에 합니다. viewport가 content+padding 범위 안에 있으면 world가 고정되어 thumb 비율이 정확하게 반영됩니다. viewport가 범위를 넘으면 동적으로 확장하여 edge-case를 처리합니다.

### 설계 결정

| 결정 | 이유 |
|------|------|
| **유틸 함수** (React hook 아님) | RAF 콜백 내에서 직접 호출하기 위해. 외부 상태(cameraState)를 인자로 받으므로 순수 함수는 아님 |
| **매 프레임 전체 재계산** | 요소 추가/삭제/이동 시 자동 반영, 캐싱 복잡도 회피 |
| **Visible Viewport 조건부 확장** | content+padding 범위를 넘을 때만 world 확장. 항상 포함하면 ratio가 ~0.5에 고정됨 |
| **200px 패딩** | 콘텐츠 경계 근처에서 자연스러운 여유 공간. 500px은 과도하여 스크롤바 반응성 저하 |

### ElementRegistry 의존 및 좌표계 주의

```typescript
// elementRegistry.ts에서 사용하는 API:
getRegisteredElementIds(): string[]      // 모든 등록된 요소 ID
getElementBoundsSimple(id): ElementBounds | null  // 요소 bounds
```

- ElementRegistry는 Module-level singleton Map이므로 import만으로 접근 가능

#### ⚠️ 좌표계 문제: Global vs World 좌표

`getElementBoundsSimple()`은 두 가지 소스에서 bounds를 반환합니다:

| 소스 | 좌표계 | 설명 |
|------|--------|------|
| `layoutBoundsRegistry` (우선) | **Global** (stage 기준) | `container.getBounds()` 결과 저장 (BuilderCanvas.tsx:302). Camera transform 포함 |
| `getBounds()` fallback | **Global** (stage 기준) | PixiJS getBounds()는 항상 global 좌표 반환 |

두 소스 모두 Camera Container의 pan/zoom 변환이 적용된 **global 좌표**를 반환합니다.
**스크롤바의 world bounds 계산에 사용할 경우**, 카메라 이동 시 요소 bounds가 함께 움직여 스크롤바가 흔들리는 문제가 발생합니다. 따라서 역변환이 필요합니다.

**해결: Global → World 역변환 적용**

```typescript
// cameraState는 calculateWorldBounds()의 인자로 전달됨
// 호출 측: calculateWorldBounds(canvasSize, viewportBounds, vcState, padding)

// calculateWorldBounds 내부에서 사용:
function toWorldBounds(
  global: ElementBounds,
  cam: { x: number; y: number; scale: number }
): ElementBounds {
  return {
    x: (global.x - cam.x) / cam.scale,
    y: (global.y - cam.y) / cam.scale,
    width: global.width / cam.scale,
    height: global.height / cam.scale,
  };
}
```

`calculateWorldBounds()` 함수 내에서 모든 element bounds에 이 역변환을 적용합니다.
`cameraState`는 함수 시그니처의 세 번째 인자로 전달받으며, 호출 측에서 `getViewportController().getState()`로 획득합니다.

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

### 3.1 Visible Viewport 정의 및 World 좌표 변환

Workspace는 `position: fixed; inset: 0`으로 전체 화면을 차지하지만, 패널이 오버레이되어 실제 가시 영역은 더 좁습니다. 스크롤바가 나타내는 "viewport"는 **패널을 제외한 가시 영역**이어야 체감과 일치합니다.

```
┌─────────────────────────────────────────────────────┐
│ Workspace (containerSize.width × containerSize.height)│
│ ┌────┬──────────────────────────────────┬──────┐    │
│ │side│     Visible Viewport             │inspec│    │
│ │bar │  (사용자가 실제로 보는 영역)      │ tor  │    │
│ │    │                                  │      │    │
│ │left│                                  │right │    │
│ │Inset                                  │Inset │    │
│ └────┴──────────────────────────────────┴──────┘    │
└─────────────────────────────────────────────────────┘
```

**Visible Viewport 계산:**

```typescript
// 패널 inset (updatePanelOffset에서 측정한 값 재사용)
const leftInset = panelLayout.showLeft
  ? (document.querySelector('aside.sidebar') as HTMLElement)?.offsetWidth ?? 0
  : 0;
const rightInset = panelLayout.showRight
  ? (document.querySelector('aside.inspector') as HTMLElement)?.offsetWidth ?? 0
  : 0;

// Visible viewport (screen pixels)
const visibleWidth = containerSize.width - leftInset - rightInset;
const visibleHeight = containerSize.height;
// 주의: vertical track의 bottom: 12px(수평 스크롤바 겹침 방지)로 인한 차이는
// 오버레이 수준(12px)이므로 viewport 계산에서 무시합니다.
// 스크롤바 높이는 캔버스 콘텐츠 영역 대비 극소량이라 체감 오차가 없습니다.
// 정확히 맞추고 싶다면 visibleHeight = containerSize.height - 12 로 보정 가능합니다.

// ViewportController state: { x, y, scale }
// x, y = Camera Container의 화면상 위치 (pixel)
// scale = zoom level

// Visible viewport → World 좌표 변환:
viewportX = (leftInset - state.x) / state.scale   // 가시 영역 좌측의 world X
viewportY = -state.y / state.scale                 // 가시 영역 상단의 world Y
viewportW = visibleWidth / state.scale             // 가시 영역 너비 (world 단위)
viewportH = visibleHeight / state.scale            // 가시 영역 높이 (world 단위)
```

이 변환을 통해 패널이 열렸을 때 스크롤바 thumb 크기와 위치가 실제 가시 영역에 정확히 대응합니다.

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

세 가지 소스에서 변경을 감지하고 RAF로 throttle:

```
소스 1: ViewportController.addUpdateListener()
  → pan 드래그, zoomAtPoint, setPosition 시 호출
  → React state 업데이트 없이 직접 호출됨

소스 2: useCanvasSyncStore.subscribe()
  → zoom, panOffset selector 구독
  → 외부 줌 변경 (버튼, fit-to-screen) 감지

소스 3: ResizeObserver (track 요소)
  → 창 리사이즈, 패널 애니메이션 중 track 크기 변경 감지
  → 움직이지 않아도 thumb 크기/위치 재계산

세 소스 모두 → scheduleUpdate() 호출:
  if (rafId !== 0) return;  // 이미 예약됨
  rafId = requestAnimationFrame(() => {
    rafId = 0;
    updateThumb();   // DOM 업데이트
    showScrollbar();  // fade-in
  });
```

**ResizeObserver 설정:**

```typescript
const trackResizeObserver = new ResizeObserver(() => {
  scheduleUpdate();
});
trackResizeObserver.observe(track);

// cleanup에서 trackResizeObserver.disconnect() 호출
```

이를 통해 창 리사이즈, 패널 애니메이션 도중에도 스크롤바가 즉시 갱신됩니다. viewport 이동 없이도 track 크기가 변하면 thumb 비율이 재계산됩니다.

### 3.6 Thumb 드래그

```
1. thumb에 pointerdown 이벤트
   → e.preventDefault(), e.stopPropagation()
   → thumb.setPointerCapture(e.pointerId)  ← 포인터 캡처
   → 드래그 시작 상태 캡처 (startPos, startViewportState)

2. thumb에 pointermove 이벤트 (pointerCapture로 thumb에서 수신)
   → 마우스 delta → track 비율 변환 → world 이동량 계산
   → ViewportController.setPosition() 호출
   → useCanvasSyncStore.setPanOffset() 호출

3. thumb에 pointerup / lostpointercapture 이벤트
   → 드래그 종료, 리스너 해제
```

#### Pointer Capture 사용

`setPointerCapture(e.pointerId)`를 사용하여 드래그 안정성을 확보합니다:
- thumb 밖으로 마우스가 나가도 이벤트 수신 유지
- `window` 레벨 리스너 대신 thumb 자체에서 이벤트 처리
- `lostpointercapture` 이벤트에서 자동 cleanup

```typescript
thumb.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  thumb.setPointerCapture(e.pointerId);
  // ... 드래그 시작
});

// pointermove/pointerup은 thumb에 바인딩 (capture 덕분에 thumb 밖에서도 수신)
thumb.addEventListener('pointermove', onMove);
thumb.addEventListener('pointerup', onUp);
thumb.addEventListener('lostpointercapture', onUp);
```

#### 이벤트 우선순위: Thumb vs Track

- Thumb `pointerdown`: `e.stopPropagation()`으로 track click 전파 방지
- Track `click`: `e.target === thumb`이면 무시 (이중 안전장치)
- Track `click`에서 `isDraggingRef`가 `true`이면 무시 (드래그 직후 click 방어). pointerCapture는 포인터 이벤트 라우팅을 보장하지만 click 발생 자체를 막지는 않으므로, 이 방어가 필수입니다
- 선택적으로 이동 임계값(예: 3px 이상 이동 시 드래그로 간주)을 두어 의도치 않은 click 발생을 추가 필터링할 수 있음

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

`useStore`의 `panelLayout` 구독 — `showLeft`/`showRight` 토글 + `activeLeftPanels`/`activeRightPanels` 개수 변경 모두 감지:

```typescript
// useStore는 subscribeWithSelector 미사용 → 직접 비교
let prevShowLeft = useStore.getState().panelLayout.showLeft;
let prevShowRight = useStore.getState().panelLayout.showRight;
let prevActiveLeftCount = useStore.getState().panelLayout.activeLeftPanels?.length ?? 0;
let prevActiveRightCount = useStore.getState().panelLayout.activeRightPanels?.length ?? 0;

const unsubPanel = useStore.subscribe((state) => {
  const { showLeft, showRight, activeLeftPanels, activeRightPanels } = state.panelLayout;
  const activeLeftCount = activeLeftPanels?.length ?? 0;
  const activeRightCount = activeRightPanels?.length ?? 0;
  if (
    showLeft !== prevShowLeft ||
    showRight !== prevShowRight ||
    activeLeftCount !== prevActiveLeftCount ||
    activeRightCount !== prevActiveRightCount
  ) {
    prevShowLeft = showLeft;
    prevShowRight = showRight;
    prevActiveLeftCount = activeLeftCount;
    prevActiveRightCount = activeRightCount;
    // 패널 애니메이션(0.3s) 이후 재측정
    setTimeout(updatePanelOffset, 350);
  }
});
```

> **⚠️ 구현 중 발견된 버그**: 초기 설계에서는 `showLeft`/`showRight` 토글만 감지했으나, 우측에 복수 패널을 활성화해도 `showRight`는 `true`로 유지되어 스크롤바 위치가 갱신되지 않았음. `activeRightPanels.length` 변경도 감지하도록 수정.

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
  bottom: 2px;
  left: 0;        /* JS에서 패널 너비로 조정 */
  right: 0;       /* JS에서 패널 너비로 조정 */
  height: 6px;
}

.canvas-scrollbar--vertical {
  top: 0;
  right: 2px;     /* JS에서 패널 너비로 조정 */
  bottom: 6px;    /* 하단 수평 스크롤바와 겹침 방지 */
  width: 6px;
}

/* ============================================
 * Thumb
 * ============================================ */
.canvas-scrollbar__thumb {
  position: absolute;
  border-radius: 3px;
  background: var(--scrollbar-thumb, rgba(0, 0, 0, 0.25));
  will-change: transform;
}

.canvas-scrollbar--horizontal .canvas-scrollbar__thumb {
  top: 1px;
  height: 4px;
  /* width, transform: JS에서 설정 */
}

.canvas-scrollbar--vertical .canvas-scrollbar__thumb {
  left: 1px;
  width: 4px;
  /* height, transform: JS에서 설정 */
}

/* ============================================
 * Thumb 상태
 * ============================================ */
.canvas-scrollbar__thumb:hover {
  background: var(--scrollbar-thumb-hover, rgba(0, 0, 0, 0.4));
}

.canvas-scrollbar__thumb:active,
.canvas-scrollbar__thumb--dragging {
  background: var(--scrollbar-thumb-active, rgba(0, 0, 0, 0.55));
}

/*
 * 💡 CSS 토큰 참고:
 * 프로젝트는 --color-* CSS 변수 체계를 사용합니다 (예: var(--color-gray-500)).
 * 스크롤바 색상도 --scrollbar-thumb(-hover/-active) CSS 변수로 정의하여
 * 향후 다크 모드/테마 전환 시 일괄 변경할 수 있게 합니다.
 * rgba() fallback은 변수 미정의 시 기본값으로 작동합니다.
 */
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
| **Pointer Capture** | thumb.setPointerCapture() | 드래그 중 요소 밖 이동 처리, window 리스너 불필요 |
| **ResizeObserver** | track 요소 관찰 | 리사이즈/패널 애니메이션 중에도 즉시 갱신 |

### 5.2 메모리 관리

```
useEffect cleanup에서 모든 리소스 해제:
  - ViewportController 리스너 제거 (removeVCListener)
  - Zustand 구독 해제 (unsubSync, unsubPanel)
  - ResizeObserver 해제 (trackResizeObserver.disconnect())
  - DOM 이벤트 해제 (pointerdown, pointermove, pointerup, lostpointercapture, click)
  - RAF 취소 (cancelAnimationFrame)
  - 타이머 정리 (clearTimeout)
```

### 5.3 주의사항

#### `useStore.subscribe` vs `useCanvasSyncStore.subscribe`

| Store | 미들웨어 | subscribe 사용법 |
|-------|---------|-----------------|
| `useStore` | 없음 (`create<Store>()` 직접) | `subscribe((state) => { ... })` + 직접 비교 |
| `useCanvasSyncStore` | `subscribeWithSelector` | `subscribe(selector, callback, { equalityFn })` |

#### z-index 및 레이어링 목표

스크롤바는 패널 "앞"에 올리는 것이 아니라, **Workspace 내부에서 캔버스 위에만** 위치합니다:

- Workspace (`position: fixed; z-index: 0`) 내부에서 `position: absolute`로 배치
- `z-index: 10`은 Workspace 스태킹 컨텍스트 **내부** 기준 — 캔버스(z-index: auto) 위에만 올라감
- 패널(`aside`)은 Workspace 밖의 별도 Grid 영역이므로 z-index 충돌 없음
- 스크롤바가 패널과 겹치는 영역은 track의 `left`/`right` inset으로 제거하여 시각적 겹침 방지

### 5.4 검증 체크리스트

#### 빌드 검증
- [ ] `pnpm type-check` — 타입 에러 없음
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
| `apps/builder/src/builder/workspace/canvas/viewport/useViewportControl.ts` | 수정 | 1 (버그 수정) |
| `apps/builder/src/builder/workspace/scrollbar/calculateWorldBounds.ts` | 신규 | 2 |
| `apps/builder/src/builder/workspace/scrollbar/CanvasScrollbar.tsx` | 신규 | 3 |
| `apps/builder/src/builder/workspace/scrollbar/CanvasScrollbar.css` | 신규 | 4 |
| `apps/builder/src/builder/workspace/scrollbar/index.ts` | 신규 | 4 |
| `apps/builder/src/builder/workspace/Workspace.tsx` | 수정 | 4 |

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-01-30 | 초기 설계 문서 작성 (Phase 1~5) |
| 2026-01-30 | 구현 완료 후 버그 수정 3건 반영 |
| | - **ViewportController 싱글톤 불일치**: `useViewportControl`이 별도 인스턴스를 생성하여 스크롤바 리스너에 이벤트 미전달 → 싱글톤 공유로 수정 |
| | - **World Bounds 계산**: viewport를 항상 world에 포함 → ratio 고정(~0.5) → content 기반 계산 + viewport 조건부 확장으로 수정, 패딩 500→200 |
| | - **패널 구독 누락**: `showLeft`/`showRight` 토글만 감지 → `activeLeftPanels`/`activeRightPanels` 개수 변경도 감지 |
| | - **CSS 크기 축소**: Track 12→6px, Thumb 8→4px, 여백 2→1px, bottom/right 2px 오프셋 추가 |
