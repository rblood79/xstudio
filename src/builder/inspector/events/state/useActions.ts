/**
 * useActions - React Stately 기반 EventAction 관리
 *
 * useListData를 사용하여 Action 목록 CRUD 및 재정렬 자동화
 * Phase 1: Inspector Events React Stately 전환
 */

import { useListData } from 'react-stately';
import type { Key } from 'react-stately';
import type { EventAction, ActionType } from '@/types/events';

/**
 * Action 목록 관리 훅
 *
 * @param initialActions - 초기 액션 목록
 * @returns Action CRUD 메서드 및 상태
 *
 * @example
 * const { actions, addAction, updateAction, moveAction } =
 *   useActions(selectedHandler?.actions || []);
 *
 * // 액션 추가
 * const newAction = addAction('navigate', { path: '/home' });
 *
 * // 액션 이동 (드래그 앤 드롭)
 * moveAction(actionId, 3);
 *
 * // 액션 복제
 * duplicateAction(actionId);
 */
export function useActions(initialActions: EventAction[]) {
  const list = useListData({
    initialItems: initialActions,
    getKey: (item) => item.id,
  });

  /**
   * 새 액션 추가
   *
   * @param actionType - 액션 타입 (navigate, updateState 등)
   * @param value - 액션 설정 값
   * @returns 생성된 액션
   */
  const addAction = (
    actionType: ActionType,
    value: Record<string, unknown> = {}
  ): EventAction => {
    const newAction: EventAction = {
      id: `action-${actionType}-${Date.now()}`,
      type: actionType,
      value,
      enabled: true,
    };

    list.append(newAction);
    return newAction;
  };

  /**
   * 액션 업데이트
   *
   * @param id - 액션 ID
   * @param updates - 업데이트할 속성
   */
  const updateAction = (id: Key, updates: Partial<EventAction>) => {
    list.update(id, (old) => ({ ...old, ...updates }));
  };

  /**
   * 액션 이동 (드래그 앤 드롭 또는 수동 재정렬)
   *
   * useListData.move()를 사용하여 자동 재정렬
   * 기존 159줄의 수동 로직을 단 3줄로 대체
   *
   * @param actionId - 이동할 액션 ID
   * @param toIndex - 목표 인덱스
   */
  const moveAction = (actionId: Key, toIndex: number) => {
    list.move(actionId, toIndex);
  };

  /**
   * 여러 액션 일괄 이동 (다중 선택 드래그)
   *
   * @param actionIds - 이동할 액션 ID 배열
   * @param toIndex - 목표 인덱스
   */
  const moveActions = (actionIds: Key[], toIndex: number) => {
    // React Stately는 여러 키를 한 번에 이동하는 기능 제공
    // actionIds를 역순으로 처리하여 순서 유지
    const sortedIds = [...actionIds].reverse();
    sortedIds.forEach((id, index) => {
      list.move(id, toIndex + index);
    });
  };

  /**
   * 액션 복제
   *
   * @param actionId - 복제할 액션 ID
   * @returns 복제된 액션 또는 undefined
   */
  const duplicateAction = (actionId: Key): EventAction | undefined => {
    const original = list.getItem(actionId);
    if (!original) return undefined;

    const index = list.items.findIndex((a) => a.id === actionId);
    const duplicate: EventAction = {
      ...original,
      id: `${actionId}-copy-${Date.now()}`,
    };

    // 원본 바로 다음에 삽입
    list.insert(index + 1, duplicate);
    return duplicate;
  };

  /**
   * 액션 활성화/비활성화 토글
   *
   * @param actionId - 액션 ID
   */
  const toggleAction = (actionId: Key) => {
    const action = list.getItem(actionId);
    if (action) {
      list.update(actionId, (old) => ({ ...old, enabled: !old.enabled }));
    }
  };

  /**
   * 모든 액션 활성화
   */
  const enableAll = () => {
    list.items.forEach((action) => {
      list.update(action.id, (old) => ({ ...old, enabled: true }));
    });
  };

  /**
   * 모든 액션 비활성화
   */
  const disableAll = () => {
    list.items.forEach((action) => {
      list.update(action.id, (old) => ({ ...old, enabled: false }));
    });
  };

  /**
   * 선택된 액션 삭제 (다중 선택 지원)
   */
  const removeSelectedActions = () => {
    const selectedIds = Array.from(list.selectedKeys);
    selectedIds.forEach((id) => list.remove(id));
  };

  /**
   * 모든 액션 삭제
   */
  const removeAll = () => {
    list.items.forEach((action) => list.remove(action.id));
  };

  return {
    /** 액션 목록 */
    actions: list.items,

    /** 새 액션 추가 */
    addAction,

    /** 액션 업데이트 */
    updateAction,

    /** 액션 삭제 */
    removeAction: list.remove,

    /** 액션 이동 (단일) */
    moveAction,

    /** 액션 일괄 이동 (다중) */
    moveActions,

    /** 액션 복제 */
    duplicateAction,

    /** 액션 가져오기 */
    getAction: list.getItem,

    /** 액션 활성화/비활성화 토글 */
    toggleAction,

    /** 모든 액션 활성화 */
    enableAll,

    /** 모든 액션 비활성화 */
    disableAll,

    /** 선택된 액션 삭제 */
    removeSelectedActions,

    /** 모든 액션 삭제 */
    removeAll,

    /** 선택된 키 */
    selectedKeys: list.selectedKeys,

    /** 선택된 키 설정 */
    setSelectedKeys: list.setSelectedKeys,
  };
}
