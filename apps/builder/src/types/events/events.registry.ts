/**
 * Event Type Registry — 이벤트 정의의 유일한 정본 (ADR-055)
 *
 * 새 이벤트 추가 시 이 파일의 EVENT_REGISTRY만 수정하면 됩니다.
 * EventType, ImplementedEventType, EVENT_TYPE_LABELS는 자동 derive됩니다.
 *
 * 1차 파생물: EventType, ImplementedEventType, EVENT_TYPE_LABELS, EVENT_CATEGORIES
 * 2차 파생물(별도 파일): metadata.ts supportedEvents, COMPONENT_RECOMMENDED_EVENTS
 */

// ===== 이벤트 카테고리 ID =====

export type EventCategoryId =
  | "mouse"
  | "form"
  | "keyboard"
  | "reactAria"
  | "other";

// ===== 이벤트 정의 인터페이스 =====

interface EventDef {
  label: string;
  category: EventCategoryId;
  implemented: boolean;
}

// ===== 정본: EVENT_REGISTRY =====

export const EVENT_REGISTRY = {
  // Mouse Events
  onClick: {
    label: "클릭",
    category: "mouse",
    implemented: true,
  },
  onDoubleClick: {
    label: "더블클릭",
    category: "mouse",
    implemented: false,
  },
  onMouseEnter: {
    label: "마우스 진입",
    category: "mouse",
    implemented: true,
  },
  onMouseLeave: {
    label: "마우스 나감",
    category: "mouse",
    implemented: true,
  },
  onMouseDown: {
    label: "마우스 다운",
    category: "mouse",
    implemented: false,
  },
  onMouseUp: {
    label: "마우스 업",
    category: "mouse",
    implemented: false,
  },

  // Form Events
  onChange: {
    label: "값 변경",
    category: "form",
    implemented: true,
  },
  onInput: {
    label: "입력",
    category: "form",
    implemented: false,
  },
  onSubmit: {
    label: "제출",
    category: "form",
    implemented: true,
  },
  onFocus: {
    label: "포커스",
    category: "form",
    implemented: true,
  },
  onBlur: {
    label: "포커스 해제",
    category: "form",
    implemented: true,
  },

  // Keyboard Events
  onKeyDown: {
    label: "키 누름",
    category: "keyboard",
    implemented: true,
  },
  onKeyUp: {
    label: "키 뗌",
    category: "keyboard",
    implemented: true,
  },
  onKeyPress: {
    label: "키 입력",
    category: "keyboard",
    implemented: false,
  },

  // React Aria Events
  onPress: {
    label: "프레스",
    category: "reactAria",
    implemented: true,
  },
  onSelectionChange: {
    label: "선택 변경",
    category: "reactAria",
    implemented: true,
  },
  onAction: {
    label: "액션",
    category: "reactAria",
    implemented: true,
  },
  onOpenChange: {
    label: "열림/닫힘",
    category: "reactAria",
    implemented: true,
  },
  onChangeEnd: {
    label: "값 변경 완료",
    category: "reactAria",
    implemented: true,
  },
  onExpandedChange: {
    label: "펼침/접힘 변경",
    category: "reactAria",
    implemented: true,
  },
  onRemove: {
    label: "항목 제거",
    category: "reactAria",
    implemented: true,
  },

  // Other Events
  onScroll: {
    label: "스크롤",
    category: "other",
    implemented: false,
  },
  onResize: {
    label: "크기 변경",
    category: "other",
    implemented: false,
  },
  onLoad: {
    label: "로드",
    category: "other",
    implemented: false,
  },
} as const satisfies Record<string, EventDef>;

// ===== 1차 파생: 타입 =====

/** 모든 이벤트 타입 (구현 + 미구현) */
export type EventType = keyof typeof EVENT_REGISTRY;

/** 구현된 이벤트만 */
export type ImplementedEventType = {
  [K in EventType]: (typeof EVENT_REGISTRY)[K]["implemented"] extends true
    ? K
    : never;
}[EventType];

// ===== 1차 파생: 런타임 상수 =====

/** 구현된 이벤트 배열 (런타임 whitelist) */
export const IMPLEMENTED_EVENT_TYPES = (
  Object.keys(EVENT_REGISTRY) as EventType[]
).filter((k) => EVENT_REGISTRY[k].implemented) as ImplementedEventType[];

/** 이벤트 타입 → 한글 레이블 매핑 */
export const EVENT_TYPE_LABELS = Object.fromEntries(
  (Object.entries(EVENT_REGISTRY) as [EventType, EventDef][]).map(([k, v]) => [
    k,
    v.label,
  ]),
) as Record<EventType, string>;

/** 카테고리별 이벤트 목록 (자동 집계) */
export const EVENT_CATEGORIES_BY_ID = (
  Object.entries(EVENT_REGISTRY) as [EventType, EventDef][]
).reduce<Record<EventCategoryId, EventType[]>>(
  (acc, [key, def]) => {
    if (!acc[def.category]) acc[def.category] = [];
    acc[def.category].push(key);
    return acc;
  },
  {} as Record<EventCategoryId, EventType[]>,
);

// ===== 타입 가드 =====

/** 이벤트 타입이 registry에 존재하는지 확인 */
export function isEventType(eventType: string): eventType is EventType {
  return eventType in EVENT_REGISTRY;
}

/** 이벤트 타입이 구현되어 있는지 확인 */
export function isImplementedEventType(
  eventType: string,
): eventType is ImplementedEventType {
  return (
    eventType in EVENT_REGISTRY &&
    EVENT_REGISTRY[eventType as EventType].implemented
  );
}

// ===== 액션 타입 (변경 없음 — 이벤트 정본화와 별도) =====

export const IMPLEMENTED_ACTION_TYPES = [
  // Navigation
  "navigate",
  "scroll_to",
  "scrollTo",

  // UI State
  "toggle_visibility",
  "toggleVisibility",
  "show_modal",
  "showModal",
  "hide_modal",
  "hideModal",
  "showToast",

  // Data Management
  "update_state",
  "updateState",
  "set_state",
  "setState",
  "copy_to_clipboard",
  "copyToClipboard",

  // Form Operations
  "validate_form",
  "validateForm",
  "reset_form",
  "resetForm",
  "submit_form",
  "submitForm",
  "update_form_field",
  "updateFormField",

  // Custom
  "custom_function",
  "customFunction",
  "api_call",
  "apiCall",
  "show_toast",

  // Component Interaction
  "set_component_state",
  "setComponentState",
  "trigger_component_action",
  "triggerComponentAction",

  // Collection Interaction
  "filter_collection",
  "filterCollection",
  "select_item",
  "selectItem",
  "clear_selection",
  "clearSelection",

  // Data Panel Integration
  "fetchDataTable",
  "refreshDataTable",
  "executeApi",
  "setVariable",
  "getVariable",

  // DataTable Actions
  "loadDataTable",
  "syncComponent",
  "saveToDataTable",
] as const;

export type ActionType = (typeof IMPLEMENTED_ACTION_TYPES)[number];

/** 액션 타입 → 한글 레이블 매핑 (camelCase 정본, snake_case는 자동 derive) */
const CAMEL_ACTION_LABELS: Record<string, string> = {
  navigate: "페이지 이동",
  scrollTo: "스크롤 이동",
  setState: "상태 설정",
  updateState: "상태 업데이트",
  toggleVisibility: "표시/숨김 토글",
  showModal: "모달 표시",
  hideModal: "모달 숨김",
  showToast: "토스트 표시",
  validateForm: "폼 검증",
  resetForm: "폼 리셋",
  submitForm: "폼 제출",
  updateFormField: "폼 필드 업데이트",
  setComponentState: "컴포넌트 상태 설정",
  triggerComponentAction: "컴포넌트 액션 트리거",
  filterCollection: "컬렉션 필터",
  selectItem: "항목 선택",
  clearSelection: "선택 해제",
  apiCall: "API 호출",
  copyToClipboard: "클립보드 복사",
  customFunction: "커스텀 함수",
  fetchDataTable: "DataTable 조회",
  refreshDataTable: "DataTable 새로고침",
  executeApi: "API 실행",
  setVariable: "변수 설정",
  getVariable: "변수 조회",
  loadDataTable: "DataTable 로드",
  syncComponent: "컴포넌트 동기화",
  saveToDataTable: "DataTable에 저장",
};

// snake_case alias → camelCase 매핑 (normalizeToInspectorAction과 동일 매핑)
const SNAKE_TO_CAMEL: Record<string, string> = {
  toggle_visibility: "toggleVisibility",
  show_modal: "showModal",
  hide_modal: "hideModal",
  update_state: "updateState",
  set_state: "setState",
  scroll_to: "scrollTo",
  copy_to_clipboard: "copyToClipboard",
  validate_form: "validateForm",
  reset_form: "resetForm",
  submit_form: "submitForm",
  update_form_field: "updateFormField",
  custom_function: "customFunction",
  api_call: "apiCall",
  set_component_state: "setComponentState",
  trigger_component_action: "triggerComponentAction",
  filter_collection: "filterCollection",
  select_item: "selectItem",
  clear_selection: "clearSelection",
  show_toast: "showToast",
};

// snake_case 레이블을 camelCase에서 자동 derive
export const ACTION_TYPE_LABELS: Partial<Record<ActionType, string>> = {
  ...CAMEL_ACTION_LABELS,
  ...Object.fromEntries(
    Object.entries(SNAKE_TO_CAMEL).map(([snake, camel]) => [
      snake,
      CAMEL_ACTION_LABELS[camel] ?? snake,
    ]),
  ),
} as Partial<Record<ActionType, string>>;

const IMPLEMENTED_ACTION_TYPES_SET = new Set<string>(IMPLEMENTED_ACTION_TYPES);

export function isImplementedActionType(
  actionType: string,
): actionType is ActionType {
  return IMPLEMENTED_ACTION_TYPES_SET.has(actionType);
}

export const ACTION_CATEGORIES = {
  navigation: {
    label: "Navigation",
    actions: ["navigate", "scrollTo"] as const,
  },
  ui: {
    label: "UI Control",
    actions: [
      "toggleVisibility",
      "showModal",
      "hideModal",
      "showToast",
    ] as const,
  },
  data: {
    label: "Data Management",
    actions: ["setState", "updateState", "copyToClipboard"] as const,
  },
  form: {
    label: "Form Operations",
    actions: [
      "validateForm",
      "resetForm",
      "submitForm",
      "updateFormField",
    ] as const,
  },
  component: {
    label: "Component Interaction",
    actions: ["setComponentState", "triggerComponentAction"] as const,
  },
  collection: {
    label: "Collection Operations",
    actions: ["filterCollection", "selectItem", "clearSelection"] as const,
  },
  dataPanel: {
    label: "Data Panel",
    actions: [
      "fetchDataTable",
      "refreshDataTable",
      "executeApi",
      "setVariable",
      "getVariable",
      "loadDataTable",
      "syncComponent",
      "saveToDataTable",
    ] as const,
  },
  custom: {
    label: "Custom",
    actions: ["customFunction", "apiCall"] as const,
  },
} as const;
