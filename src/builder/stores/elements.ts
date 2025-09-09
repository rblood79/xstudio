import { StateCreator } from 'zustand';
import { produce } from 'immer';
import { ElementProps } from '../../types/supabase';
import { elementsApi } from '../../services/api';
import { useStore } from './';

// Element 인터페이스를 직접 정의
export interface Element {
    id: string;
    tag: string;
    props: ElementProps;
    parent_id?: string | null;
    order_num?: number;
    page_id: string;
}

// Page 인터페이스도 정의
export interface Page {
    id: string;
    title: string;
    project_id: string;
    slug: string;
    parent_id?: string | null;
    order_num?: number;
}

export interface ElementsState {
    elements: Element[];
    selectedElementId: string | null;
    selectedElementProps: ElementProps;
    selectedTab: { parentId: string, tabIndex: number } | null;
    pages: Page[];
    currentPageId: string | null;

    // 액션들
    setElements: (elements: Element[]) => void;
    loadPageElements: (elements: Element[], pageId: string) => void;
    addElement: (element: Element) => void;
    updateElementProps: (elementId: string, props: ElementProps) => void;
    setSelectedElement: (elementId: string | null, props?: ElementProps) => void;
    selectTabElement: (elementId: string, props: ElementProps, tabIndex: number) => void;
    setPages: (pages: Page[]) => void;
    setCurrentPageId: (pageId: string) => void;
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

export const createElementsSlice: StateCreator<ElementsState> = (set) => ({
    elements: [],
    selectedElementId: null,
    selectedElementProps: {},
    selectedTab: null,
    pages: [],
    currentPageId: null,

    setElements: (elements) =>
        set(
            produce((state) => {
                state.elements = elements;
            })
        ),

    loadPageElements: (elements, pageId) =>
        set(
            produce((state) => {
                const newElements = Array.isArray(elements) ? [...elements] : [];
                state.elements = newElements;
                state.selectedElementId = null;
                state.selectedElementProps = {};
                state.currentPageId = pageId;

                // postMessage로 iframe에 전달
                try {
                    window.postMessage({
                        type: "UPDATE_ELEMENTS",
                        elements: newElements.map(sanitizeElement)
                    }, window.location.origin);
                } catch (error) {
                    console.error("Failed to send message:", error);
                }
            })
        ),

    addElement: (element) =>
        set(
            produce((state) => {
                state.elements.push(element);
            })
        ),

    updateElementProps: (elementId, props) =>
        set(
            produce((state) => {
                const element = state.elements.find((el: Element) => el.id === elementId);
                if (element) {
                    element.props = { ...element.props, ...props };

                    // 선택된 요소라면 selectedElementProps도 업데이트
                    if (state.selectedElementId === elementId) {
                        state.selectedElementProps = { ...state.selectedElementProps, ...props };
                    }
                }
            })
        ),

    setSelectedElement: (elementId, props) =>
        set(
            produce((state) => {
                if (!elementId) {
                    state.selectedElementId = null;
                    state.selectedElementProps = {};
                    state.selectedTab = null;
                    return;
                }

                const element = state.elements.find((el: Element) => el.id === elementId);
                if (element) {
                    state.selectedElementId = elementId;
                    state.selectedElementProps = createCompleteProps(element, props);
                    state.selectedTab = null;
                }
            })
        ),

    selectTabElement: (elementId, props, tabIndex) =>
        set(
            produce((state) => {
                const element = state.elements.find((el: Element) => el.id === elementId);
                if (element) {
                    // Tab 또는 Panel의 실제 부모 Tabs 컴포넌트 ID를 찾습니다
                    const actualParentId = element.parent_id || elementId;

                    state.selectedElementId = elementId;
                    state.selectedElementProps = createCompleteProps(element, props);
                    state.selectedTab = { parentId: actualParentId, tabIndex };
                }
            })
        ),

    setPages: (pages) =>
        set(
            produce((state) => {
                state.pages = pages;
            })
        ),

    setCurrentPageId: (pageId) =>
        set(() => ({ currentPageId: pageId })),

    removeElement: async (elementId) => {
        try {
            // 서비스 레이어를 통한 삭제
            await elementsApi.deleteElement(elementId);

            // 로컬 상태에서도 제거
            set(
                produce((state) => {
                    state.elements = state.elements.filter((el: Element) => el.id !== elementId);

                    // 선택된 요소가 삭제된 경우 선택 해제
                    if (state.selectedElementId === elementId) {
                        state.selectedElementId = null;
                        state.selectedElementProps = {};
                        state.selectedTab = null;
                    }
                })
            );

            // iframe에 업데이트된 요소 목록 전송
            const updatedElements = useStore.getState().elements.filter((el: Element) => el.id !== elementId);
            try {
                window.postMessage({
                    type: "UPDATE_ELEMENTS",
                    elements: updatedElements.map(sanitizeElement)
                }, window.location.origin);
            } catch (error) {
                console.error("Failed to send message:", error);
            }

        } catch (error) {
            console.error('Element 삭제 중 오류:', error);
        }
    },

    removeTabPair: async (elementId) => {
        try {
            // Tab과 Panel 쌍을 모두 서비스 레이어를 통해 삭제
            //const tabElement = useStore.getState().elements.find(el => el.id === elementId);
            const panelElements = useStore.getState().elements.filter(el => el.parent_id === elementId);

            const elementIdsToDelete = [elementId, ...panelElements.map(el => el.id)];
            await elementsApi.deleteMultipleElements(elementIdsToDelete);

            // 로컬 상태에서도 제거
            set(
                produce((state) => {
                    // Tab과 Panel 쌍을 모두 제거
                    state.elements = state.elements.filter((el: Element) =>
                        el.id !== elementId && el.parent_id !== elementId
                    );

                    // 선택된 요소가 삭제된 경우 선택 해제
                    if (state.selectedElementId === elementId) {
                        state.selectedElementId = null;
                        state.selectedElementProps = {};
                        state.selectedTab = null;
                    }
                })
            );

            // iframe에 업데이트된 요소 목록 전송
            const updatedElements = useStore.getState().elements.filter((el: Element) =>
                el.id !== elementId && el.parent_id !== elementId
            );
            try {
                window.postMessage({
                    type: "UPDATE_ELEMENTS",
                    elements: updatedElements.map(sanitizeElement)
                }, window.location.origin);
            } catch (error) {
                console.error("Failed to send message:", error);
            }

        } catch (error) {
            console.error('Tab/Panel 쌍 삭제 중 오류:', error);
        }
    }
});
