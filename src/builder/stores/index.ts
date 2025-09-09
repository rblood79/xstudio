import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { createElementsSlice, ElementsState } from './elements';
import { createHistorySlice, HistoryState } from './history';
import { createSelectionSlice, SelectionState } from './selection';
import { createThemeSlice, ThemeState } from './theme';
import { Element, DesignToken, MemoizedSelector, Selector, EqualityFn } from '../../types/store';

// 통합 스토어 타입
interface Store extends ElementsState, HistoryState, SelectionState, ThemeState { }

// 성능 최적화를 위한 메모이제이션 유틸리티
class StoreOptimizer {
    private static selectors = new Map<string, MemoizedSelector<unknown, Store>>();

    static createMemoizedSelector<T>(
        key: string,
        selector: (state: Store) => T,
        equalityFn?: (a: T, b: T) => boolean
    ): (state: Store) => T {
        if (!this.selectors.has(key)) {
            this.selectors.set(key, {
                selector: selector as unknown as Selector<unknown, Store>,
                equalityFn: equalityFn as unknown as EqualityFn<unknown>,
                lastResult: undefined,
                lastState: undefined
            });
        }

        const memoized = this.selectors.get(key)!;

        return (state: Store) => {
            if (memoized.lastState === state) {
                return memoized.lastResult! as T;
            }

            const result = memoized.selector(state) as T;

            if (memoized.equalityFn && memoized.lastResult) {
                if (memoized.equalityFn(memoized.lastResult as T, result)) {
                    return memoized.lastResult as T;
                }
            }

            memoized.lastResult = result;
            memoized.lastState = state;
            return result;
        };
    }

    static clearCache() {
        this.selectors.clear();
    }

    static getCacheSize() {
        return this.selectors.size;
    }
}

// 모듈화된 스토어 생성
export const useStore = create<Store>()(
    devtools(
        subscribeWithSelector(
            (...a) => ({
                ...createElementsSlice(...a),
                ...createHistorySlice(...a),
                ...createSelectionSlice(...a),
                ...createThemeSlice(...a),
            })
        ),
        {
            name: 'XStudio Store',
            enabled: import.meta.env.DEV
        }
    )
);

// 기본 선택기들 (메모이제이션 적용)
export const useElements = () => useStore(
    StoreOptimizer.createMemoizedSelector(
        'elements',
        state => state.elements,
        (a, b) => a.length === b.length && a.every((el, i) => el.id === b[i]?.id)
    )
);

export const useSelectedElement = () => useStore(
    StoreOptimizer.createMemoizedSelector(
        'selectedElement',
        state => state.selectedElementId
    )
);

export const useSelectedElementProps = () => useStore(
    StoreOptimizer.createMemoizedSelector(
        'selectedElementProps',
        state => state.selectedElementProps,
        (a, b) => JSON.stringify(a) === JSON.stringify(b)
    )
);

export const useCurrentPageId = () => useStore(
    StoreOptimizer.createMemoizedSelector(
        'currentPageId',
        state => state.currentPageId
    )
);

export const usePages = () => useStore(
    StoreOptimizer.createMemoizedSelector(
        'pages',
        state => state.pages,
        (a, b) => a.length === b.length && a.every((page, i) => page.id === b[i]?.id)
    )
);

// 복합 선택기들 (고급 메모이제이션)
export const useElementById = (id: string) => useStore(
    StoreOptimizer.createMemoizedSelector(
        `elementById-${id}`,
        state => state.elements.find((el: Element) => el.id === id)
    )
);

export const useElementsByParent = (parentId: string) => useStore(
    StoreOptimizer.createMemoizedSelector(
        `elementsByParent-${parentId}`,
        state => state.elements.filter((el: Element) => el.parent_id === parentId),
        (a, b) => a.length === b.length && a.every((el, i) => el.id === b[i]?.id)
    )
);

export const useSelectedElementWithProps = () => useStore(
    StoreOptimizer.createMemoizedSelector(
        'selectedElementWithProps',
        state => {
            if (!state.selectedElementId) return null;
            const element = state.elements.find((el: Element) => el.id === state.selectedElementId);
            return element ? { ...element, props: state.selectedElementProps } : null;
        },
        (a, b) => {
            if (!a && !b) return true;
            if (!a || !b) return false;
            return a.id === b.id && JSON.stringify(a.props) === JSON.stringify(b.props);
        }
    )
);

// 액션 선택기들 (참조 안정성 보장)
export const useElementActions = () => useStore(
    StoreOptimizer.createMemoizedSelector(
        'elementActions',
        state => ({
            addElement: state.addElement,
            updateElementProps: state.updateElementProps,
            removeElement: state.removeElement,
            setSelectedElement: state.setSelectedElement,
            loadPageElements: state.loadPageElements,
        })
    )
);

export const useHistoryActions = () => useStore(
    StoreOptimizer.createMemoizedSelector(
        'historyActions',
        state => ({
            undo: state.undo,
            redo: state.redo,
            addToHistory: state.addToHistory,
            clearHistory: state.clearHistory,
        })
    )
);

export const useThemeActions = () => useStore(
    StoreOptimizer.createMemoizedSelector(
        'themeActions',
        state => ({
            loadTheme: state.loadTheme,
            updateTokenValue: state.updateTokenValue,
            deleteToken: state.deleteToken,
            addToken: state.addToken,
        })
    )
);

// 구독 기반 선택기들 (성능 최적화)
export const useElementsSubscription = (callback: (elements: Element[]) => void) => {
    useStore.subscribe(
        state => state.elements,
        callback,
        {
            equalityFn: (a, b) =>
                a.length === b.length &&
                a.every((el, i) => el.id === b[i]?.id && el.order_num === b[i]?.order_num)
        }
    );
};

export const useSelectedElementSubscription = (callback: (elementId: string | null) => void) => {
    useStore.subscribe(
        state => state.selectedElementId,
        callback
    );
};

export const useThemeSubscription = (callback: (tokens: DesignToken[]) => void) => {
    useStore.subscribe(
        state => [...(state.rawTokens || []), ...(state.semanticTokens || [])],
        callback,
        {
            equalityFn: (a, b) =>
                a.length === b.length &&
                a.every((token, i) => token.id === b[i]?.id && token.value === b[i]?.value)
        }
    );
};

// 배치 업데이트 유틸리티
export const useBatchUpdate = () => {
    const store = useStore.getState();

    return {
        batchUpdateElements: (updates: Array<{ id: string; props: Record<string, unknown> }>) => {
            const currentElements = store.elements;
            const updatedElements = currentElements.map(element => {
                const update = updates.find(u => u.id === element.id);
                return update ? { ...element, props: { ...element.props, ...update.props } } : element;
            });

            store.setElements(updatedElements as Element[]);
        },

        batchUpdateTokens: (updates: Array<{ id: string; value: string }>) => {
            const updateTokenValue = store.updateTokenValue;
            updates.forEach(update => {
                updateTokenValue(update.id, 'raw', update.value);
            });
        }
    };
};

// 상태 변경 감지 및 최적화
export const useStoreOptimization = () => {
    return {
        clearCache: () => StoreOptimizer.clearCache(),
        getCacheSize: () => StoreOptimizer.getCacheSize(),
        optimizeStore: () => {
            // 불필요한 캐시 정리 로직
        }
    };
};

// 개발 환경에서만 사용할 수 있는 디버깅 유틸리티
export const useStoreDebug = () => {
    if (!import.meta.env.DEV) return {};

    return {
        getState: () => useStore.getState(),
        subscribe: (callback: (state: Store) => void) => useStore.subscribe(callback),
        clearAllCache: () => StoreOptimizer.clearCache(),
    };
};
