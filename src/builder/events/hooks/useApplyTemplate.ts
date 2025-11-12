import { useCallback } from "react";
import type { EventTemplate } from "../data/eventTemplates";
import type { EventHandler } from "../types";

export interface ApplyTemplateOptions {
  /**
   * Whether to merge with existing event handlers or replace them
   * - "merge": Add template actions to existing event handlers
   * - "replace": Replace existing event handlers with template
   */
  mode: "merge" | "replace";
}

/**
 * Hook to apply event templates
 *
 * This hook provides a callback function to apply a template's event handlers.
 * The actual implementation should be connected to the element store or
 * passed as a prop from the parent component.
 */
export function useApplyTemplate(
  currentEventHandlers: EventHandler[],
  onUpdateEventHandlers: (handlers: EventHandler[]) => void,
  options: ApplyTemplateOptions = { mode: "merge" }
) {
  const applyTemplate = useCallback(
    (template: EventTemplate) => {
      const { mode } = options;

      if (mode === "replace") {
        // Replace all existing event handlers with template
        onUpdateEventHandlers(template.events);
        return;
      }

      // Merge mode: combine template events with existing handlers
      const mergedHandlers = [...currentEventHandlers];

      for (const templateEvent of template.events) {
        // Find existing handler with same event type
        const existingIndex = mergedHandlers.findIndex(
          (handler) => handler.type === templateEvent.type
        );

        if (existingIndex >= 0) {
          // Merge actions: add template actions to existing handler
          const existingHandler = mergedHandlers[existingIndex];
          const mergedActions = [
            ...existingHandler.actions,
            ...templateEvent.actions
          ];

          mergedHandlers[existingIndex] = {
            ...existingHandler,
            actions: mergedActions
          };
        } else {
          // No existing handler for this event type, add new one
          mergedHandlers.push(templateEvent);
        }
      }

      onUpdateEventHandlers(mergedHandlers);
    },
    [currentEventHandlers, onUpdateEventHandlers, options]
  );

  return { applyTemplate };
}

/**
 * Generate unique IDs for event handlers and actions from template
 */
export function generateEventHandlerIds(
  handlers: EventHandler[],
  prefix: string = "event"
): EventHandler[] {
  return handlers.map((handler, handlerIndex) => ({
    ...handler,
    id: `${prefix}-${handler.type}-${handlerIndex}-${Date.now()}`,
    actions: handler.actions.map((action, actionIndex) => ({
      ...action,
      id: `${prefix}-${handler.type}-action-${actionIndex}-${Date.now()}`
    }))
  }));
}
