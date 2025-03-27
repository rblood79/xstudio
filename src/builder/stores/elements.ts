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

interface Store {
  elements: Element[];
  selectedElementId: string | null;
  selectedElementProps: Record<string, string | number | boolean | React.CSSProperties>;
  pages: Page[];
  history: { patches: Patch[]; inversePatches: Patch[]; snapshot?: { prev: Element[]; current: Element[] } }[]; // 패치 히스토리
  historyIndex: number;
  setElements: (elements: Element[]) => void;
  loadPageElements: (elements: Element[]) => void;
  addElement: (element: Element) => void;
  updateElementProps: (elementId: string, props: Record<string, string | number | boolean | React.CSSProperties>) => void;
  setSelectedElement: (elementId: string | null, props?: Record<string, string | number | boolean | React.CSSProperties>) => void;
  setPages: (pages: Page[]) => void;
  undo: () => void;
  redo: () => void;
}

export const useStore = create<Store>((set) => ({
  elements: [],
  selectedElementId: null,
  selectedElementProps: {},
  pages: [],
  history: [], // 초기 상태
  historyIndex: -1,
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
  loadPageElements: (elements) =>
    set(
      produce((state) => {
        // 상태를 완전히 초기화
        state.elements = Array.isArray(elements) ? [...elements] : [];
        state.selectedElementId = null;
        state.selectedElementProps = {};
        state.history = [];
        state.historyIndex = -1;

        // 이벤트 발생: elements가 비어있거나 있을 때 모두 처리
        //console.log("Sending UPDATE_ELEMENTS event with elements:", state.elements);
        window.postMessage({ type: "UPDATE_ELEMENTS", elements: state.elements }, window.location.origin);
      })
    ),
  addElement: (element) =>
    set(
      produce((state) => {
        // 현재 상태의 스냅샷 저장
        const prevState = [...state.elements];

        // 요소 추가
        state.elements.push(element);

        // 히스토리에 변경사항 추가
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
      })
    ),
  updateElementProps: (elementId, props) =>
    set(
      produce((state) => {
        const element = state.elements.find((el: Element) => el.id === elementId);
        if (!element) return;

        // 변경 전 속성과 변경할 속성이 같은지 비교
        let hasChanges = false;
        Object.keys(props).forEach(key => {
          if (JSON.stringify(element.props[key]) !== JSON.stringify(props[key])) {
            hasChanges = true;
          }
        });

        // 변경사항이 있을 때만 히스토리 업데이트
        if (hasChanges) {
          const prevState = state.elements.map((el: Element) => ({
            ...el,
            props: { ...el.props }
          }));

          // props 업데이트
          element.props = { ...element.props, ...props };

          // 히스토리 업데이트
          state.history = [
            ...state.history.slice(0, state.historyIndex + 1),
            {
              patches: [],
              inversePatches: [],
              snapshot: {
                prev: prevState,
                current: state.elements.map((el: Element) => ({
                  ...el,
                  props: { ...el.props }
                }))
              }
            }
          ];
          state.historyIndex = state.history.length - 1;
        } else {
          // 변경사항이 없어도 props는 업데이트
          element.props = { ...element.props, ...props };
        }

        // 선택된 요소의 props는 항상 업데이트
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
  undo: () =>
    set(
      produce((state) => {
        if (state.historyIndex >= 0) {
          const currentHistory = state.history[state.historyIndex];
          if (currentHistory.snapshot) {
            state.elements = [...currentHistory.snapshot.prev];
          }
          state.historyIndex -= 1;

          // 선택된 요소 상태 업데이트
          const selectedElement = state.elements.find((el: Element) => el.id === state.selectedElementId);
          state.selectedElementProps = selectedElement ? { ...selectedElement.props } : {};
        }
      })
    ),
  redo: () =>
    set(
      produce((state) => {
        if (state.historyIndex < state.history.length - 1) {
          state.historyIndex += 1;
          const currentHistory = state.history[state.historyIndex];
          if (currentHistory.snapshot) {
            state.elements = [...currentHistory.snapshot.current];
          }

          // 선택된 요소 상태 업데이트
          const selectedElement = state.elements.find((el: Element) => el.id === state.selectedElementId);
          state.selectedElementProps = selectedElement ? { ...selectedElement.props } : {};
        }
      })
    ),
}));