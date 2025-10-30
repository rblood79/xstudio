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
export type { RecommendedEvent } from "./useRecommendedEvents";
export type { ApplyTemplateOptions } from "./useApplyTemplate";
