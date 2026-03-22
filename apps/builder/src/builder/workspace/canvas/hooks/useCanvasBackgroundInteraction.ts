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

    // 페이지 영역 밖 클릭 → 선택 해제 (body 재선택 금지)
    clearSelection();
  }, [clearSelection, setSelectedElement]);
}
