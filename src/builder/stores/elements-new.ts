import { create } from 'zustand';
import { produce } from 'immer';
import { Element, ElementProps } from '../../types';
import { historyManager, HistoryEntry } from './history';

interface Page {
    id: string;
    name: string;
    slug: string;
    parent_id?: string | null;
    order_num?: number;
}

interface Store {
    elements: Element[];
    selectedElementId: string | null;
    selectedElementProps: ElementProps;
    selectedTab: { parentId: string, tabIndex: number } | null;
    pages: Page[];
    currentPageId: string | null;
    setElements: (elements: Element[], options?: { skipHistory?: boolean }) => void;
    loadPageElements: (elements: Element[], pageId: string) => void;
    addElement: (element: Element) => void;
    updateElementProps: (elementId: string, props: ElementProps) => void;
    setSelectedElement: (elementId: string | null, props?: ElementProps) => void;
    selectTabElement: (elementId: string, props: ElementProps, tabIndex: number) => void;
    setPages: (pages: Page[]) => void;
    setCurrentPageId: (pageId: string) => void;
    undo: () => void;
    redo: () => void;
    removeElement: (elementId: string) => Promise<void>;
    removeTabPair: (elementId: string) => void;
}

const sanitizeElement = (el: Element) => ({
    id: el.id,
    tag: el.tag,
    props: JSON.parse(JSON.stringify(el.props)), // Deep clone to remove non-serializable values
    parent_id: el.parent_id,
    page_id: el.page_id,
    order_num: el.order_num
});

// Helper function for element selection logic
const createCompleteProps = (element: Element, props?: ElementProps) => ({
    ...element.props,
    ...props,
    tag: element.tag
});

const findElementById = (elements: Element[], elementId: string) => {
    return elements.find((el: Element) => el.id === elementId);
};

// ElementsState 타입 정의
export interface ElementsState {
    elements: Element[];
    selectedElementId: string | null;
    selectedElementProps: ElementProps;
    selectedTab: { parentId: string, tabIndex: number } | null;
    pages: Page[];
    currentPageId: string | null;
    setElements: (elements: Element[], options?: { skipHistory?: boolean }) => void;
    loadPageElements: (elements: Element[], pageId: string) => void;
    addElement: (element: Element) => void;
    updateElementProps: (elementId: string, props: ElementProps) => void;
    setSelectedElement: (elementId: string | null, props?: ElementProps) => void;
    selectTabElement: (elementId: string, props: ElementProps, tabIndex: number) => void;
    setPages: (pages: Page[]) => void;
    setCurrentPageId: (pageId: string) => void;
    undo: () => void;
    redo: () => void;
    removeElement: (elementId: string) => Promise<void>;
    removeTabPair: (elementId: string) => void;
}

export const useStore = create<ElementsState>((set, get) => ({
    elements: [],
    selectedElementId: null,
    selectedElementProps: {},
    selectedTab: null,
    pages: [],
    currentPageId: null,

    setElements: (elements, options = {}) =>
        set(
            produce((state: ElementsState) => {
                const prevElements = state.elements;
                state.elements = elements.map(sanitizeElement);

                // skipHistory 옵션이 true가 아닌 경우에만 히스토리 생성
                if (!options.skipHistory && state.currentPageId) {
                    historyManager.addEntry({
                        type: 'update',
                        elementId: 'all',
                        data: {
                            element: { id: 'all', tag: 'root', props: {}, parent_id: null, page_id: state.currentPageId, order_num: 0 } as Element,
                            prevElement: { id: 'all', tag: 'root', props: {}, parent_id: null, page_id: state.currentPageId, order_num: 0 } as Element
                        }
                    });
                }
            })
        ),

    loadPageElements: (elements, pageId) =>
        set(
            produce((state: ElementsState) => {
                const newElements = elements.map(sanitizeElement);

                // 새 페이지의 히스토리 초기화
                historyManager.setCurrentPage(pageId);

                // 상태 업데이트
                state.elements = newElements;
                state.selectedElementId = null;
                state.selectedElementProps = {};
                state.currentPageId = pageId;

                // 첫 로드 시에는 postMessage만 하고 히스토리는 생성하지 않음
                if (typeof window !== 'undefined' && window.parent) {
                    window.parent.postMessage(
                        {
                            type: 'ELEMENTS_LOADED',
                            payload: {
                                elements: newElements,
                                pageId: pageId
                            }
                        },
                        '*'
                    );
                }
            })
        ),

    addElement: (element) =>
        set(
            produce((state: ElementsState) => {
                const sanitizedElement = sanitizeElement(element);
                state.elements.push(sanitizedElement);

                // 히스토리 추가
                if (state.currentPageId) {
                    historyManager.addEntry({
                        type: 'add',
                        elementId: element.id,
                        data: { element: sanitizedElement }
                    });
                }

                // postMessage로 iframe에 전달
                if (typeof window !== 'undefined' && window.parent) {
                    window.parent.postMessage(
                        {
                            type: 'ELEMENT_ADDED',
                            payload: { element: sanitizedElement }
                        },
                        '*'
                    );
                }
            })
        ),

    updateElementProps: (elementId, props) =>
        set(
            produce((state: ElementsState) => {
                const element = findElementById(state.elements, elementId);
                if (!element) return;

                const prevProps = { ...element.props };
                element.props = { ...element.props, ...props };

                // 히스토리 추가
                if (state.currentPageId) {
                    historyManager.addEntry({
                        type: 'update',
                        elementId: elementId,
                        data: {
                            element: { ...element },
                            prevElement: { ...element, props: prevProps },
                            props: props,
                            prevProps: prevProps
                        }
                    });
                }

                // 선택된 요소가 업데이트된 경우 selectedElementProps도 업데이트
                if (state.selectedElementId === elementId) {
                    state.selectedElementProps = createCompleteProps(element, props);
                }

                // postMessage로 iframe에 전달
                if (typeof window !== 'undefined' && window.parent) {
                    window.parent.postMessage(
                        {
                            type: 'ELEMENT_UPDATED',
                            payload: { elementId, props }
                        },
                        '*'
                    );
                }
            })
        ),

    setSelectedElement: (elementId, props) =>
        set(
            produce((state: ElementsState) => {
                state.selectedElementId = elementId;

                if (elementId && props) {
                    state.selectedElementProps = props;
                } else if (elementId) {
                    const element = findElementById(state.elements, elementId);
                    if (element) {
                        state.selectedElementProps = createCompleteProps(element);
                    }
                } else {
                    state.selectedElementProps = {};
                }
            })
        ),

    selectTabElement: (elementId, props, tabIndex) =>
        set(
            produce((state: ElementsState) => {
                state.selectedElementId = elementId;
                state.selectedElementProps = props;
                state.selectedTab = { parentId: elementId, tabIndex };
            })
        ),

    setPages: (pages) =>
        set(() => ({ pages })),

    setCurrentPageId: (pageId) =>
        set(() => ({ currentPageId: pageId })),

    undo: () => {
        const state = get();
        if (!state.currentPageId) return;

        const entry = historyManager.undo();
        if (!entry) return;

        set(
            produce((state: ElementsState) => {
                switch (entry.type) {
                    case 'add':
                        // 추가된 요소 제거
                        state.elements = state.elements.filter(el => el.id !== entry.elementId);
                        if (state.selectedElementId === entry.elementId) {
                            state.selectedElementId = null;
                            state.selectedElementProps = {};
                        }
                        break;

                    case 'update':
                        // 이전 상태로 복원
                        if (entry.data.prevElement) {
                            const index = state.elements.findIndex(el => el.id === entry.elementId);
                            if (index !== -1) {
                                state.elements[index] = entry.data.prevElement;
                            }
                        }
                        break;

                    case 'remove':
                        // 제거된 요소 복원
                        if (entry.data.element) {
                            state.elements.push(entry.data.element);
                        }
                        break;
                }

                // postMessage로 iframe에 전달
                if (typeof window !== 'undefined' && window.parent) {
                    window.parent.postMessage(
                        {
                            type: 'ELEMENTS_UPDATED',
                            payload: { elements: state.elements }
                        },
                        '*'
                    );
                }
            })
        );
    },

    redo: () => {
        const state = get();
        if (!state.currentPageId) return;

        const entry = historyManager.redo();
        if (!entry) return;

        set(
            produce((state: ElementsState) => {
                switch (entry.type) {
                    case 'add':
                        // 요소 다시 추가
                        if (entry.data.element) {
                            state.elements.push(entry.data.element);
                        }
                        break;

                    case 'update':
                        // 업데이트된 상태로 복원
                        if (entry.data.element) {
                            const index = state.elements.findIndex(el => el.id === entry.elementId);
                            if (index !== -1) {
                                state.elements[index] = entry.data.element;
                            }
                        }
                        break;

                    case 'remove':
                        // 요소 다시 제거
                        state.elements = state.elements.filter(el => el.id !== entry.elementId);
                        if (state.selectedElementId === entry.elementId) {
                            state.selectedElementId = null;
                            state.selectedElementProps = {};
                        }
                        break;
                }

                // postMessage로 iframe에 전달
                if (typeof window !== 'undefined' && window.parent) {
                    window.parent.postMessage(
                        {
                            type: 'ELEMENTS_UPDATED',
                            payload: { elements: state.elements }
                        },
                        '*'
                    );
                }
            })
        );
    },

    removeElement: async (elementId) => {
        const state = get();
        const element = findElementById(state.elements, elementId);
        if (!element) return;

        set(
            produce((state: ElementsState) => {
                // 히스토리 추가
                if (state.currentPageId) {
                    historyManager.addEntry({
                        type: 'remove',
                        elementId: elementId,
                        data: { element: { ...element } }
                    });
                }

                // 요소 제거
                state.elements = state.elements.filter(el => el.id !== elementId);

                // 선택된 요소가 제거된 경우 선택 해제
                if (state.selectedElementId === elementId) {
                    state.selectedElementId = null;
                    state.selectedElementProps = {};
                }

                // postMessage로 iframe에 전달
                if (typeof window !== 'undefined' && window.parent) {
                    window.parent.postMessage(
                        {
                            type: 'ELEMENT_REMOVED',
                            payload: { elementId }
                        },
                        '*'
                    );
                }
            })
        );
    },

    removeTabPair: (elementId) =>
        set(
            produce((state: ElementsState) => {
                // 탭 페어 제거 로직
                const element = findElementById(state.elements, elementId);
                if (element && element.tag === 'TabList') {
                    // 탭 리스트와 관련된 탭 패널들도 함께 제거
                    const relatedElements = state.elements.filter(
                        el => el.parent_id === elementId || el.id === elementId
                    );

                    relatedElements.forEach(relatedElement => {
                        if (state.currentPageId) {
                            historyManager.addEntry({
                                type: 'remove',
                                elementId: relatedElement.id,
                                data: { element: { ...relatedElement } }
                            });
                        }
                    });

                    state.elements = state.elements.filter(
                        el => el.parent_id !== elementId && el.id !== elementId
                    );

                    if (state.selectedElementId === elementId) {
                        state.selectedElementId = null;
                        state.selectedElementProps = {};
                    }
                }
            })
        ),
}));
