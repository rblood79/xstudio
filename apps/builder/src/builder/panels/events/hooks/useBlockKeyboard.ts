/**
 * useBlockKeyboard - 블록 UI 키보드 내비게이션 훅
 *
 * Events Panel 블록 간 키보드 내비게이션 지원
 * - Tab: 블록 간 포커스 이동 (브라우저 기본)
 * - Enter: 선택된 블록 편집 모드 진입
 * - Escape: 편집 모드 종료, 상위로 이동
 * - Arrow Up/Down: 액션 리스트 내 이동
 */

import { useCallback, useEffect } from 'react';

interface UseBlockKeyboardOptions {
  /** 현재 선택된 핸들러 ID */
  selectedHandlerId: string | null;

  /** 현재 선택된 액션 ID */
  selectedActionId: string | null;

  /** 편집 모드 여부 */
  isEditing: boolean;

  /** 핸들러 선택 콜백 */
  onSelectHandler: (id: string | null) => void;

  /** 액션 선택 콜백 */
  onSelectAction: (id: string | null) => void;

  /** 편집 모드 종료 콜백 */
  onExitEdit: () => void;

  /** 액션 목록 (순서대로) */
  actionIds: string[];

  /** 핸들러 목록 (순서대로) */
  handlerIds: string[];

  /** 활성화 여부 */
  enabled?: boolean;
}

/**
 * 블록 UI 키보드 내비게이션 훅
 *
 * @example
 * useBlockKeyboard({
 *   selectedHandlerId,
 *   selectedActionId,
 *   isEditing,
 *   onSelectHandler: selectHandler,
 *   onSelectAction: setSelectedAction,
 *   onExitEdit: () => setIsEditing(false),
 *   actionIds: actions.map(a => a.id),
 *   handlerIds: handlers.map(h => h.id),
 * });
 */
export function useBlockKeyboard({
  selectedHandlerId,
  selectedActionId,
  isEditing,
  onSelectHandler,
  onSelectAction,
  onExitEdit,
  actionIds,
  handlerIds,
  enabled = true,
}: UseBlockKeyboardOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Escape: 편집 모드 종료 또는 선택 해제
      if (event.key === 'Escape') {
        event.preventDefault();

        if (isEditing) {
          onExitEdit();
        } else if (selectedActionId) {
          onSelectAction(null);
        } else if (selectedHandlerId) {
          onSelectHandler(null);
        }
        return;
      }

      // Enter: 현재 포커스된 요소 활성화 (클릭과 동일)
      // 브라우저 기본 동작 사용 - 버튼, 링크 등 활성화

      // Arrow Up/Down: 액션 리스트 내 이동
      if (selectedHandlerId && actionIds.length > 0) {
        const currentIndex = selectedActionId
          ? actionIds.indexOf(selectedActionId)
          : -1;

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          const nextIndex = Math.min(currentIndex + 1, actionIds.length - 1);
          onSelectAction(actionIds[nextIndex]);
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          const prevIndex = Math.max(currentIndex - 1, 0);
          onSelectAction(actionIds[prevIndex]);
        }
      }

      // 핸들러 목록에서 Arrow Up/Down
      if (!selectedHandlerId && handlerIds.length > 0) {
        // 핸들러 목록 모드에서는 별도 처리 없음
        // Tab으로 자연스럽게 이동
      }
    },
    [
      enabled,
      isEditing,
      selectedHandlerId,
      selectedActionId,
      actionIds,
      handlerIds,
      onSelectHandler,
      onSelectAction,
      onExitEdit,
    ]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}

/**
 * 블록 포커스 관리를 위한 속성 생성
 *
 * @example
 * const blockProps = getBlockFocusProps('handler-1', 'onClick', onClick);
 * <div {...blockProps}>...</div>
 */
export function getBlockFocusProps(
  id: string,
  label: string,
  onClick?: () => void
) {
  return {
    tabIndex: 0,
    role: 'button',
    'aria-label': label,
    'data-block-id': id,
    onClick,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.();
      }
    },
  };
}
