import { useListData } from 'react-stately';
import { useEffect } from 'react';

const RECENT_COMPONENTS_KEY = 'xstudio_recent_components';
const MAX_RECENT_ITEMS = 8;

/**
 * localStorage에서 최근 컴포넌트 로드
 */
function loadRecentFromStorage(): { id: string; tag: string }[] {
    try {
        const stored = localStorage.getItem(RECENT_COMPONENTS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                // string[] → { id, tag }[] 변환
                return parsed.map((tag) => ({ id: tag, tag }));
            }
        }
    } catch (error) {
        console.error('Failed to load recent components:', error);
    }
    return [];
}

/**
 * localStorage에 최근 컴포넌트 저장
 */
function saveRecentToStorage(items: { id: string; tag: string }[]) {
    try {
        // { id, tag }[] → string[] 변환
        const tags = items.map((item) => item.tag);
        localStorage.setItem(RECENT_COMPONENTS_KEY, JSON.stringify(tags));
    } catch (error) {
        console.error('Failed to save recent components:', error);
    }
}

/**
 * useRecentComponents - React Stately useListData 기반 최근 사용 컴포넌트 관리
 *
 * 최대 8개까지만 유지하며, 최근 순서대로 정렬됩니다.
 *
 * @example
 * ```tsx
 * const { recentTags, addRecentComponent, clearRecentComponents } = useRecentComponents();
 *
 * // 컴포넌트 추가 (중복 제거 + 맨 앞에 추가)
 * addRecentComponent('Button');
 *
 * // 최근 사용 목록 초기화
 * clearRecentComponents();
 * ```
 */
export function useRecentComponents() {
    const list = useListData<{ id: string; tag: string }>({
        initialItems: loadRecentFromStorage(),
        getKey: (item) => item.id,
    });

    // localStorage 동기화: items가 변경될 때마다 저장
    useEffect(() => {
        saveRecentToStorage(list.items);
    }, [list.items]);

    // 최근 사용 컴포넌트 추가
    const addRecentComponent = (tag: string) => {
        // 이미 존재하면 제거
        const exists = list.items.some((item) => item.tag === tag);
        if (exists) {
            list.remove(tag);
        }

        // 맨 앞에 추가
        list.prepend({ id: tag, tag });

        // MAX_RECENT_ITEMS 개수 제한
        if (list.items.length > MAX_RECENT_ITEMS) {
            // 오래된 아이템 제거 (마지막 아이템들)
            const itemsToRemove = list.items.slice(MAX_RECENT_ITEMS);
            const keysToRemove = itemsToRemove.map((item) => item.id);
            list.remove(...keysToRemove);
        }
    };

    // 최근 사용 목록 초기화
    const clearRecentComponents = () => {
        // 모든 아이템 제거
        const allKeys = list.items.map((item) => item.id);
        list.remove(...allKeys);
        localStorage.removeItem(RECENT_COMPONENTS_KEY);
    };

    // 하위 호환성을 위해 recentTags 배열 제공
    const recentTags = list.items.map((item) => item.tag);

    return {
        recentTags,
        addRecentComponent,
        clearRecentComponents,
    };
}
