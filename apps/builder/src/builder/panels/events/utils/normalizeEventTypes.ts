/**
 * Event/Action 타입 정규화 유틸리티
 *
 * XStudio에서는 두 가지 이벤트/액션 타입 포맷이 공존함:
 * 1. events.types.ts (공식 레지스트리): snake_case (scroll_to, toggle_visibility)
 * 2. eventTypes.ts (인스펙터 내부): camelCase (scrollTo, toggleVisibility)
 *
 * 이 유틸은 두 포맷 간 변환을 중앙화하여 일관성 유지
 */

import type { ActionType as RegistryActionType } from '@/types/events/events.types';
import type { ActionType as InspectorActionType } from '../types/eventTypes';

/**
 * snake_case → camelCase 매핑
 * events.types.ts → eventTypes.ts 변환용
 */
const SNAKE_TO_CAMEL_ACTION: Record<string, InspectorActionType> = {
  scroll_to: 'scrollTo',
  toggle_visibility: 'toggleVisibility',
  update_state: 'updateState',
  show_modal: 'showModal',
  hide_modal: 'hideModal',
  copy_to_clipboard: 'copyToClipboard',
  validate_form: 'validateForm',
  reset_form: 'resetForm',
  submit_form: 'submitForm',
  update_form_field: 'updateFormField',
  set_state: 'setState',
  set_component_state: 'setComponentState',
  trigger_component_action: 'triggerComponentAction',
  filter_collection: 'filterCollection',
  select_item: 'selectItem',
  clear_selection: 'clearSelection',
  custom_function: 'customFunction',
  api_call: 'apiCall',
  show_toast: 'showToast',
};

/**
 * camelCase → snake_case 매핑
 * eventTypes.ts → events.types.ts 변환용
 */
const CAMEL_TO_SNAKE_ACTION: Record<string, RegistryActionType> = {
  scrollTo: 'scroll_to',
  toggleVisibility: 'toggle_visibility',
  updateState: 'update_state',
  showModal: 'show_modal',
  hideModal: 'hide_modal',
  copyToClipboard: 'copy_to_clipboard',
  validateForm: 'validate_form',
  resetForm: 'reset_form',
  submitForm: 'submit_form',
  updateFormField: 'update_form_field',
  setState: 'set_state',
  setComponentState: 'set_component_state',
  triggerComponentAction: 'trigger_component_action',
  filterCollection: 'filter_collection',
  selectItem: 'select_item',
  clearSelection: 'clear_selection',
  customFunction: 'custom_function',
  apiCall: 'api_call',
  showToast: 'show_toast',
};

/**
 * Registry ActionType (snake_case) → Inspector ActionType (camelCase)
 *
 * @param actionType - Registry에서 온 액션 타입 (snake_case)
 * @returns Inspector용 액션 타입 (camelCase)
 *
 * @example
 * normalizeToInspectorAction('scroll_to'); // 'scrollTo'
 * normalizeToInspectorAction('navigate');  // 'navigate' (변환 불필요)
 */
export function normalizeToInspectorAction(
  actionType: RegistryActionType | string
): InspectorActionType {
  const normalized = SNAKE_TO_CAMEL_ACTION[actionType];
  return normalized ?? (actionType as InspectorActionType);
}

/**
 * Inspector ActionType (camelCase) → Registry ActionType (snake_case)
 *
 * @param actionType - Inspector에서 온 액션 타입 (camelCase)
 * @returns Registry용 액션 타입 (snake_case)
 *
 * @example
 * normalizeToRegistryAction('scrollTo');  // 'scroll_to'
 * normalizeToRegistryAction('navigate');  // 'navigate' (변환 불필요)
 */
export function normalizeToRegistryAction(
  actionType: InspectorActionType | string
): RegistryActionType {
  const normalized = CAMEL_TO_SNAKE_ACTION[actionType];
  return normalized ?? (actionType as RegistryActionType);
}

/**
 * 액션 타입이 snake_case인지 확인
 */
export function isSnakeCaseAction(actionType: string): boolean {
  return actionType.includes('_');
}

/**
 * 액션 타입이 camelCase인지 확인
 */
export function isCamelCaseAction(actionType: string): boolean {
  return !actionType.includes('_') && /[a-z][A-Z]/.test(actionType);
}
