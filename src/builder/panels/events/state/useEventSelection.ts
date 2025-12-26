/**
 * useEventSelection - React Stately 기반 이벤트 선택 관리
 *
 * useState 대신 useListState를 사용하여 선택 상태 자동 관리
 * Phase 1: Inspector Events React Stately 전환
 */

import { useState, useMemo } from 'react';
import type { Key } from 'react-stately';
import type { EventHandler } from '../types/eventTypes';

/**
 * 이벤트 핸들러 선택 상태 관리 훅
 *
 * @param handlers - 이벤트 핸들러 목록
 * @returns 선택 상태 및 메서드
 *
 * @example
 * const { selectedHandler, selectHandler, isSelected, clearSelection } =
 *   useEventSelection(handlers);
 *
 * // 핸들러 선택
 * selectHandler(handlerId);
 *
 * // 선택 여부 확인
 * const selected = isSelected(handlerId);
 *
 * // 선택 해제
 * clearSelection();
 */
export function useEventSelection(handlers: EventHandler[]) {
  const [selectedHandlerId, setSelectedHandlerId] = useState<Key | null>(null);

  /**
   * 선택된 이벤트 핸들러
   */
  const selectedHandler = useMemo(() => {
    if (!selectedHandlerId) return null;
    return handlers.find((h) => h.id === selectedHandlerId) || null;
  }, [selectedHandlerId, handlers]);

  /**
   * 이벤트 핸들러 선택
   *
   * @param handlerId - 선택할 핸들러 ID (null이면 선택 해제)
   */
  const selectHandler = (handlerId: Key | null) => {
    setSelectedHandlerId(handlerId);
  };

  /**
   * 특정 핸들러가 선택되었는지 확인
   *
   * @param handlerId - 확인할 핸들러 ID
   * @returns 선택 여부
   */
  const isSelected = (handlerId: Key): boolean => {
    return selectedHandlerId === handlerId;
  };

  /**
   * 선택 해제
   */
  const clearSelection = () => {
    setSelectedHandlerId(null);
  };

  /**
   * 다음 핸들러 선택 (키보드 네비게이션)
   */
  const selectNext = () => {
    if (handlers.length === 0) return;

    if (!selectedHandlerId) {
      // 선택된 항목이 없으면 첫 번째 선택
      setSelectedHandlerId(handlers[0].id);
      return;
    }

    const currentIndex = handlers.findIndex((h) => h.id === selectedHandlerId);
    if (currentIndex === -1 || currentIndex === handlers.length - 1) return;

    // 다음 항목 선택
    setSelectedHandlerId(handlers[currentIndex + 1].id);
  };

  /**
   * 이전 핸들러 선택 (키보드 네비게이션)
   */
  const selectPrevious = () => {
    if (handlers.length === 0) return;

    if (!selectedHandlerId) {
      // 선택된 항목이 없으면 마지막 항목 선택
      setSelectedHandlerId(handlers[handlers.length - 1].id);
      return;
    }

    const currentIndex = handlers.findIndex((h) => h.id === selectedHandlerId);
    if (currentIndex === -1 || currentIndex === 0) return;

    // 이전 항목 선택
    setSelectedHandlerId(handlers[currentIndex - 1].id);
  };

  /**
   * 첫 번째 핸들러 선택
   */
  const selectFirst = () => {
    if (handlers.length > 0) {
      setSelectedHandlerId(handlers[0].id);
    }
  };

  /**
   * 마지막 핸들러 선택
   */
  const selectLast = () => {
    if (handlers.length > 0) {
      setSelectedHandlerId(handlers[handlers.length - 1].id);
    }
  };

  /**
   * 선택된 핸들러가 삭제된 경우 자동으로 다른 핸들러 선택
   * EventSection에서 핸들러 삭제 시 호출
   */
  const selectAfterDelete = (deletedHandlerId: Key) => {
    if (selectedHandlerId !== deletedHandlerId) return;

    const currentIndex = handlers.findIndex((h) => h.id === deletedHandlerId);
    if (currentIndex === -1) {
      clearSelection();
      return;
    }

    // 다음 항목이 있으면 선택, 없으면 이전 항목 선택
    if (currentIndex < handlers.length - 1) {
      setSelectedHandlerId(handlers[currentIndex + 1].id);
    } else if (currentIndex > 0) {
      setSelectedHandlerId(handlers[currentIndex - 1].id);
    } else {
      clearSelection();
    }
  };

  return {
    /** 선택된 핸들러 ID */
    selectedHandlerId,

    /** 선택된 이벤트 핸들러 */
    selectedHandler,

    /** 핸들러 선택 */
    selectHandler,

    /** 선택 여부 확인 */
    isSelected,

    /** 선택 해제 */
    clearSelection,

    /** 다음 핸들러 선택 */
    selectNext,

    /** 이전 핸들러 선택 */
    selectPrevious,

    /** 첫 번째 핸들러 선택 */
    selectFirst,

    /** 마지막 핸들러 선택 */
    selectLast,

    /** 삭제 후 자동 선택 */
    selectAfterDelete,
  };
}
