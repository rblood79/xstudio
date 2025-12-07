/**
 * Events Panel - Block-based Event Editor
 *
 * WHEN → IF → THEN/ELSE 패턴의 시각적 이벤트 편집기
 *
 * Phase 5: Events Panel 재설계 완료
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
