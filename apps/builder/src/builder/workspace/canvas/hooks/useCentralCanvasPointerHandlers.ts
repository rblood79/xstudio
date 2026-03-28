import { useEffect, type MutableRefObject, type RefObject } from "react";
import { useStore } from "../../../stores";
import type { BoundingBox } from "../selection";
import {
  commitPointerClick,
  isPointerDoubleClick,
  resetPointerClick,
  resolveBodySelection,
  resolveSelectionHit,
  resolveTopmostHitElementId,
} from "../interaction";
import { hitTestPoint } from "../wasm-bindings/spatialIndex";

interface ModifierState {
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

/** 드래그 시작 threshold (px, scene-local 좌표계) */
const DRAG_THRESHOLD = 3;

interface UseCentralCanvasPointerHandlersOptions {
  completeEditRef: MutableRefObject<(elementId: string) => void>;
  computeSelectionBoundsForHitTest: () => BoundingBox | null;
  containerRef: RefObject<HTMLDivElement | null>;
  editingElementIdRef: MutableRefObject<string | null>;
  handleElementClickRef: MutableRefObject<
    (elementId: string, modifiers?: ModifierState) => void
  >;
  handleElementDoubleClickRef: MutableRefObject<(elementId: string) => void>;
  isEditingRef: MutableRefObject<boolean>;
  lastClickTargetRef: MutableRefObject<string | null>;
  lastClickTimeRef: MutableRefObject<number>;
  /** 드래그 시작 콜백 (SelectionLayer로 전달) */
  onStartMove: MutableRefObject<
    (
      elementId: string,
      bounds: BoundingBox,
      position: { x: number; y: number },
    ) => void
  >;
  /** 드래그 업데이트 콜백 (SelectionLayer로 전달) */
  onUpdateDrag: MutableRefObject<(position: { x: number; y: number }) => void>;
  /** 드래그 종료 콜백 (SelectionLayer로 전달) */
  onEndDrag: MutableRefObject<() => void>;
  pageHeight: number;
  pageWidth: number;
  screenToCanvasPoint: (position: { x: number; y: number }) => {
    x: number;
    y: number;
  };
  selectionBoundsRef: MutableRefObject<BoundingBox | null>;
  setCurrentPageId: (pageId: string) => void;
  setCursor: (cursor: string) => void;
  setSelectedElement: (elementId: string) => void;
  setSelectedElements: (elementIds: string[]) => void;
  zoom: number;
}

export function useCentralCanvasPointerHandlers({
  completeEditRef,
  computeSelectionBoundsForHitTest,
  containerRef,
  editingElementIdRef,
  handleElementClickRef,
  handleElementDoubleClickRef,
  isEditingRef,
  lastClickTargetRef,
  lastClickTimeRef,
  onStartMove,
  onUpdateDrag,
  onEndDrag,
  pageHeight,
  pageWidth,
  screenToCanvasPoint,
  selectionBoundsRef,
  setCurrentPageId,
  setCursor,
  setSelectedElement,
  setSelectedElements,
  zoom,
}: UseCentralCanvasPointerHandlersOptions): void {
  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    /**
     * 드래그 pending 상태 (threshold 미만 이동 중)
     * pointerdown에서 inSelectionBounds 히트 시 초기화,
     * pointermove에서 threshold 초과 시 드래그 시작
     */
    let pendingDrag: {
      elementId: string;
      bounds: BoundingBox;
      startCanvasPos: { x: number; y: number };
      startClientX: number;
      startClientY: number;
    } | null = null;

    /** 현재 드래그 활성 여부 (threshold 초과 후) */
    let isDragging = false;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      const guardedEvent = event as PointerEvent & { __handled?: boolean };
      if (guardedEvent.__handled) {
        return;
      }
      guardedEvent.__handled = true;

      if (isEditingRef.current) {
        const target = event.target as HTMLElement;
        const overlay = target.closest("[data-text-edit-overlay]");
        if (overlay) {
          return;
        }
        const editId = editingElementIdRef.current;
        if (editId) {
          completeEditRef.current(editId);
        }
        return;
      }

      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, [contenteditable="true"]')) {
        return;
      }

      const rect = element.getBoundingClientRect();
      const canvasPos = screenToCanvasPoint({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });

      const selectionBounds = computeSelectionBoundsForHitTest();
      selectionBoundsRef.current = selectionBounds;

      const state = useStore.getState();
      const selectedIds = state.selectedElementIds;
      const isSingleSelection = selectedIds.length === 1;
      const now = Date.now();

      if (isSingleSelection && selectionBounds) {
        const { hitHandle } = resolveSelectionHit(
          canvasPos,
          selectionBounds,
          zoom,
        );
        if (hitHandle) {
          // 리사이즈 핸들 히트 — 드래그 기능 비활성 상태
          return;
        }
      }

      const hitElementId = resolveTopmostHitElementId(
        hitTestPoint(canvasPos.x, canvasPos.y),
        state.elementsMap,
      );

      // body가 선택된 상태에서는 inSelectionBounds를 무시한다.
      // body의 selectionBounds가 전체 페이지를 커버하므로,
      // 내부 요소 클릭 시 inSelectionBounds=true가 되어 클릭이 무시되는 버그 방지.
      const selectedElement =
        selectedIds.length === 1 ? state.elementsMap.get(selectedIds[0]) : null;
      const isBodySelected = selectedElement?.tag.toLowerCase() === "body";

      const { inSelectionBounds } = isBodySelected
        ? { inSelectionBounds: false }
        : resolveSelectionHit(canvasPos, selectionBounds, zoom);

      if (!inSelectionBounds && hitElementId) {
        if (
          isPointerDoubleClick(
            {
              lastClickTargetId: lastClickTargetRef.current,
              lastClickTime: lastClickTimeRef.current,
            },
            hitElementId,
            now,
          )
        ) {
          const resetState = resetPointerClick();
          lastClickTargetRef.current = resetState.lastClickTargetId;
          lastClickTimeRef.current = resetState.lastClickTime;
          handleElementDoubleClickRef.current(hitElementId);
          return;
        }

        const session = commitPointerClick(hitElementId, now);
        lastClickTargetRef.current = session.lastClickTargetId;
        lastClickTimeRef.current = session.lastClickTime;

        const modifiers = {
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
        };

        handleElementClickRef.current(hitElementId, modifiers);
        return;
      }

      if (inSelectionBounds) {
        if (selectedIds.length > 0 && selectionBounds) {
          const targetId = selectedIds[0] ?? null;
          if (
            isPointerDoubleClick(
              {
                lastClickTargetId: lastClickTargetRef.current,
                lastClickTime: lastClickTimeRef.current,
              },
              targetId,
              now,
            )
          ) {
            const resetState = resetPointerClick();
            lastClickTargetRef.current = resetState.lastClickTargetId;
            lastClickTimeRef.current = resetState.lastClickTime;
            if (targetId) {
              handleElementDoubleClickRef.current(targetId);
            }
            return;
          }

          const session = commitPointerClick(targetId, now);
          lastClickTargetRef.current = session.lastClickTargetId;
          lastClickTimeRef.current = session.lastClickTime;

          // Body 요소는 drag 대상에서 제외
          if (targetId && selectedElement?.tag.toLowerCase() !== "body") {
            pendingDrag = {
              elementId: targetId,
              bounds: selectionBounds,
              startCanvasPos: canvasPos,
              startClientX: event.clientX,
              startClientY: event.clientY,
            };
          }
        }
        return;
      }

      if (!hitElementId) {
        const resetState = resetPointerClick();
        lastClickTargetRef.current = resetState.lastClickTargetId;
        lastClickTimeRef.current = resetState.lastClickTime;
        if (!event.shiftKey) {
          const bodySelection = resolveBodySelection({
            canvasPoint: canvasPos,
            currentPageId: state.currentPageId,
            elementsMap: state.elementsMap,
            pageHeight,
            pageIndexElementsByPage: state.pageIndex.elementsByPage,
            pagePositions: state.pagePositions,
            pageWidth,
            pages: state.pages,
          });

          if (bodySelection.pageId) {
            // 페이지 영역 내부 빈 공간 클릭 → 해당 페이지로 전환 + body 선택
            if (bodySelection.pageId !== state.currentPageId) {
              setCurrentPageId(bodySelection.pageId);
            }
            if (bodySelection.bodyElementId) {
              setSelectedElement(bodySelection.bodyElementId);
            } else {
              setSelectedElements([]);
            }
          } else {
            // 페이지 영역 밖 클릭 → 선택 모두 해제
            setSelectedElements([]);
          }
        }
      }
    };

    const handleWindowPointerMove = (event: PointerEvent) => {
      if (pendingDrag) {
        const dx = event.clientX - pendingDrag.startClientX;
        const dy = event.clientY - pendingDrag.startClientY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (!isDragging && dist >= DRAG_THRESHOLD) {
          // threshold 초과 → 드래그 시작
          isDragging = true;
          // store에서 최신 selectedElementIds 읽기 (stale closure 방지)
          const currentId =
            useStore.getState().selectedElementIds[0] ?? pendingDrag.elementId;
          onStartMove.current(
            currentId,
            pendingDrag.bounds,
            pendingDrag.startCanvasPos,
          );
        }

        if (isDragging) {
          const rect = element.getBoundingClientRect();
          const canvasPos = screenToCanvasPoint({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
          onUpdateDrag.current(canvasPos);
        }
        return;
      }

      // pendingDrag 없을 때 커서 업데이트
      const rect = element.getBoundingClientRect();
      const canvasPos = screenToCanvasPoint({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });

      const state = useStore.getState();
      const isSingleSelection = state.selectedElementIds.length === 1;

      if (isSingleSelection) {
        const selectionBounds =
          selectionBoundsRef.current ?? computeSelectionBoundsForHitTest();
        const { hitHandle } = resolveSelectionHit(
          canvasPos,
          selectionBounds,
          zoom,
        );
        if (hitHandle) {
          setCursor(hitHandle.cursor);
          return;
        }
      }

      setCursor("default");
    };

    const handleWindowPointerUp = () => {
      if (isDragging) {
        onEndDrag.current();
      }
      pendingDrag = null;
      isDragging = false;
    };

    const handlePointerMove = (event: PointerEvent) => {
      // pendingDrag가 없을 때만 커서 업데이트 (드래그 중 window 핸들러가 처리)
      if (pendingDrag) return;

      const rect = element.getBoundingClientRect();
      const canvasPos = screenToCanvasPoint({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });

      const state = useStore.getState();
      const isSingleSelection = state.selectedElementIds.length === 1;

      if (isSingleSelection) {
        const selectionBounds =
          selectionBoundsRef.current ?? computeSelectionBoundsForHitTest();
        const { hitHandle } = resolveSelectionHit(
          canvasPos,
          selectionBounds,
          zoom,
        );
        if (hitHandle) {
          setCursor(hitHandle.cursor);
          return;
        }
      }

      setCursor("default");
    };

    element.addEventListener("pointerdown", handlePointerDown);
    element.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);

    return () => {
      element.removeEventListener("pointerdown", handlePointerDown);
      element.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
    };
  }, [
    completeEditRef,
    computeSelectionBoundsForHitTest,
    containerRef,
    editingElementIdRef,
    handleElementClickRef,
    handleElementDoubleClickRef,
    isEditingRef,
    lastClickTargetRef,
    lastClickTimeRef,
    onEndDrag,
    onStartMove,
    onUpdateDrag,
    pageHeight,
    pageWidth,
    screenToCanvasPoint,
    selectionBoundsRef,
    setCurrentPageId,
    setCursor,
    setSelectedElement,
    setSelectedElements,
    zoom,
  ]);
}
