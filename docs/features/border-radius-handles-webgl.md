# WebGL BorderRadius 핸들 구현 설계서

> **작성일**: 2025-12-24
> **상태**: 설계 완료
> **참조**: Adobe XD, Figma border-radius 조절 UX

---

## 1. 개요

### 1.1 목표
WebGL 모드(PixiJS 캔버스)에서 Adobe XD/Figma 스타일의 borderRadius 핸들을 구현합니다.

### 1.2 핵심 기능
- **모서리 근처 hover 시에만 핸들 표시** (Figma 스타일)
- **대각선 드래그로 borderRadius 조절**
- **Shift+드래그: 4개 모서리 동시 조절**

### 1.3 참조 디자인

#### Adobe XD
- 선택된 요소의 4개 모서리에 작은 원형 핸들 표시
- 드래그 방향: 대각선 (코너 안쪽으로 드래그하면 radius 증가)
- 드래그 중 현재 값 툴팁 표시

#### Figma
- 모서리 근처에 마우스가 있을 때만 핸들 표시
- 핸들은 현재 radius 값에 비례하여 대각선 방향으로 오프셋
- 드래그 중 실시간 미리보기

---

## 2. 아키텍처

### 2.1 컴포넌트 구조

```
SelectionLayer
  └── SelectionBox
        ├── TransformHandle (기존 8방향 리사이즈)
        └── BorderRadiusHandles (신규)
              └── BorderRadiusHandle × 4 (topLeft, topRight, bottomLeft, bottomRight)
```

### 2.2 파일 구조

```
src/builder/workspace/canvas/selection/
├── types.ts                      # (수정) CornerPosition 추가
├── borderRadiusTypes.ts          # (신규) 상수, 유틸리티
├── BorderRadiusHandle.tsx        # (신규) 개별 핸들 컴포넌트
├── BorderRadiusHandles.tsx       # (신규) 핸들 컨테이너
├── useBorderRadiusDragPixi.ts    # (신규) 드래그 훅
├── SelectionBox.tsx              # (수정) 핸들 렌더링 추가
└── SelectionLayer.tsx            # (수정) borderRadius 구독
```

---

## 3. API 설계

### 3.1 borderRadiusTypes.ts

```typescript
/**
 * 코너 위치 타입
 */
export type CornerPosition = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

/**
 * 코너 근처 hover 감지 거리 (화면 픽셀 기준)
 */
export const CORNER_HOVER_DISTANCE = 30;

/**
 * 핸들 크기 (원형 반지름, 화면 픽셀 기준)
 */
export const BORDER_RADIUS_HANDLE_SIZE = 4;

/**
 * 핸들 색상 (primary blue)
 */
export const BORDER_RADIUS_HANDLE_COLOR = 0x3b82f6;

/**
 * 코너별 CSS 속성 매핑
 */
export const cornerPropertyMap: Record<CornerPosition, string> = {
  topLeft: 'borderTopLeftRadius',
  topRight: 'borderTopRightRadius',
  bottomLeft: 'borderBottomLeftRadius',
  bottomRight: 'borderBottomRightRadius',
};

/**
 * 코너별 커서 스타일
 */
export const cornerCursorMap: Record<CornerPosition, string> = {
  topLeft: 'nwse-resize',
  topRight: 'nesw-resize',
  bottomLeft: 'nesw-resize',
  bottomRight: 'nwse-resize',
};

/**
 * 가장 가까운 코너 찾기
 */
export function findNearestCorner(
  mouseX: number,
  mouseY: number,
  width: number,
  height: number,
  zoom: number
): CornerPosition | null {
  const threshold = CORNER_HOVER_DISTANCE / zoom;

  const corners: Record<CornerPosition, { x: number; y: number }> = {
    topLeft: { x: 0, y: 0 },
    topRight: { x: width, y: 0 },
    bottomLeft: { x: 0, y: height },
    bottomRight: { x: width, y: height },
  };

  let nearestCorner: CornerPosition | null = null;
  let minDistance = Infinity;

  for (const [corner, pos] of Object.entries(corners) as [CornerPosition, { x: number; y: number }][]) {
    const distance = Math.hypot(mouseX - pos.x, mouseY - pos.y);
    if (distance < threshold && distance < minDistance) {
      minDistance = distance;
      nearestCorner = corner;
    }
  }

  return nearestCorner;
}

/**
 * 대각선 거리 계산 (드래그 방향에 따른 radius 변화량)
 */
export function calculateDiagonalDistance(
  corner: CornerPosition,
  deltaX: number,
  deltaY: number
): number {
  switch (corner) {
    case 'topLeft':
      return (deltaX + deltaY) / Math.SQRT2;
    case 'topRight':
      return (-deltaX + deltaY) / Math.SQRT2;
    case 'bottomLeft':
      return (deltaX - deltaY) / Math.SQRT2;
    case 'bottomRight':
      return (-deltaX - deltaY) / Math.SQRT2;
    default:
      return 0;
  }
}
```

### 3.2 BorderRadiusHandle.tsx

```typescript
import { memo, useCallback } from 'react';
import { Graphics as PixiGraphics, FederatedPointerEvent } from 'pixi.js';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type { CornerPosition } from './borderRadiusTypes';
import {
  BORDER_RADIUS_HANDLE_SIZE,
  BORDER_RADIUS_HANDLE_COLOR,
  cornerCursorMap,
} from './borderRadiusTypes';

export interface BorderRadiusHandleProps {
  corner: CornerPosition;
  x: number;
  y: number;
  zoom: number;
  onDragStart: (corner: CornerPosition, e: FederatedPointerEvent) => void;
}

export const BorderRadiusHandle = memo(function BorderRadiusHandle({
  corner,
  x,
  y,
  zoom,
  onDragStart,
}: BorderRadiusHandleProps) {
  useExtend(PIXI_COMPONENTS);

  // 줌 독립적 크기
  const radius = BORDER_RADIUS_HANDLE_SIZE / zoom;
  const strokeWidth = 1.5 / zoom;

  const draw = useCallback((g: PixiGraphics) => {
    g.clear();
    g.circle(0, 0, radius);
    g.fill({ color: BORDER_RADIUS_HANDLE_COLOR });
    g.setStrokeStyle({ width: strokeWidth, color: 0xffffff });
    g.stroke();
  }, [radius, strokeWidth]);

  const handlePointerDown = useCallback((e: FederatedPointerEvent) => {
    e.stopPropagation();
    onDragStart(corner, e);
  }, [corner, onDragStart]);

  return (
    <pixiGraphics
      x={x}
      y={y}
      draw={draw}
      eventMode="static"
      cursor={cornerCursorMap[corner]}
      onPointerDown={handlePointerDown}
    />
  );
});
```

### 3.3 BorderRadiusHandles.tsx

```typescript
import { memo, useMemo } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { BorderRadiusHandle } from './BorderRadiusHandle';
import type { CornerPosition } from './borderRadiusTypes';
import type { FederatedPointerEvent } from 'pixi.js';

export interface BorderRadiusHandlesProps {
  hoveredCorner: CornerPosition | null;
  boundsWidth: number;
  boundsHeight: number;
  currentRadius: number;
  zoom: number;
  onDragStart: (corner: CornerPosition, e: FederatedPointerEvent) => void;
}

export const BorderRadiusHandles = memo(function BorderRadiusHandles({
  hoveredCorner,
  boundsWidth,
  boundsHeight,
  currentRadius,
  zoom,
  onDragStart,
}: BorderRadiusHandlesProps) {
  useExtend(PIXI_COMPONENTS);

  // 핸들 위치 계산 (radius에 비례하여 대각선 오프셋)
  const handlePositions = useMemo(() => {
    const getOffset = (radius: number) => {
      const minOffset = 4 / zoom;
      const radiusOffset = radius * 0.5;
      return minOffset + radiusOffset;
    };

    const offset = getOffset(currentRadius);

    return {
      topLeft: { x: offset, y: offset },
      topRight: { x: boundsWidth - offset, y: offset },
      bottomLeft: { x: offset, y: boundsHeight - offset },
      bottomRight: { x: boundsWidth - offset, y: boundsHeight - offset },
    };
  }, [boundsWidth, boundsHeight, currentRadius, zoom]);

  // hover된 코너만 렌더링
  if (!hoveredCorner) return null;

  const position = handlePositions[hoveredCorner];

  return (
    <BorderRadiusHandle
      corner={hoveredCorner}
      x={position.x}
      y={position.y}
      zoom={zoom}
      onDragStart={onDragStart}
    />
  );
});
```

### 3.4 useBorderRadiusDragPixi.ts

```typescript
import { useCallback, useRef, useEffect } from 'react';
import type { FederatedPointerEvent } from 'pixi.js';
import type { CornerPosition } from './borderRadiusTypes';
import { calculateDiagonalDistance, cornerPropertyMap } from './borderRadiusTypes';
import { TIMING } from '../../../constants/timing';
import { useStore } from '../../../stores';

interface DragState {
  isDragging: boolean;
  corner: CornerPosition | null;
  initialRadius: number;
  initialMouseX: number;
  initialMouseY: number;
  maxRadius: number;
  lastRadius: number;
}

const initialDragState: DragState = {
  isDragging: false,
  corner: null,
  initialRadius: 0,
  initialMouseX: 0,
  initialMouseY: 0,
  maxRadius: 0,
  lastRadius: -1,
};

export interface UseBorderRadiusDragOptions {
  onDragStart?: () => void;
  onDragUpdate?: (radius: number, corner: CornerPosition) => void;
  onDragEnd?: (radius: number, corner: CornerPosition) => void;
}

export function useBorderRadiusDragPixi(
  bounds: { width: number; height: number } | null,
  currentBorderRadius: number,
  options: UseBorderRadiusDragOptions = {}
) {
  const { onDragStart, onDragUpdate, onDragEnd } = options;

  // ref 기반 상태 관리 (React 리렌더링 방지)
  const dragStateRef = useRef<DragState>({ ...initialDragState });
  const lastThrottleTimeRef = useRef<number>(0);

  // 마우스 이동 핸들러
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const state = dragStateRef.current;
    if (!state.isDragging || !state.corner) return;

    // 시간 기반 스로틀링 (16ms = 60fps)
    const now = performance.now();
    if (now - lastThrottleTimeRef.current < TIMING.DRAG_THROTTLE) {
      return;
    }
    lastThrottleTimeRef.current = now;

    const deltaX = e.clientX - state.initialMouseX;
    const deltaY = e.clientY - state.initialMouseY;
    const diagonalDistance = calculateDiagonalDistance(state.corner, deltaX, deltaY);

    let newRadius = Math.round(state.initialRadius + diagonalDistance);
    newRadius = Math.max(0, Math.min(state.maxRadius, newRadius));

    if (newRadius === state.lastRadius) return;

    dragStateRef.current.lastRadius = newRadius;
    onDragUpdate?.(newRadius, state.corner);
  }, [onDragUpdate]);

  // 마우스 업 핸들러
  const handleMouseUp = useCallback((e: MouseEvent) => {
    const state = dragStateRef.current;
    if (!state.isDragging || !state.corner) return;

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);

    const corner = state.corner;
    const finalRadius = state.lastRadius;
    const shiftKey = e.shiftKey;

    // 상태 초기화
    dragStateRef.current = { ...initialDragState };

    // Store 업데이트
    const { updateSelectedStyle, updateSelectedStyles } = useStore.getState();

    if (shiftKey) {
      // Shift+드래그: 모든 코너 동시 조절
      updateSelectedStyles({
        borderRadius: `${finalRadius}px`,
        borderTopLeftRadius: `${finalRadius}px`,
        borderTopRightRadius: `${finalRadius}px`,
        borderBottomLeftRadius: `${finalRadius}px`,
        borderBottomRightRadius: `${finalRadius}px`,
      });
    } else {
      // 개별 코너 조절
      const property = cornerPropertyMap[corner];
      updateSelectedStyle(property, `${finalRadius}px`);
    }

    onDragEnd?.(finalRadius, corner);
  }, [handleMouseMove, onDragEnd]);

  // 드래그 시작
  const startDrag = useCallback((corner: CornerPosition, e: FederatedPointerEvent) => {
    if (!bounds) return;

    dragStateRef.current = {
      isDragging: true,
      corner,
      initialRadius: currentBorderRadius,
      initialMouseX: e.global.x,
      initialMouseY: e.global.y,
      maxRadius: Math.min(bounds.width, bounds.height) / 2,
      lastRadius: currentBorderRadius,
    };

    onDragStart?.();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [bounds, currentBorderRadius, onDragStart, handleMouseMove, handleMouseUp]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return {
    startDrag,
    isDragging: dragStateRef.current.isDragging,
    activeCorner: dragStateRef.current.corner,
  };
}
```

---

## 4. 성능 최적화

> 참조: `docs/performance/13-webgl-canvas-optimization-final.md`

### 4.1 기여도 분석

| 기술 | 기여율 | 적용 위치 |
|------|--------|----------|
| RAF 스로틀링 | ~40% | `useBorderRadiusDragPixi` 드래그 중 |
| ref 기반 상태 | ~25% | 드래그 중간 상태 |
| **값 변경 시에만 업데이트** | ~20% | hover 감지 (리렌더링 방지) |
| 조건부 렌더링 | ~10% | hover 코너만 표시 |
| useDeferredValue | ~5% | 인스펙터 패널 (선택적) |

### 4.2 최적화 전략

#### 드래그 중 (핵심)
```typescript
// 1. ref 기반 상태 관리 (React 리렌더링 방지)
const dragStateRef = useRef<DragState>({ ... });

// 2. 시간 기반 스로틀링 (16ms = 60fps)
const now = performance.now();
if (now - lastThrottleTimeRef.current < TIMING.DRAG_THROTTLE) {
  return;
}

// 3. 콜백으로 PixiJS 직접 조작
onDragUpdate?.(newRadius, corner);
```

#### Hover 감지 (SelectionBox)
```typescript
// ⚡ 값 변경 시에만 state 업데이트 (불필요한 리렌더링 방지)
const hoveredCornerRef = useRef<CornerPosition | null>(null);

const handlePointerMove = (e) => {
  const corner = findNearestCorner(...);

  // 이전 값과 다를 때만 업데이트
  if (corner !== hoveredCornerRef.current) {
    hoveredCornerRef.current = corner;
    setHoveredCorner(corner);
  }
};
```

#### 핸들 렌더링 (BorderRadiusHandles)
```typescript
// hover된 코너만 렌더링 (조건부 렌더링)
if (!hoveredCorner) return null;

return <BorderRadiusHandle corner={hoveredCorner} ... />;
```

#### 인스펙터 패널 (선택적)
```typescript
// useDeferredValue로 Long Task 감소
export const useDebouncedBorderRadius = () => {
  const currentRadius = useBorderRadiusValue();
  return useDeferredValue(currentRadius);
};
```

---

## 5. 구현 순서

### Step 1: borderRadiusTypes.ts
- CornerPosition 타입
- 상수 정의 (CORNER_HOVER_DISTANCE, BORDER_RADIUS_HANDLE_SIZE 등)
- 유틸리티 함수 (findNearestCorner, calculateDiagonalDistance)

### Step 2: useBorderRadiusDragPixi.ts
- ref 기반 드래그 상태 관리
- 시간 기반 스로틀링
- document 레벨 이벤트 핸들링
- Store 업데이트 로직

### Step 3: BorderRadiusHandle.tsx
- PixiJS Graphics로 원형 핸들 렌더링
- zoom 독립적 크기
- eventMode="static"

### Step 4: BorderRadiusHandles.tsx
- hoveredCorner에 해당하는 핸들만 렌더링
- 핸들 위치 계산 (radius 비례 오프셋)

### Step 5: SelectionBox.tsx 수정
- onPointerMove로 마우스 위치 추적
- findNearestCorner로 hover 코너 감지
- **값 변경 시에만 state 업데이트** (불필요한 리렌더링 방지)
- BorderRadiusHandles 렌더링

```typescript
// ⚡ 퍼포먼스 최적화: ref로 이전 값 추적
const hoveredCornerRef = useRef<CornerPosition | null>(null);
const [hoveredCorner, setHoveredCorner] = useState<CornerPosition | null>(null);

const handlePointerMove = useCallback((e: FederatedPointerEvent) => {
  if (!showHandles) return;

  const local = e.getLocalPosition(e.currentTarget);
  const corner = findNearestCorner(local.x, local.y, width, height, zoom);

  // ⚡ 값이 변경된 경우에만 state 업데이트
  if (corner !== hoveredCornerRef.current) {
    hoveredCornerRef.current = corner;
    setHoveredCorner(corner);
  }
}, [showHandles, width, height, zoom]);

const handlePointerLeave = useCallback(() => {
  if (hoveredCornerRef.current !== null) {
    hoveredCornerRef.current = null;
    setHoveredCorner(null);
  }
}, []);
```

### Step 6: SelectionLayer.tsx 수정
- 선택된 요소의 borderRadius 값 구독
- onDragUpdate, onDragEnd 콜백 연결

---

## 6. 테스트 체크리스트

- [ ] 단일 요소 선택 시 모서리 근처 hover에서 핸들 표시
- [ ] 다중 선택 시 핸들 숨김
- [ ] 대각선 드래그로 borderRadius 조절
- [ ] Shift+드래그로 4개 모서리 동시 조절
- [ ] 줌 레벨 변경 시 핸들 크기 일정
- [ ] 드래그 중 60fps 유지
- [ ] ESC 키로 드래그 취소
- [ ] 최대 radius 제한 (요소 크기의 절반)

---

## 7. 참조 파일

| 파일 | 역할 |
|------|------|
| `overlay/hooks/useBorderRadiusDrag.ts` | 기존 iframe용 드래그 로직 (참조) |
| `selection/TransformHandle.tsx` | PixiJS 핸들 렌더링 패턴 |
| `selection/useDragInteraction.ts` | 드래그 최적화 패턴 |
| `selection/types.ts` | 타입/상수 정의 패턴 |
| `docs/performance/13-webgl-canvas-optimization-final.md` | 성능 최적화 지침 |
