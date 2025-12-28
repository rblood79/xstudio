/**
 * Keyboard Shortcuts Type Definitions
 *
 * 키보드 단축키 시스템의 타입 정의
 *
 * @since Phase 2 구현 (2025-12-28)
 */

import type { KeyboardModifier, ShortcutCategory } from '../hooks/useKeyboardShortcutsRegistry';

// ============================================
// Scope Types
// ============================================

/**
 * 단축키 활성화 스코프
 *
 * - global: 항상 활성
 * - canvas-focused: 캔버스에 포커스가 있을 때
 * - panel:*: 특정 패널이 활성화되었을 때
 * - modal: 모달이 열려있을 때
 * - text-editing: 텍스트 입력 중
 */
export type ShortcutScope =
  | 'global'
  | 'canvas-focused'
  | 'panel:properties'
  | 'panel:styles'
  | 'panel:events'
  | 'panel:nodes'
  | 'modal'
  | 'text-editing';

// ============================================
// Shortcut Definition Types
// ============================================

/**
 * 단축키 정의 (핸들러 제외)
 *
 * 설정 파일에서 사용되는 단축키 메타데이터
 */
export interface ShortcutDefinition {
  /** 키 (예: 'z', 'c', '=') */
  key: string;

  /** KeyboardEvent.code (예: 'Space', 'NumpadAdd') */
  code?: string;

  /** Modifier 키 조합 */
  modifier: KeyboardModifier;

  /** 카테고리 */
  category: ShortcutCategory;

  /** 활성화 스코프 (배열이면 여러 스코프에서 활성) */
  scope: ShortcutScope | ShortcutScope[];

  /** 우선순위 (높을수록 먼저 실행) */
  priority: number;

  /** 입력 필드에서도 동작 여부 */
  allowInInput?: boolean;

  /** capture 단계에서 처리 여부 */
  capture?: boolean;

  /** 설명 */
  description: string;

  /** 다국어 설명 */
  i18n?: {
    ko?: string;
    ja?: string;
    [locale: string]: string | undefined;
  };
}

/**
 * 단축키 ID 타입 (문자열 리터럴)
 */
export type ShortcutId = string;

/**
 * 단축키 핸들러 맵
 */
export type ShortcutHandlers = Record<ShortcutId, () => void>;

/**
 * 단축키 정의 맵
 */
export type ShortcutDefinitions = Record<ShortcutId, ShortcutDefinition>;

// ============================================
// Help Panel Types
// ============================================

/**
 * 도움말 패널용 단축키 그룹
 */
export interface ShortcutGroup {
  /** 그룹 ID */
  id: ShortcutCategory;

  /** 그룹 라벨 */
  label: string;

  /** 그룹 내 단축키 ID 목록 */
  shortcuts: ShortcutId[];
}

/**
 * 도움말 패널용 단축키 표시 정보
 */
export interface ShortcutDisplayInfo {
  /** 단축키 ID */
  id: ShortcutId;

  /** 플랫폼별 표시 문자열 (예: "⌘Z" 또는 "Ctrl+Z") */
  display: string;

  /** 설명 */
  description: string;

  /** 카테고리 */
  category: ShortcutCategory;
}

// ============================================
// Conflict Detection Types
// ============================================

/**
 * 단축키 충돌 정보
 */
export interface ShortcutConflict {
  /** 기존 단축키 ID */
  existingId: ShortcutId;

  /** 새 단축키 ID */
  newId: ShortcutId;

  /** 충돌하는 키 조합 */
  keyCombo: string;

  /** 해결 방법 */
  resolution: 'override' | 'skip' | 'error';
}

// ============================================
// Re-exports
// ============================================

export type { KeyboardModifier, ShortcutCategory } from '../hooks/useKeyboardShortcutsRegistry';
