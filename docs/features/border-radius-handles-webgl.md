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
 * 핸들 색상 (테마 토큰 fallback)
 */
export const BORDER_RADIUS_HANDLE_COLOR = 0x3b82f6;

/**
 * ⚡ Hover 디바운스 시간 (ms) - 깜빡임 방지
 */
export const HOVER_DEBOUNCE_MS = 30;

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

> **색상 토큰 주의**: `BORDER_RADIUS_HANDLE_COLOR`는 하드코딩 값이 아니라 `cssVariableReader` 기반 테마 컬러를 우선 사용하고, 해당 값은 폴백으로만 둡니다.

### 3.2 BorderRadiusHandle.tsx

```typescript
import { memo, useCallback, useMemo } from 'react';
import { Graphics as PixiGraphics, FederatedPointerEvent, Circle } from 'pixi.js';
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
  /** ⚡ 테마 색상을 부모에서 props로 전달 (훅 호출 방지) */
  handleColor?: number;
  onDragStart: (corner: CornerPosition, e: FederatedPointerEvent) => void;
}

export const BorderRadiusHandle = memo(function BorderRadiusHandle({
  corner,
  x,
  y,
  zoom,
  handleColor = BORDER_RADIUS_HANDLE_COLOR,
  onDragStart,
}: BorderRadiusHandleProps) {
  useExtend(PIXI_COMPONENTS);

  // 줌 독립적 크기
  const radius = BORDER_RADIUS_HANDLE_SIZE / zoom;
  const strokeWidth = 1.5 / zoom;

  // ⚡ hitArea 확장 (클릭 영역 +4px)
  const hitArea = useMemo(() => {
    const hitRadius = (BORDER_RADIUS_HANDLE_SIZE + 4) / zoom;
    return new Circle(0, 0, hitRadius);
  }, [zoom]);

  const draw = useCallback((g: PixiGraphics) => {
    g.clear();
    g.circle(0, 0, radius);
    g.fill({ color: handleColor });
    g.setStrokeStyle({ width: strokeWidth, color: 0xffffff });
    g.stroke();
  }, [radius, strokeWidth, handleColor]);

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
      hitArea={hitArea}
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
import { BORDER_RADIUS_HANDLE_COLOR } from './borderRadiusTypes';
import type { FederatedPointerEvent } from 'pixi.js';

export interface BorderRadiusHandlesProps {
  hoveredCorner: CornerPosition | null;
  boundsWidth: number;
  boundsHeight: number;
  currentRadius: number;
  zoom: number;
  /** ⚡ 테마 색상을 부모(SelectionLayer)에서 전달 */
  handleColor?: number;
  onDragStart: (corner: CornerPosition, e: FederatedPointerEvent) => void;
}

export const BorderRadiusHandles = memo(function BorderRadiusHandles({
  hoveredCorner,
  boundsWidth,
  boundsHeight,
  currentRadius,
  zoom,
  handleColor = BORDER_RADIUS_HANDLE_COLOR,
  onDragStart,
}: BorderRadiusHandlesProps) {
  useExtend(PIXI_COMPONENTS);

  // ⚡ 단일 코너만 계산 (4개 모두 계산하지 않음)
  const handlePosition = useMemo(() => {
    if (!hoveredCorner) return null;

    const getOffset = (radius: number) => {
      const minOffset = 4 / zoom;
      const radiusOffset = radius * 0.5;
      return minOffset + radiusOffset;
    };

    const offset = getOffset(currentRadius);

    // ⚡ Math.round로 서브픽셀 렌더링 방지
    switch (hoveredCorner) {
      case 'topLeft':
        return { x: Math.round(offset), y: Math.round(offset) };
      case 'topRight':
        return { x: Math.round(boundsWidth - offset), y: Math.round(offset) };
      case 'bottomLeft':
        return { x: Math.round(offset), y: Math.round(boundsHeight - offset) };
      case 'bottomRight':
        return { x: Math.round(boundsWidth - offset), y: Math.round(boundsHeight - offset) };
      default:
        return null;
    }
  }, [hoveredCorner, boundsWidth, boundsHeight, currentRadius, zoom]);

  // hover된 코너만 렌더링 (조건부 렌더링)
  if (!hoveredCorner || !handlePosition) return null;

  return (
    <BorderRadiusHandle
      corner={hoveredCorner}
      x={handlePosition.x}
      y={handlePosition.y}
      zoom={zoom}
      handleColor={handleColor}
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

// ============================================
// RAF Throttle (useDragInteraction 패턴)
// ============================================

/**
 * ⚡ RAF 기반 스로틀 (프레임당 1회만 실행)
 */
function useRAFThrottle() {
  const rafIdRef = useRef<number | null>(null);
  const pendingCallbackRef = useRef<(() => void) | null>(null);

  const schedule = useCallback((callback: () => void) => {
    pendingCallbackRef.current = callback;

    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        pendingCallbackRef.current?.();
        pendingCallbackRef.current = null;
      });
    }
  }, []);

  const cancel = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    pendingCallbackRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  return { schedule, cancel };
}

// ============================================
// Types
// ============================================

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
  /** ⚡ ESC 키로 드래그 취소 시 콜백 */
  onDragCancel?: () => void;
}

// ============================================
// Hook
// ============================================

export function useBorderRadiusDragPixi(
  bounds: { width: number; height: number } | null,
  currentBorderRadius: number,
  options: UseBorderRadiusDragOptions = {}
) {
  const { onDragStart, onDragUpdate, onDragEnd, onDragCancel } = options;

  // ref 기반 상태 관리 (React 리렌더링 방지)
  const dragStateRef = useRef<DragState>({ ...initialDragState });
  const lastThrottleTimeRef = useRef<number>(0);

  // ⚡ RAF 스로틀링
  const { schedule: scheduleUpdate, cancel: cancelUpdate } = useRAFThrottle();

  // 마우스 이동 핸들러
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const state = dragStateRef.current;
    if (!state.isDragging || !state.corner) return;

    // ⚡ 시간 기반 스로틀링 (16ms = 60fps)
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

    // ⚡ RAF 스케줄링으로 콜백 호출
    scheduleUpdate(() => {
      onDragUpdate?.(newRadius, state.corner!);
    });
  }, [onDragUpdate, scheduleUpdate]);

  // 마우스 업 핸들러
  const handleMouseUp = useCallback((e: MouseEvent) => {
    // ⚡ pending RAF 취소
    cancelUpdate();

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
  }, [handleMouseMove, onDragEnd, cancelUpdate]);

  // ⚡ ESC 키로 드래그 취소
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && dragStateRef.current.isDragging) {
      // pending RAF 취소
      cancelUpdate();

      // 이벤트 리스너 제거
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // 상태 초기화
      dragStateRef.current = { ...initialDragState };

      onDragCancel?.();
    }
  }, [cancelUpdate, handleMouseMove, handleMouseUp, onDragCancel]);

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
    document.addEventListener('keydown', handleKeyDown);
  }, [bounds, currentBorderRadius, onDragStart, handleMouseMove, handleMouseUp, handleKeyDown]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      cancelUpdate();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleMouseMove, handleMouseUp, handleKeyDown, cancelUpdate]);

  return {
    startDrag,
    isDragging: dragStateRef.current.isDragging,
    activeCorner: dragStateRef.current.corner,
  };
}
```

> **WebGL 적용 시 변경 포인트**
> - `MouseEvent` 대신 `FederatedPointerEvent` 사용
> - `document.addEventListener` 대신 `app.stage.on/off` 또는 상위 컨테이너 이벤트 사용
> - `e.getLocalPosition(selectionContainer)`로 로컬 델타 계산

### 3.5 WebGL 전용 보완 사항

#### 3.5.1 좌표계/줌
- **좌표계 통일**: 드래그 시작/이동/종료 모두 Pixi 좌표로 처리합니다. `FederatedPointerEvent.getLocalPosition(selectionContainer)` 기준으로 델타를 계산하고 DOM `clientX/Y`와 혼용하지 않습니다.
- **줌 보정**: `selectionContainer`가 `viewport` 스케일을 포함한다면 로컬 좌표 사용만으로 보정이 됩니다. DOM 좌표를 써야 한다면 `delta / zoom` 보정을 반드시 적용합니다.
- **로테이션/스케일**: 회전/스케일이 적용된 선택 박스에서도 일관된 델타를 얻으려면 항상 로컬 좌표를 사용합니다.

#### 3.5.2 이벤트 처리 전략
- **Pixi pointer 이벤트 사용**: `pointerdown`은 핸들에서, `pointermove`/`pointerup`/`pointerupoutside`는 `app.stage` 또는 상위 컨테이너에 등록합니다.
- **포인터 추적**: `pointerId`를 저장해 멀티 포인터 입력을 무시합니다.
- **리스너 정리**: 드래그 종료/취소 시 `pointermove`, `pointerup`, `pointerupoutside`, `keydown` 리스너를 모두 제거합니다. `keydown`은 mouseup에서도 반드시 해제합니다.

#### 3.5.3 Store 업데이트 흐름 (WebGL)
- **실시간 미리보기**: `onDragUpdate`에서 `updateSelectedStyle(s)`를 호출해 WebGL 프리뷰를 즉시 갱신합니다.
- **커밋 시점 분리**: DB 저장/동기화는 drag end에서만 수행합니다(메모리 상태 → preview → DB 순서 유지).
- **히스토리 최소화**: undo/redo 히스토리는 drag end에서만 기록되도록 처리합니다.
- **ESC 취소 복원**: 드래그 시작 시 `initialRadius`를 저장해두고 `onDragCancel`에서 해당 값을 store에 복원합니다.
- **Shift 상태 반영**: 드래그 중 `event.shiftKey`를 읽어 즉시 반영합니다(마우스 업 시점만 확인하면 UX가 어긋날 수 있음).

#### 3.5.4 값/단위 처리 규칙
- **기본 단위**: 드래그 조절 값은 px 기준으로 계산합니다.
- **percent 처리 정책 필요**: `borderRadius: "50%"` 등 퍼센트 값이 있으면 `min(width, height)` 기준 px로 변환해 표시하거나, 편집 시점에 px로 정규화합니다. 문서에 명시된 정책대로 일관되게 저장합니다.
- **혼합 값**: 코너별 값이 다른 경우(혼합)에는 hover 시 해당 코너만 조절하고 Shift로 전체를 덮어씁니다.

#### 3.5.5 Hover/Hit 영역
- **히트 영역 확장**: `CORNER_HOVER_DISTANCE / zoom`만큼 selection hitArea를 확장해 코너 바깥에서도 hover가 안정적으로 동작하게 합니다.
- **멀티 선택 제한**: 다중 선택 시 핸들 숨김을 유지합니다(드래그 UX 충돌 방지).

---

### 3.6 UI 피드백 및 레이어링

- **핸들 레이어링**: Selection overlay 최상단에 렌더링하고, 선택 테두리/리사이즈 핸들보다 위에 배치합니다.
- **테마 컬러 연동**: M3 토큰에서 핸들 색을 읽고(예: primary/outline) 다크/라이트 테마를 모두 지원합니다.
- **드래그 툴팁(선택)**: 코너 근처 드래그 시 현재 px 값을 간단한 텍스트로 표시합니다(예: Pixi Text 또는 DOM overlay).
- **히트 영역 확장**: 손잡이 원 크기보다 큰 `hitArea`를 설정해 미스 클릭을 줄입니다.
- **상호작용 충돌 방지**: 드래그 중에는 viewport pan/zoom 입력을 비활성화하거나 `stopPropagation` 처리합니다.

## 4. 성능 최적화

> 참조: `docs/performance/13-webgl-canvas-optimization-final.md`

### 4.1 기여도 분석

| 기술 | 기여율 | 적용 위치 |
|------|--------|----------|
| RAF + 시간 기반 스로틀링 | ~25% | `useBorderRadiusDragPixi` 드래그 중 |
| ref 기반 상태 | ~20% | 드래그 중간 상태 |
| **값 변경 시에만 업데이트** | ~12% | hover 감지 (리렌더링 방지) |
| **단일 코너만 계산** | ~10% | `BorderRadiusHandles` (4개 → 1개) |
| Hover debounce | ~8% | 깜빡임 방지 |
| **테마 색상 props 전달** | ~6% | 핸들 내 훅 호출 방지 |
| 조건부 렌더링 | ~5% | hover 코너만 표시 |
| **hitArea 확장** | ~5% | 클릭 성공률 + UX |
| cancelUpdate (RAF 취소) | ~4% | 드래그 종료/취소 시 |
| **Store selector 최적화** | ~3% | shallow 비교 |
| useDeferredValue | ~2% | 인스펙터 패널 |

### 4.2 최적화 전략

#### 드래그 중 (핵심)
```typescript
// 1. ref 기반 상태 관리 (React 리렌더링 방지)
const dragStateRef = useRef<DragState>({ ... });

// 2. RAF + 시간 기반 이중 스로틀링
const { schedule: scheduleUpdate, cancel: cancelUpdate } = useRAFThrottle();

const now = performance.now();
if (now - lastThrottleTimeRef.current < TIMING.DRAG_THROTTLE) {
  return;
}

// 3. RAF 스케줄링으로 콜백 호출
scheduleUpdate(() => {
  onDragUpdate?.(newRadius, corner);
});
```

#### 드래그 종료/취소 시 RAF 정리
```typescript
// ⚡ pending RAF 취소 (불필요한 콜백 실행 방지)
const handleMouseUp = useCallback(() => {
  cancelUpdate(); // 먼저 취소
  // ... 종료 로직
}, [cancelUpdate]);

// ⚡ ESC 키로 드래그 취소
const handleKeyDown = useCallback((e: KeyboardEvent) => {
  if (e.key === 'Escape' && dragStateRef.current.isDragging) {
    cancelUpdate();
    dragStateRef.current = { ...initialDragState };
    onDragCancel?.();
  }
}, [cancelUpdate, onDragCancel]);
```

#### Hover 감지 (SelectionBox)
```typescript
// ⚡ 값 변경 시에만 state 업데이트 + debounce로 깜빡임 방지
const hoveredCornerRef = useRef<CornerPosition | null>(null);
const hoverDebounceRef = useRef<NodeJS.Timeout | null>(null);

const handlePointerMove = useCallback((e) => {
  const corner = findNearestCorner(...);

  // 이전 값과 다를 때만 처리
  if (corner !== hoveredCornerRef.current) {
    // pending debounce 취소
    if (hoverDebounceRef.current) {
      clearTimeout(hoverDebounceRef.current);
    }

    if (corner === null) {
      // ⚡ 코너 벗어날 때는 30ms 딜레이 (깜빡임 방지)
      hoverDebounceRef.current = setTimeout(() => {
        hoveredCornerRef.current = null;
        setHoveredCorner(null);
      }, 30);
    } else {
      // 코너 진입은 즉시
      hoveredCornerRef.current = corner;
      setHoveredCorner(corner);
    }
  }
}, []);

// cleanup
useEffect(() => {
  return () => {
    if (hoverDebounceRef.current) {
      clearTimeout(hoverDebounceRef.current);
    }
  };
}, []);
```

#### 단일 코너만 계산 (BorderRadiusHandles)
```typescript
// ⚡ 4개 모두 계산하지 않고 hoveredCorner만 계산
const handlePosition = useMemo(() => {
  if (!hoveredCorner) return null;

  const offset = getOffset(currentRadius);

  // Math.round로 서브픽셀 방지
  switch (hoveredCorner) {
    case 'topLeft':
      return { x: Math.round(offset), y: Math.round(offset) };
    case 'topRight':
      return { x: Math.round(boundsWidth - offset), y: Math.round(offset) };
    // ...
  }
}, [hoveredCorner, boundsWidth, boundsHeight, currentRadius, zoom]);
```

#### 테마 색상 props 전달
```typescript
// ❌ 핸들 내부에서 훅 호출 (매 렌더마다 호출)
const BorderRadiusHandle = () => {
  const colors = useThemeColors();
  ...
}

// ✅ SelectionLayer에서 한 번만 호출하고 props로 전달
const SelectionLayer = () => {
  const colors = useThemeColors();
  return <BorderRadiusHandles handleColor={colors.primary} ... />;
}
```

#### hitArea 확장 (BorderRadiusHandle)
```typescript
// ⚡ 클릭 영역을 핸들 크기보다 크게 설정
const hitArea = useMemo(() => {
  const hitRadius = (BORDER_RADIUS_HANDLE_SIZE + 4) / zoom;
  return new Circle(0, 0, hitRadius);
}, [zoom]);

<pixiGraphics hitArea={hitArea} ... />
```

#### Store selector 최적화 (SelectionLayer)
```typescript
import { shallow } from 'zustand/shallow';

// ⚡ shallow 비교 + selector로 불필요한 리렌더링 방지
const borderRadius = useStore(
  useCallback((state) => {
    const el = state.elements[selectedId];
    return el?.style?.borderRadius ?? 0;
  }, [selectedId]),
  shallow
);
```

#### 핸들 렌더링 (BorderRadiusHandles)
```typescript
// hover된 코너만 렌더링 (조건부 렌더링)
if (!hoveredCorner) return null;

return <BorderRadiusHandle corner={hoveredCorner} ... />;
```

#### 인스펙터 패널
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
- 상수 정의 (CORNER_HOVER_DISTANCE, BORDER_RADIUS_HANDLE_SIZE, HOVER_DEBOUNCE_MS 등)
- 유틸리티 함수 (findNearestCorner, calculateDiagonalDistance)

```typescript
/** ⚡ Hover 디바운스 시간 (ms) - 깜빡임 방지 */
export const HOVER_DEBOUNCE_MS = 30;
```

### Step 2: useBorderRadiusDragPixi.ts
- ⚡ **useRAFThrottle 훅** (useDragInteraction 패턴)
- ref 기반 드래그 상태 관리
- ⚡ **RAF + 시간 기반 이중 스로틀링**
- Pixi pointer 이벤트(`pointermove`, `pointerup`, `pointerupoutside`) 기반 처리
- `pointerId` 추적으로 멀티 포인터 입력 무시
- ⚡ **ESC 키 취소 처리** + onDragCancel 콜백
- ⚡ **cancelUpdate** - 드래그 종료/취소 시 pending RAF 정리
- Store 업데이트 로직 (Shift 키 지원)

### Step 3: BorderRadiusHandle.tsx
- PixiJS Graphics로 원형 핸들 렌더링
- zoom 독립적 크기
- eventMode="static"
- 모든 콜백 useCallback 래핑
- ⚡ **hitArea 확장** (`Circle(0, 0, hitRadius)`) - 클릭 성공률 개선
- ⚡ **handleColor props** - 테마 색상을 부모에서 전달 (훅 호출 방지)

### Step 4: BorderRadiusHandles.tsx
- hoveredCorner에 해당하는 핸들만 렌더링 (조건부 렌더링)
- ⚡ **단일 코너만 계산** - 4개 모두 계산하지 않음
- ⚡ **Math.round로 서브픽셀 방지**
- handleColor props를 자식에게 전달

### Step 5: SelectionBox.tsx 수정
- onPointerMove로 마우스 위치 추적
- findNearestCorner로 hover 코너 감지
- ⚡ **값 변경 시에만 state 업데이트** (불필요한 리렌더링 방지)
- ⚡ **Hover debounce** (30ms) - 깜빡임 방지
- BorderRadiusHandles 렌더링
- selection 컨테이너 `eventMode="static"` + `hitArea` 확장

```typescript
// ⚡ 퍼포먼스 최적화: ref로 이전 값 추적 + debounce
const hoveredCornerRef = useRef<CornerPosition | null>(null);
const hoverDebounceRef = useRef<NodeJS.Timeout | null>(null);
const [hoveredCorner, setHoveredCorner] = useState<CornerPosition | null>(null);

const handlePointerMove = useCallback((e: FederatedPointerEvent) => {
  if (!showHandles) return;

  const local = e.getLocalPosition(e.currentTarget);
  const corner = findNearestCorner(local.x, local.y, width, height, zoom);

  // 값이 변경된 경우에만 처리
  if (corner !== hoveredCornerRef.current) {
    // pending debounce 취소
    if (hoverDebounceRef.current) {
      clearTimeout(hoverDebounceRef.current);
    }

    if (corner === null) {
      // ⚡ 코너 벗어날 때는 30ms 딜레이 (깜빡임 방지)
      hoverDebounceRef.current = setTimeout(() => {
        hoveredCornerRef.current = null;
        setHoveredCorner(null);
      }, HOVER_DEBOUNCE_MS);
    } else {
      // 코너 진입은 즉시
      hoveredCornerRef.current = corner;
      setHoveredCorner(corner);
    }
  }
}, [showHandles, width, height, zoom]);

const handlePointerLeave = useCallback(() => {
  // pending debounce 취소
  if (hoverDebounceRef.current) {
    clearTimeout(hoverDebounceRef.current);
  }
  if (hoveredCornerRef.current !== null) {
    hoveredCornerRef.current = null;
    setHoveredCorner(null);
  }
}, []);

// cleanup
useEffect(() => {
  return () => {
    if (hoverDebounceRef.current) {
      clearTimeout(hoverDebounceRef.current);
    }
  };
}, []);
```

### Step 6: SelectionLayer.tsx 수정
- 선택된 요소의 borderRadius 값 구독
- ⚡ **Store selector 최적화** - shallow 비교 + useCallback selector
- ⚡ **useThemeColors** 훅 호출 → handleColor props로 전달
- onDragStart, onDragUpdate, onDragEnd, ⚡ **onDragCancel** 콜백 연결
- ⚡ **useDeferredValue**로 인스펙터 업데이트 분리 (선택적)

```typescript
// ⚡ SelectionLayer에서 테마 색상 + Store 최적화
import { shallow } from 'zustand/shallow';
import { useThemeColors } from '../hooks/useThemeColors';

const SelectionLayer = () => {
  // 테마 색상 한 번만 호출
  const colors = useThemeColors();

  // Store selector 최적화
  const borderRadius = useStore(
    useCallback((state) => {
      const el = state.elements[selectedId];
      return parseBorderRadius(el?.style?.borderRadius);
    }, [selectedId]),
    shallow
  );

  return (
    <BorderRadiusHandles
      handleColor={colors.primary}
      currentRadius={borderRadius}
      ...
    />
  );
};
```

---

## 6. 테스트 체크리스트

### 기능 테스트
- [ ] 단일 요소 선택 시 모서리 근처 hover에서 핸들 표시
- [ ] 다중 선택 시 핸들 숨김
- [ ] 대각선 드래그로 borderRadius 조절
- [ ] Shift+드래그로 4개 모서리 동시 조절
- [ ] 드래그 중 Shift 토글 시 즉시 반영
- [ ] 줌 레벨 변경 시 핸들 크기 일정
- [ ] ESC 키로 드래그 취소 (원래 값 복원)
- [ ] pointerupoutside에서도 드래그 종료 처리
- [ ] 최대 radius 제한 (요소 크기의 절반)
- [ ] percent 값이 있는 요소에서 px 변환/정규화 정책 적용
- [ ] 드래그 1회당 히스토리 1개만 기록

### 성능 테스트
- [ ] 드래그 중 60fps 유지
- [ ] hover 시 깜빡임 없음 (debounce 동작)
- [ ] 빠른 마우스 이동에도 핸들 안정적 표시
- [ ] 드래그 종료 후 불필요한 콜백 없음 (cancelUpdate 동작)
- [ ] 테마 변경 시 핸들 색상 즉시 반영
- [ ] hitArea 확장으로 작은 핸들도 클릭 용이
- [ ] Store 변경 시 불필요한 리렌더링 없음 (React DevTools 확인)

---

## 7. 참조 파일

| 파일 | 역할 |
|------|------|
| `overlay/hooks/useBorderRadiusDrag.ts` | 기존 iframe용 드래그 로직 (참조) |
| `selection/TransformHandle.tsx` | PixiJS 핸들 렌더링 패턴 |
| `selection/useDragInteraction.ts` | 드래그 최적화 패턴 |
| `selection/types.ts` | 타입/상수 정의 패턴 |
| `docs/performance/13-webgl-canvas-optimization-final.md` | 성능 최적화 지침 |
