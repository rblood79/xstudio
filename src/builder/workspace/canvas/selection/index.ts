/**
 * Selection System Index
 *
 * 🚀 Phase 10 B1.3: Selection + Transform 모듈 내보내기
 *
 * @since 2025-12-11 Phase 10 B1.3
 */

// Types
export type {
  HandlePosition,
  HandleType,
  CursorStyle,
  BoundingBox,
  TransformBox,
  DragOperation,
  DragState,
  SelectionState,
  HandleConfig,
} from './types';

export {
  HANDLE_CONFIGS,
  HANDLE_SIZE,
  SELECTION_COLOR,
  HANDLE_FILL_COLOR,
  HANDLE_STROKE_COLOR,
  LASSO_COLOR,
  LASSO_FILL_ALPHA,
  calculateBounds,
  calculateCombinedBounds,
  boxesIntersect,
  pointInBox,
} from './types';

// Components
export { SelectionBox } from './SelectionBox';
export type { SelectionBoxProps, SelectionBoxHandle } from './SelectionBox';

export { TransformHandle } from './TransformHandle';
export type { TransformHandleProps } from './TransformHandle';

export { LassoSelection } from './LassoSelection';
export { getLassoBounds } from './LassoSelection.utils';
export type { LassoSelectionProps } from './LassoSelection';

export { SelectionLayer } from './SelectionLayer';
export { findElementsInLasso } from './SelectionLayer.utils';
export type { SelectionLayerProps } from './SelectionLayer';

// Hooks
export { useDragInteraction } from './useDragInteraction';
export type { UseDragInteractionOptions, UseDragInteractionReturn } from './useDragInteraction';
