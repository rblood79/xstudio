import { create } from "zustand";
import type { SelectedElement, EventHandler, DataBinding } from "../types";

interface InspectorState {
  selectedElement: SelectedElement | null;
  isSyncingToBuilder: boolean; // Inspector → Builder 동기화 중 플래그

  // 요소 선택
  setSelectedElement: (element: SelectedElement | null) => void;
  setSyncingToBuilder: (syncing: boolean) => void;

  // PropertiesSection - 속성 업데이트
  updateProperty: (key: string, value: unknown) => void;
  updateProperties: (properties: Record<string, unknown>) => void;

  // StyleSection - 스타일 업데이트
  updateSemanticClasses: (classes: string[]) => void;
  addSemanticClass: (className: string) => void;
  removeSemanticClass: (className: string) => void;
  updateCSSVariables: (variables: Record<string, string>) => void;
  updateCSSVariable: (key: string, value: string) => void;

  // DataSection - 데이터 바인딩 업데이트
  updateDataBinding: (binding: DataBinding | undefined) => void;

  // EventSection - 이벤트 업데이트
  updateEvents: (events: EventHandler[]) => void;
  addEvent: (event: EventHandler) => void;
  updateEvent: (id: string, event: EventHandler) => void;
  removeEvent: (id: string) => void;
}

export const useInspectorState = create<InspectorState>((set) => ({
  selectedElement: null,
  isSyncingToBuilder: false,

  setSelectedElement: (element) => set({ selectedElement: element }),
  setSyncingToBuilder: (syncing) => set({ isSyncingToBuilder: syncing }),

  // Properties
  updateProperty: (key, value) =>
    set((state) => {
      if (!state.selectedElement) return state;

      return {
        selectedElement: {
          ...state.selectedElement,
          properties: {
            ...state.selectedElement.properties,
            [key]: value,
          },
        },
      };
    }),

  updateProperties: (properties) =>
    set((state) => {
      if (!state.selectedElement) return state;

      return {
        isSyncingToBuilder: true, // 즉시 플래그 설정 (Builder → Inspector 동기화 차단)
        selectedElement: {
          ...state.selectedElement,
          properties: {
            ...state.selectedElement.properties,
            ...properties,
          },
        },
      };
    }),

  // Styles
  updateSemanticClasses: (classes) =>
    set((state) => {
      if (!state.selectedElement) return state;
      return {
        selectedElement: {
          ...state.selectedElement,
          semanticClasses: classes,
        },
      };
    }),

  addSemanticClass: (className) =>
    set((state) => {
      if (!state.selectedElement) return state;
      const currentClasses = state.selectedElement.semanticClasses || [];
      if (currentClasses.includes(className)) return state;
      return {
        selectedElement: {
          ...state.selectedElement,
          semanticClasses: [...currentClasses, className],
        },
      };
    }),

  removeSemanticClass: (className) =>
    set((state) => {
      if (!state.selectedElement) return state;
      const currentClasses = state.selectedElement.semanticClasses || [];
      return {
        selectedElement: {
          ...state.selectedElement,
          semanticClasses: currentClasses.filter((c) => c !== className),
        },
      };
    }),

  updateCSSVariables: (variables) =>
    set((state) => {
      if (!state.selectedElement) return state;
      return {
        selectedElement: {
          ...state.selectedElement,
          cssVariables: variables,
        },
      };
    }),

  updateCSSVariable: (key, value) =>
    set((state) => {
      if (!state.selectedElement) return state;
      return {
        selectedElement: {
          ...state.selectedElement,
          cssVariables: {
            ...(state.selectedElement.cssVariables || {}),
            [key]: value,
          },
        },
      };
    }),

  // Data Binding
  updateDataBinding: (binding) =>
    set((state) => {
      if (!state.selectedElement) return state;

      console.log("📊 updateDataBinding 호출:", {
        elementId: state.selectedElement.id,
        elementType: state.selectedElement.type,
        oldBinding: state.selectedElement.dataBinding,
        newBinding: binding,
      });

      return {
        isSyncingToBuilder: true, // 플래그 설정하여 역동기화 차단
        selectedElement: {
          ...state.selectedElement,
          dataBinding: binding,
        },
      };
    }),

  // Events
  updateEvents: (events) =>
    set((state) => {
      if (!state.selectedElement) return state;
      return {
        selectedElement: {
          ...state.selectedElement,
          events,
        },
      };
    }),

  addEvent: (event) =>
    set((state) => {
      if (!state.selectedElement) return state;
      const currentEvents = state.selectedElement.events || [];
      return {
        selectedElement: {
          ...state.selectedElement,
          events: [...currentEvents, event],
        },
      };
    }),

  updateEvent: (id, event) =>
    set((state) => {
      if (!state.selectedElement) return state;
      const currentEvents = state.selectedElement.events || [];
      return {
        selectedElement: {
          ...state.selectedElement,
          events: currentEvents.map((e) => (e.id === id ? event : e)),
        },
      };
    }),

  removeEvent: (id) =>
    set((state) => {
      if (!state.selectedElement) return state;
      const currentEvents = state.selectedElement.events || [];
      return {
        selectedElement: {
          ...state.selectedElement,
          events: currentEvents.filter((e) => e.id !== id),
        },
      };
    }),
}));
