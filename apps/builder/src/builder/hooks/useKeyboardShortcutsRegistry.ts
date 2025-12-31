/**
 * useKeyboardShortcutsRegistry Hook
 *
 * 범용 키보드 단축키 등록 시스템
 * - 여러 패널에서 중복되는 키보드 이벤트 리스너 패턴을 통합
 * - 메모리 효율적: 한 번만 addEventListener 등록
 * - 타입 안전: 명시적인 단축키 타입 정의
 * - capture phase 지원: 브라우저 기본 동작 차단
 * - allowInInput: 입력 필드 내 단축키 선택적 허용
 * - priority: 우선순위 기반 단축키 실행
 * - scope: 스코프 기반 단축키 필터링 (Phase 4)
 *
 * @example
 * ```tsx
 * useKeyboardShortcutsRegistry([
 *   { key: 'c', modifier: 'cmdShift', handler: handleCopy },
 *   { key: 'v', modifier: 'cmdShift', handler: handlePaste },
 *   { key: 'z', modifier: 'cmd', handler: handleUndo, allowInInput: true, priority: 100 },
 * ], [], { capture: true });
 * ```
 *
 * @since Phase 0+1 구현 (2025-12-28)
 * @updated Phase 4 - 스코프 지원 추가 (2025-12-28)
 */

import { useEffect } from 'react';
import type { ShortcutScope } from '../types/keyboard';

/**
 * 지원되는 modifier 조합
 */
export type KeyboardModifier =
  | 'cmd'           // Cmd (Mac) or Ctrl (Win)
  | 'cmdShift'      // Cmd+Shift or Ctrl+Shift
  | 'cmdAlt'        // Cmd+Alt or Ctrl+Alt
  | 'ctrl'          // Ctrl (macOS/Windows 동일) - 패널 토글용
  | 'ctrlShift'     // Ctrl+Shift (macOS/Windows 동일)
  | 'ctrlAlt'       // Ctrl+Alt (macOS/Windows 동일)
  | 'alt'           // Alt or Option
  | 'altShift'      // Alt+Shift or Option+Shift
  | 'shift'         // Shift only
  | 'none';         // No modifier

/**
 * 단축키 카테고리
 */
export type ShortcutCategory =
  | 'system'        // Undo, Redo, Save (priority: 100)
  | 'navigation'    // Zoom, Pan (priority: 90)
  | 'panels'        // Panel toggles (priority: 80)
  | 'canvas'        // Element manipulation (priority: 70)
  | 'tools'         // Tool selection (priority: 60)
  | 'properties'    // Property editing (priority: 50)
  | 'events'        // Events panel (priority: 50)
  | 'nodes';        // Nodes panel (priority: 50)

/**
 * 키보드 단축키 정의
 */
export interface KeyboardShortcut {
  /** 키 (예: 'c', 'v', 's', 'Enter') */
  key: string;

  /** KeyboardEvent.code 매칭용 (예: 'Space') */
  code?: string;

  /** Modifier 키 조합 */
  modifier: KeyboardModifier;

  /** 실행할 핸들러 함수 */
  handler: () => void;

  /** event.preventDefault() 호출 여부 (기본: true) */
  preventDefault?: boolean;

  /** event.stopPropagation() 호출 여부 (기본: false) */
  stopPropagation?: boolean;

  /** 입력 필드(input, textarea, contenteditable)에서도 동작 여부 (기본: false) */
  allowInInput?: boolean;

  /** 우선순위 (높을수록 먼저 실행, 기본: 0) */
  priority?: number;

  /** 카테고리 (선택사항) */
  category?: ShortcutCategory;

  /** 설명 (선택사항, 디버깅용) */
  description?: string;

  /** 비활성화 여부 (선택사항) */
  disabled?: boolean;

  /** 활성화 스코프 (선택사항, 기본: 'global') */
  scope?: ShortcutScope | ShortcutScope[];
}

/**
 * Registry 옵션
 */
export interface RegistryOptions {
  /** 이벤트 타입 (기본: 'keydown') */
  eventType?: 'keydown' | 'keyup';

  /** 캡처 단계에서 이벤트 처리 여부 (기본: false) */
  capture?: boolean;

  /** 이벤트 타겟 (기본: 'window') */
  target?: 'window' | 'document';

  /** 현재 활성 스코프 (선택사항, 스코프 필터링에 사용) */
  activeScope?: ShortcutScope;
}

/**
 * 입력 필드인지 확인
 */
function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  );
}

/**
 * 스코프가 매칭되는지 확인
 */
function matchesScope(
  shortcutScope: ShortcutScope | ShortcutScope[] | undefined,
  activeScope: ShortcutScope | undefined
): boolean {
  // 스코프가 정의되지 않으면 global로 간주
  if (!shortcutScope) return true;

  // activeScope가 없으면 global로 간주
  if (!activeScope) return true;

  // global은 항상 매칭
  if (shortcutScope === 'global') return true;

  // 배열이면 포함 여부 확인
  if (Array.isArray(shortcutScope)) {
    if (shortcutScope.includes('global')) return true;
    return shortcutScope.includes(activeScope);
  }

  // 단일 스코프 비교
  return shortcutScope === activeScope;
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

  // code 일치 확인 (우선)
  if (shortcut.code && event.code !== shortcut.code) {
    return false;
  }

  // 키 일치 확인 (대소문자 구분 안 함)
  if (!shortcut.code && event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
    return false;
  }

  // Modifier 확인
  // cmd = Cmd (Mac) or Ctrl (Win) - 크로스 플랫폼 단축키용
  // ctrl = Ctrl only (양 플랫폼 동일) - 패널 토글 등 특수 용도
  const isMac = navigator.platform.includes('Mac');
  const cmdKey = isMac ? event.metaKey : event.ctrlKey;

  switch (shortcut.modifier) {
    case 'cmd':
      return cmdKey && !event.shiftKey && !event.altKey && (isMac ? !event.ctrlKey : !event.metaKey);

    case 'cmdShift':
      return cmdKey && event.shiftKey && !event.altKey && (isMac ? !event.ctrlKey : !event.metaKey);

    case 'cmdAlt':
      return cmdKey && !event.shiftKey && event.altKey && (isMac ? !event.ctrlKey : !event.metaKey);

    case 'ctrl':
      // Ctrl 키만 (macOS/Windows 동일)
      return event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey;

    case 'ctrlShift':
      // Ctrl+Shift (macOS/Windows 동일)
      return event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey;

    case 'ctrlAlt':
      // Ctrl+Alt (macOS/Windows 동일)
      return event.ctrlKey && !event.shiftKey && event.altKey && !event.metaKey;

    case 'alt':
      return event.altKey && !event.shiftKey && !event.ctrlKey && !event.metaKey;

    case 'altShift':
      return event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey;

    case 'shift':
      return event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey;

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
 * @param options - Registry 옵션 (capture, target 등)
 */
export function useKeyboardShortcutsRegistry(
  shortcuts: KeyboardShortcut[],
  deps: React.DependencyList = [],
  options: RegistryOptions = {}
): void {
  const { eventType = 'keydown', capture = false, target = 'window', activeScope } = options;

  useEffect(() => {
    const handleKeyEvent = (event: KeyboardEvent) => {
      const isInput = isInputElement(event.target);

      // 우선순위 기준 정렬 (내림차순, 높은 우선순위 먼저)
      const sortedShortcuts = [...shortcuts].sort(
        (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
      );

      // 등록된 단축키 중 일치하는 것 찾기
      for (const shortcut of sortedShortcuts) {
        // 입력 필드에서 allowInInput이 false면 스킵
        if (isInput && !shortcut.allowInInput) {
          continue;
        }

        // 스코프가 매칭되지 않으면 스킵
        if (!matchesScope(shortcut.scope, activeScope)) {
          continue;
        }

        if (matchesShortcut(event, shortcut)) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          if (shortcut.stopPropagation) {
            event.stopPropagation();
          }
          shortcut.handler();
          break; // 첫 번째 매치만 실행
        }
      }
    };

    const eventTarget = target === 'document' ? document : window;
    eventTarget.addEventListener(eventType, handleKeyEvent as EventListener, { capture });

    return () => {
      eventTarget.removeEventListener(eventType, handleKeyEvent as EventListener, { capture });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capture, target, eventType, activeScope, ...deps]);
}

/**
 * 디버깅용: 등록된 단축키 목록 출력
 */
export function logShortcuts(shortcuts: KeyboardShortcut[]): void {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');

  console.group('🎹 Registered Keyboard Shortcuts');
  shortcuts
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    .forEach((shortcut) => {
      const modifierLabel: Record<KeyboardModifier, string> = {
        cmd: isMac ? '⌘' : 'Ctrl',
        cmdShift: isMac ? '⌘⇧' : 'Ctrl+Shift',
        cmdAlt: isMac ? '⌘⌥' : 'Ctrl+Alt',
        ctrl: 'Ctrl',
        ctrlShift: 'Ctrl+Shift',
        ctrlAlt: 'Ctrl+Alt',
        alt: isMac ? '⌥' : 'Alt',
        altShift: isMac ? '⌥⇧' : 'Alt+Shift',
        shift: isMac ? '⇧' : 'Shift',
        none: '',
      };

      const prefix = modifierLabel[shortcut.modifier];
      const keyLabel = `${prefix}${prefix ? '+' : ''}${shortcut.key.toUpperCase()}`;
      const priorityLabel = shortcut.priority ? `[P:${shortcut.priority}]` : '';
      const flags = [
        shortcut.disabled ? '❌disabled' : '',
        shortcut.allowInInput ? '📝allowInInput' : '',
      ].filter(Boolean).join(' ');

      console.log(
        `${keyLabel.padEnd(20)} ${priorityLabel.padEnd(8)} ${shortcut.description || '(no description)'} ${flags}`
      );
    });
  console.groupEnd();
}

/**
 * 플랫폼에 맞는 단축키 표시 문자열 생성
 */
export function formatShortcut(shortcut: Pick<KeyboardShortcut, 'key' | 'modifier'>): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');

  const modifierSymbols: Record<KeyboardModifier, string> = {
    cmd: isMac ? '⌘' : 'Ctrl+',
    cmdShift: isMac ? '⌘⇧' : 'Ctrl+Shift+',
    cmdAlt: isMac ? '⌘⌥' : 'Ctrl+Alt+',
    ctrl: isMac ? '⌃' : 'Ctrl+',
    ctrlShift: isMac ? '⌃⇧' : 'Ctrl+Shift+',
    ctrlAlt: isMac ? '⌃⌥' : 'Ctrl+Alt+',
    alt: isMac ? '⌥' : 'Alt+',
    altShift: isMac ? '⌥⇧' : 'Alt+Shift+',
    shift: isMac ? '⇧' : 'Shift+',
    none: '',
  };

  return `${modifierSymbols[shortcut.modifier]}${shortcut.key.toUpperCase()}`;
}
