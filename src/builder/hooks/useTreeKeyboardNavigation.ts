/**
 * useTreeKeyboardNavigation - 트리 키보드 네비게이션 훅
 *
 * ♿ Accessibility Features:
 * - Arrow Up/Down: 이전/다음 항목으로 이동
 * - Arrow Left: 접기 또는 부모로 이동
 * - Arrow Right: 펼치기
 * - Home: 첫 번째 항목으로 이동
 * - End: 마지막 항목으로 이동
 * - Enter/Space: 선택
 *
 * @example
 * ```tsx
 * const { focusedIndex, setFocusedIndex, handleKeyDown } = useTreeKeyboardNavigation({
 *   items: flattenedNodes,
 *   onSelect: (item) => console.log('Selected:', item),
 *   onToggle: (id) => toggleExpand(id),
 *   getParentId: (item) => item.element.parent_id,
 * });
 * ```
 */

import { useState, useCallback, KeyboardEvent } from "react";

export interface TreeNavigationItem {
  id: string;
  hasChildren: boolean;
  isExpanded: boolean;
}

export interface UseTreeKeyboardNavigationOptions<T extends TreeNavigationItem> {
  /** 평탄화된 트리 아이템 목록 */
  items: T[];
  /** 아이템 선택 핸들러 */
  onSelect: (item: T) => void;
  /** 펼치기/접기 핸들러 */
  onToggle: (id: string) => void;
  /** 부모 ID 가져오기 함수 */
  getParentId: (item: T) => string | null | undefined;
  /** 초기 포커스 인덱스 */
  initialFocusedIndex?: number;
  /** Arrow 이동 시 자동 선택 여부 */
  selectOnArrowNavigation?: boolean;
}

export interface UseTreeKeyboardNavigationResult {
  /** 현재 포커스된 인덱스 */
  focusedIndex: number;
  /** 포커스 인덱스 설정 */
  setFocusedIndex: (index: number) => void;
  /** 키보드 이벤트 핸들러 */
  handleKeyDown: (e: KeyboardEvent) => void;
  /** 특정 아이템으로 포커스 이동 */
  focusItem: (id: string) => void;
  /** 첫 번째 아이템으로 포커스 이동 */
  focusFirst: () => void;
  /** 마지막 아이템으로 포커스 이동 */
  focusLast: () => void;
}

export function useTreeKeyboardNavigation<T extends TreeNavigationItem>({
  items,
  onSelect,
  onToggle,
  getParentId,
  initialFocusedIndex = -1,
  selectOnArrowNavigation = true,
}: UseTreeKeyboardNavigationOptions<T>): UseTreeKeyboardNavigationResult {
  const [focusedIndex, setFocusedIndex] = useState<number>(initialFocusedIndex);

  /**
   * 특정 아이템으로 포커스 이동
   */
  const focusItem = useCallback(
    (id: string) => {
      const index = items.findIndex((item) => item.id === id);
      if (index !== -1) {
        setFocusedIndex(index);
      }
    },
    [items]
  );

  /**
   * 첫 번째 아이템으로 포커스 이동
   */
  const focusFirst = useCallback(() => {
    if (items.length > 0) {
      setFocusedIndex(0);
    }
  }, [items]);

  /**
   * 마지막 아이템으로 포커스 이동
   */
  const focusLast = useCallback(() => {
    if (items.length > 0) {
      setFocusedIndex(items.length - 1);
    }
  }, [items]);

  /**
   * 키보드 이벤트 핸들러
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const currentIndex = focusedIndex;
      const count = items.length;

      if (count === 0) return;

      let newIndex = currentIndex;
      let handled = false;

      switch (e.key) {
        case "ArrowDown":
          newIndex = Math.min(currentIndex + 1, count - 1);
          if (newIndex < 0) newIndex = 0;
          handled = true;
          break;

        case "ArrowUp":
          newIndex = Math.max(currentIndex - 1, 0);
          handled = true;
          break;

        case "Home":
          newIndex = 0;
          handled = true;
          break;

        case "End":
          newIndex = count - 1;
          handled = true;
          break;

        case "Enter":
        case " ":
          if (currentIndex >= 0 && currentIndex < count) {
            onSelect(items[currentIndex]);
            handled = true;
          }
          break;

        case "ArrowRight":
          if (currentIndex >= 0 && currentIndex < count) {
            const item = items[currentIndex];
            if (item.hasChildren && !item.isExpanded) {
              onToggle(item.id);
              handled = true;
            }
          }
          break;

        case "ArrowLeft":
          if (currentIndex >= 0 && currentIndex < count) {
            const item = items[currentIndex];
            if (item.hasChildren && item.isExpanded) {
              // 펼쳐진 경우 접기
              onToggle(item.id);
              handled = true;
            } else {
              // 부모로 이동
              const parentId = getParentId(item);
              if (parentId) {
                const parentIndex = items.findIndex((i) => i.id === parentId);
                if (parentIndex !== -1) {
                  newIndex = parentIndex;
                  handled = true;
                }
              }
            }
          }
          break;

        default:
          break;
      }

      if (handled) {
        e.preventDefault();
        e.stopPropagation();

        if (newIndex !== currentIndex && newIndex >= 0) {
          setFocusedIndex(newIndex);

          // Arrow 이동 시 자동 선택
          if (
            selectOnArrowNavigation &&
            (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Home" || e.key === "End")
          ) {
            onSelect(items[newIndex]);
          }
        }
      }
    },
    [focusedIndex, items, onSelect, onToggle, getParentId, selectOnArrowNavigation]
  );

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
    focusItem,
    focusFirst,
    focusLast,
  };
}

export default useTreeKeyboardNavigation;
