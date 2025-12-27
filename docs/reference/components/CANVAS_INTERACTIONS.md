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
│   └── zoomTo(), zoomToFit()        # 버튼 줌 (중앙 기준)
│
└── canvas/
    ├── BuilderCanvas.tsx            # PixiJS Application
    │   └── useZoomPan() 호출
    │
    ├── canvasSync.ts                # Zustand Store (zoom, panOffset)
    │
    └── grid/
        └── useZoomPan.ts            # 줌/팬 인터랙션 훅
```

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
- [CANVAS_RUNTIME_ISOLATION.md](./CANVAS_RUNTIME_ISOLATION.md) - 캔버스 런타임 격리
- [PIXI_WEBGL_INTEGRATION.md](../PIXI_WEBGL_INTEGRATION.md) - PixiJS WebGL 통합
- [Phase 10 B1.4](../phases/PHASE_10.md) - 줌/팬 구현 스펙

**최종 업데이트:** 2025-12-12
