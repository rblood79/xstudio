/**
 * 통합된 이벤트 타입 시스템
 * - Inspector EventHandler와 EventEngine ElementEvent 통합
 * - React Aria 이벤트 포함
 */

/**
 * 지원되는 이벤트 타입
 */
export type EventType =
  // Mouse Events
  | "onClick"
  | "onDoubleClick"
  | "onMouseEnter"
  | "onMouseLeave"
  | "onMouseDown"
  | "onMouseUp"

  // Form Events
  | "onChange"
  | "onInput"
  | "onSubmit"
  | "onFocus"
  | "onBlur"

  // Keyboard Events
  | "onKeyDown"
  | "onKeyUp"
  | "onKeyPress"

  // React Aria Events (중요!)
  | "onPress"
  | "onSelectionChange"
  | "onAction"
  | "onOpenChange"

  // Other
  | "onScroll"
  | "onResize"
  | "onLoad";

/**
 * 이벤트 핸들러 (통합 버전)
 */
export interface EventHandler {
  id: string;
  event: EventType;
  actions: EventAction[];

  // 선택적 고급 기능
  enabled?: boolean;
  description?: string;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  debounce?: number;
  throttle?: number;

  // 조건부 실행
  condition?: string; // JavaScript 표현식
}

/**
 * 이벤트 액션
 */
export interface EventAction {
  id?: string; // 선택적 (생성 시 자동 할당)
  type: ActionType;
  config: ActionConfig;

  // 액션 제어
  delay?: number; // 지연 시간 (ms)
  condition?: string; // 실행 조건 (JavaScript 표현식)
  enabled?: boolean; // 액션 활성화 여부
}

/**
 * 액션 타입
 */
export type ActionType =
  // Navigation
  | "navigate"
  | "scrollTo"

  // State Management
  | "setState"
  | "updateState"

  // API & Data
  | "apiCall"

  // UI Interaction
  | "showModal"
  | "hideModal"
  | "showToast"
  | "toggleVisibility"

  // Form
  | "validateForm"
  | "resetForm"
  | "submitForm"

  // Utilities
  | "copyToClipboard"
  | "customFunction";

/**
 * 액션 설정 (Union 타입)
 */
export type ActionConfig =
  | NavigateConfig
  | SetStateConfig
  | APICallConfig
  | ShowModalConfig
  | HideModalConfig
  | ShowToastConfig
  | ValidateFormConfig
  | CustomConfig
  | ScrollToConfig
  | ToggleVisibilityConfig
  | CopyToClipboardConfig;

/**
 * Navigate 액션 설정
 */
export interface NavigateConfig {
  path: string;
  openInNewTab?: boolean;
  replace?: boolean;
}

/**
 * SetState 액션 설정
 */
export interface SetStateConfig {
  storePath: string;
  value: unknown;
  merge?: boolean;
}

/**
 * API Call 액션 설정
 */
export interface APICallConfig {
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: unknown;
  onSuccess?: EventAction;
  onError?: EventAction;
}

/**
 * Show Modal 액션 설정
 */
export interface ShowModalConfig {
  modalId: string;
  props?: Record<string, unknown>;
  backdrop?: boolean;
  closable?: boolean;
}

/**
 * Hide Modal 액션 설정
 */
export interface HideModalConfig {
  modalId?: string; // undefined면 모든 모달 닫기
}

/**
 * Show Toast 액션 설정
 */
export interface ShowToastConfig {
  message: string;
  type: "success" | "error" | "warning" | "info";
  duration?: number;
  position?: "top" | "bottom" | "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

/**
 * Validate Form 액션 설정
 */
export interface ValidateFormConfig {
  formId: string;
  onValid?: EventAction;
  onInvalid?: EventAction;
}

/**
 * Custom 액션 설정
 */
export interface CustomConfig {
  code: string;
  params?: Record<string, unknown>;
}

/**
 * Scroll To 액션 설정
 */
export interface ScrollToConfig {
  elementId?: string;
  position?: "top" | "center" | "bottom";
  smooth?: boolean;
  offset?: number;
}

/**
 * Toggle Visibility 액션 설정
 */
export interface ToggleVisibilityConfig {
  elementId: string;
  show?: boolean; // undefined면 토글, true/false면 명시적 제어
  duration?: number;
  easing?: "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear";
}

/**
 * Copy to Clipboard 액션 설정
 */
export interface CopyToClipboardConfig {
  text: string;
  source?: "static" | "element" | "state";
  elementId?: string;
  stateKey?: string;
}

/**
 * 이벤트 카테고리
 */
export interface EventCategory {
  id: string;
  label: string;
  icon: string;
  events: EventType[];
  description?: string;
}

/**
 * 이벤트 메타데이터 (추천, 사용률 등)
 */
export interface EventMetadata {
  label: string;
  description: string;
  usage?: string; // 사용률 (예: "95%")
  category: string;
  compatibleWith?: string[]; // 호환 가능한 컴포넌트 타입들
  example?: string;
}

/**
 * 액션 메타데이터
 */
export interface ActionMetadata {
  label: string;
  description: string;
  icon?: string;
  category: "navigation" | "state" | "api" | "ui" | "form" | "utility";
  configFields: ActionConfigField[];
}

/**
 * 액션 설정 필드
 */
export interface ActionConfigField {
  name: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "textarea";
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: unknown;
}

/**
 * 이벤트 실행 컨텍스트
 */
export interface EventContext {
  event: Event;
  element: HTMLElement;
  elementId: string;
  pageId: string;
  projectId: string;
  state: Record<string, unknown>;
}

/**
 * 이벤트 실행 결과
 */
export interface EventExecutionResult {
  success: boolean;
  actionResults: Array<{
    actionId: string;
    success: boolean;
    error?: string;
    data?: unknown;
  }>;
  totalExecutionTime: number;
}

/**
 * 이벤트 타입 레이블 맵
 */
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  // Mouse
  onClick: "클릭",
  onDoubleClick: "더블클릭",
  onMouseEnter: "마우스 진입",
  onMouseLeave: "마우스 나감",
  onMouseDown: "마우스 다운",
  onMouseUp: "마우스 업",

  // Form
  onChange: "값 변경",
  onInput: "입력",
  onSubmit: "제출",
  onFocus: "포커스",
  onBlur: "포커스 해제",

  // Keyboard
  onKeyDown: "키 누름",
  onKeyUp: "키 뗌",
  onKeyPress: "키 입력",

  // React Aria
  onPress: "프레스",
  onSelectionChange: "선택 변경",
  onAction: "액션",
  onOpenChange: "열림/닫힘",

  // Other
  onScroll: "스크롤",
  onResize: "크기 변경",
  onLoad: "로드"
};

/**
 * 액션 타입 레이블 맵
 */
export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  navigate: "페이지 이동",
  scrollTo: "스크롤 이동",
  setState: "상태 설정",
  updateState: "상태 업데이트",
  apiCall: "API 호출",
  showModal: "모달 표시",
  hideModal: "모달 숨김",
  showToast: "토스트 표시",
  toggleVisibility: "표시/숨김 토글",
  validateForm: "폼 검증",
  resetForm: "폼 리셋",
  submitForm: "폼 제출",
  copyToClipboard: "클립보드 복사",
  customFunction: "커스텀 함수"
};

/**
 * 기본값 상수
 */
export const DEFAULT_DEBOUNCE_TIME = 300;
export const DEFAULT_THROTTLE_TIME = 100;
export const MAX_EXECUTION_TIME = 5000;
