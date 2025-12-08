/**
 * Events Module - Event Handler System
 *
 * 이 모듈은 두 가지 이벤트 편집 시스템을 제공합니다:
 *
 * 1. Block-based Editor (권장 - Phase 5)
 *    - WHEN → IF → THEN/ELSE 패턴
 *    - 위치: src/builder/panels/events/
 *    - 사용: import { EventsPanel } from '@/builder/panels/events';
 *
 * 2. Legacy Editor (하위 호환성)
 *    - 기존 리스트 기반 편집
 *    - 위치: src/builder/events/
 *    - 사용: import Events from '@/builder/events/index.tsx';
 *
 * @example
 * // 권장 - Block-based Editor 사용
 * import { EventsPanel } from '@/builder/panels/events';
 * <EventsPanel />
 *
 * @example
 * // Legacy Editor 사용 (하위 호환성)
 * import Events from '@/builder/events/index.tsx';
 * <Events />
 */

// ============================================================================
// Block-based Event System (Phase 5 - 권장)
// ============================================================================

// Block Components
export {
  WhenBlock,
  IfBlock,
  ThenElseBlock,
  ActionBlock,
  ActionList,
  BlockConnector,
} from '../panels/events/blocks';

// Editor Components
export {
  ConditionRow,
  OperatorToggle,
  OperatorPicker,
  ElementPicker,
  BlockActionEditor,
  VariableBindingEditor,
} from '../panels/events/editors';

// Preview Components
export {
  CodePreviewPanel,
  EventMinimap,
  EventDebugger,
} from '../panels/events/preview';

// Hooks
export {
  useEventSearch,
  highlightMatch,
  useRecommendedEvents,
  useEventMetadata,
  useIsEventRecommended,
  useApplyTemplate,
  generateEventHandlerIds,
  useCopyPasteActions,
  useActionKeyboardShortcuts,
  useEventFlow,
  useVariableSchema,
  getEventPayloadSchema,
  createDataTableSchema,
} from './hooks';

// Utils
export {
  parseVariables,
  getValueByPath,
  interpolate,
  getRootVariable,
  splitPath,
  getPathPrefix,
  getCurrentInput,
  validateBindings,
  quickValidate,
  getSuggestions,
  normalizeToRegistryAction,
  normalizeToInspectorAction,
  normalizeToRegistryEvent,
  normalizeToInspectorEvent,
} from './utils';

// Types
export type { RecommendedEvent, ApplyTemplateOptions } from './hooks';
export type {
  VariableBinding,
  VariableType,
  ParseResult,
  ParseError,
  ValidationResult,
  BindingValidation,
  ValidationWarning,
  ValidationError,
} from './utils';

// Pickers
export { EventTypePicker } from './pickers/EventTypePicker';
export { ActionTypePicker } from './pickers/ActionTypePicker';

// ============================================================================
// Legacy Event System (하위 호환성)
// ============================================================================

// @deprecated - Block-based Editor 사용을 권장합니다
export * from "./EventList";
export * from "./EventEditor";

// Action Editors (21 개)
export * from "./actions/ActionEditor";
export * from "./actions/NavigateActionEditor";
export * from "./actions/SetStateActionEditor";
export * from "./actions/SetComponentStateActionEditor";
export * from "./actions/UpdateStateActionEditor";
export * from "./actions/APICallActionEditor";
export * from "./actions/ShowModalActionEditor";
export * from "./actions/HideModalActionEditor";
export * from "./actions/ShowToastActionEditor";
export * from "./actions/ValidateFormActionEditor";
export * from "./actions/SubmitFormActionEditor";
export * from "./actions/ResetFormActionEditor";
export * from "./actions/UpdateFormFieldActionEditor";
export * from "./actions/ScrollToActionEditor";
export * from "./actions/ToggleVisibilityActionEditor";
export * from "./actions/FilterCollectionActionEditor";
export * from "./actions/SelectItemActionEditor";
export * from "./actions/ClearSelectionActionEditor";
export * from "./actions/TriggerComponentActionEditor";
export * from "./actions/CopyToClipboardActionEditor";
export * from "./actions/CustomFunctionActionEditor";
export * from "./actions/LoadDataTableActionEditor";
export * from "./actions/SyncComponentActionEditor";
export * from "./actions/SaveToDataTableActionEditor";
