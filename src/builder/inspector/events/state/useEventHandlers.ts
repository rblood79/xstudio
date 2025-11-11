/**
 * useEventHandlers - React Stately 기반 EventHandler 관리
 *
 * useListData를 사용하여 EventHandler 목록 CRUD 자동화
 * Phase 1: Inspector Events React Stately 전환
 */

import { useListData } from 'react-stately';
import type { Key } from 'react-stately';
import type { EventType } from '@/types/events';
import type { EventHandler } from '../types';

/**
 * EventHandler 목록 관리 훅
 *
 * @param initialEvents - 초기 이벤트 핸들러 목록
 * @returns EventHandler CRUD 메서드 및 상태
 *
 * @example
 * const { handlers, addHandler, updateHandler, removeHandler } =
 *   useEventHandlers(element.events || []);
 *
 * // 이벤트 추가
 * const newHandler = addHandler('onClick');
 *
 * // 이벤트 업데이트
 * updateHandler(handlerId, { actions: [...] });
 *
 * // 이벤트 삭제
 * removeHandler(handlerId);
 */
export function useEventHandlers(initialEvents: EventHandler[]) {
  // Ensure all events have actions array initialized
  const sanitizedEvents = initialEvents.map(event => ({
    ...event,
    actions: event.actions || [],
  }));

  const list = useListData({
    initialItems: sanitizedEvents,
    getKey: (item) => item.id,
  });

  /**
   * 새 이벤트 핸들러 추가
   *
   * @param eventType - 이벤트 타입 (onClick, onHover 등)
   * @returns 생성된 이벤트 핸들러
   */
  const addHandler = (eventType: EventType): EventHandler => {
    const newHandler: EventHandler = {
      id: `event-${eventType}-${Date.now()}`,
      event: eventType,
      actions: [],
      enabled: true,
    };

    list.append(newHandler);
    return newHandler;
  };

  /**
   * 이벤트 핸들러 업데이트
   *
   * @param id - 이벤트 핸들러 ID
   * @param updates - 업데이트할 속성 또는 완전한 핸들러 객체
   */
  const updateHandler = (id: Key, updates: Partial<EventHandler> | EventHandler) => {
    // updates가 완전한 EventHandler인지 확인 (id와 event 존재)
    if ('id' in updates && 'event' in updates) {
      // 완전한 객체를 전달받은 경우 그대로 사용
      list.update(id, updates as EventHandler);
    } else {
      // Partial인 경우 병합 (함수 사용하지 않고 직접 병합)
      const current = list.getItem(id);
      if (current) {
        list.update(id, { ...current, ...updates } as EventHandler);
      }
    }
  };

  /**
   * 이벤트 핸들러 복제
   *
   * @param id - 복제할 이벤트 핸들러 ID
   * @returns 복제된 이벤트 핸들러 또는 undefined
   */
  const duplicateHandler = (id: Key): EventHandler | undefined => {
    const original = list.getItem(id);
    if (!original) return undefined;

    const duplicate: EventHandler = {
      ...original,
      id: `${id}-copy-${Date.now()}`,
      actions: (original.actions || []).map((action) => ({
        ...action,
        id: `${action.id}-copy-${Date.now()}`,
      })),
    };

    list.append(duplicate);
    return duplicate;
  };

  /**
   * 이벤트 핸들러 활성화/비활성화 토글
   *
   * @param id - 이벤트 핸들러 ID
   */
  const toggleHandler = (id: Key) => {
    const handler = list.getItem(id);
    if (handler) {
      list.update(id, { ...handler, enabled: !handler.enabled });
    }
  };

  /**
   * 모든 이벤트 핸들러 활성화
   */
  const enableAll = () => {
    list.items.forEach((handler) => {
      list.update(handler.id, { ...handler, enabled: true });
    });
  };

  /**
   * 모든 이벤트 핸들러 비활성화
   */
  const disableAll = () => {
    list.items.forEach((handler) => {
      list.update(handler.id, { ...handler, enabled: false });
    });
  };

  return {
    /** 이벤트 핸들러 목록 */
    handlers: list.items,

    /** 새 이벤트 핸들러 추가 */
    addHandler,

    /** 이벤트 핸들러 업데이트 */
    updateHandler,

    /** 이벤트 핸들러 삭제 */
    removeHandler: list.remove,

    /** 이벤트 핸들러 복제 */
    duplicateHandler,

    /** 이벤트 핸들러 가져오기 */
    getHandler: list.getItem,

    /** 이벤트 핸들러 활성화/비활성화 토글 */
    toggleHandler,

    /** 모든 핸들러 활성화 */
    enableAll,

    /** 모든 핸들러 비활성화 */
    disableAll,

    /** 선택된 키 (useListData 내부 상태) */
    selectedKeys: list.selectedKeys,

    /** 선택된 키 설정 */
    setSelectedKeys: list.setSelectedKeys,
  };
}
