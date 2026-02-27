/**
 * Selection Layer
 *
 * 🚀 Phase 10 B1.3: 선택 시스템 통합 레이어
 * 🚀 Phase 19: 성능 최적화 - selectionBoxRef를 통한 imperative 업데이트
 *
 * 기능:
 * - 선택된 요소의 SelectionBox 표시
 * - Transform 핸들로 리사이즈
 * - 드래그로 이동
 * - 라쏘 선택
 *
 * @since 2025-12-11 Phase 10 B1.3
 * @updated 2025-12-23 Phase 19 성능 최적화
 */

import { useCallback, useMemo, memo, type RefObject, useState, useEffect } from 'react';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { useStore } from '../../../stores';
import { SelectionBox, type SelectionBoxHandle } from './SelectionBox';
import { LassoSelection } from './LassoSelection';
import type { BoundingBox, HandlePosition, CursorStyle, DragState } from './types';
import { calculateCombinedBounds } from './types';
import { getElementBoundsSimple, getElementContainer } from '../elementRegistry';
import { getViewportController } from '../viewport/ViewportController';
import type { Container } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';

// ============================================
// Camera-local 좌표 헬퍼
// ============================================

/**
 * PixiJS 부모 체인을 탐색하여 Camera-local 좌표를 직접 계산
 *
 * panOffset(React state)에 의존하지 않아 팬 중에도 항상 정확.
 * DirectContainer가 x/y를 직접 설정하므로 각 노드의 position을 합산하면
 * Camera 기준 로컬 좌표가 된다.
 */
function getCameraLocalPosition(container: Container): { x: number; y: number } | null {
  let x = 0, y = 0;
  let node: Container | null = container;
  while (node) {
    if (node.label === 'Camera') {
      return { x, y };
    }
    x += node.position.x;
    y += node.position.y;
    node = node.parent as Container | null;
  }
  return null; // Camera 바깥 요소
}

// ============================================
// Types
// ============================================

export interface SelectionLayerProps {
  /** 드래그 상태 */
  dragState: DragState;
  /** 페이지 너비 (Body 선택용) */
  pageWidth?: number;
  /** 페이지 높이 (Body 선택용) */
  pageHeight?: number;
  /** 페이지 위치 맵 (Body 선택/바운드용) */
  pagePositions?: Record<string, { x: number; y: number }>;
  /** 페이지 위치 변경 버전 */
  pagePositionsVersion?: number;
  /** 현재 줌 레벨 (핸들 크기 유지용) */
  zoom?: number;
  /** 🚀 Phase 7: Pan offset for coordinate transformation */
  panOffset?: { x: number; y: number };
  /** 드래그 시작 콜백 */
  onResizeStart?: (
    elementId: string,
    handle: HandlePosition,
    bounds: BoundingBox,
    position: { x: number; y: number }
  ) => void;
  /** 이동 시작 콜백 */
  onMoveStart?: (
    elementId: string,
    bounds: BoundingBox,
    position: { x: number; y: number }
  ) => void;
  /** 커서 변경 콜백 */
  onCursorChange?: (cursor: CursorStyle) => void;
  /**
   * 🚀 Phase 19: SelectionBox imperative handle ref
   * 드래그 중 React 리렌더링 없이 위치 업데이트용
   */
  selectionBoxRef?: RefObject<SelectionBoxHandle | null>;
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
  pageWidth = 1920,
  pageHeight = 1080,
  pagePositions,
  pagePositionsVersion: _pagePositionsVersion = 0,
  zoom = 1,
  panOffset = { x: 0, y: 0 },
  onResizeStart,
  onMoveStart,
  onCursorChange,
  selectionBoxRef,
}: SelectionLayerProps) {
  useExtend(PIXI_COMPONENTS);

  // Store state
  // 🚀 성능 최적화: elementsMap 전체 구독 제거
  // 기존: elementsMap 구독 → 어떤 요소든 변경되면 SelectionLayer 리렌더
  // 개선: selectedElementIds + 선택된 요소의 스타일 변경만 구독
  const selectedElementIds = useStore((state) => state.selectedElementIds);
  const currentPageId = useStore((state) => state.currentPageId);

  // 🚀 최적화: elementsMap은 구독하지 않고 getState()로 읽음
  const getElementsMap = useCallback(() => useStore.getState().elementsMap, []);

  // 선택된 요소들 (Body 포함)
  // 🚀 최적화: getState()로 elementsMap 조회 (구독 없음)
  const selectedElements = useMemo(() => {
    if (!currentPageId || selectedElementIds.length === 0) return [];
    const elementsMap = getElementsMap();
    const resolved: Element[] = [];
    for (const id of selectedElementIds) {
      const el = elementsMap.get(id);
      if (el && el.page_id === currentPageId) {
        resolved.push(el);
      }
    }
    return resolved;
  }, [currentPageId, selectedElementIds, getElementsMap]);

  // 🚀 최적화: childrenMap 활용하여 O(n) → O(selected) 개선
  // 기존: elementsMap.forEach로 전체 요소 순회 (O(n))
  // 개선: childrenMap에서 선택된 요소의 자식 여부만 확인 (O(selected))
  const getChildrenMap = useCallback(() => useStore.getState().childrenMap, []);

  const hasChildrenIdSet = useMemo(() => {
    if (selectedElementIds.length === 0) return new Set<string>();
    const childrenMap = getChildrenMap();
    const set = new Set<string>();
    for (const id of selectedElementIds) {
      const children = childrenMap.get(id);
      if (children && children.length > 0) {
        set.add(id);
      }
    }
    return set;
  }, [selectedElementIds, getChildrenMap]);

  // 🚀 Phase 2: ElementRegistry의 getBounds() 사용으로 전환
  // 🚀 Phase 7: Camera 로컬 좌표 계산
  // 개선: PixiJS 부모 체인을 직접 탐색하여 Camera-local 좌표 계산
  // panOffset(React state)에 의존하지 않아 팬/줌 중에도 항상 정확
  const computeSelectionBounds = useCallback(() => {
    if (selectedElements.length === 0) return null;

    // 실시간 zoom 조회 (ViewportController > prop fallback)
    const controller = getViewportController();
    const currentZoom = controller?.getState()?.scale ?? zoom;

    const boxes = selectedElements.map((el) => {
      // Body 요소는 페이지 전체 크기로 설정 (이미 Camera 로컬 좌표)
      if (el.tag.toLowerCase() === 'body') {
        const pos = el.page_id ? pagePositions?.[el.page_id] : undefined;
        return {
          x: pos?.x ?? 0,
          y: pos?.y ?? 0,
          width: pageWidth,
          height: pageHeight,
        };
      }

      // 우선: PixiJS 부모 체인에서 Camera-local 좌표 직접 계산
      // panOffset 불필요 → 팬 중에도 정확
      const container = getElementContainer(el.id);
      if (container) {
        const localPos = getCameraLocalPosition(container);
        if (localPos) {
          const bounds = getElementBoundsSimple(el.id);
          return {
            x: localPos.x,
            y: localPos.y,
            width: (bounds?.width ?? 100) / currentZoom,
            height: (bounds?.height ?? 40) / currentZoom,
          };
        }
      }

      // fallback: 기존 panOffset 기반 변환
      const bounds = getElementBoundsSimple(el.id);
      if (bounds) {
        const localX = (bounds.x - panOffset.x) / currentZoom;
        const localY = (bounds.y - panOffset.y) / currentZoom;
        const localWidth = bounds.width / currentZoom;
        const localHeight = bounds.height / currentZoom;
        return { x: localX, y: localY, width: localWidth, height: localHeight };
      }
      // fallback: 기본값
      return { x: 0, y: 0, width: 100, height: 40 };
    });

    return calculateCombinedBounds(boxes);
  }, [
    selectedElements,
    pageWidth,
    pageHeight,
    zoom,
    panOffset,
    pagePositions,
  ]);

  // 🚀 Phase 2: 선택 변경 시 bounds 계산
  // ElementRegistry의 getBounds()를 사용하여 실제 렌더링된 위치 조회
  const [selectionBounds, setSelectionBounds] = useState<BoundingBox | null>(null);

  // layoutBoundsRegistry에 직접 저장된 bounds를 사용하므로 getBounds() 타이밍 문제 없음.
  // LayoutContainer의 useEffect(RAF)가 bounds를 저장한 후, 다음 프레임에서 조회.
  useEffect(() => {
    let cancelled = false;
    requestAnimationFrame(() => {
      if (!cancelled) {
        const bounds = computeSelectionBounds();
        setSelectionBounds(bounds);
      }
    });
    return () => { cancelled = true; };
  }, [computeSelectionBounds]);

  // 단일 선택 여부
  const isSingleSelection = selectedElements.length === 1;

  // 컨테이너 요소 선택 여부 (자식이 있는 요소 선택 시 이동 영역 비활성화 - 자식 요소 클릭 허용)
  const isContainerSelected = useMemo(() => {
    if (selectedElements.length === 0) return false;

    // 선택된 요소 중 자식 요소가 있는 컨테이너가 있는지 확인
    return selectedElements.some((selectedEl) => {
      // Body는 항상 컨테이너
      if (selectedEl.tag.toLowerCase() === 'body') return true;

      return hasChildrenIdSet.has(selectedEl.id);
    });
  }, [selectedElements, hasChildrenIdSet]);

  // 핸들 드래그 시작
  const handleResizeStart = useCallback(
    (handle: HandlePosition, position: { x: number; y: number }) => {
      if (!selectionBounds || selectedElements.length === 0) return;

      // 단일 선택 시에만 리사이즈 지원
      if (isSingleSelection) {
        const element = selectedElements[0];
        onResizeStart?.(element.id, handle, selectionBounds, position);
      }
    },
    [selectionBounds, selectedElements, isSingleSelection, onResizeStart]
  );

  // 이동 드래그 시작
  const handleMoveStart = useCallback(
    (position: { x: number; y: number }) => {
      if (!selectionBounds || selectedElements.length === 0) return;

      // 단일 선택 또는 다중 선택 모두 이동 지원
      const element = selectedElements[0];
      onMoveStart?.(element.id, selectionBounds, position);
    },
    [selectionBounds, selectedElements, onMoveStart]
  );

  // 커서 변경
  const handleCursorChange = useCallback(
    (cursor: CursorStyle) => {
      onCursorChange?.(cursor);
    },
    [onCursorChange]
  );

  return (
    <pixiContainer label="SelectionLayer">
      {/* 선택 박스 (선택된 요소가 있을 때) */}
      {selectionBounds && selectedElements.length > 0 && (
        <SelectionBox
          ref={selectionBoxRef}
          bounds={selectionBounds}
          showHandles={isSingleSelection}
          enableMoveArea={!isContainerSelected}
          zoom={zoom}
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
            zoom={zoom}
          />
        )}
    </pixiContainer>
  );
});

export default SelectionLayer;
