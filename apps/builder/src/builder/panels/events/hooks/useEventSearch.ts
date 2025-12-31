/**
 * 이벤트 검색 Hook (fuse.js 기반 퍼지 검색)
 */

import { useMemo } from "react";
import Fuse from "fuse.js";
import { EVENT_METADATA, isEventCompatible } from "../data/eventCategories";
import type { EventType, EventMetadata } from "../types/eventTypes";

/**
 * 검색 가능한 이벤트 아이템
 */
interface SearchableEvent extends EventMetadata {
  type: EventType;
}

/**
 * useEventSearch Hook
 *
 * @param query - 검색어
 * @param componentType - 컴포넌트 타입 (호환성 필터링용)
 * @returns 검색 결과 및 상태
 *
 * @example
 * ```tsx
 * const { searchResults, isSearching } = useEventSearch("클릭", "Button");
 * // → [{ type: "onClick", label: "클릭", ... }]
 * ```
 */
export function useEventSearch(query: string, componentType?: string) {
  // Fuse.js 인스턴스 (메타데이터 기반)
  const fuse = useMemo(() => {
    const events: SearchableEvent[] = Object.entries(EVENT_METADATA).map(
      ([type, meta]) => ({
        type: type as EventType,
        ...meta
      })
    );

    return new Fuse(events, {
      keys: [
        { name: "label", weight: 2 }, // 라벨 우선순위 높음
        { name: "description", weight: 1 },
        { name: "type", weight: 1.5 }
      ],
      threshold: 0.3, // 퍼지 매칭 정확도 (0 = 완전일치, 1 = 모두 매칭)
      includeScore: true,
      minMatchCharLength: 1
    });
  }, []);

  // 검색 결과
  const searchResults = useMemo(() => {
    // 검색어가 없으면 빈 배열
    if (!query || query.trim().length === 0) {
      return [];
    }

    // Fuse.js 검색
    const results = fuse.search(query.trim());

    // 컴포넌트 호환성 필터링
    const filtered = results
      .map((result) => result.item)
      .filter((event) => {
        // 컴포넌트 타입이 지정되지 않으면 모두 허용
        if (!componentType) return true;

        // 호환성 체크
        return isEventCompatible(event.type, componentType);
      });

    return filtered;
  }, [query, componentType, fuse]);

  // 검색 중 여부
  const isSearching = query.trim().length > 0;

  // 검색어와 매칭된 카테고리들
  const matchedCategories = useMemo(() => {
    if (searchResults.length === 0) return [];

    const categories = new Set(searchResults.map((r) => r.category));
    return Array.from(categories);
  }, [searchResults]);

  return {
    searchResults,
    isSearching,
    matchedCategories,
    resultCount: searchResults.length
  };
}

/**
 * 검색 하이라이트 유틸리티
 * 검색어와 일치하는 부분을 강조 표시
 *
 * @example
 * ```tsx
 * const highlighted = highlightMatch("onClick", "click");
 * // → { before: "on", match: "Click", after: "" }
 * ```
 */
export function highlightMatch(text: string, query: string): {
  before: string;
  match: string;
  after: string;
} | null {
  if (!query || query.trim().length === 0) return null;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return null;

  return {
    before: text.slice(0, index),
    match: text.slice(index, index + lowerQuery.length),
    after: text.slice(index + lowerQuery.length)
  };
}
