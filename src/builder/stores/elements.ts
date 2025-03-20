import { atom, map } from 'nanostores';
//import type { ReactNode } from 'react';

// Element Interface
export interface Element {
  id: string;
  tag: string;
  props: { [key: string]: string | number | boolean | React.CSSProperties };
  parent_id?: string | null;
  page_id?: string;
}

// Stores
export const elementsStore = atom<Element[]>([]);
export const selectedElementIdStore = atom<string | null>(null);
export const selectedElementPropsStore = map<Record<string, string | number | boolean | React.CSSProperties>>({});

// Utility functions
export const setElements = (elements: Element[]) => {
  elementsStore.set(elements);
};

export const addElement = (element: Element) => {
  elementsStore.set([...elementsStore.get(), element]);
};

export const updateElementProps = (elementId: string, props: Record<string, string | number | boolean | React.CSSProperties>) => {
  const elements = elementsStore.get();
  const updatedElements = elements.map(el => 
    el.id === elementId ? { ...el, props: { ...el.props, ...props } } : el
  );
  elementsStore.set(updatedElements);
  if (selectedElementIdStore.get() === elementId) {
    selectedElementPropsStore.set({ ...props });
  }
};

export const setSelectedElement = (elementId: string | null, props?: Record<string, string | number | boolean | React.CSSProperties>) => {
  selectedElementIdStore.set(elementId);
  if (elementId && props) {
    selectedElementPropsStore.set({ ...props });
  } else {
    selectedElementPropsStore.set({});
  }
};