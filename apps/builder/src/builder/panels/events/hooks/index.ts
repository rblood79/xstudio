/**
 * Event Hooks Export
 */

export { useEventSearch, highlightMatch } from "./useEventSearch";
export {
  useRecommendedEvents,
  useEventMetadata,
  useIsEventRecommended
} from "./useRecommendedEvents";
export { useApplyTemplate, generateEventHandlerIds } from "./useApplyTemplate";
export { useCopyPasteActions, useActionKeyboardShortcuts } from "./useCopyPasteActions";
export { useEventFlow } from "./useEventFlow";
export {
  useVariableSchema,
  getEventPayloadSchema,
  createDataTableSchema,
} from "./useVariableSchema";
export { useBlockKeyboard } from "./useBlockKeyboard";
export type { RecommendedEvent } from "./useRecommendedEvents";
export type { ApplyTemplateOptions } from "./useApplyTemplate";
