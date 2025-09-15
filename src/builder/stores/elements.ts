import { StateCreator } from 'zustand';
import { produce } from 'immer';
import { Element, Page, ComponentElementProps } from '../../types/unified';
import { elementsApi } from '../../services/api';
import { useStore } from './';
import { MessageService } from '../../utils/messaging'; // 메시징 서비스 추가
import { ElementUtils } from '../../utils/elementUtils';

export interface ElementsState {
    elements: Element[];
    selectedElementId: string | null;
    selectedElementProps: ComponentElementProps;
    selectedTab: { parentId: string, tabIndex: number } | null;
    pages: Page[];
    currentPageId: string | null;

    // 액션들
    setElements: (elements: Element[]) => void;
    loadPageElements: (elements: Element[], pageId: string) => void;
    addElement: (element: Element) => void;
    updateElementProps: (elementId: string, props: ComponentElementProps) => void;
    setSelectedElement: (elementId: string | null, props?: ComponentElementProps) => void;
    selectTabElement: (elementId: string, props: ComponentElementProps, tabIndex: number) => void;
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
const createCompleteProps = (element: Element, props?: ComponentElementProps) => ({
    ...element.props,
    ...props,
    tag: element.tag
});

// 타입 가드 함수 추가
const hasTabId = (props: ComponentElementProps): props is ComponentElementProps & { tabId: string } => {
    return 'tabId' in props && typeof props.tabId === 'string';
};

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
                    MessageService.sendToWindow("UPDATE_ELEMENTS", {
                        elements: newElements.map(sanitizeElement)
                    });
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
            const elementToDelete = useStore.getState().elements.find(el => el.id === elementId);
            if (!elementToDelete) {
                //console.log('Element not found:', elementId);
                return;
            }

            //console.log('Deleting element:', elementToDelete);
            const deletedIds: string[] = [];

            // Tab이나 Panel인 경우 쌍으로 삭제
            if (elementToDelete.tag === 'Tab' || elementToDelete.tag === 'Panel') {
                const parentId = elementToDelete.parent_id;
                //console.log('Parent ID:', parentId);

                if (!parentId) {
                    // 부모가 없으면 단일 삭제
                    await ElementUtils.deleteElement(elementId);
                    deletedIds.push(elementId);
                } else {
                    // 같은 부모를 가진 Tab과 Panel들을 찾기
                    const siblings = useStore.getState().elements.filter(el => el.parent_id === parentId);
                    //console.log('Siblings:', siblings);

                    if (elementToDelete.tag === 'Tab') {
                        // Tab을 삭제하는 경우, 같은 tabId를 가진 Panel 찾기
                        const tabId = hasTabId(elementToDelete.props) ? elementToDelete.props.tabId : elementId;
                        //console.log('Tab ID to match:', tabId);

                        let correspondingPanel = siblings.find(el =>
                            el.tag === 'Panel' && (el.props as Record<string, unknown>).tabId === tabId
                        );

                        // tabId가 없는 경우 order_num으로 매칭 시도
                        if (!correspondingPanel && !(elementToDelete.props as Record<string, unknown>).tabId) {
                            const tabOrderNum = elementToDelete.order_num || 0;
                            correspondingPanel = siblings.find(el =>
                                el.tag === 'Panel' && el.order_num === tabOrderNum + 1
                            );
                            //console.log('Fallback: Found Panel by order_num:', correspondingPanel);
                        }

                        //console.log('Corresponding Panel:', correspondingPanel);

                        // Tab 삭제
                        await ElementUtils.deleteElement(elementId);
                        deletedIds.push(elementId);

                        // 해당 Panel 삭제
                        if (correspondingPanel) {
                            await ElementUtils.deleteElement(correspondingPanel.id);
                            deletedIds.push(correspondingPanel.id);
                            //console.log('Deleted Tab and Panel pair');
                        } else {
                            //console.log('No corresponding Panel found');
                        }
                    } else if (elementToDelete.tag === 'Panel') {
                        // Panel을 삭제하는 경우, 같은 tabId를 가진 Tab 찾기
                        const tabId = (elementToDelete.props as Record<string, unknown>).tabId;
                        //console.log('Panel tabId:', tabId);

                        let correspondingTab = null;

                        if (tabId) {
                            correspondingTab = siblings.find(el =>
                                el.tag === 'Tab' && (el.props as Record<string, unknown>).tabId === tabId
                            );
                        } else {
                            // tabId가 없는 경우 order_num으로 매칭 시도
                            const panelOrderNum = elementToDelete.order_num || 0;
                            correspondingTab = siblings.find(el =>
                                el.tag === 'Tab' && el.order_num === panelOrderNum - 1
                            );
                            //console.log('Fallback: Found Tab by order_num:', correspondingTab);
                        }

                        //console.log('Corresponding Tab:', correspondingTab);

                        // Panel 삭제
                        await ElementUtils.deleteElement(elementId);
                        deletedIds.push(elementId);

                        // 해당 Tab 삭제
                        if (correspondingTab) {
                            await ElementUtils.deleteElement(correspondingTab.id);
                            deletedIds.push(correspondingTab.id);
                            //console.log('Deleted Panel and Tab pair');
                        } else {
                            //console.log('No corresponding Tab found');
                        }
                    }
                }
            } else {
                // 일반 요소는 단일 삭제
                await ElementUtils.deleteElement(elementId);
                deletedIds.push(elementId);
            }

            //console.log('Deleted IDs:', deletedIds);

            // 로컬 상태에서도 제거
            set(
                produce((state) => {
                    state.elements = state.elements.filter((el: Element) => !deletedIds.includes(el.id));

                    // 선택된 요소가 삭제된 경우 선택 해제
                    if (deletedIds.includes(state.selectedElementId)) {
                        state.selectedElementId = null;
                        state.selectedElementProps = {};
                        state.selectedTab = null;
                    }
                })
            );

            // iframe에 업데이트된 요소 목록 전송
            const updatedElements = useStore.getState().elements;
            try {
                MessageService.sendToWindow("UPDATE_ELEMENTS", {
                    elements: updatedElements.map(sanitizeElement)
                });
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
                MessageService.sendToWindow("UPDATE_ELEMENTS", {
                    elements: updatedElements.map(sanitizeElement)
                });
            } catch (error) {
                console.error("Failed to send message:", error);
            }

        } catch (error) {
            console.error('Tab/Panel 쌍 삭제 중 오류:', error);
        }
    }
});
