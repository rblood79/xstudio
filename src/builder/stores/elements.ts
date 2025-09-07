import { create } from 'zustand';
import { produce, Patch, enablePatches } from 'immer';
import { ElementProps } from '../../types/supabase';
import { supabase } from '../../env/supabase.client'; // supabase import 추가

enablePatches();

export interface Element {
  id: string;
  tag: string;
  props: ElementProps;
  parent_id?: string | null;
  page_id?: string;
  order_num?: number;
}

interface Page {
  id: string;
  title: string;
  project_id: string;
  slug: string;
  parent_id?: string | null;
  order_num?: number;
}

interface PageHistory {
  elements: Element[];
  history: { patches: Patch[]; inversePatches: Patch[]; snapshot?: { prev: Element[]; current: Element[] } }[];
  historyIndex: number;
}

interface Store {
  elements: Element[];
  selectedElementId: string | null;
  selectedElementProps: ElementProps;
  selectedTab: { parentId: string, tabIndex: number } | null;
  pages: Page[];
  history: { patches: Patch[]; inversePatches: Patch[]; snapshot?: { prev: Element[]; current: Element[] } }[]; // 패치 히스토리
  historyIndex: number;
  pageHistories: Record<string, PageHistory>;  // 페이지별 히스토리 관리
  currentPageId: string | null;
  setElements: (elements: Element[]) => void;
  loadPageElements: (elements: Element[], pageId: string) => void;
  addElement: (element: Element) => void;
  updateElementProps: (elementId: string, props: ElementProps) => void; // 동기 함수로 수정
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
  return elements.find(el => el.id === elementId);
};

export const useStore = create<Store>((set, get) => ({
  elements: [],
  selectedElementId: null,
  selectedElementProps: {},
  selectedTab: null,
  pages: [],
  history: [], // 초기 상태
  historyIndex: -1,
  pageHistories: {},
  currentPageId: null,
  setElements: (elements) =>
    set(
      produce((state) => {
        const prevState = [...state.elements];
        state.elements = elements;

        state.history = [
          ...state.history.slice(0, state.historyIndex + 1),
          {
            patches: [],
            inversePatches: [],
            snapshot: {
              prev: prevState,
              current: [...elements]
            }
          }
        ];
        state.historyIndex = state.history.length - 1;
      })
    ),
  loadPageElements: (elements, pageId) =>
    set(
      produce((state) => {
        const newElements = Array.isArray(elements) ? [...elements] : [];

        // 새 페이지의 히스토리 초기화 또는 기존 히스토리 사용
        const pageHistory = state.pageHistories[pageId] || {
          elements: newElements,
          history: [], // 빈 배열로 시작
          historyIndex: -1
        };

        // 상태 업데이트
        state.elements = newElements;
        state.selectedElementId = null;
        state.selectedElementProps = {};
        state.currentPageId = pageId;
        state.history = pageHistory.history;
        state.historyIndex = pageHistory.historyIndex;
        state.pageHistories[pageId] = pageHistory;

        // 첫 로드 시에는 postMessage만 하고 히스토리는 생성하지 않음
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
        const prevState = [...state.elements];
        state.elements.push(element);
        updateHistory(state, prevState, [...state.elements]);
      })
    ),
  updateElementProps: (elementId, props) => {
    set(
      produce((state) => {
        const element = state.elements.find((el: Element) => el.id === elementId);
        if (!element) return;

        let hasChanges = false;
        const newProps = { ...element.props, ...props };

        // 이전 props와 새로운 props를 비교하여 실제 변경이 있는지 확인
        if (Object.keys(element.props).length !== Object.keys(newProps).length) {
          hasChanges = true;
        } else {
          for (const key in newProps) {
            if (JSON.stringify(element.props[key]) !== JSON.stringify(newProps[key])) {
              hasChanges = true;
              break;
            }
          }
        }

        if (hasChanges) {
          const prevState = state.elements.map((el: Element) => ({
            ...el,
            props: { ...el.props }
          }));

          element.props = newProps;

          // selectedElementProps 업데이트
          if (state.selectedElementId === elementId) {
            state.selectedElementProps = newProps;
          }

          updateHistory(state, prevState, state.elements.map((el: Element) => ({
            ...el,
            props: { ...el.props }
          })));

          // 데이터베이스 업데이트 (비동기로 처리)
          supabase
            .from('elements')
            .update({ props: newProps })
            .eq('id', elementId)
            .then(({ error }) => {
              if (error) {
                console.error('Element props 업데이트 에러:', error);
              }
            })
            .catch((err) => {
              console.error('Element props 업데이트 중 오류:', err);
            });
        }
      })
    );
  },
  setSelectedElement: (elementId, props) =>
    set((state) => {
      if (!elementId) {
        return {
          ...state,
          selectedElementId: null,
          selectedElementProps: {},
          selectedTab: null
        };
      }

      const element = findElementById(state.elements, elementId);
      if (!element) {
        console.warn('Element not found in store:', elementId);
        return state;
      }

      return {
        ...state,
        selectedElementId: elementId,
        selectedElementProps: createCompleteProps(element, props),
        selectedTab: null
      };
    }),
  selectTabElement: (elementId, props, tabIndex) =>
    set((state) => {
      const element = findElementById(state.elements, elementId);
      if (!element) {
        console.warn('Element not found in store:', elementId);
        return state;
      }

      // Tab 또는 Panel의 실제 부모 Tabs 컴포넌트 ID를 찾습니다
      const actualParentId = element.parent_id || elementId;

      return {
        ...state,
        selectedElementId: elementId,
        selectedElementProps: createCompleteProps(element, props),
        selectedTab: { parentId: actualParentId, tabIndex }
      };
    }),
  setPages: (pages) =>
    set(
      produce((state) => {
        state.pages = pages;
      })
    ),
  setCurrentPageId: (pageId) =>
    set(() => ({ currentPageId: pageId })),
  undo: () => {
    const state = get();
    if (!state.currentPageId) return;

    set(
      produce((state) => {
        const pageHistory = state.pageHistories[state.currentPageId!];
        if (!pageHistory || pageHistory.historyIndex < 0) return;

        const currentHistory = pageHistory.history[pageHistory.historyIndex];
        if (currentHistory?.snapshot) {
          const elements = currentHistory.snapshot.prev.map((el: Element) => ({
            id: el.id,
            tag: el.tag,
            props: { ...el.props },
            parent_id: el.parent_id,
            page_id: el.page_id,
            order_num: el.order_num
          }));

          state.elements = elements;
          pageHistory.historyIndex -= 1;

          try {
            window.postMessage({
              type: "UPDATE_ELEMENTS",
              elements: elements.map(sanitizeElement)
            }, window.location.origin);
          } catch (error) {
            console.error("Failed to send message:", error);
          }
        }
      })
    );
  },
  redo: () => {
    const state = get();
    if (!state.currentPageId) return;

    set(
      produce((state) => {
        const pageHistory = state.pageHistories[state.currentPageId!];
        if (!pageHistory || pageHistory.historyIndex >= pageHistory.history.length - 1) return;

        const nextHistory = pageHistory.history[pageHistory.historyIndex + 1];
        if (nextHistory?.snapshot) {
          const elements = nextHistory.snapshot.current.map((el: Element) => ({
            id: el.id,
            tag: el.tag,
            props: { ...el.props },
            parent_id: el.parent_id,
            page_id: el.page_id,
            order_num: el.order_num
          }));

          state.elements = elements;
          pageHistory.historyIndex += 1;

          try {
            window.postMessage({
              type: "UPDATE_ELEMENTS",
              elements: elements.map(sanitizeElement)
            }, window.location.origin);
          } catch (error) {
            console.error("Failed to send message:", error);
          }
        }
      })
    );
  },
  removeElement: async (elementId: string) => {
    const state = get();
    const elementToRemove = state.elements.find(el => el.id === elementId);

    if (!elementToRemove) return;

    // Tab 또는 Panel인 경우 쌍으로 삭제
    if (elementToRemove.tag === 'Tab' || elementToRemove.tag === 'Panel') {
      const parentId = elementToRemove.parent_id;
      const tabIndex = elementToRemove.props.tabIndex;

      // 쌍 요소 찾기 - 더 정확한 매칭 로직
      const pairedElement = state.elements.find((el: Element) => {
        if (el.parent_id !== parentId || el.tag === elementToRemove.tag) return false;

        // tabIndex가 있는 경우 tabIndex로 매칭
        if (tabIndex !== undefined && el.props.tabIndex !== undefined) {
          return el.props.tabIndex === tabIndex;
        }

        // tabIndex가 없는 경우 order_num으로 매칭
        return el.order_num === elementToRemove.order_num;
      });

      // 쌍을 찾지 못한 경우 경고 로그
      if (!pairedElement) {
        console.warn(`Tab/Panel 쌍을 찾을 수 없습니다. elementId: ${elementId}, tabIndex: ${tabIndex}, order_num: ${elementToRemove.order_num}`);
      }

      // Supabase에서 삭제
      try {
        const idsToDelete = [elementId];
        if (pairedElement) {
          idsToDelete.push(pairedElement.id);
        }

        const { error } = await supabase
          .from('elements')
          .delete()
          .in('id', idsToDelete);

        if (error) {
          console.error('Tab/Panel 쌍 삭제 에러:', error);
          return;
        }
      } catch (err) {
        console.error('Tab/Panel 쌍 삭제 중 오류:', err);
        return;
      }

      // 로컬 상태 업데이트
      set(
        produce((state) => {
          const prevState = [...state.elements];

          // 두 요소 모두 제거
          state.elements = state.elements.filter((el: Element) =>
            el.id !== elementId &&
            (pairedElement ? el.id !== pairedElement.id : true)
          );

          // 남은 Tab/Panel 재정렬
          if (parentId) {
            const remainingTabs = state.elements
              .filter((el: Element) => el.parent_id === parentId && el.tag === 'Tab')
              .sort((a: Element, b: Element) => (a.order_num || 0) - (b.order_num || 0));

            const remainingPanels = state.elements
              .filter((el: Element) => el.parent_id === parentId && el.tag === 'Panel')
              .sort((a: Element, b: Element) => (a.order_num || 0) - (b.order_num || 0));

            // 재정렬
            remainingTabs.forEach((tab: Element, index: number) => {
              tab.order_num = index + 1;
              tab.props.tabIndex = index;
            });

            remainingPanels.forEach((panel: Element, index: number) => {
              panel.order_num = index + 1;
              panel.props.tabIndex = index;
            });
          }

          // 히스토리 업데이트
          if (state.history.length > 0) {
            state.history = [
              ...state.history.slice(0, state.historyIndex + 1),
              {
                patches: [],
                inversePatches: [],
                snapshot: {
                  prev: prevState,
                  current: [...state.elements]
                }
              }
            ];
            state.historyIndex = state.history.length - 1;
          }
        })
      );

      // 재정렬된 데이터를 Supabase에 업데이트
      if (parentId) {
        try {
          const currentState = get();
          const remainingElements = currentState.elements
            .filter((el: Element) => el.parent_id === parentId && (el.tag === 'Tab' || el.tag === 'Panel'))
            .sort((a: Element, b: Element) => (a.order_num || 0) - (b.order_num || 0));

          for (const element of remainingElements) {
            try {
              await supabase
                .from('elements')
                .update({
                  order_num: element.order_num,
                  props: element.props
                })
                .eq('id', element.id);
            } catch (err) {
              console.error('요소 재정렬 업데이트 에러:', err);
            }
          }
        } catch (err) {
          console.error('재정렬 업데이트 중 오류:', err);
        }
      }
    } else {
      // 일반 요소 삭제
      try {
        const { error } = await supabase
          .from('elements')
          .delete()
          .eq('id', elementId);

        if (error) {
          console.error('요소 삭제 에러:', error);
          return;
        }
      } catch (err) {
        console.error('요소 삭제 중 오류:', err);
        return;
      }

      // 로컬 상태 업데이트
      set(
        produce((state) => {
          const prevState = [...state.elements];
          state.elements = state.elements.filter((el: Element) => el.id !== elementId);

          // 히스토리 업데이트
          if (state.history.length > 0) {
            state.history = [
              ...state.history.slice(0, state.historyIndex + 1),
              {
                patches: [],
                inversePatches: [],
                snapshot: {
                  prev: prevState,
                  current: [...state.elements]
                }
              }
            ];
            state.historyIndex = state.history.length - 1;
          }
        })
      );
    }
  },
  removeTabPair: (elementId: string) =>
    set(
      produce(async (state) => {
        const elementToRemove = state.elements.find((el: Element) => el.id === elementId);

        if (!elementToRemove || (elementToRemove.tag !== 'Tab' && elementToRemove.tag !== 'Panel')) {
          return;
        }

        const parentId = elementToRemove.parent_id;
        const tabIndex = elementToRemove.props.tabIndex;

        // 같은 parent_id와 tabIndex를 가진 반대편 요소 찾기
        const pairedElement = state.elements.find((el: Element) =>
          el.parent_id === parentId &&
          el.props.tabIndex === tabIndex &&
          el.tag !== elementToRemove.tag
        );

        // Supabase에서 두 요소 모두 삭제
        try {
          const idsToDelete = [elementId];
          if (pairedElement) {
            idsToDelete.push(pairedElement.id);
          }

          const { error } = await supabase
            .from('elements')
            .delete()
            .in('id', idsToDelete);

          if (error) {
            console.error('Tab/Panel 쌍 삭제 에러:', error);
            return;
          }
        } catch (err) {
          console.error('Tab/Panel 쌍 삭제 중 오류:', err);
          return;
        }

        // 로컬 상태에서 두 요소 모두 제거
        state.elements = state.elements.filter((el: Element) =>
          el.id !== elementId &&
          (pairedElement ? el.id !== pairedElement.id : true)
        );

        // 남은 Tab들의 order_num과 tabIndex 재정렬
        if (parentId) {
          const remainingTabs = state.elements
            .filter((el: Element) => el.parent_id === parentId && el.tag === 'Tab')
            .sort((a: Element, b: Element) => (a.order_num || 0) - (b.order_num || 0));

          const remainingPanels = state.elements
            .filter((el: Element) => el.parent_id === parentId && el.tag === 'Panel')
            .sort((a: Element, b: Element) => (a.props.tabIndex || 0) - (b.props.tabIndex || 0));

          // Tab 재정렬
          remainingTabs.forEach((tab: Element, index: number) => {
            tab.order_num = index + 1;
            tab.props.tabIndex = index;
          });

          // Panel 재정렬
          remainingPanels.forEach((panel: Element, index: number) => {
            panel.order_num = index + 1;
            panel.props.tabIndex = index;
          });
        }
      })
    ),
}));

// addElement, updateElementProps 등의 상태 변경 함수들에서 공통으로 사용할 히스토리 업데이트 로직
const updateHistory = (state: Store, prevState: Element[], currentState: Element[]) => {
  if (!state.currentPageId) return;

  const newHistoryEntry = {
    patches: [],
    inversePatches: [],
    snapshot: {
      prev: prevState.map(el => ({
        id: el.id,
        tag: el.tag,
        props: { ...el.props },
        parent_id: el.parent_id,
        page_id: el.page_id,
        order_num: el.order_num
      })),
      current: currentState.map(el => ({
        id: el.id,
        tag: el.tag,
        props: { ...el.props },
        parent_id: el.parent_id,
        page_id: el.page_id,
        order_num: el.order_num
      }))
    }
  };

  // 현재 페이지의 히스토리 업데이트
  const pageHistory = state.pageHistories[state.currentPageId] || {
    elements: [],
    history: [],
    historyIndex: -1
  };

  pageHistory.history = [
    ...pageHistory.history.slice(0, pageHistory.historyIndex + 1),
    newHistoryEntry
  ];
  pageHistory.historyIndex = pageHistory.history.length - 1;
  pageHistory.elements = currentState;

  state.history = pageHistory.history;
  state.historyIndex = pageHistory.historyIndex;
  state.pageHistories[state.currentPageId] = pageHistory;
};