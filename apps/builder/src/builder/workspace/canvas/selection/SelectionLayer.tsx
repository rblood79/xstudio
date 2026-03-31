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
  computeSiblingOffsets,
  type DropTarget,
  type DropIndicatorSnapshot,
} from "./dropTargetResolver";
import {
  setDragVisualOffset,
  setDragSiblingOffsets,
} from "../skia/nodeRendererTree";
import {
  updateAnimationTargets,
  clearAllAnimations,
} from "../skia/dragAnimator";
import { historyManager } from "../../../stores/history";
import { getDB } from "../../../../lib/db";
import { hitTestPoint } from "../wasm-bindings/spatialIndex";

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

  // ADR-043 Phase A: 드래그 시작 시 원래 order_num 스냅샷 (commit 후 undo용)
  const dragStartSnapshotRef = useRef<Array<{
    id: string;
    order_num: number;
    parent_id?: string | null;
  }> | null>(null);

  // A-6: 마지막으로 resolve된 drop target (onMoveEnd에서 단일 commit에 사용)
  const lastResolvedDropTargetRef = useRef<DropTarget | null>(null);

  const { startMove, updateDrag, endDrag, cancelDrag } = useDragInteraction({
    onDragUpdate: (operation, data) => {
      if (operation !== "move" || !data.delta) return;

      const { delta } = data;
      selectionBoxRef.current?.updatePosition(delta);

      const dragState = useStore.getState();
      const draggedId = dragState.selectedElementIds[0];
      if (!draggedId) return;

      // Pencil 패턴: 절대 커서 위치를 drop target resolver에 직접 사용
      const scenePoint = data.current;
      if (!scenePoint) return;

      // A-7: 드래그 시작 시 원래 order_num 스냅샷을 한 번만 캡처
      // reparent를 위해 parent_id도 함께 저장
      if (!dragStartSnapshotRef.current) {
        const dragged = dragState.elementsMap.get(draggedId);
        if (dragged) {
          const allChildren = [...dragState.elementsMap.values()]
            .filter((e) => e.parent_id === dragged.parent_id)
            .map((e) => ({
              id: e.id,
              order_num: e.order_num ?? 0,
              parent_id: e.parent_id,
            }));
          dragStartSnapshotRef.current = allChildren;
        }
      }

      // A-3: 드래그 요소 시각적 오프셋 적용 (store 변경 없음)
      setDragVisualOffset(draggedId, delta.x, delta.y);

      // A-5: dead zone — 이전 drop target의 방향에 따라 커서 위치 축 결정
      const draggedBounds = getElementBoundsSimple(draggedId);
      if (draggedBounds) {
        const isHz = lastResolvedDropTargetRef.current?.isHorizontal ?? false;
        const pos = isHz ? scenePoint.x : scenePoint.y;
        const bStart = isHz ? draggedBounds.x : draggedBounds.y;
        const bEnd =
          bStart + (isHz ? draggedBounds.width : draggedBounds.height);
        if (pos >= bStart && pos <= bEnd) {
          // drop indicator 유지, 형제 오프셋은 그대로
          if (dropIndicatorSnapshotRef) {
            const prev = lastResolvedDropTargetRef.current;
            dropIndicatorSnapshotRef.current = prev
              ? {
                  targetBounds: prev.containerBounds,
                  insertIndex: prev.insertionIndex,
                  childBounds: prev.siblingBounds,
                  isHorizontal: prev.isHorizontal,
                  isReparent: prev.isReparent,
                }
              : null;
          }
          return;
        }
      }

      // drop target resolve (hitTestPoint 전달로 cross-container 탐색 활성화)
      const resolved = resolveDropTarget(
        scenePoint,
        draggedId,
        {
          elementsMap: dragState.elementsMap,
          childrenMap: dragState.childrenMap,
        },
        hitTestPoint,
      );

      // A-6: 마지막 resolved target 저장 (onMoveEnd 단일 commit용)
      lastResolvedDropTargetRef.current = resolved;

      // 형제 시각적 오프셋 갱신 (dragAnimator를 통한 lerp 보간)
      if (resolved) {
        const offsets = computeSiblingOffsets(resolved, draggedId, {
          elementsMap: dragState.elementsMap,
          childrenMap: dragState.childrenMap,
        });
        updateAnimationTargets(offsets.size > 0 ? offsets : null);
      } else {
        updateAnimationTargets(null);
      }

      // ADR-043 Phase 3: drop indicator 스냅샷 갱신 (SkiaOverlay RAF에서 읽음)
      if (dropIndicatorSnapshotRef) {
        dropIndicatorSnapshotRef.current = resolved
          ? {
              targetBounds: resolved.containerBounds,
              insertIndex: resolved.insertionIndex,
              childBounds: resolved.siblingBounds,
              isHorizontal: resolved.isHorizontal,
              isReparent: resolved.isReparent,
            }
          : null;
      }
    },
    onMoveEnd: (elementId, _delta) => {
      // A-4: onMoveEnd — 단일 commit (visual offsets 해제 후 store 반영)

      // 1. commit 전에 최종 drop target과 snapshot을 먼저 읽기
      const finalTarget = lastResolvedDropTargetRef.current;
      const startSnapshot = dragStartSnapshotRef.current;

      // 2. 시각적 상태 모두 해제
      clearAllAnimations(); // 애니메이터 상태 즉시 초기화
      setDragVisualOffset(null, 0, 0, true); // store 갱신이 뒤따르므로 invalidation 스킵
      setDragSiblingOffsets(null);
      dropTargetRef.current = null;
      lastResolvedDropTargetRef.current = null;
      dragStartSnapshotRef.current = null;
      if (dropIndicatorSnapshotRef) {
        dropIndicatorSnapshotRef.current = null;
      }

      // 3. 단일 store commit
      if (finalTarget && !finalTarget.isAdjacentInsertion) {
        const state = useStore.getState();
        if (finalTarget.isReparent) {
          // cross-container reparent: parent_id 변경 + 양쪽 order_num 재정렬
          state.moveElementToContainer(
            elementId,
            finalTarget.containerId,
            finalTarget.insertionIndex,
          );
        } else {
          // same-parent reorder
          const updates = computeReorderFromDropTarget(finalTarget, elementId, {
            elementsMap: state.elementsMap,
            childrenMap: state.childrenMap,
          });
          if (updates.length > 0) {
            state.batchUpdateElementOrders(updates);
          }
        }
      }

      // 4. History + DB Persist
      if (startSnapshot) {
        const state = useStore.getState();

        // reparent 시: 구 부모 형제들 + 드래그 요소 + 신 부모 형제들 모두 포함
        const affectedIds = new Set(startSnapshot.map((s) => s.id));
        if (finalTarget?.isReparent) {
          // 신 부모의 현재 자식들도 히스토리에 포함
          const newSiblings = state.childrenMap.get(finalTarget.containerId);
          newSiblings?.forEach((c) => affectedIds.add(c.id));
          affectedIds.add(elementId);
        }

        const prevElements = startSnapshot
          .filter((s) => affectedIds.has(s.id))
          .map((s) => {
            const el = state.elementsMap.get(s.id);
            return el
              ? {
                  ...el,
                  order_num: s.order_num,
                  parent_id: s.parent_id ?? el.parent_id,
                }
              : undefined;
          })
          .filter((el): el is NonNullable<typeof el> => el !== undefined);
        const nextElements = [...affectedIds]
          .map((id) => state.elementsMap.get(id))
          .filter((el): el is NonNullable<typeof el> => el !== undefined);

        if (prevElements.length > 0 && nextElements.length > 0) {
          const hasChange =
            finalTarget?.isReparent ||
            prevElements.some((p) => {
              const next = state.elementsMap.get(p.id);
              return next && next.order_num !== p.order_num;
            });
          if (hasChange) {
            historyManager.addBatchDiffEntry(prevElements, nextElements);
          }
        }

        // DB Persist (백그라운드)
        queueMicrotask(() => {
          void (async () => {
            try {
              const db = await getDB();
              const currentState = useStore.getState();
              const persistIds = [...affectedIds];
              await Promise.all(
                persistIds.map((id) => {
                  const el = currentState.elementsMap.get(id);
                  const snap = startSnapshot.find((s) => s.id === id);
                  if (!el) return Promise.resolve();
                  const orderChanged = !snap || el.order_num !== snap.order_num;
                  const parentChanged =
                    finalTarget?.isReparent &&
                    id === elementId &&
                    el.parent_id !== snap?.parent_id;
                  if (orderChanged || parentChanged) {
                    return db.elements.update(id, {
                      order_num: el.order_num ?? 0,
                      ...(parentChanged ? { parent_id: el.parent_id } : {}),
                    });
                  }
                  return Promise.resolve();
                }),
              );
            } catch (error) {
              console.error(
                "[SelectionLayer] reorder/reparent DB 저장 실패:",
                error,
              );
            }
          })();
        });
      }

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
        // A: 취소 시 시각적 오프셋 해제 (store는 변경하지 않았으므로 복원 불필요)
        clearAllAnimations(); // 애니메이터 상태 즉시 초기화
        setDragVisualOffset(null);
        setDragSiblingOffsets(null);
        if (dropIndicatorSnapshotRef) {
          dropIndicatorSnapshotRef.current = null;
        }
        dropTargetRef.current = null;
        lastResolvedDropTargetRef.current = null;
        dragStartSnapshotRef.current = null;
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
