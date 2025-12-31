import { useListData } from 'react-stately';
import { useEffect } from 'react';

const RECENT_SEARCHES_KEY = 'xstudio_recent_searches';
const MAX_RECENT_SEARCHES = 10; // 최대 저장 개수

/**
 * localStorage에서 최근 검색 로드
 */
function loadSearchesFromStorage(): { id: string; query: string; timestamp: number }[] {
    try {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        }
    } catch (error) {
        console.error('Failed to load recent searches:', error);
    }
    return [];
}

/**
 * localStorage에 최근 검색 저장
 */
function saveSearchesToStorage(items: { id: string; query: string; timestamp: number }[]) {
    try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(items));
    } catch (error) {
        console.error('Failed to save recent searches:', error);
    }
}

/**
 * useRecentSearches - React Stately useListData 기반 최근 검색 기록 관리
 *
 * @example
 * ```tsx
 * const { recentSearches, addSearch, clearSearches } = useRecentSearches();
 *
 * // 검색 기록 추가
 * addSearch('Button');
 *
 * // 최근 검색 기록 목록
 * recentSearches.forEach(search => console.log(search.query));
 * ```
 */
export function useRecentSearches() {
    const list = useListData<{ id: string; query: string; timestamp: number }>({
        initialItems: loadSearchesFromStorage(),
        getKey: (item) => item.id,
    });

    // localStorage 동기화: items가 변경될 때마다 저장
    useEffect(() => {
        saveSearchesToStorage(list.items);
    }, [list.items]);

    // 검색 기록 추가 (중복 제거, 최신순 정렬, 최대 개수 제한)
    const addSearch = (query: string) => {
        // 빈 검색어는 저장하지 않음
        if (!query.trim()) return;

        const normalizedQuery = query.trim().toLowerCase();

        // 중복 제거: 동일한 검색어가 있으면 제거
        const existingItem = list.items.find(item => item.query.toLowerCase() === normalizedQuery);
        if (existingItem) {
            list.remove(existingItem.id);
        }

        // 새 검색 기록 추가 (prepend로 최상단에 추가)
        const newItem = {
            id: `${Date.now()}-${normalizedQuery}`,
            query: query.trim(),
            timestamp: Date.now(),
        };
        list.prepend(newItem);

        // 최대 개수 초과 시 오래된 항목 제거
        if (list.items.length > MAX_RECENT_SEARCHES) {
            const itemsToRemove = list.items.slice(MAX_RECENT_SEARCHES);
            list.remove(...itemsToRemove.map(item => item.id));
        }
    };

    // 검색 기록 초기화
    const clearSearches = () => {
        const allKeys = list.items.map((item) => item.id);
        list.remove(...allKeys);
        localStorage.removeItem(RECENT_SEARCHES_KEY);
    };

    // 특정 검색 기록 제거
    const removeSearch = (id: string) => {
        list.remove(id);
    };

    return {
        recentSearches: list.items,
        addSearch,
        clearSearches,
        removeSearch,
    };
}
