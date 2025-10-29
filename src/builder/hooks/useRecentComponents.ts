import { useState, useEffect, useCallback } from 'react';

const RECENT_COMPONENTS_KEY = 'xstudio_recent_components';
const MAX_RECENT_ITEMS = 8;

export function useRecentComponents() {
    const [recentTags, setRecentTags] = useState<string[]>([]);

    // localStorage에서 최근 컴포넌트 로드
    useEffect(() => {
        try {
            const stored = localStorage.getItem(RECENT_COMPONENTS_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    setRecentTags(parsed);
                }
            }
        } catch (error) {
            console.error('Failed to load recent components:', error);
        }
    }, []);

    // localStorage에 저장
    const saveToStorage = useCallback((tags: string[]) => {
        try {
            localStorage.setItem(RECENT_COMPONENTS_KEY, JSON.stringify(tags));
        } catch (error) {
            console.error('Failed to save recent components:', error);
        }
    }, []);

    // 최근 사용 컴포넌트 추가
    const addRecentComponent = useCallback((tag: string) => {
        setRecentTags(prevTags => {
            // 이미 존재하면 제거 후 맨 앞에 추가
            const filtered = prevTags.filter(t => t !== tag);
            const updated = [tag, ...filtered].slice(0, MAX_RECENT_ITEMS);
            saveToStorage(updated);
            return updated;
        });
    }, [saveToStorage]);

    // 최근 사용 목록 초기화
    const clearRecentComponents = useCallback(() => {
        setRecentTags([]);
        localStorage.removeItem(RECENT_COMPONENTS_KEY);
    }, []);

    return {
        recentTags,
        addRecentComponent,
        clearRecentComponents
    };
}
