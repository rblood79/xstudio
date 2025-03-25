import { create } from 'zustand';
import { produce, produceWithPatches, Patch, applyPatches, enablePatches, WritableDraft } from 'immer';

enablePatches();

export interface Element {
  id: string;
  tag: string;
  props: { [key: string]: string | number | boolean | React.CSSProperties };
  parent_id?: string | null;
  page_id?: string;
}

interface Page {
  id: string;
  title: string;
  project_id: string;
  slug: string;
}

interface Store {
  elements: Element[];
  selectedElementId: string | null;
  selectedElementProps: Record<string, string | number | boolean | React.CSSProperties>;
  pages: Page[];
  history: { patches: Patch[]; inversePatches: Patch[] }[]; // 패치 히스토리
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
        const result = produceWithPatches(state, (draft: WritableDraft<Store>) => {
          draft.elements = elements;
        }) as unknown as [Store, Patch[], Patch[]];
        const [nextState, patches, inversePatches] = result;
        
        Object.assign(state, nextState);
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push({ patches, inversePatches });
        state.history = newHistory;
        state.historyIndex = newHistory.length - 1;
      })
    ),
  loadPageElements: (elements) =>
    set(
      produce((state) => {
        state.elements = elements;
      })
    ),
  addElement: (element) =>
    set(
      produce((state) => {
        state.elements.push(element);
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push({ patches: [], inversePatches: [] });
        state.history = newHistory;
        state.historyIndex = newHistory.length - 1;
      })
    ),
  updateElementProps: (elementId, props) =>
    set(
      produce((state) => {
        // 현재 요소 찾기
        const element = state.elements.find((el: Element) => el.id === elementId);
        if (!element) return;

        // 변경 전 속성과 변경할 속성이 같은지 비교하기 위한 함수
        const isEqual = (obj1: unknown, obj2: unknown): boolean => {
          if (obj1 === obj2) return true;
          
          // 객체가 아닌 경우 단순 비교
          if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
            return obj1 === obj2;
          }
          
          const keys1 = Object.keys(obj1 as object);
          const keys2 = Object.keys(obj2 as object);
          
          if (keys1.length !== keys2.length) return false;
          
          return keys1.every(key => {
            if (!keys2.includes(key)) return false;
            return isEqual((obj1 as Record<string, unknown>)[key], (obj2 as Record<string, unknown>)[key]);
          });
        };

        // 변경될 속성 생성
        const updatedProps = { ...element.props };
        let hasChanges = false;
        
        // 각 속성별로 변경 여부 확인
        Object.keys(props).forEach(key => {
          if (!isEqual(updatedProps[key], props[key])) {
            updatedProps[key] = props[key];
            hasChanges = true;
          }
        });

        // 변경된 부분이 없으면 history에 저장하지 않음
        if (!hasChanges) return;

        // 변경 사항이 있는 경우에만 patches 생성 및 history 저장
        const result = produceWithPatches(state, (draft: WritableDraft<Store>) => {
          const elementToUpdate = draft.elements.find((el: Element) => el.id === elementId);
          if (elementToUpdate) {
            elementToUpdate.props = updatedProps;
            if (draft.selectedElementId === elementId) {
              draft.selectedElementProps = { ...updatedProps };
            }
          }
        }) as unknown as [Store, Patch[], Patch[]];
        
        const [nextState, patches, inversePatches] = result;

        // 패치가 비어있지 않은 경우에만 히스토리에 추가
        if (patches.length > 0) {
          Object.assign(state, nextState);
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push({ patches, inversePatches });
          state.history = newHistory;
          state.historyIndex = newHistory.length - 1;
        } else {
          // 실제 변경이 없는 경우 상태만 업데이트
          Object.assign(state, nextState);
        }
      })
    ),
  setSelectedElement: (elementId, props) =>
    set(
      produce((state) => {
        state.selectedElementId = elementId;
        if (elementId && props) {
          state.selectedElementProps = { ...props };
          const element = state.elements.find((el: Element) => el.id === elementId);
          if (element) element.props = { ...element.props, ...props };
        } else {
          state.selectedElementProps = {};
        }
      })
    ),
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
          const { inversePatches } = state.history[state.historyIndex];
          applyPatches(state, inversePatches);
          state.historyIndex -= 1;
          
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
          const { patches } = state.history[state.historyIndex];
          applyPatches(state, patches);
          
          const selectedElement = state.elements.find((el: Element) => el.id === state.selectedElementId);
          state.selectedElementProps = selectedElement ? { ...selectedElement.props } : {};
        }
      })
    ),
}));