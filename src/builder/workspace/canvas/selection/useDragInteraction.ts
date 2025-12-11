/**
 * useDragInteraction Hook
 *
 * 🚀 Phase 10 B1.3: 드래그 인터랙션 관리
 *
 * 기능:
 * - 요소 이동 (Move)
 * - 요소 리사이즈 (Resize)
 * - 라쏘 선택 (Lasso)
 *
 * @since 2025-12-11 Phase 10 B1.3
 */

import { useState, useCallback, useRef } from 'react';
import type { DragState, HandlePosition, BoundingBox, DragOperation } from './types';

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
  const { onMoveEnd, onResizeEnd, onLassoEnd, findElementsInLasso } = options;

  const [dragState, setDragState] = useState<DragState>(initialDragState);

  // 중간 상태 저장용 ref (성능 최적화)
  const dragStateRef = useRef<DragState>(initialDragState);

  // 이동 시작
  const startMove = useCallback(
    (elementId: string, bounds: BoundingBox, position: { x: number; y: number }) => {
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
    []
  );

  // 리사이즈 시작
  const startResize = useCallback(
    (
      elementId: string,
      handle: HandlePosition,
      bounds: BoundingBox,
      position: { x: number; y: number }
    ) => {
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
    []
  );

  // 라쏘 선택 시작
  const startLasso = useCallback((position: { x: number; y: number }) => {
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
  }, []);

  // 드래그 업데이트
  const updateDrag = useCallback((position: { x: number; y: number }) => {
    if (!dragStateRef.current.isDragging) return;

    const newState: DragState = {
      ...dragStateRef.current,
      currentPosition: position,
    };
    dragStateRef.current = newState;
    setDragState(newState);
  }, []);

  // 드래그 종료
  const endDrag = useCallback(() => {
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
  }, [onMoveEnd, onResizeEnd, onLassoEnd, findElementsInLasso]);

  // 드래그 취소
  const cancelDrag = useCallback(() => {
    dragStateRef.current = initialDragState;
    setDragState(initialDragState);
  }, []);

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
