/**
 * Selection Layer
 *
 * 🚀 Phase 10 B1.3: 선택 시스템 통합 레이어
 *
 * 기능:
 * - 선택된 요소의 SelectionBox 표시
 * - Transform 핸들로 리사이즈
 * - 드래그로 이동
 * - 라쏘 선택
 *
 * @since 2025-12-11 Phase 10 B1.3
 */

import { useCallback, useMemo, memo } from 'react';
import { Container } from '@pixi/react';
import { useStore } from '../../../stores';
import { SelectionBox } from './SelectionBox';
import { LassoSelection, getLassoBounds } from './LassoSelection';
import type { BoundingBox, HandlePosition, CursorStyle, DragState } from './types';
import { calculateBounds, calculateCombinedBounds, boxesIntersect } from './types';

// ============================================
// Types
// ============================================

export interface SelectionLayerProps {
  /** 드래그 상태 */
  dragState: DragState;
  /** 드래그 시작 콜백 */
  onResizeStart?: (elementId: string, handle: HandlePosition, bounds: BoundingBox) => void;
  /** 이동 시작 콜백 */
  onMoveStart?: (elementId: string, bounds: BoundingBox) => void;
  /** 커서 변경 콜백 */
  onCursorChange?: (cursor: CursorStyle) => void;
}

// ============================================
// Component
// ============================================

/**
 * SelectionLayer
 *
 * 캔버스의 선택 시스템을 관리하는 최상위 레이어입니다.
 */
export const SelectionLayer = memo(function SelectionLayer({
  dragState,
  onResizeStart,
  onMoveStart,
  onCursorChange,
}: SelectionLayerProps) {
  // Store state
  const elements = useStore((state) => state.elements);
  const selectedElementIds = useStore((state) => state.selectedElementIds);
  const currentPageId = useStore((state) => state.currentPageId);

  // 선택된 요소들
  const selectedElements = useMemo(() => {
    return elements.filter(
      (el) => selectedElementIds.includes(el.id) && el.page_id === currentPageId
    );
  }, [elements, selectedElementIds, currentPageId]);

  // 선택된 요소들의 바운딩 박스
  const selectionBounds = useMemo(() => {
    if (selectedElements.length === 0) return null;

    const boxes = selectedElements.map((el) =>
      calculateBounds(el.props?.style as Record<string, unknown> | undefined)
    );

    return calculateCombinedBounds(boxes);
  }, [selectedElements]);

  // 단일 선택 여부
  const isSingleSelection = selectedElements.length === 1;

  // 핸들 드래그 시작
  const handleResizeStart = useCallback(
    (handle: HandlePosition) => {
      if (!selectionBounds || selectedElements.length === 0) return;

      // 단일 선택 시에만 리사이즈 지원
      if (isSingleSelection) {
        const element = selectedElements[0];
        onResizeStart?.(element.id, handle, selectionBounds);
      }
    },
    [selectionBounds, selectedElements, isSingleSelection, onResizeStart]
  );

  // 이동 드래그 시작
  const handleMoveStart = useCallback(() => {
    if (!selectionBounds || selectedElements.length === 0) return;

    // 단일 선택 또는 다중 선택 모두 이동 지원
    const element = selectedElements[0];
    onMoveStart?.(element.id, selectionBounds);
  }, [selectionBounds, selectedElements, onMoveStart]);

  // 커서 변경
  const handleCursorChange = useCallback(
    (cursor: CursorStyle) => {
      onCursorChange?.(cursor);
    },
    [onCursorChange]
  );

  return (
    <pixiContainer>
      {/* 선택 박스 (선택된 요소가 있을 때) */}
      {selectionBounds && (
        <SelectionBox
          bounds={selectionBounds}
          showHandles={isSingleSelection}
          onDragStart={handleResizeStart}
          onMoveStart={handleMoveStart}
          onCursorChange={handleCursorChange}
        />
      )}

      {/* 라쏘 선택 (드래그 중) */}
      {dragState.isDragging &&
        dragState.operation === 'lasso' &&
        dragState.startPosition &&
        dragState.currentPosition && (
          <LassoSelection
            start={dragState.startPosition}
            current={dragState.currentPosition}
          />
        )}
    </pixiContainer>
  );
});

// ============================================
// Helper Hooks
// ============================================

/**
 * 라쏘 선택 영역과 교차하는 요소 찾기
 */
export function findElementsInLasso(
  elements: { id: string; props?: { style?: Record<string, unknown> } }[],
  lassoStart: { x: number; y: number },
  lassoCurrent: { x: number; y: number }
): string[] {
  const lassoBounds = getLassoBounds(lassoStart, lassoCurrent);

  return elements
    .filter((el) => {
      const elementBounds = calculateBounds(el.props?.style);
      return boxesIntersect(lassoBounds, elementBounds);
    })
    .map((el) => el.id);
}

export default SelectionLayer;
