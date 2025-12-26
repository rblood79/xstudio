/**
 * 이벤트 시스템 데이터 Export
 */

// Event Categories & Metadata
export {
  EVENT_CATEGORIES,
  EVENT_METADATA,
  COMPONENT_RECOMMENDED_EVENTS,
  isEventCompatible,
  getRecommendedEvents,
  getEventsByCategory
} from "./eventCategories";

// Action Metadata
export {
  ACTION_METADATA,
  ACTION_CATEGORIES,
  getActionMetadata,
  getActionsByCategory,
  getRecommendedActions
} from "./actionMetadata";
