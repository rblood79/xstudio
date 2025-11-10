import { useState, useEffect } from 'react';
import type { Tab } from '../sidebar/SidebarNav';

const SIDEBAR_TABS_KEY = 'xstudio_sidebar_tabs';

/**
 * localStorage에서 활성 탭 로드
 */
function loadTabsFromStorage(): Set<Tab> {
    try {
        const stored = localStorage.getItem(SIDEBAR_TABS_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                return new Set(parsed as Tab[]);
            }
        }
    } catch (error) {
        console.error('Failed to load sidebar tabs:', error);
    }
    // 초기값: 빈 Set (아무 탭도 열리지 않음)
    return new Set<Tab>();
}

/**
 * localStorage에 활성 탭 저장
 */
function saveTabsToStorage(tabs: Set<Tab>) {
    try {
        const tabsArray = Array.from(tabs);
        localStorage.setItem(SIDEBAR_TABS_KEY, JSON.stringify(tabsArray));
    } catch (error) {
        console.error('Failed to save sidebar tabs:', error);
    }
}

/**
 * useSidebarTabs - 사이드바 활성 탭 상태 관리 (localStorage 연동)
 *
 * @example
 * ```tsx
 * const { activeTabs, toggleTab } = useSidebarTabs();
 *
 * // 탭 토글
 * toggleTab('nodes');
 * ```
 */
export function useSidebarTabs() {
    const [activeTabs, setActiveTabs] = useState<Set<Tab>>(() => loadTabsFromStorage());

    // localStorage 동기화: activeTabs가 변경될 때마다 저장
    useEffect(() => {
        saveTabsToStorage(activeTabs);
    }, [activeTabs]);

    // 탭 토글
    const toggleTab = (tab: Tab) => {
        setActiveTabs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tab)) {
                newSet.delete(tab);
            } else {
                newSet.add(tab);
            }
            return newSet;
        });
    };

    // 전체 닫기
    const closeAll = () => {
        setActiveTabs(new Set<Tab>());
    };

    return {
        activeTabs,
        toggleTab,
        closeAll,
    };
}
