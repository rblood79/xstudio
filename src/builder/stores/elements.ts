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

    // 히스토리 기록을 위한 내부 메서드 추가
    _saveHistorySnapshot?: (elements: Element[], description: string) => void;
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
const isElementWithId = (el: Element, id: string): el is Element => {
    return el.id === id;
};

const hasTabId = (props: ComponentElementProps): props is ComponentElementProps & { tabId: string } => {
    return 'tabId' in props && typeof props.tabId === 'string';
};

export const createElementsSlice: StateCreator<ElementsState> = (set, get) => ({
    elements: [],
    selectedElementId: null,
    selectedElementProps: {},
    selectedTab: null,
    pages: [],
    currentPageId: null,


    setElements: (elements, options = {}) => {
        // produce 함수 외부에서 이전 요소들 가져오기
        const prevElements = get().elements;

        set(
            produce((state) => {
                state.elements = elements;
            })
        );

        // skipHistory 옵션이 없을 때만 히스토리 기록
        // 단, 초기 로드나 동일한 요소들인 경우 히스토리 기록하지 않음
        if (!options.skipHistory) {
            // 동일한 요소들이면 히스토리 기록하지 않음
            const currentIds = elements.map(el => el.id).sort().join(',');
            const prevIds = prevElements.map(el => el.id).sort().join(',');

            console.log('🔍 setElements 히스토리 체크:', {
                currentIds,
                prevIds,
                isDifferent: currentIds !== prevIds,
                skipHistory: options.skipHistory
            });

            if (currentIds !== prevIds) {
                const { saveSnapshot } = get() as unknown as { saveSnapshot: (elements: Element[], description: string) => void };
                if (saveSnapshot) {
                    saveSnapshot(elements, '요소 전체 설정');
                }
            } else {
                console.log('🚫 동일한 요소들 - 히스토리 기록 생략');
            }
        }
    },

    loadPageElements: (elements, pageId) =>
        set(
            produce((state) => {
                const newElements = Array.isArray(elements) ? [...elements] : [];
                const prevElements = [...state.elements];

                state.elements = newElements;
                state.selectedElementId = null;
                state.selectedElementProps = {};
                state.currentPageId = pageId;

                // 히스토리 기록 (페이지 로드 시) - 직접 addToHistory 호출 (페이지 로드는 히스토리 기록 안함)
                // const { addToHistory } = get() as unknown as { addToHistory: (prev: Element[], current: Element[], desc?: string) => void };
                // if (addToHistory) {
                //     addToHistory(prevElements, state.elements, '페이지 요소 로드');
                //     console.log('✅ 히스토리 기록 성공 (페이지 요소 로드)', {
                //         prevCount: prevElements.length,
                //         currentCount: state.elements.length,
                //         description: '페이지 요소 로드'
                //     });
                // }

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

    addElement: (element) => {
        console.group('🆕 요소 추가 상세 로그');
        console.log('추가할 요소:', {
            elementId: element.id,
            elementTag: element.tag,
            elementProps: element.props,
            parentId: element.parent_id,
            pageId: element.page_id,
            orderNum: element.order_num
        });

        set(
            produce((state) => {
                const prevElements = [...state.elements];
                console.log('추가 전 요소 상태:', {
                    prevElementsCount: prevElements.length,
                    prevElementIds: prevElements.map(el => el.id)
                });

                state.elements.push(element);

                console.log('추가 후 요소 상태:', {
                    currentElementsCount: state.elements.length,
                    currentElementIds: state.elements.map(el => el.id)
                });
            })
        );

        // 히스토리 기록 - produce 함수 외부에서 호출
        console.log('히스토리 기록 시도');
        const { saveSnapshot } = get() as unknown as { saveSnapshot: (elements: Element[], description: string) => void };
        if (saveSnapshot) {
            const currentElements = get().elements;
            saveSnapshot(currentElements, '요소 추가');
        } else {
            console.warn('saveSnapshot 메서드 없음');
        }

        // iframe 전송은 useIframeMessenger의 useEffect에서 처리
        console.groupEnd();
    },

    updateElementProps: (elementId: string, props: ComponentElementProps) => {
        set(
            produce((state: ElementsState) => {
                const prevElements: Element[] = [...state.elements];
                const element: Element | undefined = state.elements.find<Element>((el): boolean => el.id === elementId);

                if (element) {
                    element.props = { ...element.props, ...props };

                    if (state.selectedElementId === elementId) {
                        state.selectedElementProps = { ...state.selectedElementProps, ...props };
                    }
                }
            })
        );

        // 히스토리 기록 (속성 변경 시) - produce 함수 외부에서 호출
        const { saveSnapshot } = get() as unknown as { saveSnapshot: (elements: Element[], description: string) => void };
        if (saveSnapshot) {
            const currentElements = get().elements;
            saveSnapshot(currentElements, '속성 업데이트');
        }

        // iframe 전송은 useIframeMessenger의 useEffect에서 처리
    },

    setSelectedElement: (elementId, props) =>
        set(
            produce((state: ElementsState) => {
                if (!elementId) {
                    state.selectedElementId = null;
                    state.selectedElementProps = {};
                    state.selectedTab = null;
                    return;
                }

                const element: Element | undefined = state.elements.find((el: Element) => el.id === elementId);
                if (element) {
                    state.selectedElementId = elementId;
                    state.selectedElementProps = createCompleteProps(element, props);
                    state.selectedTab = null;
                }
            })
        ),

    selectTabElement: (elementId, props, tabIndex) =>
        set(
            produce((state: ElementsState) => {
                const element: Element | undefined = state.elements.find((el: Element) => el.id === elementId);
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
            const prevElements = useStore.getState().elements;
            const elementToDelete = prevElements.find((el): el is Element => el.id === elementId);

            if (!elementToDelete) {
                console.log('🚫 삭제할 요소를 찾을 수 없음:', elementId);
                return;
            }

            // 히스토리 기록을 삭제 전에 수행 - 새로운 스냅샷 시스템 사용
            const { saveSnapshot } = useStore.getState() as unknown as { saveSnapshot: (elements: Element[], description: string) => void };
            if (saveSnapshot) {
                // 삭제 전 요소들을 저장
                const currentElements = useStore.getState().elements;
                saveSnapshot(currentElements, '요소 삭제');
            }

            const deletedIds: string[] = [];

            // Tab이나 Panel인 경우 쌍으로 삭제
            if (elementToDelete.tag === 'Tab' || elementToDelete.tag === 'Panel') {
                const parentId = elementToDelete.parent_id;

                if (!parentId) {
                    // 부모가 없으면 단일 삭제
                    await ElementUtils.deleteElement(elementId);
                    deletedIds.push(elementId);
                } else {
                    // 같은 부모를 가진 Tab과 Panel들을 찾기
                    const siblings = useStore.getState().elements.filter(el => el.parent_id === parentId);

                    if (elementToDelete.tag === 'Tab') {
                        // Tab을 삭제하는 경우, 같은 tabId를 가진 Panel 찾기
                        const tabId = hasTabId(elementToDelete.props) ? elementToDelete.props.tabId : elementId;

                        let correspondingPanel = siblings.find(el =>
                            el.tag === 'Panel' && (el.props as Record<string, unknown>).tabId === tabId
                        );

                        // tabId가 없는 경우 order_num으로 매칭 시도
                        if (!correspondingPanel && !(elementToDelete.props as Record<string, unknown>).tabId) {
                            const tabOrderNum = elementToDelete.order_num || 0;
                            correspondingPanel = siblings.find(el =>
                                el.tag === 'Panel' && el.order_num === tabOrderNum + 1
                            );
                        }

                        // Tab 삭제
                        await ElementUtils.deleteElement(elementId);
                        deletedIds.push(elementId);

                        // 해당 Panel 삭제
                        if (correspondingPanel) {
                            await ElementUtils.deleteElement(correspondingPanel.id);
                            deletedIds.push(correspondingPanel.id);
                        }
                    } else if (elementToDelete.tag === 'Panel') {
                        // Panel을 삭제하는 경우, 같은 tabId를 가진 Tab 찾기
                        const tabId = (elementToDelete.props as Record<string, unknown>).tabId;

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
                        }

                        // Panel 삭제
                        await ElementUtils.deleteElement(elementId);
                        deletedIds.push(elementId);

                        // 해당 Tab 삭제
                        if (correspondingTab) {
                            await ElementUtils.deleteElement(correspondingTab.id);
                            deletedIds.push(correspondingTab.id);
                        }
                    }
                }
            } else {
                // 일반 요소는 단일 삭제
                await ElementUtils.deleteElement(elementId);
                deletedIds.push(elementId);
            }

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

            console.log('✅ 요소 삭제 및 히스토리 기록 완료:', {
                deletedElementId: elementId,
                remainingElements: useStore.getState().elements.length
            });

        } catch (error) {
            console.error('Element 삭제 중 오류:', error);
        }
    },

    removeTabPair: async (elementId) => {
        try {
            // Tab과 Panel 쌍을 모두 서비스 레이어를 통해 삭제
            const prevElements = useStore.getState().elements;
            const panelElements = prevElements.filter(el => el.parent_id === elementId);

            // 히스토리 기록을 삭제 전에 수행 - 새로운 스냅샷 시스템 사용
            const { saveSnapshot } = useStore.getState() as unknown as { saveSnapshot: (elements: Element[], description: string) => void };
            if (saveSnapshot) {
                saveSnapshot(useStore.getState().elements, '탭/패널 쌍 삭제');
            }

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

            console.log('✅ 탭/패널 쌍 삭제 및 히스토리 기록 완료:', {
                deletedElementId: elementId,
                remainingElements: useStore.getState().elements.length
            });

        } catch (error) {
            console.error('Tab/Panel 쌍 삭제 중 오류:', error);
        }
    }
});
