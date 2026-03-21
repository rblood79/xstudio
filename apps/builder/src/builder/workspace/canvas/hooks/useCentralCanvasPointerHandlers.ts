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

interface UseCentralCanvasPointerHandlersOptions {
  completeEditRef: MutableRefObject<(elementId: string) => void>;
  computeSelectionBoundsForHitTest: () => BoundingBox | null;
  containerRef: RefObject<HTMLDivElement | null>;
  dragPointerRef: MutableRefObject<{ x: number; y: number } | null>;
  dragStateIsDragging: boolean;
  editingElementIdRef: MutableRefObject<string | null>;
  handleElementClickRef: MutableRefObject<
    (elementId: string, modifiers?: ModifierState) => void
  >;
  handleElementDoubleClickRef: MutableRefObject<(elementId: string) => void>;
  isEditingRef: MutableRefObject<boolean>;
  lastClickTargetRef: MutableRefObject<string | null>;
  lastClickTimeRef: MutableRefObject<number>;
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
  startMove: (
    elementId: string,
    bounds: BoundingBox,
    startPoint: { x: number; y: number },
  ) => void;
  startResize: (
    elementId: string,
    position: string,
    bounds: BoundingBox,
    startPoint: { x: number; y: number },
  ) => void;
  zoom: number;
}

export function useCentralCanvasPointerHandlers({
  completeEditRef,
  computeSelectionBoundsForHitTest,
  containerRef,
  dragPointerRef,
  dragStateIsDragging,
  editingElementIdRef,
  handleElementClickRef,
  handleElementDoubleClickRef,
  isEditingRef,
  lastClickTargetRef,
  lastClickTimeRef,
  pageHeight,
  pageWidth,
  screenToCanvasPoint,
  selectionBoundsRef,
  setCurrentPageId,
  setCursor,
  setSelectedElement,
  setSelectedElements,
  startMove,
  startResize,
  zoom,
}: UseCentralCanvasPointerHandlersOptions): void {
  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

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
          const resetState = resetPointerClick();
          lastClickTargetRef.current = resetState.lastClickTargetId;
          lastClickTimeRef.current = resetState.lastClickTime;
          dragPointerRef.current = canvasPos;
          startResize(
            selectedIds[0],
            hitHandle.position,
            selectionBounds,
            canvasPos,
          );
          return;
        }
      }

      const { inSelectionBounds } = resolveSelectionHit(
        canvasPos,
        selectionBounds,
        zoom,
      );
      const hitElementId = resolveTopmostHitElementId(
        hitTestPoint(canvasPos.x, canvasPos.y),
        state.elementsMap,
      );

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
        const isMultiSelectKey = modifiers.metaKey || modifiers.ctrlKey;

        handleElementClickRef.current(hitElementId, modifiers);
        if (!isMultiSelectKey) {
          const currentSelectedIds = useStore.getState().selectedElementIds;
          if (currentSelectedIds.length > 0) {
            const moveTargetId = currentSelectedIds[0];
            const newBounds = computeSelectionBoundsForHitTest();
            if (newBounds) {
              dragPointerRef.current = canvasPos;
              startMove(moveTargetId, newBounds, canvasPos);
            }
          }
        }
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
          dragPointerRef.current = canvasPos;
          startMove(selectedIds[0], selectionBounds, canvasPos);
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

          if (
            bodySelection.pageId &&
            bodySelection.pageId !== state.currentPageId
          ) {
            setCurrentPageId(bodySelection.pageId);
          }

          if (bodySelection.bodyElementId) {
            setSelectedElement(bodySelection.bodyElementId);
          } else {
            setSelectedElements([]);
          }
        }
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (dragStateIsDragging) {
        return;
      }

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

    return () => {
      element.removeEventListener("pointerdown", handlePointerDown);
      element.removeEventListener("pointermove", handlePointerMove);
    };
  }, [
    completeEditRef,
    computeSelectionBoundsForHitTest,
    containerRef,
    dragPointerRef,
    dragStateIsDragging,
    editingElementIdRef,
    handleElementClickRef,
    handleElementDoubleClickRef,
    isEditingRef,
    lastClickTargetRef,
    lastClickTimeRef,
    pageHeight,
    pageWidth,
    screenToCanvasPoint,
    selectionBoundsRef,
    setCurrentPageId,
    setCursor,
    setSelectedElement,
    setSelectedElements,
    startMove,
    startResize,
    zoom,
  ]);
}
