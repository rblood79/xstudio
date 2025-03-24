import { create } from 'zustand';
import { produce } from 'immer';

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
  history: Element[][]; // 이력 배열
  historyIndex: number; // 현재 이력 위치
  setElements: (elements: Element[]) => void;
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
  history: [[]], // 초기 상태
  historyIndex: 0,
  setElements: (elements) =>
    set(
      produce((state) => {
        state.elements = elements;
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(elements);
        state.history = newHistory;
        state.historyIndex = newHistory.length - 1;
      })
    ),
  addElement: (element) =>
    set(
      produce((state) => {
        state.elements.push(element);
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push([...state.elements]);
        state.history = newHistory;
        state.historyIndex = newHistory.length - 1;
      })
    ),
  updateElementProps: (elementId, props) =>
    set(
      produce((state) => {
        const element = state.elements.find((el: Element) => el.id === elementId);
        if (element) {
          element.props = { ...element.props, ...props };
          if (state.selectedElementId === elementId) {
            state.selectedElementProps = { ...element.props };
          }
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push([...state.elements]);
          state.history = newHistory;
          state.historyIndex = newHistory.length - 1;
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
        if (state.historyIndex > 0) {
          state.historyIndex -= 1;
          state.elements = state.history[state.historyIndex];
            const selectedElement: Element | undefined = state.elements.find((el: Element) => el.id === state.selectedElementId);
          state.selectedElementProps = selectedElement ? { ...selectedElement.props } : {};
        }
      })
    ),
  redo: () =>
    set(
      produce((state) => {
        if (state.historyIndex < state.history.length - 1) {
          state.historyIndex += 1;
          state.elements = state.history[state.historyIndex];
            const selectedElement: Element | undefined = state.elements.find((el: Element) => el.id === state.selectedElementId);
          state.selectedElementProps = selectedElement ? { ...selectedElement.props } : {};
        }
      })
    ),
}));