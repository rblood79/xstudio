import { useState, useEffect, useCallback } from 'react';

const FAVORITE_COMPONENTS_KEY = 'xstudio_favorite_components';

export function useFavoriteComponents() {
    const [favoriteTags, setFavoriteTags] = useState<string[]>([]);

    // localStorage에서 즐겨찾기 로드
    useEffect(() => {
        try {
            const stored = localStorage.getItem(FAVORITE_COMPONENTS_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    setFavoriteTags(parsed);
                }
            }
        } catch (error) {
            console.error('Failed to load favorite components:', error);
        }
    }, []);

    // localStorage에 저장
    const saveToStorage = useCallback((tags: string[]) => {
        try {
            localStorage.setItem(FAVORITE_COMPONENTS_KEY, JSON.stringify(tags));
        } catch (error) {
            console.error('Failed to save favorite components:', error);
        }
    }, []);

    // 즐겨찾기 토글
    const toggleFavorite = useCallback((tag: string) => {
        setFavoriteTags(prevTags => {
            const exists = prevTags.includes(tag);
            const updated = exists
                ? prevTags.filter(t => t !== tag)
                : [...prevTags, tag];
            saveToStorage(updated);
            return updated;
        });
    }, [saveToStorage]);

    // 즐겨찾기 여부 확인
    const isFavorite = useCallback((tag: string) => {
        return favoriteTags.includes(tag);
    }, [favoriteTags]);

    // 즐겨찾기 초기화
    const clearFavorites = useCallback(() => {
        setFavoriteTags([]);
        localStorage.removeItem(FAVORITE_COMPONENTS_KEY);
    }, []);

    return {
        favoriteTags,
        toggleFavorite,
        isFavorite,
        clearFavorites
    };
}
