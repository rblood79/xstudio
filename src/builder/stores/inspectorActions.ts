/**
 * Inspector Actions Slice
 *
 * Single Source of Truth: Inspector Store 제거 후 Builder Store에서 직접 관리
 *
 * 기존 Inspector Store의 액션들을 Builder Store로 통합:
 * - updateInlineStyle, updateInlineStyles
 * - updateProperty, updateProperties
 * - updateCustomId
 * - updateDataBinding
 * - updateEvents, addEvent, updateEvent, removeEvent
 */

import { StateCreator } from "zustand";
import type { Element, ComponentElementProps } from "../../types/core/store.types";
import type { SelectedElement, DataBinding, EventHandler } from "../inspector/types";
import { saveService } from "../../services/save";

// ============================================
// Types
// ============================================

export interface InspectorActionsState {
  // Selected element in SelectedElement format (derived from elementsMap)
  // Note: This is computed from selectedElementId + elementsMap, not stored separately

  // Actions for updating selected element
  updateSelectedStyle: (property: string, value: string) => void;
  updateSelectedStyles: (styles: Record<string, string>) => void;
  updateSelectedProperty: (key: string, value: unknown) => void;
  updateSelectedProperties: (properties: Record<string, unknown>) => void;
  updateSelectedCustomId: (customId: string) => void;
  updateSelectedDataBinding: (dataBinding: DataBinding | undefined) => void;
  updateSelectedEvents: (events: EventHandler[]) => void;
  addSelectedEvent: (event: EventHandler) => void;
  updateSelectedEvent: (id: string, event: EventHandler) => void;
  removeSelectedEvent: (id: string) => void;
  // ComputedStyle은 DB 저장 없이 메모리만 업데이트 (런타임 값)
  updateSelectedComputedStyle: (computedStyle: Record<string, string>) => void;
}

// Required state from other slices
interface RequiredState {
  selectedElementId: string | null;
  elementsMap: Map<string, Element>;
  elements: Element[];
  updateElement: (elementId: string, updates: Partial<Element>) => Promise<void>;
  _rebuildIndexes: () => void;
}

type CombinedState = InspectorActionsState & RequiredState;

// ============================================
// Slice Creator
// ============================================

export const createInspectorActionsSlice: StateCreator<
  CombinedState,
  [],
  [],
  InspectorActionsState
> = (set, get) => {
  /**
   * Helper: Get current selected element
   */
  const getSelectedElement = (): Element | null => {
    const { selectedElementId, elementsMap } = get();
    if (!selectedElementId) return null;
    return elementsMap.get(selectedElementId) || null;
  };

  /**
   * Helper: Update element and save to DB
   *
   * 🚀 Performance Optimization:
   * - elementsMap 직접 업데이트 (O(1))
   * - props/style 변경 시 _rebuildIndexes 스킵 (구조 변경 없음)
   * - 단일 set() 호출로 배칭
   */
  const updateAndSave = async (
    elementId: string,
    propsUpdate: Partial<ComponentElementProps>,
    additionalUpdates?: Partial<Element>
  ) => {
    const { elementsMap, elements, selectedElementId } = get();
    const element = elementsMap.get(elementId);
    if (!element) return;

    const newProps = {
      ...element.props,
      ...propsUpdate,
    };

    const updatedElement: Element = {
      ...element,
      props: newProps,
      ...additionalUpdates,
    };

    // 🚀 O(1) Map 업데이트 (새 Map 생성으로 불변성 유지)
    const newElementsMap = new Map(elementsMap);
    newElementsMap.set(elementId, updatedElement);

    // 🚀 elements 배열도 업데이트 (findIndex로 위치 찾아서 직접 교체)
    const elementIndex = elements.findIndex((el) => el.id === elementId);
    let newElements = elements;
    if (elementIndex !== -1) {
      newElements = [...elements];
      newElements[elementIndex] = updatedElement;
    }

    // 🚀 단일 set() 호출 - 배칭으로 리렌더링 최소화
    const stateUpdate: Partial<CombinedState> = {
      elements: newElements,
      elementsMap: newElementsMap,
    };

    // selectedElementProps 동시 업데이트
    if (selectedElementId === elementId) {
      (stateUpdate as Record<string, unknown>).selectedElementProps = newProps;
    }

    set(stateUpdate);

    // ⚠️ 구조 변경(parent_id, 추가/삭제) 시에만 인덱스 재구축
    // props/style 변경은 구조 변경이 아니므로 스킵
    // (childrenMap, pageIndex는 parent_id 기반이므로 영향 없음)

    // DB 저장 (비동기, idle callback)
    const runDbSync = async () => {
      try {
        const payload: Record<string, unknown> = { props: newProps };

        if (additionalUpdates?.customId !== undefined) {
          payload.custom_id = additionalUpdates.customId;
        }
        if (additionalUpdates?.dataBinding !== undefined) {
          payload.data_binding = additionalUpdates.dataBinding;
        }

        await saveService.savePropertyChange(
          {
            table: "elements",
            id: elementId,
            data: payload,
          },
          {
            source: "inspector",
            allowPreviewSaves: true,
            validateSerialization: true,
          }
        );
      } catch (error) {
        console.error("❌ Inspector action DB save failed:", error);
      }
    };

    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(() => runDbSync(), { timeout: 16 });
    } else {
      setTimeout(() => runDbSync(), 0);
    }
  };

  return {
    // ============================================
    // Style Actions
    // ============================================

    updateSelectedStyle: (property, value) => {
      const element = getSelectedElement();
      if (!element) return;

      const currentStyle = { ...((element.props?.style as Record<string, string>) || {}) };

      if (value === "" || value === null || value === undefined) {
        delete currentStyle[property];
      } else {
        currentStyle[property] = value;
      }

      updateAndSave(element.id, { style: currentStyle });
    },

    updateSelectedStyles: (styles) => {
      const element = getSelectedElement();
      if (!element) return;

      const currentStyle = { ...((element.props?.style as Record<string, string>) || {}) };

      Object.entries(styles).forEach(([property, value]) => {
        if (value === "" || value === null || value === undefined) {
          delete currentStyle[property];
        } else {
          currentStyle[property] = value;
        }
      });

      updateAndSave(element.id, { style: currentStyle });
    },

    // ============================================
    // Property Actions
    // ============================================

    updateSelectedProperty: (key, value) => {
      const element = getSelectedElement();
      if (!element) return;

      updateAndSave(element.id, { [key]: value });
    },

    updateSelectedProperties: (properties) => {
      const element = getSelectedElement();
      if (!element) return;

      updateAndSave(element.id, properties);
    },

    // ============================================
    // CustomId Action
    // ============================================

    updateSelectedCustomId: (customId) => {
      const element = getSelectedElement();
      if (!element) return;

      updateAndSave(element.id, {}, { customId });
    },

    // ============================================
    // DataBinding Action
    // ============================================

    updateSelectedDataBinding: (dataBinding) => {
      const element = getSelectedElement();
      if (!element) return;

      updateAndSave(element.id, {}, { dataBinding: dataBinding as Element["dataBinding"] });
    },

    // ============================================
    // Event Actions
    // ============================================

    updateSelectedEvents: (events) => {
      const element = getSelectedElement();
      if (!element) return;

      updateAndSave(element.id, { events });
    },

    addSelectedEvent: (event) => {
      const element = getSelectedElement();
      if (!element) return;

      const currentEvents = ((element.props?.events as EventHandler[]) || []);
      updateAndSave(element.id, { events: [...currentEvents, event] });
    },

    updateSelectedEvent: (id, event) => {
      const element = getSelectedElement();
      if (!element) return;

      const currentEvents = ((element.props?.events as EventHandler[]) || []);
      const updatedEvents = currentEvents.map((e) => (e.id === id ? event : e));
      updateAndSave(element.id, { events: updatedEvents });
    },

    removeSelectedEvent: (id) => {
      const element = getSelectedElement();
      if (!element) return;

      const currentEvents = ((element.props?.events as EventHandler[]) || []);
      const updatedEvents = currentEvents.filter((e) => e.id !== id);
      updateAndSave(element.id, { events: updatedEvents });
    },

    // ============================================
    // ComputedStyle Action (메모리만, DB 저장 없음)
    // ============================================

    updateSelectedComputedStyle: (computedStyle) => {
      const { selectedElementId } = get();
      if (!selectedElementId) return;

      // selectedElementProps만 업데이트 (UI 반영)
      // DB 저장 없음 - computedStyle은 런타임 값
      const currentState = get() as CombinedState & { selectedElementProps: ComponentElementProps };
      const currentProps = currentState.selectedElementProps || {};

      // 변경 없으면 스킵
      const prevComputedStyle = currentProps.computedStyle as Record<string, string> | undefined;
      if (prevComputedStyle) {
        const prevKeys = Object.keys(prevComputedStyle);
        const newKeys = Object.keys(computedStyle);
        if (prevKeys.length === newKeys.length) {
          const isSame = prevKeys.every(
            (key) => prevComputedStyle[key] === computedStyle[key]
          );
          if (isSame) return; // 변경 없음
        }
      }

      set({
        selectedElementProps: {
          ...currentProps,
          computedStyle,
        },
      } as Partial<CombinedState>);
    },
  };
};

// ============================================
// Selector: useSelectedElement
// ============================================

/**
 * Convert Element to SelectedElement format
 * Used by panels to get selected element in Inspector-compatible format
 */
export function mapElementToSelectedElement(element: Element): SelectedElement {
  const { style, computedStyle, events, ...otherProps } = element.props as Record<string, unknown>;

  return {
    id: element.id,
    customId: element.customId,
    type: element.tag,
    properties: otherProps,
    style: (style as React.CSSProperties) || {},
    computedStyle: computedStyle as Partial<React.CSSProperties> | undefined,
    semanticClasses: [],
    cssVariables: {},
    dataBinding: element.dataBinding as SelectedElement["dataBinding"],
    events: (events as SelectedElement["events"]) || [],
  };
}
