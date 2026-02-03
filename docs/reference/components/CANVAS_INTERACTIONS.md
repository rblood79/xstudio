# Canvas Interactions

> WebGL 캔버스 줌/팬 인터랙션 시스템

## 개요

XStudio의 WebGL 캔버스는 PixiJS 기반으로 구현되며, 줌(Zoom)과 팬(Pan) 인터랙션을 지원합니다.

## 인터랙션 목록

| 동작 | 입력 | 설명 |
|------|------|------|
| **줌 (커서 기준)** | `Ctrl + 휠` / `Cmd + 휠` | 마우스 커서 위치를 기준으로 확대/축소 |
| **줌 인** | `-` 버튼 | 뷰포트 중앙 기준 축소 |
| **줌 아웃** | `+` 버튼 | 뷰포트 중앙 기준 확대 |
| **화면 맞춤** | `Fit` 버튼 | 캔버스를 뷰포트에 맞춤 (10% 여백) |
| **팬 이동** | `Alt + 드래그` | 캔버스 이동 |
| **팬 이동** | `휠 클릭(중간 버튼) + 드래그` | 캔버스 이동 |
| **팬 모드** | `Space` 키 | 누르고 있는 동안 커서가 grab으로 변경 |

## 아키텍처

### 파일 구조

```
src/builder/workspace/
├── Workspace.tsx                    # 워크스페이스 컨테이너
│   ├── zoomTo(), zoomToFit()        # 버튼 줌 (중앙 기준)
│   └── <CanvasScrollbar />          # 스크롤바 마운트
│
├── canvas/
│   ├── BuilderCanvas.tsx            # PixiJS Application
│   │   └── useViewportControl() 호출
│   │
│   ├── canvasSync.ts                # Zustand Store (zoom, panOffset)
│   │
│   ├── viewport/
│   │   ├── ViewportController.ts    # Camera Container 제어 (싱글턴)
│   │   └── useViewportControl.ts    # 줌/팬 인터랙션 훅
│   │
│   └── grid/
│       └── useZoomPan.ts            # (레거시) 줌/팬 훅
│
└── scrollbar/
    ├── CanvasScrollbar.tsx          # Figma 스타일 스크롤바 (DOM 직접 조작)
    ├── CanvasScrollbar.css          # 스크롤바 스타일
    ├── calculateWorldBounds.ts      # World Bounds 계산
    └── index.ts                     # 배럴 export
```

### ViewportController (싱글턴)

Camera Container의 pan/zoom/scale을 제어하는 핵심 컨트롤러입니다.
`getViewportController()`로 모듈 레벨 싱글턴 인스턴스를 공유합니다.

```typescript
// 싱글턴 취득
const vc = getViewportController();

// 현재 상태 읽기
const { x, y, scale } = vc.getState();

// 외부 리스너 등록 (스크롤바 등)
const remove = vc.addUpdateListener(() => {
  // pan/zoom/setPosition 변경 시 호출
});

// 지연 콜백 바인딩 (Zustand ↔ Pixi 동기화)
vc.setOnStateSync((state) => {
  useCanvasSyncStore.getState().setZoom(state.scale);
  useCanvasSyncStore.getState().setPanOffset({ x: state.x, y: state.y });
});
```

> **주의**: `useViewportControl` 훅도 동일 싱글턴을 사용합니다. `new ViewportController()`를 직접 생성하면 리스너가 분리되어 스크롤바 등 외부 소비자가 상태를 받지 못합니다.

### 상태 관리 (canvasSync.ts)

```typescript
interface CanvasSyncState {
  zoom: number;                      // 현재 줌 레벨 (0.1 ~ 5)
  panOffset: { x: number; y: number }; // 팬 오프셋
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
}
```

### 렌더링 적용 (BuilderCanvas.tsx)

```tsx
<pixiContainer
  x={panOffset.x}      // 팬 오프셋 X
  y={panOffset.y}      // 팬 오프셋 Y
  scale={zoom}         // 줌 레벨
>
  <GridLayer />
  <CanvasBounds />
  <ElementsLayer />
  <SelectionLayer />
</pixiContainer>
```

## 줌 알고리즘

### 커서 위치 기준 줌 (zoomToPoint)

마우스 커서 아래의 캔버스 포인트가 줌 후에도 같은 화면 위치에 있도록 panOffset을 조정합니다.

```typescript
// 커서의 컨테이너 상대 좌표
const relativeX = cursorX - containerRect.left;
const relativeY = cursorY - containerRect.top;

// 줌 비율
const zoomRatio = newZoom / currentZoom;

// 새 panOffset 계산 (커서 위치 유지)
const newPanX = relativeX - (relativeX - currentPanOffset.x) * zoomRatio;
const newPanY = relativeY - (relativeY - currentPanOffset.y) * zoomRatio;
```

**수학적 원리:**
- 줌 전: 커서 아래 캔버스 좌표 = `(relativeX - panX) / zoom`
- 줌 후: 같은 캔버스 좌표가 같은 화면 위치에 있어야 함
- 따라서: `newPanX = relativeX - canvasX * newZoom`

### 휠 줌 델타 계산 (Pencil 방식)

`useViewportControl.ts`의 휠 이벤트에서 줌 델타를 Pencil 앱과 동일한 방식으로 계산합니다:

```typescript
// Pencil 방식: deltaY 클램핑 + 0.012 계수
// ctrlKey(마우스 휠) → ±30 클램핑, metaKey(트랙패드 핀치) → ±15 클램핑
const clampRange = e.metaKey ? 15 : 30;
const clamped = Math.max(-clampRange, Math.min(clampRange, e.deltaY));
const delta = clamped * -0.012;

controller.zoomAtPoint(e.clientX, e.clientY, rect, delta, true);
```

| 입력 | deltaY | clamp 범위 | 줌 변화 |
|------|--------|-----------|---------|
| 마우스 휠 1클릭 | ~120 | ±30 | 36% |
| 트랙패드 핀치 | ~3 | ±15 | 3.6% |

> **변경 이력 (2026-02-03):** 기존 `deltaY * 0.001` (12%/클릭)에서 Pencil 방식으로 변경. 마우스 휠과 트랙패드 핀치를 구분하여 각각 최적의 줌 감도를 제공.

### 중앙 기준 줌 (zoomTo)

뷰포트 중앙을 기준으로 확대/축소합니다.

```typescript
const centerX = containerWidth / 2;
const centerY = containerHeight / 2;

const zoomRatio = newZoom / currentZoom;

const newPanX = centerX - (centerX - currentPanOffset.x) * zoomRatio;
const newPanY = centerY - (centerY - currentPanOffset.y) * zoomRatio;
```

### 화면 맞춤 (zoomToFit)

캔버스가 뷰포트에 맞도록 줌과 panOffset을 계산합니다.

```typescript
const scaleX = containerWidth / canvasWidth;
const scaleY = containerHeight / canvasHeight;
const fitZoom = Math.min(scaleX, scaleY) * 0.9; // 10% 여백

const newPanX = (containerWidth - canvasWidth * fitZoom) / 2;
const newPanY = (containerHeight - canvasHeight * fitZoom) / 2;
```

## useZoomPan 훅

### 옵션

```typescript
interface UseZoomPanOptions {
  containerEl?: HTMLElement | null;  // 컨테이너 DOM 요소
  minZoom?: number;                  // 최소 줌 (기본: 0.1)
  maxZoom?: number;                  // 최대 줌 (기본: 5)
  zoomStep?: number;                 // 줌 스텝 (기본: 0.1)
  panSpeed?: number;                 // 팬 속도 (기본: 1)
}
```

### 반환값

```typescript
interface UseZoomPanReturn {
  screenToCanvas: (screenX, screenY) => { x, y };  // 화면→캔버스 좌표 변환
  canvasToScreen: (canvasX, canvasY) => { x, y };  // 캔버스→화면 좌표 변환
  zoomToPoint: (screenX, screenY, newZoom) => void; // 특정 위치 기준 줌
  resetZoom: () => void;                           // 줌 리셋 (1:1)
  fitToScreen: (canvasWidth, canvasHeight) => void; // 화면 맞춤
  zoomIn: () => void;                              // 줌 인 (중앙 기준)
  zoomOut: () => void;                             // 줌 아웃 (중앙 기준)
}
```

### Stale Closure 방지

이벤트 핸들러에서 최신 상태를 읽기 위해 `getState()`를 사용합니다:

```typescript
// ❌ 잘못된 방식 - closure의 오래된 값 사용
const handleWheel = (e: WheelEvent) => {
  const newZoom = zoom * (1 + delta);  // zoom이 stale할 수 있음
};

// ✅ 올바른 방식 - Store에서 현재 값 직접 읽기
const handleWheel = (e: WheelEvent) => {
  const { zoom: currentZoom } = useCanvasSyncStore.getState();
  const newZoom = currentZoom * (1 + delta);
};
```

## 좌표 변환

### 화면 좌표 → 캔버스 좌표

```typescript
function screenToCanvas(screenX: number, screenY: number) {
  const rect = containerEl.getBoundingClientRect();
  const relativeX = screenX - rect.left;
  const relativeY = screenY - rect.top;

  const canvasX = (relativeX - panOffset.x) / zoom;
  const canvasY = (relativeY - panOffset.y) / zoom;

  return { x: canvasX, y: canvasY };
}
```

### 캔버스 좌표 → 화면 좌표

```typescript
function canvasToScreen(canvasX: number, canvasY: number) {
  const rect = containerEl.getBoundingClientRect();

  const screenX = canvasX * zoom + panOffset.x + rect.left;
  const screenY = canvasY * zoom + panOffset.y + rect.top;

  return { x: screenX, y: screenY };
}
```

## 이벤트 처리

### 휠 이벤트

```typescript
containerEl.addEventListener('wheel', handleWheel, {
  passive: false,  // preventDefault 허용
  capture: true    // 버블링 전에 캡처
});
```

### 마우스 이벤트 (팬)

- `mousedown`: Alt+클릭 또는 중간 버튼으로 팬 시작
- `mousemove`: 팬 중 위치 업데이트 (window에 등록)
- `mouseup`: 팬 종료 (window에 등록)

### 키보드 이벤트

- `Space keydown`: 팬 모드 진입 (커서 → grab)
- `Space keyup`: 팬 모드 종료

## 성능 최적화

### useRef 사용

팬 상태를 React state 대신 useRef로 관리하여 불필요한 리렌더링 방지:

```typescript
const isPanningRef = useRef(false);
const lastPanPointRef = useRef<{ x: number; y: number } | null>(null);
```

### 이벤트 리스너 최적화

- `containerEl` (상태)을 dependency로 사용하여 DOM 준비 후 이벤트 등록
- `capture: true`로 이벤트를 먼저 가로채 PixiJS와의 충돌 방지

### 팬 드래그 스로틀링 (Phase 12)

- 팬 이동은 `requestAnimationFrame`으로 스케줄링하여 `mousemove` 폭주 시에도 프레임당 1회만 상태 업데이트.
- 드래그 종료 시 보류된 pan을 플러시해 최종 위치를 보장.
- 휠 줌/팬 로그는 기본 비활성화해 입력 시 콘솔 스팸을 제거.

> 대안 비교: 드래그 종료 시점에만 pan을 동기화하면 FPS는 좋지만 선택 박스/오버레이 위치가 드래그 중 맞지 않는 리스크가 있어, rAF 스로틀 방식을 유지합니다.

## 트러블슈팅

### 줌이 left-top 기준으로 동작

**원인:** panOffset이 조정되지 않고 zoom만 변경됨

**해결:** `zoomToPoint` 또는 `zoomTo` 함수에서 panOffset 함께 계산

### 드래그가 끊김

**원인:** React state로 팬 상태 관리 → 매 움직임마다 리렌더링

**해결:** useRef + window 이벤트 리스너 사용

### 휠 줌이 동작하지 않음

**원인:**
1. `containerEl`이 null인 상태에서 이벤트 등록 시도
2. 다른 컴포넌트에서 이벤트 가로채기

**해결:**
1. `containerEl`을 dependency로 사용하여 DOM 준비 후 등록
2. `capture: true`로 이벤트 먼저 가로채기

## Selection System (Figma-style)

### 개요

캔버스에서 요소를 선택하면 SelectionLayer가 표시되며, Figma 스타일의 핸들 시스템을 사용합니다.

### 파일 구조

```
src/builder/workspace/canvas/selection/
├── SelectionLayer.tsx        # 최상위 선택 레이어 (Store 연결, bounds 계산)
├── SelectionBox.tsx          # 선택 박스 + 핸들 렌더링 (imperative 업데이트)
├── TransformHandle.tsx       # 개별 리사이즈 핸들 (코너/엣지)
├── types.ts                  # 타입 정의, HANDLE_CONFIGS, 상수
├── useDragInteraction.ts     # Move/Resize/Lasso 드래그 훅
├── LassoSelection.tsx        # 라쏘 선택 시각화
├── SelectionLayer.utils.ts   # 라쏘 유틸
├── LassoSelection.utils.ts   # 라쏘 바운딩박스 계산
└── index.ts                  # 모듈 내보내기
```

### 핸들 배치 (Figma 스타일)

```
■ ──────────────────── ■      ■ = 코너 핸들 (시각적으로 표시)
│                      │      ─ = 엣지 핸들 (보이지 않음, 호버 시 커서 변경)
│                      │
■ ──────────────────── ■
```

| 핸들 | 위치 | 타입 | 표시 | 커서 |
|------|------|------|------|------|
| top-left | (0, 0) | 코너 | 보임 | `nwse-resize` ↘↖ |
| top-right | (1, 0) | 코너 | 보임 | `nesw-resize` ↗↙ |
| bottom-right | (1, 1) | 코너 | 보임 | `nwse-resize` ↘↖ |
| bottom-left | (0, 1) | 코너 | 보임 | `nesw-resize` ↗↙ |
| top-center | (0.5, 0) | 엣지 | 숨김 | `ns-resize` ↕ |
| middle-right | (1, 0.5) | 엣지 | 숨김 | `ew-resize` ↔ |
| bottom-center | (0.5, 1) | 엣지 | 숨김 | `ew-resize` ↔ |
| middle-left | (0, 0.5) | 엣지 | 숨김 | `ew-resize` ↔ |

### 코너 vs 엣지 핸들

**코너 핸들** (`isCorner: true`):
- 6×6px 흰색 정사각형 + 파란 테두리
- 줌 독립적 크기 (`HANDLE_SIZE / zoom`)
- 양방향 대각선 화살표 커서 (`nwse-resize`, `nesw-resize`)

**엣지 핸들** (`isCorner: false`):
- 투명 히트 영역 (alpha: 0.001, 시각적으로 보이지 않음)
- 상단/하단: `width=boundsWidth`, `height=EDGE_HIT_THICKNESS(8px)`
- 좌측/우측: `width=EDGE_HIT_THICKNESS(8px)`, `height=boundsHeight`
- 양방향 수직/수평 화살표 커서 (`ns-resize`, `ew-resize`)

### 상수

```typescript
HANDLE_SIZE = 6;              // 코너 핸들 크기 (px)
EDGE_HIT_THICKNESS = 8;      // 엣지 히트 영역 두께 (px)
SELECTION_COLOR = 0x3b82f6;   // 선택 테두리 (Blue-500)
HANDLE_FILL_COLOR = 0xffffff; // 코너 핸들 배경 (흰색)
HANDLE_STROKE_COLOR = 0x3b82f6; // 코너 핸들 테두리 (Blue-500)
```

### 커서 스타일 (양방향 화살표)

```typescript
type CursorStyle =
  | 'default'
  | 'move'
  | 'nwse-resize'  // ↘↖ 대각선 (TL, BR)
  | 'nesw-resize'  // ↗↙ 대각선 (TR, BL)
  | 'ns-resize'    // ↕ 수직 (TC, BC)
  | 'ew-resize';   // ↔ 수평 (MR, ML)
```

### Z-Order (렌더링 순서)

`HANDLE_CONFIGS` 배열에서 코너가 먼저, 엣지가 나중에 정의되어 있어 PixiJS 렌더링 시 코너 핸들이 엣지 히트 영역 위에 표시됩니다:

```
1. 이동 영역 (투명 배경)
2. 선택 테두리 (파란색 1px)
3. 엣지 핸들 4개 (투명 히트 영역)  ← 먼저 렌더링
4. 코너 핸들 4개 (흰색 정사각형)   ← 위에 렌더링
```

### 성능 최적화 (Phase 19)

- **Imperative 업데이트**: 드래그 중 React 리렌더링 없이 PixiJS 직접 조작
- **RAF 스로틀링**: 프레임당 1회만 위치 업데이트
- **선택적 구독**: `elementsMap` 전체가 아닌 선택된 요소만 구독

---

## 레이아웃 시스템

### Layout Calculator

`src/builder/workspace/canvas/layout/layoutCalculator.ts`

캔버스에서 DOM의 레이아웃 방식을 재현합니다.

#### 지원 레이아웃

| 레이아웃 | display 값 | 설명 |
|----------|------------|------|
| Block | `block` (기본) | 수직 스택, margin/padding |
| Flex | `flex` | flexDirection, justifyContent, alignItems, gap |
| Absolute | position: `absolute` | 부모 기준 절대 위치 |

#### Flexbox 속성

```typescript
interface FlexStyle {
  display: 'flex';
  flexDirection: 'row' | 'row-reverse' | 'column' | 'column-reverse';
  justifyContent: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  gap: number;
}
```

#### 안전 기능

- `MAX_LAYOUT_DEPTH = 1000` - 무한 재귀 방지
- `visited Set` - 순환 참조 감지 및 경고

### StylesPanel 연동

Inspector의 StylesPanel 변경 → Canvas 레이아웃 자동 재계산:

```
StylesPanel → useStyleActions → useInspectorState
                                      ↓
                              useSyncWithBuilder
                                      ↓
                              useStore (elements)
                                      ↓
                          BuilderCanvas (layoutResult)
```

## 스크롤바 연동

줌/팬 상태 변경 시 Figma 스타일 스크롤바가 연동됩니다.

### 상태 전파 흐름

```
ViewportController.pan/zoom/setPosition
  ↓ notifyUpdateListeners()
CanvasScrollbar (scheduleUpdate)
  ↓ RAF throttle
updateThumb() — DOM 직접 조작 (transform, width/height)
```

### 변경 감지 소스

| 소스 | 역할 |
|------|------|
| `ViewportController.addUpdateListener()` | pan/zoom/setPosition 실시간 변경 |
| `useCanvasSyncStore.subscribe()` | 외부 zoom/pan 변경 (버튼, fit-to-screen) |
| `ResizeObserver(track)` | 창 리사이즈, 패널 애니메이션 |
| `useStore.subscribe(panelLayout)` | 패널 열림/닫힘 → 오프셋 재측정 |

> 상세 설계: [CANVAS_SCROLLBAR.md](../../CANVAS_SCROLLBAR.md)

---

## Canvas Resize (Figma-style)

### 문제

패널 열기/닫기 시 `<canvas>` 크기가 부모 컨테이너를 따라가지 않음

### 해결: CSS Transform + Debounce

```typescript
function CanvasResizeHandler({ width, height }) {
  const { app } = useApplication();

  // 1. 애니메이션 중: CSS transform scale (즉시, 깜빡임 없음)
  const scaleX = width / baseSize.current.width;
  canvas.style.transform = `scale(${scaleX}, ${scaleY})`;

  // 2. 150ms debounce 후: 실제 WebGL resize
  debounceTimer.current = setTimeout(() => {
    canvas.style.transform = '';
    app.renderer.resize(width, height);
  }, 150);
}
```

### 동작 흐름

```
패널 열기/닫기 시작
  ↓
1200px → CSS scale(1200/1400) 적용 (즉시)
1180px → CSS scale(1180/1400) 업데이트
1160px → CSS scale(1160/1400) 업데이트
  ↓
150ms 동안 변화 없음
  ↓
CSS transform 제거 + WebGL resize(1160px)
```

### 방식 비교

| 방식 | 깜빡임 | 성능 | WebGL 상태 |
|------|--------|------|------------|
| key prop remount | ❌ 검은 화면 | 느림 | 재생성 |
| 직접 renderer.resize | ❌ 깜빡임 | 빠름 | 유지 |
| CSS Transform + Debounce | ✅ 없음 | 빠름 | 유지 |

---

**관련 문서:**
- [CANVAS_SCROLLBAR.md](../../CANVAS_SCROLLBAR.md) - 캔버스 스크롤바 설계
- [CANVAS_RUNTIME_ISOLATION.md](./CANVAS_RUNTIME_ISOLATION.md) - 캔버스 런타임 격리
- [PIXI_WEBGL_INTEGRATION.md](../PIXI_WEBGL_INTEGRATION.md) - PixiJS WebGL 통합
- [Phase 10 B1.4](../phases/PHASE_10.md) - 줌/팬 구현 스펙

**최종 업데이트:** 2026-02-03
