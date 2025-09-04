import { create } from 'zustand';
import { produce, Patch, enablePatches } from 'immer';
import { ElementProps } from '../../types/supabase';

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
  updateElementProps: (elementId: string, props: ElementProps) => void;
  setSelectedElement: (elementId: string | null, props?: ElementProps) => void;
  selectTabElement: (elementId: string, props: ElementProps, tabIndex: number) => void;
  setPages: (pages: Page[]) => void;
  setCurrentPageId: (pageId: string) => void;
  undo: () => void;
  redo: () => void;
  removeElement: (elementId: string) => void;
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
  updateElementProps: (elementId, props) =>
    set(
      produce((state) => {
        const element = state.elements.find((el: Element) => el.id === elementId);
        if (!element) return;

        let hasChanges = false;
        const newProps = { ...element.props, ...props }; // 변경될 새로운 props

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

        // selectedElementProps 업데이트 로직 수정
        if (state.selectedElementId === elementId) {
          // 현재 selectedElementProps와 새로 업데이트될 props를 비교
          let selectedPropsChanged = false;
          if (Object.keys(state.selectedElementProps).length !== Object.keys(newProps).length) {
            selectedPropsChanged = true;
          } else {
            for (const key in newProps) {
              if (JSON.stringify(state.selectedElementProps[key]) !== JSON.stringify(newProps[key])) {
                selectedPropsChanged = true;
                break;
              }
            }
          }
          if (selectedPropsChanged) {
            state.selectedElementProps = newProps; // 실제 변경이 있을 때만 새 객체 생성
          }
        }

        if (hasChanges) {
          const prevState = state.elements.map((el: Element) => ({
            ...el,
            props: { ...el.props }
          }));

          element.props = newProps; // 이전에 계산된 newProps 사용
          updateHistory(state, prevState, state.elements.map((el: Element) => ({
            ...el,
            props: { ...el.props }
          })));
        } else {
          // 실제 변경이 없더라도 props를 적용 (예: 불필요한 키 제거 방지)
          element.props = newProps;
        }
      })
    ),
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
  removeElement: (elementId: string) =>
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

        // postMessage로 변경사항 알림
        try {
          window.postMessage({
            type: "UPDATE_ELEMENTS",
            elements: state.elements.map(sanitizeElement)
          }, window.location.origin);
        } catch (error) {
          console.error("Failed to send message:", error);
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