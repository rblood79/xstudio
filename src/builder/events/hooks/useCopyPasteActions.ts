import { useCallback, useEffect, useState } from "react";
import type { EventAction } from "../types/eventTypes";

const CLIPBOARD_KEY = "xstudio-event-actions-clipboard";

/**
 * Hook for copy/paste actions functionality
 */
export function useCopyPasteActions() {
  const [clipboard, setClipboard] = useState<EventAction[]>([]);

  // Load clipboard from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CLIPBOARD_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setClipboard(parsed);
      }
    } catch (error) {
      console.error("Failed to load clipboard from localStorage:", error);
    }
  }, []);

  // Copy actions to clipboard
  const copyActions = useCallback((actions: EventAction[]) => {
    try {
      const serialized = JSON.stringify(actions);
      localStorage.setItem(CLIPBOARD_KEY, serialized);
      setClipboard(actions);
      return true;
    } catch (error) {
      console.error("Failed to copy actions:", error);
      return false;
    }
  }, []);

  // Paste actions from clipboard
  const pasteActions = useCallback((): EventAction[] => {
    if (clipboard.length === 0) return [];

    // Generate new IDs for pasted actions
    const pastedActions = clipboard.map((action) => ({
      ...action,
      id: `${action.id}-paste-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }));

    return pastedActions;
  }, [clipboard]);

  // Clear clipboard
  const clearClipboard = useCallback(() => {
    localStorage.removeItem(CLIPBOARD_KEY);
    setClipboard([]);
  }, []);

  // Check if clipboard has content
  const hasClipboard = clipboard.length > 0;

  return {
    clipboard,
    copyActions,
    pasteActions,
    clearClipboard,
    hasClipboard
  };
}

/**
 * Keyboard shortcut handler for copy/paste
 */
export function useActionKeyboardShortcuts(
  selectedActions: EventAction[],
  onCopy: (actions: EventAction[]) => void,
  onPaste: () => void,
  onDelete: () => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + C: Copy
      if ((e.metaKey || e.ctrlKey) && e.key === "c" && selectedActions.length > 0) {
        e.preventDefault();
        onCopy(selectedActions);
      }

      // Cmd/Ctrl + V: Paste
      if ((e.metaKey || e.ctrlKey) && e.key === "v") {
        e.preventDefault();
        onPaste();
      }

      // Delete/Backspace: Delete selected actions
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedActions.length > 0 &&
        !isInputElement(e.target)
      ) {
        e.preventDefault();
        onDelete();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedActions, onCopy, onPaste, onDelete]);
}

/**
 * Check if target is an input element
 */
function isInputElement(target: EventTarget | null): boolean {
  if (!target) return false;
  const element = target as HTMLElement;
  return (
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.isContentEditable
  );
}
