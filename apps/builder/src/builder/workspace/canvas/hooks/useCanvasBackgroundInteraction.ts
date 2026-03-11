import { useCallback } from "react";
import { useStore } from "../../../stores";

interface UseCanvasBackgroundInteractionParams {
  clearSelection: () => void;
  setSelectedElement: (id: string | null) => void;
}

export function useCanvasBackgroundInteraction({
  clearSelection,
  setSelectedElement,
}: UseCanvasBackgroundInteractionParams) {
  return useCallback(() => {
    const {
      editingContextId,
      exitEditingContext,
      currentPageId,
      elementsMap,
      pageIndex,
    } = useStore.getState();

    if (editingContextId !== null) {
      exitEditingContext();
      return;
    }

    if (currentPageId) {
      const pageElementIds = pageIndex.elementsByPage.get(currentPageId);
      if (pageElementIds) {
        for (const elementId of pageElementIds) {
          const element = elementsMap.get(elementId);
          if (element && element.tag === "body") {
            setSelectedElement(element.id);
            return;
          }
        }
      }
    }

    clearSelection();
  }, [clearSelection, setSelectedElement]);
}
