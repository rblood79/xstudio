/**
 * Event and Action Types
 *
 * ⚠️ IMPORTANT: These types are now sourced from the Event Registry
 * DO NOT modify these types directly. Instead, update events.registry.ts
 *
 * This ensures type system and runtime implementation stay synchronized.
 */

// Import from registry for use in this file
import type { EventType, ActionType } from './events.registry';

// Re-export from registry (single source of truth)
export type { EventType, ActionType } from './events.registry';
export {
  IMPLEMENTED_EVENT_TYPES,
  IMPLEMENTED_ACTION_TYPES,
  isImplementedEventType,
  isImplementedActionType,
} from './events.registry';

// 액션별 특화된 값 타입들
export interface NavigateActionValue {
    path: string;
    openInNewTab?: boolean;
    replace?: boolean;
}

export interface ToggleVisibilityActionValue {
    show?: boolean; // undefined면 토글, true/false면 명시적 제어
    duration?: number; // 애니메이션 지속시간 (ms)
    easing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
}

export interface UpdateStateActionValue {
    key: string;
    value: unknown;
    merge?: boolean; // 객체 병합 여부
}

export interface ShowModalActionValue {
    modalId: string;
    data?: unknown;
    backdrop?: boolean;
    closable?: boolean;
}

export interface HideModalActionValue {
    modalId?: string; // undefined면 모든 모달 닫기
}

export interface ScrollToActionValue {
    elementId?: string;
    position?: 'top' | 'center' | 'bottom';
    smooth?: boolean;
    offset?: number;
}

export interface CustomFunctionActionValue {
    code: string;
    params?: Record<string, unknown>;
    async?: boolean;
}

export interface CopyToClipboardActionValue {
    text: string;
    source?: 'static' | 'element' | 'state';
    elementId?: string;
    stateKey?: string;
    fallback?: string;
}

export interface UpdatePropsActionValue {
    elementId: string;
    props: Record<string, unknown>;
    merge?: boolean;
}

export interface TriggerAnimationActionValue {
    elementId: string;
    animation: string;
    duration?: number;
    delay?: number;
    iterations?: number | 'infinite';
}

export interface PlaySoundActionValue {
    url: string;
    volume?: number;
    loop?: boolean;
    preload?: boolean;
}

export interface SendAnalyticsActionValue {
    event: string;
    category?: string;
    label?: string;
    value?: number;
    customData?: Record<string, unknown>;
}

// 모든 액션 값 타입의 유니온
export type ActionValue =
    | NavigateActionValue
    | ToggleVisibilityActionValue
    | UpdateStateActionValue
    | ShowModalActionValue
    | HideModalActionValue
    | ScrollToActionValue
    | CustomFunctionActionValue
    | CopyToClipboardActionValue
    | UpdatePropsActionValue
    | TriggerAnimationActionValue
    | PlaySoundActionValue
    | SendAnalyticsActionValue;

// 개별 액션 정의
export interface EventAction {
    id: string;
    type: ActionType;
    target?: string; // 대상 요소 ID
    value?: ActionValue;
    delay?: number; // 지연 시간 (ms)
    condition?: string; // 실행 조건 (JavaScript 표현식)
    enabled?: boolean; // 액션 활성화 여부
    description?: string; // 액션 설명
}

// 요소의 이벤트 정의
export interface ElementEvent {
    id: string;
    event_type: EventType;
    actions: EventAction[];
    enabled: boolean;
    description?: string; // 이벤트 설명
    preventDefault?: boolean; // 기본 동작 방지 여부
    stopPropagation?: boolean; // 이벤트 전파 중단 여부
    debounce?: number; // 디바운스 시간 (ms)
    throttle?: number; // 스로틀 시간 (ms)
}

// 이벤트 실행 컨텍스트
export interface EventContext {
    event: Event;
    element: HTMLElement;
    elementId: string;
    pageId: string;
    projectId: string;
    state: Record<string, unknown>;
}

// 이벤트 실행 결과
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

// 이벤트 템플릿 (재사용 가능한 이벤트 패턴)
export interface EventTemplate {
    id: string;
    name: string;
    description: string;
    category: 'navigation' | 'interaction' | 'animation' | 'data' | 'custom';
    event_type: EventType;
    actions: Omit<EventAction, 'id'>[];
    tags: string[];
    preview?: string; // 미리보기 설명
}

// 이벤트 설정
export interface EventSettings {
    globalDebounce?: number;
    globalThrottle?: number;
    enableAnalytics?: boolean;
    enableDebugMode?: boolean;
    maxExecutionTime?: number;
    errorHandling?: 'ignore' | 'log' | 'stop';
}

// 타입 가드 함수들
export function isNavigateAction(action: EventAction): action is EventAction & { value: NavigateActionValue } {
    return action.type === 'navigate';
}

export function isToggleVisibilityAction(action: EventAction): action is EventAction & { value: ToggleVisibilityActionValue } {
    return action.type === 'toggle_visibility';
}

export function isUpdateStateAction(action: EventAction): action is EventAction & { value: UpdateStateActionValue } {
    return action.type === 'update_state';
}

export function isShowModalAction(action: EventAction): action is EventAction & { value: ShowModalActionValue } {
    return action.type === 'show_modal';
}

export function isCustomFunctionAction(action: EventAction): action is EventAction & { value: CustomFunctionActionValue } {
    return action.type === 'custom_function';
}

// 이벤트 유틸리티 타입들
export type EventHandlerMap = Record<EventType, (context: EventContext) => Promise<EventExecutionResult>>;

export type ActionHandlerMap = Record<ActionType, (action: EventAction, context: EventContext) => Promise<unknown>>;

// 이벤트 상수들
export const DEFAULT_DEBOUNCE_TIME = 300;
export const DEFAULT_THROTTLE_TIME = 100;
export const MAX_EXECUTION_TIME = 5000;

/**
 * ⚠️ IMPORTANT: Only include labels for IMPLEMENTED types
 * Partial type allows only implemented types to have labels
 */
export const EVENT_TYPE_LABELS: Partial<Record<EventType, string>> = {
    onClick: '클릭',
    onMouseEnter: '마우스 진입',
    onMouseLeave: '마우스 나감',
    onFocus: '포커스',
    onBlur: '포커스 해제',
    onChange: '값 변경',
    onSubmit: '제출',
    onKeyDown: '키 누름',
    onKeyUp: '키 뗌',
    // 구현 예정:
    // onDoubleClick: '더블클릭',
    // onInput: '입력',
    // onScroll: '스크롤',
    // onResize: '크기 변경'
};

/**
 * ⚠️ IMPORTANT: Only include labels for IMPLEMENTED types
 * Partial type allows only implemented types to have labels
 */
export const ACTION_TYPE_LABELS: Partial<Record<ActionType, string>> = {
    navigate: '페이지 이동',
    toggle_visibility: '표시/숨김 토글',
    toggleVisibility: '표시/숨김 토글',
    update_state: '상태 업데이트',
    updateState: '상태 업데이트',
    setState: '상태 설정',
    show_modal: '모달 표시',
    showModal: '모달 표시',
    hide_modal: '모달 숨김',
    hideModal: '모달 숨김',
    showToast: '토스트 표시',
    custom_function: '커스텀 함수',
    customFunction: '커스텀 함수',
    scroll_to: '스크롤 이동',
    scrollTo: '스크롤 이동',
    copy_to_clipboard: '클립보드 복사',
    copyToClipboard: '클립보드 복사',
    validate_form: '폼 검증',
    validateForm: '폼 검증',
    reset_form: '폼 리셋',
    resetForm: '폼 리셋',
    submitForm: '폼 제출',
    updateFormField: '폼 필드 업데이트',
    apiCall: 'API 호출',
    setComponentState: '컴포넌트 상태 설정',
    triggerComponentAction: '컴포넌트 액션 트리거',
    filterCollection: '컬렉션 필터',
    selectItem: '항목 선택',
    clearSelection: '선택 해제',
    // 구현 예정:
    // update_props: '속성 업데이트',
    // trigger_animation: '애니메이션 실행',
    // play_sound: '사운드 재생',
    // send_analytics: '분석 데이터 전송'
};

export const ACTION_CATEGORIES = {
    navigation: ['navigate', 'scroll_to'],
    interaction: ['toggle_visibility', 'show_modal', 'hide_modal', 'update_props'],
    data: ['update_state', 'copy_to_clipboard', 'send_analytics'],
    media: ['play_sound', 'trigger_animation'],
    custom: ['custom_function']
} as const;