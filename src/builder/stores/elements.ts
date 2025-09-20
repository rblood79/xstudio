import { create } from 'zustand';
import { produce } from 'immer';
import { StateCreator } from 'zustand';
import { Element, ComponentElementProps } from '../../types/store';
import { historyManager } from './history';
import { supabase } from '../../env/supabase.client';

interface Page {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  order_num?: number;
}

export interface ElementsState {
  elements: Element[];
  selectedElementId: string | null;
  selectedElementProps: ComponentElementProps;
  selectedTab: { parentId: string, tabIndex: number } | null;
  pages: Page[];
  currentPageId: string | null;
  setElements: (elements: Element[], options?: { skipHistory?: boolean }) => void;
  loadPageElements: (elements: Element[], pageId: string) => void;
  addElement: (element: Element) => void;
  updateElementProps: (elementId: string, props: ComponentElementProps) => void;
  setSelectedElement: (elementId: string | null, props?: ComponentElementProps) => void;
  selectTabElement: (elementId: string, props: ComponentElementProps, tabIndex: number) => void;
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
const createCompleteProps = (element: Element, props?: ComponentElementProps) => ({
  ...element.props,
  ...props,
  tag: element.tag
});

// Helper function to find element by ID
const findElementById = (elements: Element[], id: string): Element | null => {
  for (const element of elements) {
    if (element.id === id) return element;
  }
  return null;
};

export const createElementsSlice: StateCreator<ElementsState> = (set, get) => ({
  elements: [],
  selectedElementId: null,
  selectedElementProps: {},
  selectedTab: null,
  pages: [],
  currentPageId: null,

  setElements: (elements, options) =>
    set(
      produce((state: ElementsState) => {
        state.elements = elements;

        // 히스토리 추가 (skipHistory가 false인 경우)
        if (state.currentPageId && !options?.skipHistory) {
          historyManager.addEntry({
            type: 'update',
            elementId: 'bulk_update',
            data: {
              element: { id: 'bulk_update', tag: 'bulk', props: {}, parent_id: null, page_id: state.currentPageId, order_num: 0 },
              prevElement: { id: 'bulk_update', tag: 'bulk', props: {}, parent_id: null, page_id: state.currentPageId, order_num: 0 }
            }
          });
        }
      })
    ),

  loadPageElements: (elements, pageId) =>
    set(
      produce((state: ElementsState) => {
        state.elements = elements;
        state.currentPageId = pageId;

        // 페이지 변경 시 히스토리 초기화
        historyManager.setCurrentPage(pageId);
      })
    ),

  addElement: (element) =>
    set(
      produce((state: ElementsState) => {
        // 히스토리 추가
        if (state.currentPageId) {
          historyManager.addEntry({
            type: 'add',
            elementId: element.id,
            data: { element: { ...element } }
          });
        }

        state.elements.push(element);

        // postMessage로 iframe에 전달
        if (typeof window !== 'undefined' && window.parent) {
          window.parent.postMessage(
            {
              type: 'ELEMENT_ADDED',
              payload: { element: sanitizeElement(element) }
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

        // 히스토리 추가
        if (state.currentPageId) {
          historyManager.addEntry({
            type: 'update',
            elementId: elementId,
            data: {
              props: props,
              prevProps: { ...element.props },
              prevElement: { ...element }
            }
          });
        }

        // 요소 업데이트
        element.props = { ...element.props, ...props };

        // 선택된 요소가 업데이트된 경우 selectedElementProps도 업데이트
        if (state.selectedElementId === elementId) {
          state.selectedElementProps = createCompleteProps(element, props);
        }

        // postMessage로 iframe에 전달
        if (typeof window !== 'undefined' && window.parent) {
          window.parent.postMessage(
            {
              type: 'ELEMENT_UPDATED',
              payload: { element: sanitizeElement(element) }
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
    set(
      produce((state: ElementsState) => {
        state.pages = pages;
      })
    ),

  setCurrentPageId: (pageId) =>
    set(
      produce((state: ElementsState) => {
        state.currentPageId = pageId;
        historyManager.setCurrentPage(pageId);
      })
    ),

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
              payload: { elements: state.elements.map(sanitizeElement) }
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
            // 요소 추가
            if (entry.data.element) {
              state.elements.push(entry.data.element);
            }
            break;

          case 'update':
            // 업데이트 적용
            const element = findElementById(state.elements, entry.elementId);
            if (element && entry.data.props) {
              element.props = { ...element.props, ...entry.data.props };
            }
            break;

          case 'remove':
            // 요소 제거
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
              payload: { elements: state.elements.map(sanitizeElement) }
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

    try {
      // 데이터베이스에서 삭제
      const { error } = await supabase
        .from('elements')
        .delete()
        .eq('id', elementId);

      if (error) {
        console.error('데이터베이스 삭제 실패:', error);
        throw error;
      }

      console.log('데이터베이스에서 요소 삭제 완료:', elementId);
    } catch (error) {
      console.error('요소 삭제 중 오류:', error);
      // 데이터베이스 삭제 실패해도 메모리에서는 삭제 진행
    }

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
        // Tab과 Panel 쌍 제거
        state.elements = state.elements.filter(
          el => el.parent_id !== elementId && el.id !== elementId
        );

        if (state.selectedElementId === elementId) {
          state.selectedElementId = null;
          state.selectedElementProps = {};
        }
      })
    ),
});

// 기존 호환성을 위한 useStore export
export const useStore = create<ElementsState>(createElementsSlice);