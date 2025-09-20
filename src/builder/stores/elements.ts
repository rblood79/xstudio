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
  pageHistories: Record<string, { history: Element[][]; historyIndex: number }>;
  historyOperationInProgress: boolean;

  setElements: (elements: Element[], options?: { skipHistory?: boolean }) => void;
  loadPageElements: (elements: Element[], pageId: string) => void;
  addElement: (element: Element) => Promise<void>;
  updateElementProps: (elementId: string, props: ComponentElementProps) => Promise<void>;
  setSelectedElement: (elementId: string | null, props?: ComponentElementProps) => void;
  selectTabElement: (elementId: string, props: ComponentElementProps, tabIndex: number) => void;
  setPages: (pages: Page[]) => void;
  setCurrentPageId: (pageId: string) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  removeElement: (elementId: string) => Promise<void>;
  removeTabPair: (elementId: string) => void;
}

export const sanitizeElement = (element: Element): Element => {
  try {
    // 깊은 복사를 통해 프록시 객체에서 일반 객체로 변환
    return {
      id: element.id,
      tag: element.tag,
      props: JSON.parse(JSON.stringify(element.props || {})),
      parent_id: element.parent_id,
      page_id: element.page_id,
      order_num: element.order_num
    };
  } catch (error) {
    console.error("Element sanitization error:", error);
    // 기본 값으로 대체
    return {
      id: element.id || "",
      tag: element.tag || "",
      props: {},
      parent_id: element.parent_id,
      page_id: element.page_id || "",
      order_num: element.order_num || 0
    };
  }
};

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
  pageHistories: {},
  historyOperationInProgress: false,

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

        // pageHistories 초기화 확인
        if (!state.pageHistories) {
          state.pageHistories = {};
        }

        // 현재 페이지의 히스토리가 없으면 초기화
        if (!state.pageHistories[pageId]) {
          state.pageHistories[pageId] = { history: [], historyIndex: -1 };
        }
      })
    ),

  addElement: async (element) => {
    try {
      // 데이터베이스에 저장
      const { error } = await supabase
        .from('elements')
        .insert({
          id: element.id,
          tag: element.tag,
          props: element.props,
          parent_id: element.parent_id,
          page_id: element.page_id,
          order_num: element.order_num
        });

      if (error) {
        console.error('데이터베이스 저장 실패:', error);
        // 외래키 제약조건 오류인 경우 경고만 출력하고 계속 진행
        if (error.code === '23503') {
          console.warn('외래키 제약조건으로 인한 저장 실패, 메모리에서만 관리:', error.message);
        } else {
          throw error;
        }
      } else {
        console.log('데이터베이스에 요소 저장 완료:', element.id);
      }
    } catch (error) {
      console.error('요소 저장 중 오류:', error);
      // 데이터베이스 저장 실패해도 메모리에는 추가 진행
    }

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
    );
  },

  updateElementProps: async (elementId, props) => {
    const state = get();
    const element = findElementById(state.elements, elementId);
    if (!element) return;

    try {
      // 데이터베이스 업데이트
      const { error } = await supabase
        .from('elements')
        .update({ props: { ...element.props, ...props } })
        .eq('id', elementId);

      if (error) {
        console.error('데이터베이스 업데이트 실패:', error);
        // 외래키 제약조건 오류인 경우 경고만 출력하고 계속 진행
        if (error.code === '23503') {
          console.warn('외래키 제약조건으로 인한 업데이트 실패, 메모리에서만 관리:', error.message);
        } else {
          throw error;
        }
      } else {
        console.log('데이터베이스에서 요소 업데이트 완료:', elementId);
      }
    } catch (error) {
      console.error('요소 업데이트 중 오류:', error);
      // 데이터베이스 업데이트 실패해도 메모리에서는 업데이트 진행
    }

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
    );
  },

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

  undo: async () => {
    try {
      const state = get();
      const { currentPageId } = state;
      if (!currentPageId) return;

      // 히스토리 작업 시작 표시
      set({ historyOperationInProgress: true });

      console.log("🔄 Undo 시작");

      // historyManager에서 항목 가져오기
      const entry = historyManager.undo();
      if (!entry) {
        console.log("⚠️ Undo 불가능: 히스토리 항목 없음");
        set({ historyOperationInProgress: false });
        return;
      }

      set(
        produce((state: ElementsState) => {
          switch (entry.type) {
            case 'add':
              // 추가된 요소 제거 (역작업)
              state.elements = state.elements.filter(el => el.id !== entry.elementId);
              if (state.selectedElementId === entry.elementId) {
                state.selectedElementId = null;
                state.selectedElementProps = {};
              }
              break;

            case 'update': {
              // 이전 상태로 복원
              const element = findElementById(state.elements, entry.elementId);
              if (element && entry.data.prevProps) {
                element.props = { ...entry.data.prevProps };
              } else if (element && entry.data.prevElement) {
                // 전체 요소가 저장된 경우
                Object.assign(element, entry.data.prevElement);
              }
              break;
            }

            case 'remove':
              // 삭제된 요소 복원
              if (entry.data.element) {
                state.elements.push(entry.data.element);
              }
              break;
          }

          // iframe 업데이트
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

      // Supabase 업데이트
      try {
        // 작업 유형에 따라 다른 DB 작업 수행
        switch (entry.type) {
          case 'add':
            // 추가된 요소 제거
            await supabase
              .from('elements')
              .delete()
              .eq('id', entry.elementId);
            break;

          case 'update':
            // 이전 상태로 복원
            if (entry.data.prevElement) {
              await supabase
                .from('elements')
                .update({ props: entry.data.prevProps || entry.data.prevElement.props })
                .eq('id', entry.elementId);
            }
            break;

          case 'remove':
            // 삭제된 요소 복원
            if (entry.data.element) {
              await supabase
                .from('elements')
                .insert(sanitizeElement(entry.data.element));
            }
            break;
        }
      } catch (dbError) {
        console.error("Database update error:", dbError);
      }

      console.log("✅ Undo 완료");
    } catch (error) {
      console.error("Undo 시 오류:", error);
    } finally {
      // 히스토리 작업 종료 표시
      set({ historyOperationInProgress: false });
    }
  },

  redo: async () => {
    const state = get();
    if (!state.currentPageId) return;

    const entry = historyManager.redo();
    if (!entry) return;

    // 데이터베이스 작업 처리
    if (entry.type === 'add' && entry.data.element) {
      try {
        // 요소를 데이터베이스에 추가
        const { error } = await supabase
          .from('elements')
          .insert({
            id: entry.data.element.id,
            tag: entry.data.element.tag,
            props: entry.data.element.props,
            parent_id: entry.data.element.parent_id,
            page_id: entry.data.element.page_id,
            order_num: entry.data.element.order_num
          });

        if (error) {
          console.error('Redo 시 데이터베이스 추가 실패:', error);
        } else {
          console.log('Redo 시 데이터베이스에서 요소 추가 완료:', entry.data.element.id);
        }
      } catch (error) {
        console.error('Redo 시 요소 추가 중 오류:', error);
      }
    } else if (entry.type === 'update' && entry.data.props) {
      try {
        // 데이터베이스 업데이트
        const element = findElementById(state.elements, entry.elementId);
        if (element) {
          const { error } = await supabase
            .from('elements')
            .update({ props: { ...element.props, ...entry.data.props } })
            .eq('id', entry.elementId);

          if (error) {
            console.error('Redo 시 데이터베이스 업데이트 실패:', error);
          } else {
            console.log('Redo 시 데이터베이스에서 요소 업데이트 완료:', entry.elementId);
          }
        }
      } catch (error) {
        console.error('Redo 시 요소 업데이트 중 오류:', error);
      }
    } else if (entry.type === 'remove') {
      try {
        // 요소를 데이터베이스에서 삭제
        const { error } = await supabase
          .from('elements')
          .delete()
          .eq('id', entry.elementId);

        if (error) {
          console.error('Redo 시 데이터베이스 삭제 실패:', error);
        } else {
          console.log('Redo 시 데이터베이스에서 요소 삭제 완료:', entry.elementId);
        }
      } catch (error) {
        console.error('Redo 시 요소 삭제 중 오류:', error);
      }
    }

    set(
      produce((state: ElementsState) => {
        switch (entry.type) {
          case 'add':
            // 요소 추가
            if (entry.data.element) {
              state.elements.push(entry.data.element);
            }
            break;

          case 'update': {
            // 업데이트 적용
            const element = findElementById(state.elements, entry.elementId);
            if (element && entry.data.props) {
              element.props = { ...element.props, ...entry.data.props };
            }
            break;
          }

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
        // 외래키 제약조건 오류인 경우 경고만 출력하고 계속 진행
        if (error.code === '23503') {
          console.warn('외래키 제약조건으로 인한 삭제 실패, 메모리에서만 관리:', error.message);
        } else {
          throw error;
        }
      } else {
        console.log('데이터베이스에서 요소 삭제 완료:', elementId);
      }
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