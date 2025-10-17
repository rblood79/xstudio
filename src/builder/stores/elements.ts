import { create } from "zustand";
import { produce } from "immer";
import { StateCreator } from "zustand";
import { Element, ComponentElementProps } from "../../types/store";
import { historyManager } from "./history";
import { supabase } from "../../env/supabase.client";
import { reorderElements } from "./utils/elementReorder";
import { sanitizeElement } from "./utils/elementSanitizer";
import {
  findElementById,
  createCompleteProps,
} from "./utils/elementHelpers";
import { createUndoAction, createRedoAction } from "./history/historyActions";
import { createRemoveElementAction } from "./utils/elementRemoval";

interface Page {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  order_num?: number;
}

export interface ElementsState {
  elements: Element[];
  selectedElementId: string | null;
  selectedElementProps: ComponentElementProps;
  selectedTab: { parentId: string; tabIndex: number } | null;
  pages: Page[];
  currentPageId: string | null;
  historyOperationInProgress: boolean;

  setElements: (elements: Element[]) => void;
  loadPageElements: (elements: Element[], pageId: string) => void;
  addElement: (element: Element) => Promise<void>;
  updateElementProps: (
    elementId: string,
    props: ComponentElementProps
  ) => Promise<void>;
  updateElement: (
    elementId: string,
    updates: Partial<Element>
  ) => Promise<void>;
  setSelectedElement: (
    elementId: string | null,
    props?: ComponentElementProps
  ) => void;
  selectTabElement: (
    elementId: string,
    props: ComponentElementProps,
    tabIndex: number
  ) => void;
  setPages: (pages: Page[]) => void;
  setCurrentPageId: (pageId: string) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  removeElement: (elementId: string) => Promise<void>;
  removeTabPair: (elementId: string) => void;
  addComplexElement: (
    parentElement: Element,
    childElements: Element[]
  ) => Promise<void>;
  updateElementOrder: (elementId: string, orderNum: number) => void;
}

export const createElementsSlice: StateCreator<ElementsState> = (set, get) => {
  // undo/redo 함수 생성
  const undo = createUndoAction(set, get);
  const redo = createRedoAction(set, get);

  // removeElement 함수 생성
  const removeElement = createRemoveElementAction(set, get);

  return {
    elements: [],
    selectedElementId: null,
    selectedElementProps: {},
    selectedTab: null,
    pages: [],
    currentPageId: null,
    historyOperationInProgress: false,

  setElements: (elements) =>
    set(
      produce((state: ElementsState) => {
        state.elements = elements;

        // setElements는 내부 상태 관리용이므로 히스토리 기록하지 않음
        // 실제 요소 변경은 addElement, updateElementProps, removeElement에서 처리
      })
    ),

  loadPageElements: (elements, pageId) => {
    set(
      produce((state: ElementsState) => {
        state.elements = elements;
        state.currentPageId = pageId;

        // 페이지 변경 시 히스토리 초기화
        historyManager.setCurrentPage(pageId);
      })
    );

    // 페이지 로드 직후 즉시 order_num 재정렬 (검증보다 먼저 실행)
    setTimeout(() => {
      const { updateElementOrder } = get();
      reorderElements(elements, pageId, updateElementOrder);
    }, 50); // 검증(300ms)보다 빠르게 실행
  },

  addElement: async (element) => {
    // 1. 메모리 상태 업데이트 (우선)
    set(
      produce((state: ElementsState) => {
        // 히스토리 추가
        if (state.currentPageId) {
          historyManager.addEntry({
            type: "add",
            elementId: element.id,
            data: { element: { ...element } },
          });
        }

        // 새로운 배열 참조 생성 (리렌더링 보장)
        state.elements = [...state.elements, element];
      })
    );

    // 2. iframe 업데이트
    if (typeof window !== "undefined" && window.parent) {
      try {
        window.parent.postMessage(
          {
            type: "ELEMENT_ADDED",
            payload: { element: sanitizeElement(element) },
          },
          "*"
        );
      } catch (error) {
        console.warn("postMessage 직렬화 실패:", error);
      }
    }

    // 3. 데이터베이스 저장 (비동기, 실패해도 메모리는 유지)
    try {
      // 먼저 기존 요소가 있는지 확인
      const { data: existingElement } = await supabase
        .from("elements")
        .select("id")
        .eq("id", element.id)
        .single();

      if (existingElement) {
        console.log("🔄 요소가 이미 존재함, 업데이트 시도:", element.id);
        // 기존 요소가 있으면 업데이트
        const { error: updateError } = await supabase
          .from("elements")
          .update(sanitizeElement(element))
          .eq("id", element.id);

        if (updateError) {
          console.warn("⚠️ 요소 업데이트 실패 (메모리는 정상):", updateError);
        } else {
          console.log("✅ 데이터베이스에 요소 업데이트 완료:", element.id);
        }
      } else {
        // 새 요소 삽입
        const { error } = await supabase
          .from("elements")
          .insert(sanitizeElement(element));

        if (error) {
          if (error.code === "23503") {
            console.warn(
              "⚠️ 외래키 제약조건으로 인한 저장 실패 (메모리는 정상):",
              error.message
            );
          } else if (error.code === "23505") {
            console.warn(
              "⚠️ 중복 키 오류 - 요소가 이미 존재함 (메모리는 정상):",
              error.message
            );
          } else {
            console.warn("⚠️ 데이터베이스 저장 실패 (메모리는 정상):", error);
          }
        } else {
          console.log("✅ 데이터베이스에 요소 저장 완료:", element.id);
        }
      }
    } catch (error) {
      console.warn("⚠️ 데이터베이스 저장 중 오류 (메모리는 정상):", error);
    }

    // order_num 재정렬 (추가 후)
    const currentPageId = get().currentPageId;
    if (currentPageId && element.page_id === currentPageId) {
      setTimeout(() => {
        const { elements, updateElementOrder } = get();
        reorderElements(elements, currentPageId, updateElementOrder);
      }, 100); // 상태 업데이트 후 재정렬
    }
  },

  updateElementProps: async (elementId, props) => {
    const state = get();
    const element = findElementById(state.elements, elementId);
    if (!element) return;

    console.log("🔧 updateElementProps 호출:", {
      elementId,
      elementTag: element.tag,
      변경props: props,
      호출위치: new Error().stack?.split("\n")[2]?.trim(),
    });

    // 1. 메모리 상태 업데이트 (우선)
    set(
      produce((state: ElementsState) => {
        const element = findElementById(state.elements, elementId);
        if (!element) return;

        // 히스토리 추가
        if (state.currentPageId) {
          // Immer proxy 문제 방지: 깊은 복사로 순수 객체 생성
          const prevPropsClone = JSON.parse(JSON.stringify(element.props));
          const newPropsClone = JSON.parse(JSON.stringify(props));
          const prevElementClone = JSON.parse(JSON.stringify(element));

          console.log("📝 Props 변경 히스토리 추가:", {
            elementId,
            elementTag: element.tag,
            prevProps: prevPropsClone,
            newProps: newPropsClone,
          });
          historyManager.addEntry({
            type: "update",
            elementId: elementId,
            data: {
              props: newPropsClone,
              prevProps: prevPropsClone,
              prevElement: prevElementClone,
            },
          });
        }

        // 요소 업데이트
        element.props = { ...element.props, ...props };

        // 선택된 요소가 업데이트된 경우 selectedElementProps도 업데이트
        if (state.selectedElementId === elementId) {
          state.selectedElementProps = createCompleteProps(element, props);
        }
      })
    );

    // 2. iframe 업데이트는 PropertyPanel에서 직접 처리하도록 변경 (무한 루프 방지)

    // 2. iframe 업데이트는 PropertyPanel에서 직접 처리하도록 변경 (무한 루프 방지)

    // 3. SaveService는 외부(Preview, PropertyPanel 등)에서 호출하도록 변경
    // 이유: store slice 내부에서 동적 import 사용 시 store 인스턴스 불일치 발생
  },

  updateElement: async (elementId, updates) => {
    const state = get();
    const element = findElementById(state.elements, elementId);
    if (!element) return;

    console.log("🔄 updateElement 호출:", {
      elementId,
      elementTag: element.tag,
      updates,
      hasDataBinding: !!updates.dataBinding,
    });

    // 1. 메모리 상태 업데이트
    set(
      produce((state: ElementsState) => {
        const element = findElementById(state.elements, elementId);
        if (!element) return;

        // 히스토리 추가 (updateElementProps와 동일한 로직)
        if (state.currentPageId && updates.props) {
          // Immer proxy 문제 방지: 깊은 복사로 순수 객체 생성
          const prevPropsClone = JSON.parse(JSON.stringify(element.props));
          const newPropsClone = JSON.parse(JSON.stringify(updates.props));
          const prevElementClone = JSON.parse(JSON.stringify(element));

          console.log("📝 Element 변경 히스토리 추가:", {
            elementId,
            elementTag: element.tag,
            prevProps: prevPropsClone,
            newProps: newPropsClone,
          });
          historyManager.addEntry({
            type: "update",
            elementId: elementId,
            data: {
              props: newPropsClone,
              prevProps: prevPropsClone,
              prevElement: prevElementClone,
            },
          });
        }

        // 요소 업데이트 (props, dataBinding 등)
        Object.assign(element, updates);

        // 선택된 요소가 업데이트된 경우 props도 업데이트
        if (state.selectedElementId === elementId && updates.props) {
          state.selectedElementProps = createCompleteProps(
            element,
            updates.props
          );
        }
      })
    );

    // 2. SaveService를 통한 저장 (실시간/수동 모드 확인)
    // useSyncWithBuilder에서 이미 saveService를 호출하므로 여기서는 중복 저장 방지
    // 주석 처리: saveService가 useSyncWithBuilder에서 관리
  },

  setSelectedElement: (elementId, props) =>
    set(
      produce((state: ElementsState) => {
        state.selectedElementId = elementId;

        if (elementId && props) {
          state.selectedElementProps = props;
        } else if (elementId) {
          const element = findElementById(state.elements, elementId);
          if (element) {
            state.selectedElementProps = createCompleteProps(element);
          }
        } else {
          state.selectedElementProps = {};
        }
      })
    ),

  selectTabElement: (elementId, props, tabIndex) =>
    set(
      produce((state: ElementsState) => {
        state.selectedElementId = elementId;
        state.selectedElementProps = props;
        state.selectedTab = { parentId: elementId, tabIndex };
      })
    ),

  setPages: (pages) =>
    set(
      produce((state: ElementsState) => {
        state.pages = pages;
      })
    ),

  setCurrentPageId: (pageId) =>
    set(
      produce((state: ElementsState) => {
        state.currentPageId = pageId;
        historyManager.setCurrentPage(pageId);
      })
    ),

  undo,

  redo,

  removeElement,

  removeTabPair: (elementId) =>
    set(
      produce((state: ElementsState) => {
        // Tab과 Panel 쌍 제거
        state.elements = state.elements.filter(
          (el) => el.parent_id !== elementId && el.id !== elementId
        );

        if (state.selectedElementId === elementId) {
          state.selectedElementId = null;
          state.selectedElementProps = {};
        }
      })
    ),

  addComplexElement: async (
    parentElement: Element,
    childElements: Element[]
  ) => {
    const allElements = [parentElement, ...childElements];

    // 1. 메모리 상태 업데이트 (우선)
    set(
      produce((state: ElementsState) => {
        // 복합 컴포넌트 생성 히스토리 추가
        if (state.currentPageId) {
          historyManager.addEntry({
            type: "add",
            elementId: parentElement.id,
            data: {
              element: { ...parentElement },
              childElements: childElements.map((child) => ({ ...child })),
            },
          });
        }

        // 모든 요소 추가
        state.elements.push(...allElements);
      })
    );

    // 2. iframe 업데이트
    if (typeof window !== "undefined" && window.parent) {
      try {
        window.parent.postMessage(
          {
            type: "COMPLEX_ELEMENT_ADDED",
            payload: {
              parentElement: sanitizeElement(parentElement),
              childElements: childElements.map((child) =>
                sanitizeElement(child)
              ),
            },
          },
          "*"
        );
      } catch (error) {
        console.warn("postMessage 직렬화 실패:", error);
      }
    }

    // 3. 데이터베이스 저장 (비동기, 실패해도 메모리는 유지)
    try {
      const { error } = await supabase
        .from("elements")
        .insert(allElements.map((el) => sanitizeElement(el)));

      if (error) {
        if (error.code === "23503") {
          console.warn(
            "⚠️ 외래키 제약조건으로 인한 저장 실패 (메모리는 정상):",
            error.message
          );
        } else {
          console.warn("⚠️ 데이터베이스 저장 실패 (메모리는 정상):", error);
        }
      } else {
        console.log(
          `✅ 복합 컴포넌트 데이터베이스 저장 완료: ${parentElement.tag} + 자식 ${childElements.length}개`
        );
      }
    } catch (error) {
      console.warn("⚠️ 데이터베이스 저장 중 오류 (메모리는 정상):", error);
    }
  },

  updateElementOrder: (elementId, orderNum) =>
    set(
      produce((state: ElementsState) => {
        const element = findElementById(state.elements, elementId);
        if (element) {
          element.order_num = orderNum;
        }
      })
    ),
  };
};

// 기존 호환성을 위한 useStore export
export const useStore = create<ElementsState>(createElementsSlice);
