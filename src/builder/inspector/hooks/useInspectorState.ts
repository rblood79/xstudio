import { create } from "zustand";
import type { SelectedElement, EventHandler, DataBinding } from "../types";

interface InspectorState {
  selectedElement: SelectedElement | null;
  isSyncingToBuilder: boolean; // Inspector → Builder 동기화 중 플래그
  isUpdatingFromBuilder: boolean; // Builder → Inspector 동기화 중 플래그 (useSyncWithBuilder 스킵용)
  syncVersion: number; // 동기화 버전 (Inspector → Builder 업데이트 추적)

  // 요소 선택
  setSelectedElement: (element: SelectedElement | null) => void;
  setSyncingToBuilder: (syncing: boolean) => void;
  setUpdatingFromBuilder: (updating: boolean) => void;
  incrementSyncVersion: () => number; // 버전 증가 및 반환
  confirmSync: (version: number) => void; // Builder 업데이트 완료 확인

  // CustomId 업데이트
  updateCustomId: (customId: string) => void;

  // PropertiesSection - 속성 업데이트
  updateProperty: (key: string, value: unknown) => void;
  updateProperties: (properties: Record<string, unknown>) => void;

  // StyleSection - 스타일 업데이트
  updateSemanticClasses: (classes: string[]) => void;
  addSemanticClass: (className: string) => void;
  removeSemanticClass: (className: string) => void;
  updateCSSVariables: (variables: Record<string, string>) => void;
  updateCSSVariable: (key: string, value: string) => void;

  // Inline Style 업데이트
  updateInlineStyle: (property: string, value: string) => void;
  updateInlineStyles: (styles: Record<string, string>) => void;

  // DataSection - 데이터 바인딩 업데이트
  updateDataBinding: (binding: DataBinding | undefined) => void;

  // EventSection - 이벤트 업데이트
  updateEvents: (events: EventHandler[]) => void;
  addEvent: (event: EventHandler) => void;
  updateEvent: (id: string, event: EventHandler) => void;
  removeEvent: (id: string) => void;

  // ⭐ Computed Style 업데이트 (Option C: 지연 도착 처리)
  updateSelectedElementComputedStyle: (computedStyle: Record<string, string>) => void;
}

export const useInspectorState = create<InspectorState>((set, get) => ({
  selectedElement: null,
  isSyncingToBuilder: false,
  isUpdatingFromBuilder: false,
  syncVersion: 0,

  setSelectedElement: (element) => set({ selectedElement: element }),
  setSyncingToBuilder: (syncing) => set({ isSyncingToBuilder: syncing }),
  setUpdatingFromBuilder: (updating) => set({ isUpdatingFromBuilder: updating }),

  incrementSyncVersion: () => {
    const newVersion = get().syncVersion + 1;
    set({ syncVersion: newVersion, isSyncingToBuilder: true });
    return newVersion;
  },

  confirmSync: (version) => {
    const currentVersion = get().syncVersion;
    // 확인하려는 버전이 현재 버전과 같으면 동기화 완료
    if (version === currentVersion) {
      set({ isSyncingToBuilder: false });
    }
    // 다른 버전이면 새로운 변경사항이 있으므로 플래그 유지
  },

  // CustomId
  updateCustomId: (customId) => {
    const version = get().incrementSyncVersion();
    console.log("🔖 updateCustomId 호출 (v" + version + "):", {
      elementId: get().selectedElement?.id,
      customId,
    });

    set((state) => {
      if (!state.selectedElement) return state;
      return {
        selectedElement: {
          ...state.selectedElement,
          customId,
        },
      };
    });
  },

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

  updateProperties: (properties) => {
    const version = get().incrementSyncVersion();
    console.log("📝 updateProperties 호출 (v" + version + ")");

    set((state) => {
      if (!state.selectedElement) return state;
      return {
        selectedElement: {
          ...state.selectedElement,
          properties: {
            ...state.selectedElement.properties,
            ...properties,
          },
        },
      };
    });
  },

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

  // Inline Styles
  updateInlineStyle: (property, value) => {
    const version = get().incrementSyncVersion();
    console.log("🎨 updateInlineStyle 호출 (v" + version + "):", { property, value });

    set((state) => {
      if (!state.selectedElement) return state;

      const currentStyle = { ...(state.selectedElement.style || {}) } as Record<string, string | number>;

      // 빈 문자열이면 해당 속성 제거 (class 스타일로 폴백)
      if (value === "" || value === null || value === undefined) {
        delete currentStyle[property];
      } else {
        currentStyle[property] = value;
      }

      return {
        selectedElement: {
          ...state.selectedElement,
          style: currentStyle,
        },
      };
    });
  },

  updateInlineStyles: (styles) => {
    const version = get().incrementSyncVersion();
    console.log("🎨 updateInlineStyles 호출 (v" + version + "):", styles);

    set((state) => {
      if (!state.selectedElement) return state;

      const currentStyle = { ...(state.selectedElement.style || {}) } as Record<string, string | number>;

      // 각 속성에 대해 빈 문자열이면 제거, 아니면 추가
      Object.entries(styles).forEach(([property, value]) => {
        if (value === "" || value === null || value === undefined) {
          delete currentStyle[property];
        } else {
          currentStyle[property] = value;
        }
      });

      return {
        selectedElement: {
          ...state.selectedElement,
          style: currentStyle,
        },
      };
    });
  },

  // Data Binding
  updateDataBinding: (binding) => {
    const version = get().incrementSyncVersion();
    console.log("📊 updateDataBinding 호출 (v" + version + "):", {
      elementId: get().selectedElement?.id,
      elementType: get().selectedElement?.type,
      newBinding: binding,
    });

    set((state) => {
      if (!state.selectedElement) return state;
      return {
        selectedElement: {
          ...state.selectedElement,
          dataBinding: binding,
        },
      };
    });
  },

  // Events
  updateEvents: (events) => {
    const version = get().incrementSyncVersion();
    console.log("⚡ updateEvents 호출 (v" + version + "):", {
      elementId: get().selectedElement?.id,
      eventCount: events.length,
    });

    set((state) => {
      if (!state.selectedElement) return state;
      return {
        selectedElement: {
          ...state.selectedElement,
          events,
        },
      };
    });
  },

  addEvent: (event) => {
    const version = get().incrementSyncVersion();
    console.log("➕ addEvent 호출 (v" + version + "):", {
      elementId: get().selectedElement?.id,
      eventId: event.id,
      eventType: event.event,
    });

    set((state) => {
      if (!state.selectedElement) return state;
      const currentEvents = state.selectedElement.events || [];
      return {
        selectedElement: {
          ...state.selectedElement,
          events: [...currentEvents, event],
        },
      };
    });
  },

  updateEvent: (id, event) => {
    const version = get().incrementSyncVersion();
    console.log("📝 updateEvent 호출 (v" + version + "):", {
      elementId: get().selectedElement?.id,
      eventId: id,
      eventType: event.event,
      actionCount: event.actions.length,
    });

    set((state) => {
      if (!state.selectedElement) return state;
      const currentEvents = state.selectedElement.events || [];
      return {
        selectedElement: {
          ...state.selectedElement,
          events: currentEvents.map((e) => (e.id === id ? event : e)),
        },
      };
    });
  },

  removeEvent: (id) => {
    const version = get().incrementSyncVersion();
    console.log("🗑️ removeEvent 호출 (v" + version + "):", {
      elementId: get().selectedElement?.id,
      eventId: id,
    });

    set((state) => {
      if (!state.selectedElement) return state;
      const currentEvents = state.selectedElement.events || [];
      return {
        selectedElement: {
          ...state.selectedElement,
          events: currentEvents.filter((e) => e.id !== id),
        },
      };
    });
  },

  // ⭐ Option C: computedStyle 지연 업데이트 (syncVersion 증가 없음)
  // 오버레이 표시 후 Preview에서 비동기로 도착하는 computedStyle 처리
  // 🚀 Phase 21: 값이 같으면 업데이트 스킵 (불필요한 리렌더링 방지)
  updateSelectedElementComputedStyle: (computedStyle) => {
    set((state) => {
      if (!state.selectedElement) return state;

      // 🚀 Phase 21: 기존 computedStyle과 동일하면 업데이트 스킵
      const prevComputedStyle = state.selectedElement.computedStyle;
      if (prevComputedStyle) {
        const prevKeys = Object.keys(prevComputedStyle);
        const newKeys = Object.keys(computedStyle);
        if (prevKeys.length === newKeys.length) {
          const isSame = prevKeys.every(
            (key) => prevComputedStyle[key] === computedStyle[key]
          );
          if (isSame) return state; // 변경 없음
        }
      }

      return {
        selectedElement: {
          ...state.selectedElement,
          computedStyle,
        },
      };
    });
  },
}));
