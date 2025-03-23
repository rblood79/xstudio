// src/builder/stores/elements.ts
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
  setElements: (elements: Element[]) => void;
  addElement: (element: Element) => void;
  updateElementProps: (elementId: string, props: Record<string, string | number | boolean | React.CSSProperties>) => void;
  setSelectedElement: (elementId: string | null, props?: Record<string, string | number | boolean | React.CSSProperties>) => void;
  setPages: (pages: Page[]) => void;
}

export const useStore = create<Store>((set) => ({
  elements: [],
  selectedElementId: null,
  selectedElementProps: {},
  pages: [],
  setElements: (elements) =>
    set(
      produce((state) => {
        state.elements = elements;
      })
    ),
  addElement: (element) =>
    set(
      produce((state) => {
        state.elements.push(element);
      })
    ),
  updateElementProps: (elementId, props) =>
    set(
      produce((state) => {
        const element: Element | undefined = state.elements.find((el: Element) => el.id === elementId);
        if (element) {
          element.props = { ...element.props, ...props };
          if (state.selectedElementId === elementId) {
            state.selectedElementProps = { ...element.props };
          }
        }
      })
    ),
  setSelectedElement: (elementId, props) =>
    set(
      produce((state) => {
        state.selectedElementId = elementId;
        if (elementId && props) {
          state.selectedElementProps = { ...props };
          const element: Element | undefined = state.elements.find((el: Element) => el.id === elementId);
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
}));