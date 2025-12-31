/**
 * Events Panel - Block-based Event Editor
 *
 * WHEN → IF → THEN/ELSE 패턴의 시각적 이벤트 편집기
 *
 * Phase 5: Events Panel 재설계 완료
 * Phase 6: Events 통합 완료 (2025-12-27)
 *
 * @example
 * // EventsPanel 사용
 * import { EventsPanel } from '@/builder/panels/events';
 * <EventsPanel />
 *
 * @example
 * // 개별 블록 컴포넌트 사용
 * import { WhenBlock, IfBlock, ThenElseBlock } from '@/builder/panels/events';
 */

// Main Panel
export { EventsPanel } from './EventsPanel';

// Block Components
export {
  WhenBlock,
  IfBlock,
  ThenElseBlock,
  ActionBlock,
  ActionList,
  BlockConnector,
} from './blocks';

// Editor Components
export {
  ConditionRow,
  OperatorToggle,
  OperatorPicker,
  ElementPicker,
  BlockActionEditor,
  VariableBindingEditor,
} from './editors';

// Preview Components
export {
  CodePreviewPanel,
  EventMinimap,
  EventDebugger,
} from './preview';

// Action Editors
export * from './actions';

// Event Components
export * from './components';

// Execution
export * from './execution';

// State Management
export * from './state';

// Pickers
export * from './pickers';

// Types
export * from './types';

// Utils
export * from './utils';

// Data
export * from './data';

// Hooks
export * from './hooks';
