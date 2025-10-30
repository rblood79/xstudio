/**
 * 이벤트 시스템 타입 통합 Export
 */

// Event Types
export type {
  EventType,
  EventHandler,
  EventAction,
  ActionType,
  ActionConfig,
  NavigateConfig,
  SetStateConfig,
  APICallConfig,
  ShowModalConfig,
  ShowToastConfig,
  ValidateFormConfig,
  CustomConfig,
  ScrollToConfig,
  ToggleVisibilityConfig,
  CopyToClipboardConfig,
  EventCategory,
  EventMetadata,
  ActionMetadata,
  ActionConfigField,
  EventContext,
  EventExecutionResult
} from "./eventTypes";

export {
  EVENT_TYPE_LABELS,
  ACTION_TYPE_LABELS,
  DEFAULT_DEBOUNCE_TIME,
  DEFAULT_THROTTLE_TIME,
  MAX_EXECUTION_TIME
} from "./eventTypes";

// Template Types
export type {
  EventTemplate,
  TemplateCategory,
  TemplateCategoryMeta,
  TemplateFilter
} from "./templateTypes";

export {
  TEMPLATE_CATEGORY_LABELS,
  TEMPLATE_CATEGORIES
} from "./templateTypes";
