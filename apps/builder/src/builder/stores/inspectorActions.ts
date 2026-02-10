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
import type { ElementEvent } from "../../types/events/events.types";
import type { FillItem } from "../../types/builder/fill.types";
import { fillsToBackgroundColor, fillsToCssBackground } from "../panels/styles/utils/fillMigration";
import { saveService } from "../../services/save";
import { historyManager } from "./history";
import { normalizeElementTags } from "./utils/elementTagNormalizer";

// ============================================
// Types
// ============================================

export interface InspectorActionsState {
  // Selected element in SelectedElement format (derived from elementsMap)
  // Note: This is computed from selectedElementId + elementsMap, not stored separately

  // Actions for updating selected element
  updateSelectedStyle: (property: string, value: string) => void;
  updateSelectedStyles: (styles: Record<string, string>) => void;
  /** 실시간 프리뷰: 히스토리/DB 저장 없이 캔버스만 업데이트 */
  updateSelectedStylePreview: (property: string, value: string) => void;
  updateSelectedProperty: (key: string, value: unknown) => void;
  updateSelectedProperties: (properties: Record<string, unknown>) => void;
  updateSelectedCustomId: (customId: string) => void;
  updateSelectedDataBinding: (dataBinding: DataBinding | undefined) => void;
  updateSelectedEvents: (events: EventHandler[]) => void;
  addSelectedEvent: (event: EventHandler) => void;
  updateSelectedEvent: (id: string, event: EventHandler) => void;
  removeSelectedEvent: (id: string) => void;
  // Fill Actions (Color Picker Phase 1)
  /** fills 배열 업데이트 + style.backgroundColor 동기화 + 히스토리/DB 저장 */
  updateSelectedFills: (fills: FillItem[]) => void;
  /** fills 실시간 프리뷰: 히스토리/DB 저장 없이 캔버스만 업데이트 */
  updateSelectedFillsPreview: (fills: FillItem[]) => void;

  // ComputedStyle은 DB 저장 없이 메모리만 업데이트 (런타임 값)
  updateSelectedComputedStyle: (computedStyle: Record<string, string>) => void;
}

// Required state from other slices
interface RequiredState {
  selectedElementId: string | null;
  elementsMap: Map<string, Element>;
  elements: Element[];
  currentPageId: string | null;
  updateElement: (elementId: string, updates: Partial<Element>) => Promise<void>;
  _rebuildIndexes: () => void;
  _cancelHydrateSelectedProps: () => void;
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
   * 프리뷰 전 원본 요소 스냅샷
   * - 타이핑 중 프리뷰가 elementsMap을 수정하므로,
   *   커밋 시 정확한 prevProps를 히스토리에 기록하기 위해 원본 보관
   * - state가 아닌 closure 변수로 관리 (불필요한 리렌더링 방지)
   */
  let prePreviewElement: Element | null = null;

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
    additionalUpdates?: Partial<Element>,
    /** 프리뷰 → 커밋 시 히스토리 정확성을 위한 원본 요소 */
    prevElementOverride?: Element
  ) => {
    const { elementsMap, elements, selectedElementId, currentPageId } = get();
    const {
      elements: normalizedElements,
      updatedElements: normalizedTagElements,
    } = normalizeElementTags(elements);

    let baseElementsMap = elementsMap;
    if (normalizedTagElements.length > 0) {
      const normalizedMap = new Map(elementsMap);
      normalizedTagElements.forEach((el) => {
        normalizedMap.set(el.id, el);
      });
      baseElementsMap = normalizedMap;
    }

    const element = baseElementsMap.get(elementId);
    if (!element) return;

    // 선택된 요소의 props를 직접 업데이트하므로,
    // 진행 중인 hydration이 있으면 취소하여 경쟁 상태 방지
    if (selectedElementId === elementId) {
      get()._cancelHydrateSelectedProps();
    }

    // 🚀 히스토리 저장을 위한 이전 상태 캡처
    // prevElementOverride가 있으면 프리뷰 전 원본 사용 (정확한 undo/redo)
    const historyBase = prevElementOverride || element;
    const prevProps = structuredClone(historyBase.props);
    const prevElement = structuredClone(historyBase);

    const newProps = {
      ...element.props,
      ...propsUpdate,
    };

    const updatedElement: Element = {
      ...element,
      props: newProps,
      ...additionalUpdates,
    };

    // 🚀 히스토리 엔트리 추가 (props 변경 시)
    if (currentPageId && Object.keys(propsUpdate).length > 0) {
      historyManager.addEntry({
        type: "update",
        elementId: elementId,
        data: {
          prevProps,
          props: structuredClone(newProps),
          prevElement,
        },
      });
    }

    // 🚀 O(1) Map 업데이트 (새 Map 생성으로 불변성 유지)
    const newElementsMap = new Map(baseElementsMap);
    newElementsMap.set(elementId, updatedElement);

    // 🚀 elements 배열도 업데이트 (findIndex로 위치 찾아서 직접 교체)
    const elementIndex = normalizedElements.findIndex((el) => el.id === elementId);
    let newElements = normalizedElements;
    if (elementIndex !== -1) {
      newElements = [...normalizedElements];
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

      // 프리뷰 상태에서 커밋 시, 원본 요소의 style을 기반으로 변경
      const savedPrePreview = prePreviewElement;
      prePreviewElement = null;

      const baseElement = (savedPrePreview && savedPrePreview.id === element.id)
        ? savedPrePreview : element;
      const currentStyle = { ...((baseElement.props?.style as Record<string, string>) || {}) };

      if (value === "" || value === null || value === undefined) {
        delete currentStyle[property];
      } else {
        currentStyle[property] = value;
      }

      updateAndSave(
        element.id,
        { style: currentStyle },
        undefined,
        savedPrePreview && savedPrePreview.id === element.id ? savedPrePreview : undefined,
      );
    },

    updateSelectedStylePreview: (property, value) => {
      const { elementsMap, selectedElementId } = get();
      if (!selectedElementId) return;

      const element = elementsMap.get(selectedElementId);
      if (!element) return;

      // 첫 프리뷰 시 원본 요소 스냅샷 저장 (히스토리 정확성)
      if (!prePreviewElement || prePreviewElement.id !== selectedElementId) {
        prePreviewElement = structuredClone(element);
      }

      const currentStyle = { ...((element.props?.style as Record<string, string>) || {}) };

      if (value === "" || value === null || value === undefined) {
        delete currentStyle[property];
      } else {
        currentStyle[property] = value;
      }

      const newProps = { ...element.props, style: currentStyle };
      const updatedElement: Element = { ...element, props: newProps };

      // elementsMap만 업데이트 (캔버스 렌더링용)
      // ⚠️ selectedElementProps는 업데이트하지 않음!
      // → Jotai atom이 변경되지 않아 PropertyUnitInput의 value prop 유지
      // → blur 시 valueActuallyChanged 정상 감지 → onChange(DB 저장) 호출
      const newElementsMap = new Map(elementsMap);
      newElementsMap.set(selectedElementId, updatedElement);

      const elementIndex = (get() as CombinedState).elements.findIndex(
        (el) => el.id === selectedElementId
      );
      let newElements = (get() as CombinedState).elements;
      if (elementIndex !== -1) {
        newElements = [...newElements];
        newElements[elementIndex] = updatedElement;
      }

      set({
        elements: newElements,
        elementsMap: newElementsMap,
      } as Partial<CombinedState>);
    },

    updateSelectedStyles: (styles) => {
      const element = getSelectedElement();
      if (!element) return;

      // 프리뷰 상태에서 커밋 시, 원본 요소의 style 기반으로 변경
      const savedPrePreview = prePreviewElement;
      prePreviewElement = null;

      const baseElement = (savedPrePreview && savedPrePreview.id === element.id)
        ? savedPrePreview : element;
      const currentStyle = { ...((baseElement.props?.style as Record<string, string>) || {}) };

      Object.entries(styles).forEach(([property, value]) => {
        if (value === "" || value === null || value === undefined) {
          delete currentStyle[property];
        } else {
          currentStyle[property] = value;
        }
      });

      updateAndSave(
        element.id,
        { style: currentStyle },
        undefined,
        savedPrePreview && savedPrePreview.id === element.id ? savedPrePreview : undefined,
      );
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

      updateAndSave(element.id, { events: events as unknown as ElementEvent[] });
    },

    addSelectedEvent: (event) => {
      const element = getSelectedElement();
      if (!element) return;

      const currentEvents = ((element.props?.events as EventHandler[]) || []);
      updateAndSave(element.id, { events: [...currentEvents, event] as unknown as ElementEvent[] });
    },

    updateSelectedEvent: (id, event) => {
      const element = getSelectedElement();
      if (!element) return;

      const currentEvents = ((element.props?.events as EventHandler[]) || []);
      const updatedEvents = currentEvents.map((e) => (e.id === id ? event : e));
      updateAndSave(element.id, { events: updatedEvents as unknown as ElementEvent[] });
    },

    removeSelectedEvent: (id) => {
      const element = getSelectedElement();
      if (!element) return;

      const currentEvents = ((element.props?.events as EventHandler[]) || []);
      const updatedEvents = currentEvents.filter((e) => e.id !== id);
      updateAndSave(element.id, { events: updatedEvents as unknown as ElementEvent[] });
    },

    // ============================================
    // Fill Actions (Color Picker Phase 1)
    // ============================================

    updateSelectedFills: (fills) => {
      const element = getSelectedElement();
      if (!element) return;

      // 프리뷰 상태에서 커밋 시, 원본 요소 기반으로 변경
      const savedPrePreview = prePreviewElement;
      prePreviewElement = null;

      const baseElement = (savedPrePreview && savedPrePreview.id === element.id)
        ? savedPrePreview : element;

      // fills → CSS background 동기화 (Color → backgroundColor, Gradient → backgroundImage)
      const cssBg = fillsToCssBackground(fills);
      const currentStyle = { ...((baseElement.props?.style as Record<string, string>) || {}) };

      // 이전 background 관련 속성 정리
      delete currentStyle.backgroundColor;
      delete currentStyle.backgroundImage;

      if (cssBg.backgroundColor) {
        currentStyle.backgroundColor = cssBg.backgroundColor;
      }
      if (cssBg.backgroundImage) {
        currentStyle.backgroundImage = cssBg.backgroundImage;
      }

      updateAndSave(
        element.id,
        { style: currentStyle },
        { fills },
        savedPrePreview && savedPrePreview.id === element.id ? savedPrePreview : undefined,
      );
    },

    updateSelectedFillsPreview: (fills) => {
      const { elementsMap, selectedElementId } = get();
      if (!selectedElementId) return;

      const element = elementsMap.get(selectedElementId);
      if (!element) return;

      // 첫 프리뷰 시 원본 요소 스냅샷 저장 (히스토리 정확성)
      if (!prePreviewElement || prePreviewElement.id !== selectedElementId) {
        prePreviewElement = structuredClone(element);
      }

      // fills → CSS background 동기화 (Color → backgroundColor, Gradient → backgroundImage)
      const cssBg = fillsToCssBackground(fills);
      const currentStyle = { ...((element.props?.style as Record<string, string>) || {}) };

      // 이전 background 관련 속성 정리
      delete currentStyle.backgroundColor;
      delete currentStyle.backgroundImage;

      if (cssBg.backgroundColor) {
        currentStyle.backgroundColor = cssBg.backgroundColor;
      }
      if (cssBg.backgroundImage) {
        currentStyle.backgroundImage = cssBg.backgroundImage;
      }

      const newProps = { ...element.props, style: currentStyle };
      const updatedElement: Element = { ...element, props: newProps, fills };

      // elementsMap만 업데이트 (캔버스 렌더링용)
      // selectedElementProps는 업데이트하지 않음 (Jotai atom value 유지)
      const newElementsMap = new Map(elementsMap);
      newElementsMap.set(selectedElementId, updatedElement);

      const elementIndex = (get() as CombinedState).elements.findIndex(
        (el) => el.id === selectedElementId
      );
      let newElements = (get() as CombinedState).elements;
      if (elementIndex !== -1) {
        newElements = [...newElements];
        newElements[elementIndex] = updatedElement;
      }

      set({
        elements: newElements,
        elementsMap: newElementsMap,
      } as Partial<CombinedState>);
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
