/**
 * Event Type Registry
 *
 * 중앙 이벤트 타입 레지스트리 - 타입 시스템과 런타임 구현의 단일 진실 공급원
 *
 * 이 파일은 다음을 보장합니다:
 * 1. UI에서 선택 가능한 이벤트/액션 = 실제로 작동하는 이벤트/액션
 * 2. 타입 시스템과 런타임 검증의 동기화
 * 3. 새 이벤트/액션 추가 시 체크리스트로 활용
 */

// ===== 구현된 이벤트 타입 (화이트리스트) =====

/**
 * 현재 구현되어 실제로 작동하는 이벤트 타입 목록
 *
 * 새 이벤트 추가 체크리스트:
 * 1. 이 배열에 추가
 * 2. EventHandlerFactory의 allowedEventTypes에 추가
 * 3. 실제 이벤트 핸들러 구현
 * 4. Inspector UI에서 테스트
 */
export const IMPLEMENTED_EVENT_TYPES = [
  // Mouse Events (구현됨)
  "onClick",
  "onMouseEnter",
  "onMouseLeave",

  // Form Events (구현됨)
  "onChange",
  "onSubmit",
  "onFocus",
  "onBlur",

  // Keyboard Events (구현됨)
  "onKeyDown",
  "onKeyUp",

  // 향후 구현 예정:
  // 'onPress',          // React Aria 전용
  // 'onDoubleClick',    // 더블클릭
  // 'onInput',          // 입력 중
  // 'onScroll',         // 스크롤
  // 'onResize',         // 리사이즈
  // 'onHover',          // React Aria 호버
  // 'onDragStart',      // 드래그 시작
  // 'onDragEnd',        // 드래그 종료
  // 'onDrop',           // 드롭
] as const;

export type EventType = (typeof IMPLEMENTED_EVENT_TYPES)[number];

// ===== 구현된 액션 타입 (화이트리스트) =====

/**
 * 현재 구현되어 실제로 작동하는 액션 타입 목록
 *
 * 새 액션 추가 체크리스트:
 * 1. 이 배열에 추가
 * 2. EventEngine의 actionHandlers에 구현 함수 등록
 * 3. 액션 에디터 컴포넌트 생성 (src/builder/inspector/events/actions/)
 * 4. ACTION_METADATA에 메타데이터 추가
 * 5. Inspector UI에서 테스트
 */
export const IMPLEMENTED_ACTION_TYPES = [
  // Navigation (구현됨)
  "navigate",
  "scroll_to",
  "scrollTo", // alias for scroll_to

  // UI State (구현됨)
  "toggle_visibility",
  "toggleVisibility", // alias for toggle_visibility
  "show_modal",
  "showModal", // alias for show_modal
  "hide_modal",
  "hideModal", // alias for hide_modal
  "showToast",

  // Data Management (구현됨)
  "update_state",
  "updateState", // alias for update_state
  "setState", // alias for update_state
  "copy_to_clipboard",
  "copyToClipboard", // alias for copy_to_clipboard

  // Form Operations (구현됨)
  "validate_form",
  "validateForm", // alias for validate_form
  "reset_form",
  "resetForm", // alias for reset_form
  "submitForm",
  "updateFormField",

  // Custom (구현됨)
  "custom_function",
  "customFunction", // alias for custom_function
  "apiCall",

  // Component Interaction (구현됨)
  "setComponentState",
  "triggerComponentAction",

  // Collection Interaction (구현됨)
  "filterCollection",
  "selectItem",
  "clearSelection",

  // Data Panel Integration (구현됨)
  "fetchDataTable",      // DataTable 데이터 fetch
  "refreshDataTable",    // DataTable 데이터 새로고침
  "executeApi",          // API Endpoint 실행
  "setVariable",         // Variable 값 설정
  "getVariable",         // Variable 값 가져오기

  // 향후 구현 예정:
  // 'update_props',        // 요소 props 업데이트
  // 'trigger_animation',   // 애니메이션 트리거
  // 'play_sound',          // 사운드 재생
  // 'send_analytics',      // 분석 이벤트 전송
  // 'console_log',         // 디버깅용 콘솔 로그
  // 'set_localStorage',    // localStorage 설정
  // 'get_localStorage',    // localStorage 가져오기
  // 'remove_localStorage', // localStorage 삭제
] as const;

export type ActionType = (typeof IMPLEMENTED_ACTION_TYPES)[number];

// ===== 타입 가드 함수 =====

/**
 * 이벤트 타입이 구현되어 있는지 확인
 */
export function isImplementedEventType(
  eventType: string
): eventType is EventType {
  return (IMPLEMENTED_EVENT_TYPES as readonly string[]).includes(eventType);
}

/**
 * 액션 타입이 구현되어 있는지 확인
 */
export function isImplementedActionType(
  actionType: string
): actionType is ActionType {
  return (IMPLEMENTED_ACTION_TYPES as readonly string[]).includes(actionType);
}

// ===== 이벤트 카테고리 (UI 그룹화용) =====

export const EVENT_CATEGORIES = {
  mouse: {
    label: "Mouse Events",
    events: ["onClick", "onMouseEnter", "onMouseLeave"] as const,
  },
  form: {
    label: "Form Events",
    events: ["onChange", "onSubmit", "onFocus", "onBlur"] as const,
  },
  keyboard: {
    label: "Keyboard Events",
    events: ["onKeyDown", "onKeyUp"] as const,
  },
} as const;

// ===== 액션 카테고리 (UI 그룹화용) =====

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
    actions: ["fetchDataTable", "refreshDataTable", "executeApi", "setVariable", "getVariable"] as const,
  },
  custom: {
    label: "Custom",
    actions: ["customFunction", "apiCall"] as const,
  },
} as const;

// ===== 디버깅 유틸리티 =====

/**
 * 구현된 이벤트/액션 타입 통계
 */
export function getImplementationStats() {
  return {
    events: {
      implemented: IMPLEMENTED_EVENT_TYPES.length,
      categories: Object.keys(EVENT_CATEGORIES).length,
    },
    actions: {
      implemented: IMPLEMENTED_ACTION_TYPES.length,
      categories: Object.keys(ACTION_CATEGORIES).length,
    },
  };
}

/**
 * 개발 모드에서 통계 출력
 */
/*
if (import.meta.env.DEV) {
  const stats = getImplementationStats();
  console.log('[Event Registry] Implementation Stats:', stats);
}
*/
