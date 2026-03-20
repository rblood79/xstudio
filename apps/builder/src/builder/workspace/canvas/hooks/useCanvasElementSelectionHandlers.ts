import { startTransition, useCallback } from "react";
import { useStore } from "../../../stores";
import { resolveClickTarget } from "../../../utils/hierarchicalSelection";
import type { Element } from "../../../../types/core/store.types";
import { getElementBoundsSimple } from "../elementRegistry";

interface SelectionModifiers {
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

interface UseCanvasElementSelectionHandlersOptions {
  clearSelection: () => void;
  isEditing: boolean;
  setCurrentPageId: (pageId: string) => void;
  setSelectedElement: (elementId: string) => void;
  setSelectedElements: (elementIds: string[]) => void;
  startEdit: (
    elementId: string,
    layoutPosition?: { x: number; y: number; width: number; height: number },
  ) => void;
}

const TEXT_EDITABLE_TAGS = new Set([
  "Text",
  "Heading",
  "Label",
  "Paragraph",
  "Link",
  "Description",
  "Strong",
  "Em",
  "Code",
  "Button",
  "ToggleButton",
  "Tag",
  "Badge",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "span",
  "a",
  "label",
  "button",
]);

function selectResolvedTarget(
  resolvedTarget: string,
  modifiers: SelectionModifiers | undefined,
  setSelectedElement: (elementId: string) => void,
  setSelectedElements: (elementIds: string[]) => void,
  clearSelection: () => void,
): void {
  const isMultiSelectKey = modifiers?.metaKey || modifiers?.ctrlKey;

  startTransition(() => {
    if (isMultiSelectKey) {
      const currentState = useStore.getState();
      const currentPageId = currentState.currentPageId;
      const targetElement = currentState.elementsMap.get(resolvedTarget);

      if (targetElement?.page_id && targetElement.page_id !== currentPageId) {
        setSelectedElement(resolvedTarget);
        return;
      }

      const selectedSet = new Set(currentState.selectedElementIds);
      if (selectedSet.has(resolvedTarget)) {
        selectedSet.delete(resolvedTarget);
        if (selectedSet.size > 0) {
          setSelectedElements(Array.from(selectedSet));
        } else {
          clearSelection();
        }
      } else {
        selectedSet.add(resolvedTarget);
        setSelectedElements(Array.from(selectedSet));
      }
      return;
    }

    setSelectedElement(resolvedTarget);
  });
}

function handleUnresolvedTarget(
  elementId: string,
  clickedElement: Element | undefined,
  setCurrentPageId: (pageId: string) => void,
  setSelectedElement: (elementId: string) => void,
): void {
  if (clickedElement?.tag.toLowerCase() !== "body") {
    return;
  }

  if (
    clickedElement.page_id &&
    clickedElement.page_id !== useStore.getState().currentPageId
  ) {
    setCurrentPageId(clickedElement.page_id);
  }

  startTransition(() => {
    setSelectedElement(elementId);
  });
}

export function useCanvasElementSelectionHandlers({
  clearSelection,
  isEditing,
  setCurrentPageId,
  setSelectedElement,
  setSelectedElements,
  startEdit,
}: UseCanvasElementSelectionHandlersOptions) {
  const handleElementClick = useCallback(
    (elementId: string, modifiers?: SelectionModifiers) => {
      if (isEditing) {
        return;
      }

      const state = useStore.getState();
      const clickedElement = state.elementsMap.get(elementId);
      if (
        clickedElement?.page_id &&
        clickedElement.page_id !== state.currentPageId
      ) {
        clearSelection();
        setCurrentPageId(clickedElement.page_id);
      }

      let resolvedTarget = resolveClickTarget(
        elementId,
        state.editingContextId,
        state.elementsMap,
      );

      if (!resolvedTarget) {
        if (state.editingContextId === null) {
          handleUnresolvedTarget(
            elementId,
            clickedElement,
            setCurrentPageId,
            setSelectedElement,
          );
          return;
        }

        // context 밖 요소 클릭: 루트로 즉시 복귀 후 해당 요소 선택 시도
        state.setEditingContext(null);
        resolvedTarget = resolveClickTarget(elementId, null, state.elementsMap);
        if (!resolvedTarget) {
          handleUnresolvedTarget(
            elementId,
            clickedElement,
            setCurrentPageId,
            setSelectedElement,
          );
          return;
        }
      }

      selectResolvedTarget(
        resolvedTarget,
        modifiers,
        setSelectedElement,
        setSelectedElements,
        clearSelection,
      );
    },
    [
      clearSelection,
      isEditing,
      setCurrentPageId,
      setSelectedElement,
      setSelectedElements,
    ],
  );

  const handleElementDoubleClick = useCallback(
    (elementId: string) => {
      const state = useStore.getState();
      const resolvedTarget = resolveClickTarget(
        elementId,
        state.editingContextId,
        state.elementsMap,
      );
      if (!resolvedTarget) {
        return;
      }

      const resolvedElement = state.elementsMap.get(resolvedTarget);
      if (!resolvedElement) {
        return;
      }

      if (TEXT_EDITABLE_TAGS.has(resolvedElement.tag)) {
        const layoutPosition = getElementBoundsSimple(resolvedTarget);
        startEdit(resolvedTarget, layoutPosition ?? undefined);
        return;
      }

      const children = state.childrenMap.get(resolvedTarget);
      if (children && children.length > 0) {
        state.enterEditingContext(resolvedTarget);
        return;
      }

      const layoutPosition = getElementBoundsSimple(resolvedTarget);
      startEdit(resolvedTarget, layoutPosition ?? undefined);
    },
    [startEdit],
  );

  return {
    handleElementClick,
    handleElementDoubleClick,
  };
}
