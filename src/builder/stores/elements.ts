import { create } from 'zustand';
import { produce, Patch, enablePatches } from 'immer';

enablePatches();

export interface Element {
  id: string;
  tag: string;
  props: { [key: string]: string | number | boolean | React.CSSProperties };
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
  selectedElementProps: Record<string, string | number | boolean | React.CSSProperties>;
  pages: Page[];
  history: { patches: Patch[]; inversePatches: Patch[]; snapshot?: { prev: Element[]; current: Element[] } }[]; // 패치 히스토리
  historyIndex: number;
  pageHistories: Record<string, PageHistory>;  // 페이지별 히스토리 관리
  currentPageId: string | null;
  setElements: (elements: Element[]) => void;
  loadPageElements: (elements: Element[], pageId: string) => void;
  addElement: (element: Element) => void;
  updateElementProps: (elementId: string, props: Record<string, string | number | boolean | React.CSSProperties>) => void;
  setSelectedElement: (elementId: string | null, props?: Record<string, string | number | boolean | React.CSSProperties>) => void;
  setPages: (pages: Page[]) => void;
  setCurrentPageId: (pageId: string) => void;
  undo: () => void;
  redo: () => void;
}

const sanitizeElement = (el: Element) => ({
  id: el.id,
  tag: el.tag,
  props: JSON.parse(JSON.stringify(el.props)), // Deep clone to remove non-serializable values
  parent_id: el.parent_id,
  page_id: el.page_id,
  order_num: el.order_num
});

export const useStore = create<Store>((set, get) => ({
  elements: [],
  selectedElementId: null,
  selectedElementProps: {},
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
          history: [{
            patches: [],
            inversePatches: [],
            snapshot: {
              prev: [],
              current: newElements
            }
          }],
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
        Object.keys(props).forEach(key => {
          if (JSON.stringify(element.props[key]) !== JSON.stringify(props[key])) {
            hasChanges = true;
          }
        });

        if (hasChanges) {
          const prevState = state.elements.map((el: Element) => ({
            ...el,
            props: { ...el.props }
          }));

          element.props = { ...element.props, ...props };
          updateHistory(state, prevState, state.elements.map((el: Element) => ({
            ...el,
            props: { ...el.props }
          })));
        } else {
          element.props = { ...element.props, ...props };
        }

        if (state.selectedElementId === elementId) {
          state.selectedElementProps = { ...element.props };
        }
      })
    ),
  setSelectedElement: (elementId, props) =>
    set((state) => ({
      ...state,
      selectedElementId: elementId,
      selectedElementProps: elementId && props ? { ...props } : {}
    })),
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