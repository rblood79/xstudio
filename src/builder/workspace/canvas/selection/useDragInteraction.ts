/**
 * useDragInteraction Hook
 *
 * 🚀 Phase 10 B1.3: 드래그 인터랙션 관리
 * 🚀 Phase 19: 성능 최적화 - 드래그 중 React 리렌더링 방지
 *
 * 기능:
 * - 요소 이동 (Move)
 * - 요소 리사이즈 (Resize)
 * - 라쏘 선택 (Lasso)
 *
 * 최적화:
 * - 드래그 중에는 React state 업데이트 없이 콜백으로 PixiJS 직접 조작
 * - 드래그 종료 시에만 React state 동기화
 *
 * @since 2025-12-11 Phase 10 B1.3
 * @updated 2025-12-23 Phase 19 성능 최적화
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { DragState, HandlePosition, BoundingBox } from './types';
import { TIMING } from '../../../utils/timing';

// ============================================
// RAF Throttle
// ============================================

/**
 * RAF 기반 스로틀 (프레임당 1회만 실행)
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
// Initial State
// ============================================

const initialDragState: DragState = {
  isDragging: false,
  operation: null,
  startPosition: null,
  currentPosition: null,
  targetElementId: null,
  targetHandle: null,
  startBounds: null,
};

// ============================================
// Hook
// ============================================

export interface UseDragInteractionOptions {
  /** 이동 완료 콜백 */
  onMoveEnd?: (elementId: string, delta: { x: number; y: number }) => void;
  /** 리사이즈 완료 콜백 */
  onResizeEnd?: (
    elementId: string,
    handle: HandlePosition,
    newBounds: BoundingBox
  ) => void;
  /** 라쏘 선택 완료 콜백 */
  onLassoEnd?: (selectedIds: string[]) => void;
  /** 선택할 요소 찾기 */
  findElementsInLasso?: (
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) => string[];
  /**
   * 🚀 Phase 5: 드래그 시작 콜백 (해상도 조정 등)
   */
  onDragStart?: () => void;
  /**
   * 🚀 Phase 19: 드래그 중 실시간 콜백 (React 리렌더링 없이 PixiJS 직접 조작)
   * - Move: delta 전달
   * - Resize: newBounds 전달
   * - Lasso: start, current 전달
   */
  onDragUpdate?: (
    operation: 'move' | 'resize' | 'lasso',
    data: {
      delta?: { x: number; y: number };
      newBounds?: BoundingBox;
      start?: { x: number; y: number };
      current?: { x: number; y: number };
    }
  ) => void;
}

export interface UseDragInteractionReturn {
  /** 현재 드래그 상태 */
  dragState: DragState;
  /** 이동 시작 */
  startMove: (elementId: string, bounds: BoundingBox, position: { x: number; y: number }) => void;
  /** 리사이즈 시작 */
  startResize: (
    elementId: string,
    handle: HandlePosition,
    bounds: BoundingBox,
    position: { x: number; y: number }
  ) => void;
  /** 라쏘 선택 시작 */
  startLasso: (position: { x: number; y: number }) => void;
  /** 드래그 업데이트 (포인터 이동) */
  updateDrag: (position: { x: number; y: number }) => void;
  /** 드래그 종료 */
  endDrag: () => void;
  /** 드래그 취소 */
  cancelDrag: () => void;
}

export function useDragInteraction(
  options: UseDragInteractionOptions = {}
): UseDragInteractionReturn {
  const { onMoveEnd, onResizeEnd, onLassoEnd, findElementsInLasso, onDragStart, onDragUpdate } = options;

  const [dragState, setDragState] = useState<DragState>(initialDragState);

  // 중간 상태 저장용 ref (성능 최적화)
  const dragStateRef = useRef<DragState>(initialDragState);

  // 🚀 Phase 19: 마지막 스로틀 시간 추적
  const lastThrottleTimeRef = useRef<number>(0);

  // 🚀 RAF 스로틀링 (프레임당 1회만 상태 업데이트)
  const { schedule: scheduleUpdate, cancel: cancelUpdate } = useRAFThrottle();

  // 이동 시작
  const startMove = useCallback(
    (elementId: string, bounds: BoundingBox, position: { x: number; y: number }) => {
      // 🚀 Phase 5: 드래그 시작 콜백 (해상도 조정 등)
      onDragStart?.();

      const newState: DragState = {
        isDragging: true,
        operation: 'move',
        startPosition: position,
        currentPosition: position,
        targetElementId: elementId,
        targetHandle: null,
        startBounds: bounds,
      };
      dragStateRef.current = newState;
      setDragState(newState);
    },
    [onDragStart]
  );

  // 리사이즈 시작
  const startResize = useCallback(
    (
      elementId: string,
      handle: HandlePosition,
      bounds: BoundingBox,
      position: { x: number; y: number }
    ) => {
      // 🚀 Phase 5: 드래그 시작 콜백 (해상도 조정 등)
      onDragStart?.();

      const newState: DragState = {
        isDragging: true,
        operation: 'resize',
        startPosition: position,
        currentPosition: position,
        targetElementId: elementId,
        targetHandle: handle,
        startBounds: bounds,
      };
      dragStateRef.current = newState;
      setDragState(newState);
    },
    [onDragStart]
  );

  // 라쏘 선택 시작
  const startLasso = useCallback((position: { x: number; y: number }) => {
    // 🚀 Phase 5: 드래그 시작 콜백 (해상도 조정 등)
    onDragStart?.();

    const newState: DragState = {
      isDragging: true,
      operation: 'lasso',
      startPosition: position,
      currentPosition: position,
      targetElementId: null,
      targetHandle: null,
      startBounds: null,
    };
    dragStateRef.current = newState;
    setDragState(newState);
  }, [onDragStart]);

  // 드래그 업데이트 (🚀 Phase 19: React 리렌더링 없이 콜백만 호출)
  const updateDrag = useCallback((position: { x: number; y: number }) => {
    const state = dragStateRef.current;
    if (!state.isDragging) return;

    // 🚀 Phase 19: 시간 기반 스로틀링 (16ms = 60fps)
    const now = performance.now();
    if (now - lastThrottleTimeRef.current < TIMING.DRAG_THROTTLE) {
      return; // 스로틀 간격 내에서는 무시
    }
    lastThrottleTimeRef.current = now;

    // ref만 업데이트 (React state는 업데이트하지 않음!)
    const newState: DragState = {
      ...state,
      currentPosition: position,
    };
    dragStateRef.current = newState;

    // 🚀 Phase 19: 콜백을 통해 PixiJS 직접 조작 (React 리렌더링 없음)
    if (onDragUpdate && state.startPosition) {
      const { operation, startPosition, startBounds, targetHandle } = state;

      switch (operation) {
        case 'move': {
          const delta = {
            x: position.x - startPosition.x,
            y: position.y - startPosition.y,
          };
          onDragUpdate('move', { delta });
          break;
        }
        case 'resize': {
          if (startBounds && targetHandle) {
            const newBounds = calculateResizedBounds(
              startBounds,
              targetHandle,
              startPosition,
              position
            );
            onDragUpdate('resize', { newBounds });
          }
          break;
        }
        case 'lasso': {
          // 🚀 lasso는 React state 업데이트 필요 (LassoSelection 컴포넌트가 dragState 사용)
          scheduleUpdate(() => {
            setDragState(dragStateRef.current);
          });
          break;
        }
      }
    } else {
      // 🚀 onDragUpdate가 없으면 기존 방식 (React state 업데이트)
      scheduleUpdate(() => {
        setDragState(dragStateRef.current);
      });
    }
  }, [onDragUpdate, scheduleUpdate]);

  // 드래그 종료
  const endDrag = useCallback(() => {
    // 🚀 pending RAF 취소
    cancelUpdate();

    const state = dragStateRef.current;
    if (!state.isDragging) return;

    const { operation, startPosition, currentPosition, targetElementId, targetHandle, startBounds } =
      state;

    if (startPosition && currentPosition) {
      switch (operation) {
        case 'move':
          if (targetElementId) {
            const delta = {
              x: currentPosition.x - startPosition.x,
              y: currentPosition.y - startPosition.y,
            };
            onMoveEnd?.(targetElementId, delta);
          }
          break;

        case 'resize':
          if (targetElementId && targetHandle && startBounds) {
            const newBounds = calculateResizedBounds(
              startBounds,
              targetHandle,
              startPosition,
              currentPosition
            );
            onResizeEnd?.(targetElementId, targetHandle, newBounds);
          }
          break;

        case 'lasso':
          if (findElementsInLasso) {
            const selectedIds = findElementsInLasso(startPosition, currentPosition);
            onLassoEnd?.(selectedIds);
          }
          break;
      }
    }

    // 상태 초기화
    dragStateRef.current = initialDragState;
    setDragState(initialDragState);
  }, [onMoveEnd, onResizeEnd, onLassoEnd, findElementsInLasso, cancelUpdate]);

  // 드래그 취소
  const cancelDrag = useCallback(() => {
    // 🚀 pending RAF 취소
    cancelUpdate();
    dragStateRef.current = initialDragState;
    setDragState(initialDragState);
  }, [cancelUpdate]);

  return {
    dragState,
    startMove,
    startResize,
    startLasso,
    updateDrag,
    endDrag,
    cancelDrag,
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * 리사이즈된 바운딩 박스 계산
 */
function calculateResizedBounds(
  startBounds: BoundingBox,
  handle: HandlePosition,
  startPos: { x: number; y: number },
  currentPos: { x: number; y: number }
): BoundingBox {
  const dx = currentPos.x - startPos.x;
  const dy = currentPos.y - startPos.y;

  let { x, y, width, height } = startBounds;

  switch (handle) {
    case 'top-left':
      x += dx;
      y += dy;
      width -= dx;
      height -= dy;
      break;
    case 'top-center':
      y += dy;
      height -= dy;
      break;
    case 'top-right':
      y += dy;
      width += dx;
      height -= dy;
      break;
    case 'middle-right':
      width += dx;
      break;
    case 'bottom-right':
      width += dx;
      height += dy;
      break;
    case 'bottom-center':
      height += dy;
      break;
    case 'bottom-left':
      x += dx;
      width -= dx;
      height += dy;
      break;
    case 'middle-left':
      x += dx;
      width -= dx;
      break;
  }

  // 최소 크기 보장
  const minSize = 10;
  if (width < minSize) {
    if (handle.includes('left')) {
      x = startBounds.x + startBounds.width - minSize;
    }
    width = minSize;
  }
  if (height < minSize) {
    if (handle.includes('top')) {
      y = startBounds.y + startBounds.height - minSize;
    }
    height = minSize;
  }

  return { x, y, width, height };
}

export default useDragInteraction;
