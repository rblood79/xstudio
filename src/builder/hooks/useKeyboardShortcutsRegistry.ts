/**
 * useKeyboardShortcutsRegistry Hook
 *
 * 범용 키보드 단축키 등록 시스템
 * - 여러 패널에서 중복되는 키보드 이벤트 리스너 패턴을 통합
 * - 메모리 효율적: 한 번만 addEventListener 등록
 * - 타입 안전: 명시적인 단축키 타입 정의
 *
 * @example
 * ```tsx
 * useKeyboardShortcutsRegistry([
 *   { key: 'c', modifier: 'cmdShift', handler: handleCopy },
 *   { key: 'v', modifier: 'cmdShift', handler: handlePaste },
 * ]);
 * ```
 */

import { useEffect } from 'react';

/**
 * 지원되는 modifier 조합
 */
export type KeyboardModifier =
  | 'cmd'           // Cmd (Mac) or Ctrl (Win)
  | 'cmdShift'      // Cmd+Shift or Ctrl+Shift
  | 'alt'           // Alt or Option
  | 'altShift'      // Alt+Shift or Option+Shift
  | 'none';         // No modifier

/**
 * 키보드 단축키 정의
 */
export interface KeyboardShortcut {
  /** 키 (예: 'c', 'v', 's', 'Enter') */
  key: string;

  /** Modifier 키 조합 */
  modifier: KeyboardModifier;

  /** 실행할 핸들러 함수 */
  handler: () => void;

  /** 설명 (선택사항, 디버깅용) */
  description?: string;

  /** 비활성화 여부 (선택사항) */
  disabled?: boolean;
}

/**
 * 이벤트가 단축키와 일치하는지 확인
 */
function matchesShortcut(
  event: KeyboardEvent,
  shortcut: KeyboardShortcut
): boolean {
  // 비활성화된 단축키는 무시
  if (shortcut.disabled) return false;

  // 키 일치 확인 (대소문자 구분 안 함)
  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
    return false;
  }

  // Modifier 확인
  switch (shortcut.modifier) {
    case 'cmd':
      return (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey;

    case 'cmdShift':
      return (event.metaKey || event.ctrlKey) && event.shiftKey && !event.altKey;

    case 'alt':
      return (event.altKey || event.metaKey) && !event.shiftKey && !event.ctrlKey;

    case 'altShift':
      return (event.altKey || event.metaKey) && event.shiftKey;

    case 'none':
      return !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;

    default:
      return false;
  }
}

/**
 * 키보드 단축키 등록 hook
 *
 * @param shortcuts - 등록할 단축키 배열
 * @param deps - 추가 의존성 배열 (선택사항)
 */
export function useKeyboardShortcutsRegistry(
  shortcuts: KeyboardShortcut[],
  deps: React.DependencyList = []
): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 입력 필드에서는 단축키 비활성화
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // 등록된 단축키 중 일치하는 것 찾기
      for (const shortcut of shortcuts) {
        if (matchesShortcut(event, shortcut)) {
          event.preventDefault();
          shortcut.handler();
          break; // 첫 번째 매치만 실행
        }
      }
    };

    // eslint-disable-next-line local/prefer-keyboard-shortcuts-registry
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps]);
}

/**
 * 디버깅용: 등록된 단축키 목록 출력
 */
export function logShortcuts(shortcuts: KeyboardShortcut[]): void {
  console.group('🎹 Registered Keyboard Shortcuts');
  shortcuts.forEach((shortcut) => {
    const modifierLabel = {
      cmd: 'Cmd/Ctrl',
      cmdShift: 'Cmd/Ctrl+Shift',
      alt: 'Alt/Option',
      altShift: 'Alt/Option+Shift',
      none: '',
    }[shortcut.modifier];

    console.log(
      `${modifierLabel}${modifierLabel ? '+' : ''}${shortcut.key.toUpperCase()}`,
      shortcut.description || '(no description)',
      shortcut.disabled ? '(disabled)' : ''
    );
  });
  console.groupEnd();
}
