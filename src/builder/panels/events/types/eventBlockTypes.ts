/**
 * Events Panel 블록 기반 타입 시스템
 *
 * WHEN → IF → THEN/ELSE 패턴 지원
 * 설계 문서: docs/EVENTS_PANEL_REDESIGN.md
 */

import type { ActionConfig } from './eventTypes';
import type { ActionType, EventType } from '@/types/events/events.types';

// ============================================================================
// WHEN 블록 (트리거)
// ============================================================================

/**
 * 트리거 설정
 * WHEN 블록에서 이벤트 타입과 대상 요소를 정의
 */
export interface EventTrigger {
  /** 이벤트 타입 (onClick, onPress, onChange 등) */
  event: EventType;

  /**
   * 대상 요소
   * - 'self': 현재 선택된 요소
   * - string: 다른 요소의 customId 또는 ID
   */
  target: 'self' | string;

  /** 이벤트 옵션 */
  options?: {
    capture?: boolean;
    passive?: boolean;
    once?: boolean;
  };
}

// ============================================================================
// IF 블록 (조건)
// ============================================================================

/**
 * 조건 그룹
 * AND/OR 연산자로 여러 조건을 묶음
 */
export interface ConditionGroup {
  /** 조건 연산자 */
  operator: 'AND' | 'OR';

  /** 조건 목록 */
  conditions: Condition[];
}

/**
 * 단일 조건
 * left [operator] right 형태 (예: #email.value is_not_empty)
 */
export interface Condition {
  id: string;

  /** 조건 좌변 (참조) */
  left: ConditionOperand;

  /** 비교 연산자 */
  operator: ConditionOperator;

  /**
   * 조건 우변 (값)
   * is_empty, is_not_empty, is_true, is_false 등 단항 연산자에서는 생략 가능
   */
  right?: ConditionOperand;
}

/**
 * 조건 피연산자 (좌변 또는 우변)
 */
export interface ConditionOperand {
  /**
   * 참조 타입
   * - 'element': DOM 요소 속성 (예: "#email-input.value")
   * - 'state': 전역 상태 (예: "state.user.isLoggedIn")
   * - 'event': 이벤트 객체 (예: "event.target.value", "event.shiftKey")
   * - 'literal': 상수 값
   */
  type: 'element' | 'state' | 'event' | 'literal';

  /**
   * 참조 경로 또는 리터럴 값
   * - element: "#customId.value", "#customId.checked"
   * - state: "user.name", "cart.items.length"
   * - event: "target.value", "shiftKey", "pointerType"
   * - literal: 문자열로 표현된 값 (파싱 필요)
   */
  value: string | number | boolean | null;
}

/**
 * 조건 연산자
 */
export type ConditionOperator =
  // 동등 비교
  | 'equals'
  | 'not_equals'

  // 문자열 비교
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'matches_regex'

  // 숫자 비교
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  // 별칭 (하위 호환)
  | 'greater_than_or_equals'
  | 'less_than_or_equals'
  // 정규식 별칭
  | 'matches'

  // 단항 연산자 (right 불필요)
  | 'is_empty'
  | 'is_not_empty'
  | 'is_true'
  | 'is_false'
  | 'is_null'
  | 'is_not_null';

// ============================================================================
// THEN/ELSE 블록 (액션)
// ============================================================================

/**
 * 블록 기반 이벤트 액션
 * 기존 EventAction 확장 + 변수 바인딩 지원
 */
export interface BlockEventAction {
  id: string;

  /** 액션 타입 */
  type: ActionType;

  /** 액션 설정 (기존 ActionConfig 재사용) */
  config: ActionConfig;

  /**
   * 변수 바인딩
   * config 필드에 동적 값을 바인딩
   * 예: { "endpoint": { type: "state", path: "api.baseUrl" } }
   */
  bindings?: Record<string, VariableBinding>;

  /** 실행 지연 (ms) */
  delay?: number;

  /** 인라인 조건 (추가 필터링) */
  condition?: string;

  /** 활성화 여부 */
  enabled?: boolean;

  /**
   * 에러 처리
   * - 'continue': 에러 무시하고 다음 액션 실행
   * - 'stop': 액션 시퀀스 중단
   * - EventAction[]: 에러 시 실행할 대체 액션
   */
  onError?: 'continue' | 'stop' | BlockEventAction[];

  /** 사용자 정의 레이블 */
  label?: string;

  /** 설명 */
  description?: string;
}

/**
 * 변수 바인딩
 * 액션 config 필드에 동적 값 연결
 */
export interface VariableBinding {
  /** 바인딩 소스 타입 */
  type: 'state' | 'element' | 'event' | 'api_response' | 'literal';

  /** 참조 경로 */
  path: string;

  /** JavaScript 변환 표현식 (선택적) */
  transform?: string;
}

// ============================================================================
// 블록 기반 이벤트 핸들러 (통합)
// ============================================================================

/**
 * 블록 기반 이벤트 핸들러
 * WHEN → IF → THEN/ELSE 패턴의 완전한 구조
 */
export interface BlockEventHandler {
  id: string;

  /** WHEN 블록: 트리거 설정 */
  trigger: EventTrigger;

  /** IF 블록: 조건 그룹 (선택적) */
  conditions?: ConditionGroup;

  /** THEN 블록: 조건 만족 시 실행할 액션 */
  thenActions: BlockEventAction[];

  /** ELSE 블록: 조건 불만족 시 실행할 액션 (선택적) */
  elseActions?: BlockEventAction[];

  // 메타데이터
  /** 핸들러 활성화 여부 */
  enabled: boolean;

  /** 사용자 정의 설명 */
  description?: string;

  // 타이밍 제어
  /** 디바운스 (ms) */
  debounce?: number;

  /** 쓰로틀 (ms) */
  throttle?: number;
}

// ============================================================================
// UI 상태 타입
// ============================================================================

/**
 * 블록 드래그 상태
 */
export interface BlockDragState {
  isDragging: boolean;
  draggedBlockId: string | null;
  dropTarget: {
    blockId: string;
    position: 'before' | 'after';
  } | null;
}

/**
 * 블록 선택 상태
 */
export interface BlockSelectionState {
  selectedHandlerId: string | null;
  selectedConditionId: string | null;
  selectedActionId: string | null;
  focusedBlockType: 'when' | 'if' | 'then' | 'else' | null;
}

/**
 * Events Panel 뷰 모드
 */
export type EventsPanelViewMode = 'visual' | 'code' | 'history';

// ============================================================================
// 연산자 메타데이터
// ============================================================================

/**
 * 조건 연산자 메타데이터
 */
export const CONDITION_OPERATOR_META: Record<
  ConditionOperator,
  { label: string; unary: boolean; description: string }
> = {
  // 동등 비교
  equals: { label: '=', unary: false, description: '같음' },
  not_equals: { label: '!=', unary: false, description: '같지 않음' },

  // 문자열 비교
  contains: { label: 'contains', unary: false, description: '포함' },
  not_contains: { label: 'not contains', unary: false, description: '포함하지 않음' },
  starts_with: { label: 'starts with', unary: false, description: '~로 시작' },
  ends_with: { label: 'ends with', unary: false, description: '~로 끝남' },
  matches_regex: { label: 'matches', unary: false, description: '정규식 매치' },

  // 숫자 비교
  greater_than: { label: '>', unary: false, description: '보다 큼' },
  less_than: { label: '<', unary: false, description: '보다 작음' },
  greater_or_equal: { label: '>=', unary: false, description: '이상' },
  less_or_equal: { label: '<=', unary: false, description: '이하' },
  // 별칭 (하위 호환)
  greater_than_or_equals: { label: '>=', unary: false, description: '이상' },
  less_than_or_equals: { label: '<=', unary: false, description: '이하' },
  matches: { label: 'matches', unary: false, description: '정규식 매치' },

  // 단항 연산자
  is_empty: { label: 'is empty', unary: true, description: '비어 있음' },
  is_not_empty: { label: 'is not empty', unary: true, description: '비어 있지 않음' },
  is_true: { label: 'is true', unary: true, description: '참' },
  is_false: { label: 'is false', unary: true, description: '거짓' },
  is_null: { label: 'is null', unary: true, description: 'null' },
  is_not_null: { label: 'is not null', unary: true, description: 'null 아님' },
};

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 조건 연산자가 단항인지 확인
 */
export function isUnaryOperator(operator: ConditionOperator): boolean {
  return CONDITION_OPERATOR_META[operator].unary;
}

/**
 * 빈 조건 그룹 생성
 */
export function createEmptyConditionGroup(): ConditionGroup {
  return {
    operator: 'AND',
    conditions: [],
  };
}

/**
 * 빈 조건 생성
 */
export function createEmptyCondition(): Condition {
  return {
    id: `cond-${Date.now()}`,
    left: { type: 'element', value: '' },
    operator: 'is_not_empty',
  };
}

/**
 * 빈 블록 이벤트 핸들러 생성
 */
export function createEmptyBlockHandler(event: EventType): BlockEventHandler {
  return {
    id: `handler-${event}-${Date.now()}`,
    trigger: {
      event,
      target: 'self',
    },
    thenActions: [],
    enabled: true,
  };
}

/**
 * 빈 블록 액션 생성
 */
export function createEmptyBlockAction(type: ActionType): BlockEventAction {
  return {
    id: `action-${type}-${Date.now()}`,
    type,
    config: {} as ActionConfig,
    enabled: true,
  };
}
