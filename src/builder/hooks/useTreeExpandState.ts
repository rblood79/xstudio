/**
 * useTreeExpandState - 트리 펼치기/접기 상태 관리
 *
 * React Stately 기반 트리 확장 상태 관리 훅
 * Sidebar Layer Tree의 펼치기/접기 로직을 캡슐화
 *
 * 🚀 Performance: Store의 elementsMap 재사용으로 O(n) Map 생성 제거
 */

import { useState, useCallback, useEffect } from 'react';
import type { Key } from 'react-stately';
import type { Element } from '../../types/core/store.types';
import { useStore } from '../stores';

export interface UseTreeExpandStateOptions {
  /** 초기 펼쳐진 키 */
  initialExpandedKeys?: Set<Key>;
  /** 선택된 요소 ID (자동 부모 펼치기용) */
  selectedElementId?: string | null;
  /** 전체 요소 목록 (부모 추적용) */
  elements?: Element[];
}

export interface UseTreeExpandStateResult {
  /** 펼쳐진 키 Set */
  expandedKeys: Set<Key>;
  /** 키 토글 (펼치기/접기) */
  toggleKey: (key: Key) => void;
  /** 특정 키 펼치기 */
  expandKey: (key: Key) => void;
  /** 특정 키 접기 */
  collapseKey: (key: Key) => void;
  /** 모든 키 접기 */
  collapseAll: () => void;
  /** 선택된 요소의 모든 부모 자동 펼치기 */
  expandParents: (elementId: string) => void;
}

/**
 * 트리 펼치기/접기 상태 관리 훅
 *
 * @example
 * ```tsx
 * const { expandedKeys, toggleKey, collapseAll, expandParents } = useTreeExpandState({
 *   selectedElementId,
 *   elements,
 * });
 *
 * // 노드 클릭 시 토글
 * <button onClick={() => toggleKey(nodeId)}>Toggle</button>
 *
 * // 요소 선택 시 부모 자동 펼치기
 * useEffect(() => {
 *   if (selectedElementId) {
 *     expandParents(selectedElementId);
 *   }
 * }, [selectedElementId]);
 * ```
 */
export function useTreeExpandState(
  options: UseTreeExpandStateOptions = {}
): UseTreeExpandStateResult {
  const { initialExpandedKeys, selectedElementId, elements = [] } = options;

  // 🚀 Performance: Store의 elementsMap 재사용 (O(n) Map 생성 제거)
  const storeElementsMap = useStore((state) => state.elementsMap);

  const [expandedKeys, setExpandedKeys] = useState<Set<Key>>(
    initialExpandedKeys || new Set()
  );

  /**
   * 키 토글 (펼치기/접기)
   */
  const toggleKey = useCallback((key: Key) => {
    setExpandedKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  /**
   * 특정 키 펼치기
   */
  const expandKey = useCallback((key: Key) => {
    setExpandedKeys((prev) => {
      if (prev.has(key)) return prev;
      const newSet = new Set(prev);
      newSet.add(key);
      return newSet;
    });
  }, []);

  /**
   * 특정 키 접기
   */
  const collapseKey = useCallback((key: Key) => {
    setExpandedKeys((prev) => {
      if (!prev.has(key)) return prev;
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });
  }, []);

  /**
   * 모든 키 접기
   */
  const collapseAll = useCallback(() => {
    setExpandedKeys(new Set());
  }, []);

  /**
   * 선택된 요소의 모든 부모 자동 펼치기
   * 🚀 Phase 2.3 최적화: Store의 elementsMap 재사용으로 O(n) Map 생성 제거
   */
  const expandParents = useCallback((elementId: string) => {
    // 🚀 Store의 elementsMap 재사용 (O(1) 조회)
    const parentIds = new Set<string>();
    let currentElement = storeElementsMap.get(elementId);

    // 부모 체인 순회 (O(depth))
    while (currentElement?.parent_id) {
      parentIds.add(currentElement.parent_id);
      currentElement = storeElementsMap.get(currentElement.parent_id);
    }

    // 기존 expandedKeys에 부모 ID 추가
    if (parentIds.size > 0) {
      setExpandedKeys((prev) => {
        const newSet = new Set(prev);
        parentIds.forEach((id) => newSet.add(id));
        return newSet;
      });
    }
  }, [storeElementsMap]);

  /**
   * selectedElementId 변경 시 자동으로 부모 펼치기
   *
   * 🚀 Phase 4 최적화: Store의 elementsMap 재사용
   * - 기존: O(n) Map 생성 매번 실행
   * - 개선: Store의 elementsMap 재사용으로 O(1) 조회
   */
  useEffect(() => {
    if (!selectedElementId || elements.length === 0) return;

    // 🚀 Store의 elementsMap 재사용 (O(1) 조회)
    const parentIds = new Set<string>();
    let currentElement = storeElementsMap.get(selectedElementId);

    // 부모 체인 순회 (O(depth))
    while (currentElement?.parent_id) {
      parentIds.add(currentElement.parent_id);
      currentElement = storeElementsMap.get(currentElement.parent_id);
    }

    // 기존 expandedKeys에 부모 ID 추가
    if (parentIds.size > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpandedKeys((prev) => {
        const newSet = new Set(prev);
        let hasChanges = false;
        parentIds.forEach((id) => {
          if (!newSet.has(id)) {
            newSet.add(id);
            hasChanges = true;
          }
        });
        // 변경이 없으면 이전 Set 반환 (불필요한 상태 업데이트 방지)
        return hasChanges ? newSet : prev;
      });
    }
  }, [selectedElementId, elements.length, storeElementsMap]); // ✅ storeElementsMap 사용

  return {
    expandedKeys,
    toggleKey,
    expandKey,
    collapseKey,
    collapseAll,
    expandParents,
  };
}
