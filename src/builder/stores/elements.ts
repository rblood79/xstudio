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
  addComplexElement: (parentElement: Element, childElements: Element[]) => Promise<void>;
}

export const sanitizeElement = (element: Element): Element => {
  try {
    // structuredClone 우선 사용 (최신 브라우저)
    if (typeof structuredClone !== 'undefined') {
      return {
        id: element.id,
        tag: element.tag,
        props: structuredClone(element.props || {}),
        parent_id: element.parent_id,
        page_id: element.page_id,
        order_num: element.order_num
      };
    }

    // fallback: JSON 방식
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
      })
    ),

  addElement: async (element) => {
    // 1. 메모리 상태 업데이트 (우선)
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
      })
    );

    // 2. iframe 업데이트
    if (typeof window !== 'undefined' && window.parent) {
      try {
        window.parent.postMessage(
          {
            type: 'ELEMENT_ADDED',
            payload: { element: sanitizeElement(element) }
          },
          '*'
        );
      } catch (error) {
        console.warn('postMessage 직렬화 실패:', error);
      }
    }

    // 3. 데이터베이스 저장 (비동기, 실패해도 메모리는 유지)
    try {
      const { error } = await supabase
        .from('elements')
        .insert(sanitizeElement(element));

      if (error) {
        if (error.code === '23503') {
          console.warn('⚠️ 외래키 제약조건으로 인한 저장 실패 (메모리는 정상):', error.message);
        } else {
          console.warn('⚠️ 데이터베이스 저장 실패 (메모리는 정상):', error);
        }
      } else {
        console.log('✅ 데이터베이스에 요소 저장 완료:', element.id);
      }
    } catch (error) {
      console.warn('⚠️ 데이터베이스 저장 중 오류 (메모리는 정상):', error);
    }
  },

  updateElementProps: async (elementId, props) => {
    const state = get();
    const element = findElementById(state.elements, elementId);
    if (!element) return;

    // 1. 메모리 상태 업데이트 (우선)
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
      })
    );

    // 2. iframe 업데이트
    if (typeof window !== 'undefined' && window.parent) {
      try {
        const updatedElement = findElementById(get().elements, elementId);
        if (updatedElement) {
          window.parent.postMessage(
            {
              type: 'ELEMENT_UPDATED',
              payload: { element: sanitizeElement(updatedElement) }
            },
            '*'
          );
        }
      } catch (error) {
        console.warn('postMessage 직렬화 실패:', error);
      }
    }

    // 3. 데이터베이스 업데이트 (비동기, 실패해도 메모리는 유지)
    try {
      const { error } = await supabase
        .from('elements')
        .update({ props: { ...element.props, ...props } })
        .eq('id', elementId);

      if (error) {
        if (error.code === '23503') {
          console.warn('⚠️ 외래키 제약조건으로 인한 업데이트 실패 (메모리는 정상):', error.message);
        } else {
          console.warn('⚠️ 데이터베이스 업데이트 실패 (메모리는 정상):', error);
        }
      } else {
        console.log('✅ 데이터베이스에서 요소 업데이트 완료:', elementId);
      }
    } catch (error) {
      console.warn('⚠️ 데이터베이스 업데이트 중 오류 (메모리는 정상):', error);
    }
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

      // 1. 메모리 상태 업데이트 (우선)
      set(
        produce((state: ElementsState) => {
          switch (entry.type) {
            case 'add':
              // 추가된 요소 제거 (역작업)
              const elementIdsToRemove = [entry.elementId];
              if (entry.data.childElements && entry.data.childElements.length > 0) {
                elementIdsToRemove.push(...entry.data.childElements.map(child => child.id));
              }

              state.elements = state.elements.filter(el => !elementIdsToRemove.includes(el.id));
              if (elementIdsToRemove.includes(state.selectedElementId || '')) {
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
              // 삭제된 요소와 자식 요소들 복원
              if (entry.data.element) {
                state.elements.push(entry.data.element);
              }
              // 자식 요소들도 함께 복원
              if (entry.data.childElements && entry.data.childElements.length > 0) {
                state.elements.push(...entry.data.childElements);
                console.log(`🔄 Undo: 자식 요소 ${entry.data.childElements.length}개 복원`, {
                  parent: entry.data.element?.tag,
                  children: entry.data.childElements.map(child => ({ id: child.id, tag: child.tag }))
                });
              }
              break;
          }
        })
      );

      // 2. iframe 업데이트
      if (typeof window !== 'undefined' && window.parent) {
        try {
          const currentElements = get().elements;
          window.parent.postMessage(
            {
              type: 'ELEMENTS_UPDATED',
              payload: { elements: currentElements.map(sanitizeElement) }
            },
            '*'
          );
        } catch (error) {
          console.warn('postMessage 직렬화 실패:', error);
        }
      }

      // 3. 데이터베이스 업데이트 (비동기, 실패해도 메모리는 유지)
      try {
        switch (entry.type) {
          case 'add':
            // 부모 요소와 자식 요소들을 모두 데이터베이스에서 삭제
            const elementIdsToDelete = [entry.elementId];
            if (entry.data.childElements && entry.data.childElements.length > 0) {
              elementIdsToDelete.push(...entry.data.childElements.map(child => child.id));
            }

            await supabase
              .from('elements')
              .delete()
              .in('id', elementIdsToDelete);
            console.log(`✅ Undo: 데이터베이스에서 요소 삭제 완료 (부모 1개 + 자식 ${entry.data.childElements?.length || 0}개)`);
            break;

          case 'update':
            if (entry.data.prevElement) {
              await supabase
                .from('elements')
                .update({
                  props: entry.data.prevProps || entry.data.prevElement.props,
                  parent_id: entry.data.prevElement.parent_id,
                  order_num: entry.data.prevElement.order_num
                })
                .eq('id', entry.elementId);
              console.log('✅ Undo: 데이터베이스에서 요소 복원 완료');
            }
            break;

          case 'remove':
            if (entry.data.element) {
              // 부모 요소와 자식 요소들을 모두 데이터베이스에 복원
              const elementsToRestore = [entry.data.element];
              if (entry.data.childElements && entry.data.childElements.length > 0) {
                elementsToRestore.push(...entry.data.childElements);
              }

              await supabase
                .from('elements')
                .insert(elementsToRestore.map(el => sanitizeElement(el)));
              console.log(`✅ Undo: 데이터베이스에서 요소 복원 완료 (부모 1개 + 자식 ${entry.data.childElements?.length || 0}개)`);
            }
            break;
        }
      } catch (dbError) {
        console.warn("⚠️ 데이터베이스 업데이트 실패 (메모리는 정상):", dbError);
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
    try {
      const state = get();
      if (!state.currentPageId) return;

      // 히스토리 작업 시작 표시
      set({ historyOperationInProgress: true });

      console.log("🔄 Redo 시작");

      const entry = historyManager.redo();
      if (!entry) {
        console.log("⚠️ Redo 불가능: 히스토리 항목 없음");
        set({ historyOperationInProgress: false });
        return;
      }

      // 1. 메모리 상태 업데이트 (우선)
      set(
        produce((state: ElementsState) => {
          switch (entry.type) {
            case 'add':
              // 요소와 자식 요소들 추가
              if (entry.data.element) {
                state.elements.push(entry.data.element);
              }
              if (entry.data.childElements && entry.data.childElements.length > 0) {
                state.elements.push(...entry.data.childElements);
                console.log(`🔄 Redo: 자식 요소 ${entry.data.childElements.length}개 추가`, {
                  parent: entry.data.element?.tag,
                  children: entry.data.childElements.map(child => ({ id: child.id, tag: child.tag }))
                });
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
              // 요소와 자식 요소들 제거
              const elementIdsToRemove = [entry.elementId];
              if (entry.data.childElements && entry.data.childElements.length > 0) {
                elementIdsToRemove.push(...entry.data.childElements.map(child => child.id));
              }

              state.elements = state.elements.filter(el => !elementIdsToRemove.includes(el.id));
              if (elementIdsToRemove.includes(state.selectedElementId || '')) {
                state.selectedElementId = null;
                state.selectedElementProps = {};
              }
              break;
          }
        })
      );

      // 2. iframe 업데이트
      if (typeof window !== 'undefined' && window.parent) {
        try {
          const currentElements = get().elements;
          window.parent.postMessage(
            {
              type: 'ELEMENTS_UPDATED',
              payload: { elements: currentElements.map(sanitizeElement) }
            },
            '*'
          );
        } catch (error) {
          console.warn('postMessage 직렬화 실패:', error);
        }
      }

      // 3. 데이터베이스 업데이트 (비동기, 실패해도 메모리는 유지)
      try {
        switch (entry.type) {
          case 'add':
            if (entry.data.element) {
              // 부모 요소와 자식 요소들을 모두 데이터베이스에 추가
              const elementsToAdd = [entry.data.element];
              if (entry.data.childElements && entry.data.childElements.length > 0) {
                elementsToAdd.push(...entry.data.childElements);
              }

              await supabase
                .from('elements')
                .insert(elementsToAdd.map(el => sanitizeElement(el)));
              console.log(`✅ Redo: 데이터베이스에서 요소 추가 완료 (부모 1개 + 자식 ${entry.data.childElements?.length || 0}개)`);
            }
            break;

          case 'update':
            if (entry.data.props) {
              const element = findElementById(get().elements, entry.elementId);
              if (element) {
                await supabase
                  .from('elements')
                  .update({ props: { ...element.props, ...entry.data.props } })
                  .eq('id', entry.elementId);
                console.log('✅ Redo: 데이터베이스에서 요소 업데이트 완료');
              }
            }
            break;

          case 'remove':
            // 부모 요소와 자식 요소들을 모두 데이터베이스에서 삭제
            const elementIdsToDelete = [entry.elementId];
            if (entry.data.childElements && entry.data.childElements.length > 0) {
              elementIdsToDelete.push(...entry.data.childElements.map(child => child.id));
            }

            await supabase
              .from('elements')
              .delete()
              .in('id', elementIdsToDelete);
            console.log(`✅ Redo: 데이터베이스에서 요소 삭제 완료 (부모 1개 + 자식 ${entry.data.childElements?.length || 0}개)`);
            break;
        }
      } catch (dbError) {
        console.warn("⚠️ 데이터베이스 업데이트 실패 (메모리는 정상):", dbError);
      }

      console.log("✅ Redo 완료");
    } catch (error) {
      console.error("Redo 시 오류:", error);
    } finally {
      // 히스토리 작업 종료 표시
      set({ historyOperationInProgress: false });
    }
  },

  removeElement: async (elementId) => {
    const state = get();
    const element = findElementById(state.elements, elementId);
    if (!element) return;

    // 자식 요소들 찾기 (재귀적으로)
    const findChildren = (parentId: string): Element[] => {
      const children = state.elements.filter(el => el.parent_id === parentId);
      const allChildren: Element[] = [...children];

      // 각 자식의 자식들도 재귀적으로 찾기
      children.forEach(child => {
        allChildren.push(...findChildren(child.id));
      });

      return allChildren;
    };

    const childElements = findChildren(elementId);
    const allElementsToRemove = [element, ...childElements];
    const elementIdsToRemove = allElementsToRemove.map(el => el.id);

    console.log(`🗑️ 요소 삭제: ${elementId}와 자식 요소 ${childElements.length}개`, {
      parent: element.tag,
      children: childElements.map(child => ({ id: child.id, tag: child.tag }))
    });

    try {
      // 데이터베이스에서 모든 요소 삭제 (자식 요소들 포함)
      const { error } = await supabase
        .from('elements')
        .delete()
        .in('id', elementIdsToRemove);

      if (error) {
        console.error('데이터베이스 삭제 실패:', error);
        // 외래키 제약조건 오류인 경우 경고만 출력하고 계속 진행
        if (error.code === '23503') {
          console.warn('외래키 제약조건으로 인한 삭제 실패, 메모리에서만 관리:', error.message);
        } else {
          throw error;
        }
      } else {
        console.log('데이터베이스에서 요소 삭제 완료:', elementIdsToRemove);
      }
    } catch (error) {
      console.error('요소 삭제 중 오류:', error);
      // 데이터베이스 삭제 실패해도 메모리에서는 삭제 진행
    }

    set(
      produce((state: ElementsState) => {
        // 히스토리 추가 (부모 요소와 모든 자식 요소들 정보 저장)
        if (state.currentPageId) {
          historyManager.addEntry({
            type: 'remove',
            elementId: elementId,
            data: {
              element: { ...element },
              childElements: childElements.map(child => ({ ...child }))
            }
          });
        }

        // 모든 요소 제거 (부모 + 자식들)
        state.elements = state.elements.filter(el => !elementIdsToRemove.includes(el.id));

        // 선택된 요소가 제거된 경우 선택 해제
        if (elementIdsToRemove.includes(state.selectedElementId || '')) {
          state.selectedElementId = null;
          state.selectedElementProps = {};
        }

        // postMessage로 iframe에 전달
        if (typeof window !== 'undefined' && window.parent) {
          window.parent.postMessage(
            {
              type: 'ELEMENT_REMOVED',
              payload: { elementId: elementIdsToRemove }
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

  addComplexElement: async (parentElement: Element, childElements: Element[]) => {
    const allElements = [parentElement, ...childElements];

    // 1. 메모리 상태 업데이트 (우선)
    set(
      produce((state: ElementsState) => {
        // 복합 컴포넌트 생성 히스토리 추가
        if (state.currentPageId) {
          historyManager.addEntry({
            type: 'add',
            elementId: parentElement.id,
            data: {
              element: { ...parentElement },
              childElements: childElements.map(child => ({ ...child }))
            }
          });
        }

        // 모든 요소 추가
        state.elements.push(...allElements);
      })
    );

    // 2. iframe 업데이트
    if (typeof window !== 'undefined' && window.parent) {
      try {
        window.parent.postMessage(
          {
            type: 'COMPLEX_ELEMENT_ADDED',
            payload: {
              parentElement: sanitizeElement(parentElement),
              childElements: childElements.map(child => sanitizeElement(child))
            }
          },
          '*'
        );
      } catch (error) {
        console.warn('postMessage 직렬화 실패:', error);
      }
    }

    // 3. 데이터베이스 저장 (비동기, 실패해도 메모리는 유지)
    try {
      const { error } = await supabase
        .from('elements')
        .insert(allElements.map(el => sanitizeElement(el)));

      if (error) {
        if (error.code === '23503') {
          console.warn('⚠️ 외래키 제약조건으로 인한 저장 실패 (메모리는 정상):', error.message);
        } else {
          console.warn('⚠️ 데이터베이스 저장 실패 (메모리는 정상):', error);
        }
      } else {
        console.log(`✅ 복합 컴포넌트 데이터베이스 저장 완료: ${parentElement.tag} + 자식 ${childElements.length}개`);
      }
    } catch (error) {
      console.warn('⚠️ 데이터베이스 저장 중 오류 (메모리는 정상):', error);
    }
  },
});

// 기존 호환성을 위한 useStore export
export const useStore = create<ElementsState>(createElementsSlice);