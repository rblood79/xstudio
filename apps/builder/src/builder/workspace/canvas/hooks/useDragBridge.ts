/**
 * useDragBridge — SelectionLayer 드래그 로직의 PixiJS 독립 추출 (ADR-100 Phase 6)
 *
 * SelectionLayer(PixiJS Application 내부)의 useDragInteraction + 콜백 ref 바인딩을
 * PixiJS 외부에서도 동작하도록 추출.
 *
 * ADR-049 Deferred Commit 아키텍처를 그대로 유지:
 * - 드래그 중: setDragVisualOffset + resolveDropTarget + computeSiblingOffsets
 * - 드롭 시: 단일 store commit (moveElementToContainer / batchUpdateElementOrders)
 *
 * PixiJS 의존 부분 (SelectionBox setVisible/resetPosition)은 제거.
 * Skia 렌더링이 selection box를 이미 처리하므로 시각적 영향 없음.
 */

import { useEffect, useRef, type MutableRefObject } from "react";
import { useStore } from "../../../stores";
import { useDragInteraction } from "../selection/useDragInteraction";
import {
  resolveDropTarget,
  computeReorderFromDropTarget,
  computeSiblingOffsets,
  type DropTarget,
  type DropIndicatorSnapshot,
} from "../selection/dropTargetResolver";
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
import { getSceneBounds } from "../skia/renderCommands";
import type { BoundingBox } from "../selection/types";

interface UseDragBridgeOptions {
  onStartMoveRef: MutableRefObject<
    (
      elementId: string,
      bounds: BoundingBox,
      position: { x: number; y: number },
    ) => void
  >;
  onUpdateDragRef: MutableRefObject<
    (position: { x: number; y: number }) => void
  >;
  onEndDragRef: MutableRefObject<() => void>;
  onCancelDragRef: MutableRefObject<() => void>;
  dropIndicatorSnapshotRef: MutableRefObject<DropIndicatorSnapshot | null>;
  /** false이면 ref 바인딩 스킵 (SelectionLayer가 대신 바인딩) */
  enabled?: boolean;
}

export function useDragBridge({
  onStartMoveRef,
  onUpdateDragRef,
  onEndDragRef,
  onCancelDragRef,
  dropIndicatorSnapshotRef,
  enabled = true,
}: UseDragBridgeOptions): void {
  const dragStartSnapshotRef = useRef<Array<{
    id: string;
    order_num: number;
    parent_id?: string | null;
  }> | null>(null);

  const lastResolvedDropTargetRef = useRef<DropTarget | null>(null);

  const { startMove, updateDrag, endDrag, cancelDrag } = useDragInteraction({
    onDragUpdate: (operation, data) => {
      if (operation !== "move" || !data.delta) return;

      const { delta } = data;
      const dragState = useStore.getState();
      const draggedId = dragState.selectedElementIds[0];
      if (!draggedId) return;

      const scenePoint = data.current;
      if (!scenePoint) return;

      // 드래그 시작 시 원래 order_num 스냅샷 캡처
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

      // 드래그 요소 시각적 오프셋 (store 변경 없음)
      setDragVisualOffset(draggedId, delta.x, delta.y);

      // dead zone
      const prevTarget = lastResolvedDropTargetRef.current;
      if (prevTarget) {
        const draggedBounds = getSceneBounds(draggedId);
        if (draggedBounds) {
          const isHz = prevTarget.isHorizontal;
          const pos = isHz ? scenePoint.x : scenePoint.y;
          const bStart = isHz ? draggedBounds.x : draggedBounds.y;
          const bEnd =
            bStart + (isHz ? draggedBounds.width : draggedBounds.height);
          if (pos >= bStart && pos <= bEnd) {
            const db = getSceneBounds(draggedId);
            dropIndicatorSnapshotRef.current = {
              targetBounds: prevTarget.containerBounds,
              insertIndex: prevTarget.insertionIndex,
              childBounds: prevTarget.siblingBounds,
              isHorizontal: prevTarget.isHorizontal,
              isReparent: prevTarget.isReparent,
              dragSize: db
                ? prevTarget.isHorizontal
                  ? db.width
                  : db.height
                : 0,
            };
            return;
          }
        }
      }

      // drop target resolve
      const resolved = resolveDropTarget(
        scenePoint,
        draggedId,
        {
          elementsMap: dragState.elementsMap,
          childrenMap: dragState.childrenMap,
        },
        hitTestPoint,
      );

      lastResolvedDropTargetRef.current = resolved;

      // 형제 시각적 오프셋 갱신
      if (resolved) {
        const offsets = computeSiblingOffsets(resolved, draggedId, {
          elementsMap: dragState.elementsMap,
          childrenMap: dragState.childrenMap,
        });
        updateAnimationTargets(offsets.size > 0 ? offsets : null);
      } else {
        updateAnimationTargets(null);
      }

      // drop indicator 스냅샷 갱신
      if (resolved) {
        const db = getSceneBounds(draggedId);
        const dragSize = db
          ? resolved.isHorizontal
            ? db.width
            : db.height
          : 0;
        dropIndicatorSnapshotRef.current = {
          targetBounds: resolved.containerBounds,
          insertIndex: resolved.insertionIndex,
          childBounds: resolved.siblingBounds,
          isHorizontal: resolved.isHorizontal,
          isReparent: resolved.isReparent,
          dragSize,
        };
      } else {
        dropIndicatorSnapshotRef.current = null;
      }
    },
    onMoveEnd: (elementId, _delta) => {
      const finalTarget = lastResolvedDropTargetRef.current;
      const startSnapshot = dragStartSnapshotRef.current;

      // 시각적 상태 해제
      clearAllAnimations();
      setDragVisualOffset(null, 0, 0, true);
      setDragSiblingOffsets(null);

      lastResolvedDropTargetRef.current = null;
      dragStartSnapshotRef.current = null;
      dropIndicatorSnapshotRef.current = null;

      // 단일 store commit
      if (finalTarget && !finalTarget.isAdjacentInsertion) {
        const state = useStore.getState();
        if (finalTarget.isReparent) {
          state.moveElementToContainer(
            elementId,
            finalTarget.containerId,
            finalTarget.insertionIndex,
          );
        } else {
          const updates = computeReorderFromDropTarget(finalTarget, elementId, {
            elementsMap: state.elementsMap,
            childrenMap: state.childrenMap,
          });
          if (updates.length > 0) {
            state.batchUpdateElementOrders(updates);
          }
        }
      }

      // History + DB Persist
      if (startSnapshot) {
        const state = useStore.getState();
        const affectedIds = new Set(startSnapshot.map((s) => s.id));
        if (finalTarget?.isReparent) {
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

        // DB Persist
        queueMicrotask(() => {
          void (async () => {
            try {
              const db = await getDB();
              const currentState = useStore.getState();
              const persistIds = [...affectedIds];
              const snapMap = new Map(startSnapshot.map((s) => [s.id, s]));
              await Promise.all(
                persistIds.map((id) => {
                  const el = currentState.elementsMap.get(id);
                  const snap = snapMap.get(id);
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
              console.error("[DragBridge] reorder/reparent DB persist:", error);
            }
          })();
        });
      }
    },
  });

  // 콜백 refs 바인딩 (enabled=false이면 SelectionLayer가 바인딩)
  useEffect(() => {
    if (!enabled) return;
    onStartMoveRef.current = startMove;
    onUpdateDragRef.current = updateDrag;
    onEndDragRef.current = endDrag;
    onCancelDragRef.current = () => {
      cancelDrag();
      clearAllAnimations();
      setDragVisualOffset(null);
      setDragSiblingOffsets(null);
      dropIndicatorSnapshotRef.current = null;
      lastResolvedDropTargetRef.current = null;
      dragStartSnapshotRef.current = null;
    };
  }, [
    enabled,
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
}
