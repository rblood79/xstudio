/**
 * Selection Layer
 *
 * 🚀 Phase 10 B1.3: 선택 시스템 통합 레이어
 * 🚀 Phase 19: 성능 최적화 - selectionBoxRef를 통한 imperative 업데이트
 * ADR-043 Phase 2: Drop Target Resolver 연결
 * ADR-043 Phase 4: Commit Path — reorder + history + DB persist
 *
 * 기능:
 * - 선택된 요소의 SelectionBox 표시
 * - Transform 핸들로 리사이즈
 * - 드래그로 이동 (Phase 2: 같은 부모 내 reorder 지원)
 * - 라쏘 선택
 *
 * @since 2025-12-11 Phase 10 B1.3
 * @updated 2025-12-23 Phase 19 성능 최적화
 * @updated 2026-03-29 ADR-043 Phase 2 Drop Target Resolver
 * @updated 2026-03-29 ADR-043 Phase 4 Commit Path
 */

import { useCallback, useMemo, memo, useState, useEffect, useRef } from "react";
import { useExtend } from "@pixi/react";
import { PIXI_COMPONENTS } from "../pixiSetup";
import { useStore } from "../../../stores";
import {
  getElementBoundsSimple,
  getElementContainer,
} from "../elementRegistry";
import {
  computeSelectionBounds as computeSelectionBoundsModel,
  resolveSelectedElementsForPage,
} from "../interaction";
import { SelectionBox, type SelectionBoxHandle } from "./SelectionBox";
import { useDragInteraction } from "./useDragInteraction";
import type { BoundingBox } from "./types";
import {
  resolveDropTarget,
  computeReorderFromDropTarget,
  type DropTarget,
  type DropIndicatorSnapshot,
} from "./dropTargetResolver";
import { historyManager } from "../../../stores/history";
import { getDB } from "../../../lib/db";

// ============================================
// Types
// ============================================

export interface SelectionLayerProps {
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
  /**
   * ADR-043 Phase 1: 드래그 콜백 refs
   * useCentralCanvasPointerHandlers에서 업데이트, SelectionLayer에서 구현
   */
  onStartMoveRef?: React.MutableRefObject<
    (
      elementId: string,
      bounds: BoundingBox,
      position: { x: number; y: number },
    ) => void
  >;
  onUpdateDragRef?: React.MutableRefObject<
    (position: { x: number; y: number }) => void
  >;
  onEndDragRef?: React.MutableRefObject<() => void>;
  /** ADR-043 Phase 5: 드래그 취소 콜백 ref (Escape 키) */
  onCancelDragRef?: React.MutableRefObject<() => void>;
  /**
   * ADR-043 Phase 3: drop indicator 상태 변경 알림 ref
   * SkiaOverlay RAF 루프에서 직접 읽는 ref — React state 사용 금지 (매 포인터 이벤트마다 갱신)
   */
  dropIndicatorSnapshotRef?: React.MutableRefObject<DropIndicatorSnapshot | null>;
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
  pageWidth = 1920,
  pageHeight = 1080,
  pagePositions,
  pagePositionsVersion: _pagePositionsVersion = 0,
  zoom = 1,
  panOffset = { x: 0, y: 0 },
  onStartMoveRef,
  onUpdateDragRef,
  onEndDragRef,
  onCancelDragRef,
  dropIndicatorSnapshotRef,
}: SelectionLayerProps) {
  useExtend(PIXI_COMPONENTS);

  // SelectionBox imperative handle ref (드래그 중 PixiJS 직접 조작)
  const selectionBoxRef = useRef<SelectionBoxHandle>(null);

  // ADR-043 Phase 2: 드래그 중 현재 drop target을 ref로 보관
  // React state로 저장하지 않음 — 매 포인터 이벤트마다 갱신되므로 리렌더링 비용 회피
  const dropTargetRef = useRef<DropTarget | null>(null);

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
    return resolveSelectedElementsForPage({
      currentPageId,
      elementsMap: getElementsMap(),
      selectedElementIds,
    });
  }, [currentPageId, selectedElementIds, getElementsMap]);

  const computeSelectionBounds = useCallback(() => {
    return computeSelectionBoundsModel({
      getBounds: getElementBoundsSimple,
      getContainer: getElementContainer,
      pageHeight,
      pagePositions,
      pageWidth,
      panOffset,
      selectedElements,
      zoom,
    });
  }, [selectedElements, pageWidth, pageHeight, zoom, panOffset, pagePositions]);

  // 🚀 Phase 2: 선택 변경 시 bounds 계산
  // ElementRegistry의 getBounds()를 사용하여 실제 렌더링된 위치 조회
  const [selectionBounds, setSelectionBounds] = useState<BoundingBox | null>(
    null,
  );

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
    return () => {
      cancelled = true;
    };
  }, [computeSelectionBounds]);

  // ============================================
  // ADR-043 Phase 1: Drag Interaction
  // ============================================

  const { startMove, updateDrag, endDrag, cancelDrag } = useDragInteraction({
    onDragUpdate: (operation, data) => {
      if (operation !== "move" || !data.delta) return;

      const { delta } = data;
      selectionBoxRef.current?.updatePosition(delta);

      // ADR-043 Phase 2: drop target resolver
      // RAF 내에서 호출되므로 매 프레임 1회 실행. resolver는 순수 함수.
      const dragState = useStore.getState();
      const draggedId = dragState.selectedElementIds[0];
      if (!draggedId) return;

      // 드래그 중 요소의 현재 scene-local 위치 = 원래 중심 + delta
      const originalBounds = getElementBoundsSimple(draggedId);
      if (!originalBounds) return;

      const scenePoint = {
        x: originalBounds.x + originalBounds.width / 2 + delta.x,
        y: originalBounds.y + originalBounds.height / 2 + delta.y,
      };
      const resolved = resolveDropTarget(scenePoint, draggedId, {
        elementsMap: dragState.elementsMap,
        childrenMap: dragState.childrenMap,
      });
      dropTargetRef.current = resolved;
      // ADR-043 Phase 3: drop indicator 스냅샷 갱신 (SkiaOverlay RAF에서 읽음)
      if (dropIndicatorSnapshotRef) {
        dropIndicatorSnapshotRef.current = resolved
          ? {
              targetBounds: resolved.containerBounds,
              insertIndex: resolved.insertionIndex,
              childBounds: resolved.siblingBounds,
              isHorizontal: resolved.isHorizontal,
            }
          : null;
      }
    },
    onMoveEnd: (elementId, delta) => {
      // ADR-043 Phase 2: drop target이 있고 인접하지 않은 삽입이면 reorder
      const dropTarget = dropTargetRef.current;
      dropTargetRef.current = null;
      // ADR-043 Phase 3: drop indicator 제거
      if (dropIndicatorSnapshotRef) {
        dropIndicatorSnapshotRef.current = null;
      }

      if (dropTarget && !dropTarget.isAdjacentInsertion) {
        const state = useStore.getState();
        const updates = computeReorderFromDropTarget(dropTarget, elementId, {
          elementsMap: state.elementsMap,
          childrenMap: state.childrenMap,
        });
        if (updates.length > 0) {
          // 파이프라인:
          // 1. History Record (상태 변경 전 스냅샷)
          const prevElements = updates
            .map((u) => state.elementsMap.get(u.id))
            .filter((el): el is NonNullable<typeof el> => el !== undefined);

          // 2. Memory Update (batchUpdateElementOrders: 단일 set() + _rebuildIndexes())
          state.batchUpdateElementOrders(updates);

          // 3. History addBatchDiffEntry (변경 전 → 후 diff)
          if (prevElements.length > 0) {
            const nextState = useStore.getState();
            const nextElements = updates
              .map((u) => nextState.elementsMap.get(u.id))
              .filter((el): el is NonNullable<typeof el> => el !== undefined);
            if (nextElements.length === prevElements.length) {
              historyManager.addBatchDiffEntry(prevElements, nextElements);
            }
          }

          // 4. DB Persist (백그라운드 — stale closure 방지 위해 queueMicrotask 내 get() 사용)
          queueMicrotask(() => {
            void (async () => {
              try {
                const db = await getDB();
                await Promise.all(
                  updates.map((u) =>
                    db.elements.update(u.id, { order_num: u.order_num }),
                  ),
                );
              } catch (error) {
                console.error("[SelectionLayer] reorder DB 저장 실패:", error);
              }
            })();
          });
        }
        selectionBoxRef.current?.resetPosition();
        return;
      }

      // drop target 없음 or 인접 삽입(위치 변화 없음) → 기존 absolute delta 반영
      const state = useStore.getState();
      const el = state.elementsMap.get(elementId);
      if (!el) return;

      const prevLeft = parseFloat(String(el.props?.style?.left ?? 0)) || 0;
      const prevTop = parseFloat(String(el.props?.style?.top ?? 0)) || 0;
      const newLeft = prevLeft + delta.x;
      const newTop = prevTop + delta.y;

      // 파이프라인: Memory Update → History → DB Persist (백그라운드)
      void state.updateElementProps(elementId, {
        ...el.props,
        style: {
          ...el.props?.style,
          left: newLeft,
          top: newTop,
        },
      });

      // SelectionBox 원래 위치 리셋 (store 업데이트 후 bounds가 갱신되므로)
      selectionBoxRef.current?.resetPosition();
    },
  });

  // 콜백 refs를 통해 useCentralCanvasPointerHandlers ↔ SelectionLayer 연결
  useEffect(() => {
    if (onStartMoveRef) onStartMoveRef.current = startMove;
    if (onUpdateDragRef) onUpdateDragRef.current = updateDrag;
    if (onEndDragRef) onEndDragRef.current = endDrag;
    if (onCancelDragRef)
      onCancelDragRef.current = () => {
        cancelDrag();
        // drop indicator 제거
        if (dropIndicatorSnapshotRef) {
          dropIndicatorSnapshotRef.current = null;
        }
        dropTargetRef.current = null;
        selectionBoxRef.current?.resetPosition();
      };
  }, [
    startMove,
    updateDrag,
    endDrag,
    cancelDrag,
    onStartMoveRef,
    onUpdateDragRef,
    onEndDragRef,
    onCancelDragRef,
    dropIndicatorSnapshotRef,
  ]);

  // 단일 선택 여부
  const isSingleSelection = selectedElements.length === 1;

  return (
    <pixiContainer label="SelectionLayer">
      {/* 선택 박스 (선택된 요소가 있을 때) */}
      {selectionBounds && selectedElements.length > 0 && (
        <SelectionBox
          ref={selectionBoxRef}
          bounds={selectionBounds}
          showHandles={isSingleSelection}
          zoom={zoom}
        />
      )}
    </pixiContainer>
  );
});

export default SelectionLayer;
