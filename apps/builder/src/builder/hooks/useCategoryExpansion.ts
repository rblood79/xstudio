/**
 * useCategoryExpansion - 카테고리 펼치기/접기 상태 관리
 *
 * ComponentList의 카테고리별 펼침/접힘 상태를 관리하는 훅
 * localStorage를 사용하여 사용자 선호도를 저장
 */

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'xstudio_category_expansion';

export interface UseCategoryExpansionOptions {
  /** 초기 펼쳐진 카테고리 목록 */
  initialExpanded?: string[];
  /** localStorage 저장 여부 (기본값: true) */
  persist?: boolean;
}

export interface UseCategoryExpansionResult {
  /** 펼쳐진 카테고리 Set */
  expandedCategories: Set<string>;
  /** 특정 카테고리가 펼쳐져 있는지 확인 */
  isExpanded: (category: string) => boolean;
  /** 특정 카테고리 토글 */
  toggleCategory: (category: string) => void;
  /** 특정 카테고리들만 펼치기 (기존 상태에 추가) */
  expandCategories: (categories: string[]) => void;
  /** 모든 카테고리 펼치기 */
  expandAll: (categories: string[]) => void;
  /** 모든 카테고리 접기 */
  collapseAll: () => void;
}

/**
 * 카테고리 펼치기/접기 상태 관리 훅
 *
 * @example
 * ```tsx
 * const { expandedCategories, isExpanded, toggleCategory, expandAll, collapseAll } = useCategoryExpansion({
 *   initialExpanded: ['layout', 'inputs'],
 *   persist: true,
 * });
 *
 * <button onClick={() => toggleCategory('layout')}>
 *   {isExpanded('layout') ? <ChevronDown /> : <ChevronRight />}
 * </button>
 *
 * {isExpanded('layout') && (
 *   <div>Layout components...</div>
 * )}
 * ```
 */
export function useCategoryExpansion(
  options: UseCategoryExpansionOptions = {}
): UseCategoryExpansionResult {
  const { initialExpanded = [], persist = true } = options;

  // localStorage에서 초기 상태 로드
  const getInitialState = useCallback((): Set<string> => {
    if (!persist) {
      return new Set(initialExpanded);
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Set(Array.isArray(parsed) ? parsed : initialExpanded);
      }
    } catch (error) {
      console.warn('Failed to load category expansion state:', error);
    }

    return new Set(initialExpanded);
  }, [initialExpanded, persist]);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(getInitialState);

  // localStorage에 저장
  useEffect(() => {
    if (!persist) return;

    try {
      const array = Array.from(expandedCategories);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(array));
    } catch (error) {
      console.warn('Failed to save category expansion state:', error);
    }
  }, [expandedCategories, persist]);

  /**
   * 특정 카테고리가 펼쳐져 있는지 확인
   */
  const isExpanded = useCallback(
    (category: string) => {
      return expandedCategories.has(category);
    },
    [expandedCategories]
  );

  /**
   * 특정 카테고리 토글 (펼침 ↔ 접힘)
   */
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  /**
   * 특정 카테고리들만 펼치기 (기존 상태에 추가)
   */
  const expandCategories = useCallback((categories: string[]) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      categories.forEach((cat) => newSet.add(cat));
      return newSet;
    });
  }, []);

  /**
   * 모든 카테고리 펼치기
   */
  const expandAll = useCallback((categories: string[]) => {
    setExpandedCategories(new Set(categories));
  }, []);

  /**
   * 모든 카테고리 접기
   */
  const collapseAll = useCallback(() => {
    setExpandedCategories(new Set());
  }, []);

  return {
    expandedCategories,
    isExpanded,
    toggleCategory,
    expandCategories,
    expandAll,
    collapseAll,
  };
}
