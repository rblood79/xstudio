/**
 * useActions - React Stately 기반 EventAction 관리
 *
 * useListData를 사용하여 Action 목록 CRUD 및 재정렬 자동화
 * Phase 1: Inspector Events React Stately 전환
 *
 * ⚠️ 주의: useListData의 initialItems는 초기 마운트 시에만 적용됨
 * initialActions 변경 시 리셋을 위해 useEffect로 동기화 필요
 */

import { useEffect, useRef } from 'react';
import { useListData } from 'react-stately';
import type { Key } from 'react-stately';
import type { EventAction, ActionType } from '../types/eventTypes';

/**
 * 두 액션 배열의 ID 세트가 동일한지 비교
 * JSON.stringify 대신 ID 기반 비교로 성능 개선
 */
function areActionIdsEqual(a: EventAction[], b: EventAction[]): boolean {
  if (a.length !== b.length) return false;
  const aIds = new Set(a.map((action) => action.id));
  const bIds = new Set(b.map((action) => action.id));
  if (aIds.size !== bIds.size) return false;
  for (const id of aIds) {
    if (!bIds.has(id)) return false;
  }
  return true;
}

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
  // 이전 initialActions 참조 저장
  const prevInitialActionsRef = useRef<EventAction[]>(initialActions);

  const list = useListData({
    initialItems: initialActions,
    getKey: (item) => item.id || '',
  });

  // ⚡ initialActions 변경 시 리스트 리셋
  useEffect(() => {
    // ID 기반 비교로 실제 변경 감지
    if (!areActionIdsEqual(prevInitialActionsRef.current, initialActions)) {
      // 기존 아이템 모두 제거
      list.items.forEach((item) => {
        if (item.id) list.remove(item.id);
      });
      // 새 아이템 추가
      initialActions.forEach((action) => {
        list.append(action);
      });
      // 참조 업데이트
      prevInitialActionsRef.current = initialActions;
    }
  }, [initialActions, list]);

  /**
   * 새 액션 추가
   *
   * @param actionType - 액션 타입 (navigate, updateState 등)
   * @param config - 액션 설정 값
   * @returns 생성된 액션
   */
  const addAction = (
    actionType: ActionType,
    config: Record<string, unknown> = {}
  ): EventAction => {
    const newAction: EventAction = {
      id: `action-${actionType}-${Date.now()}`,
      type: actionType,
      config: config as EventAction['config'],
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
    const current = list.getItem(id);
    if (current) {
      list.update(id, { ...current, ...updates } as EventAction);
    }
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
      list.update(actionId, { ...action, enabled: !action.enabled } as EventAction);
    }
  };

  /**
   * 모든 액션 활성화
   */
  const enableAll = () => {
    list.items.forEach((action) => {
      if (action.id) {
        list.update(action.id, { ...action, enabled: true } as EventAction);
      }
    });
  };

  /**
   * 모든 액션 비활성화
   */
  const disableAll = () => {
    list.items.forEach((action) => {
      if (action.id) {
        list.update(action.id, { ...action, enabled: false } as EventAction);
      }
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
    list.items.forEach((action) => {
      if (action.id) {
        list.remove(action.id);
      }
    });
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
