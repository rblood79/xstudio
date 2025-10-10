import { create } from "zustand";
import { produce } from "immer";
import { StateCreator } from "zustand";
import { Element, ComponentElementProps } from "../../types/store";
import { historyManager } from "./history";
import { supabase } from "../../env/supabase.client";

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

// order_num 재정렬 유틸리티 함수
const reorderElements = async (
  elements: Element[],
  pageId: string,
  updateElementOrder: (elementId: string, orderNum: number) => void
): Promise<void> => {
  // 페이지별, 부모별로 그룹화
  const groups = elements
    .filter((el) => el.page_id === pageId)
    .reduce((acc, element) => {
      const key = element.parent_id || "root";
      if (!acc[key]) acc[key] = [];
      acc[key].push(element);
      return acc;
    }, {} as Record<string, Element[]>);

  const updates: Array<{ id: string; order_num: number }> = [];

  // 각 그룹별로 order_num 재정렬
  Object.entries(groups).forEach(([parentKey, children]) => {
    let sorted: Element[];

    // 부모 요소 확인
    const parentElement = elements.find(
      (el) => el.id === (parentKey === "root" ? null : parentKey)
    );
    const parentTag = parentElement?.tag;

    // 특별 정렬이 필요한 컴포넌트들 확인
    const isTabsChildren = parentTag === "Tabs";
    const isListBoxChildren = parentTag === "ListBox";
    const isGridListChildren = parentTag === "GridList";
    const isMenuChildren = parentTag === "Menu";
    const isComboBoxChildren = parentTag === "ComboBox";
    const isSelectChildren = parentTag === "Select";
    const isTreeChildren = parentTag === "Tree";
    const isToggleButtonChildren = parentTag === "ToggleButtonGroup";
    const isTableHeaderChildren = parentTag === "TableHeader";

    // 디버깅: 특별 정렬 대상 컴포넌트 확인
    if (
      isTabsChildren ||
      isListBoxChildren ||
      isGridListChildren ||
      isMenuChildren ||
      isComboBoxChildren ||
      isSelectChildren ||
      isTreeChildren ||
      isToggleButtonChildren ||
      isTableHeaderChildren
    ) {
      console.log(`🔍 컬렉션 컴포넌트 그룹 분석:`, {
        parentKey,
        parentElement: parentElement
          ? { id: parentElement.id, tag: parentElement.tag }
          : null,
        parentTag,
        childrenCount: children.length,
        childTags: children.map((el) => el.tag),
      });
    }

    if (isTabsChildren) {
      // Tabs 하위의 Tab과 Panel을 tabId 기반으로 쌍을 맞춰서 정렬
      const tabs = children
        .filter((el) => el.tag === "Tab")
        .sort((a, b) => {
          const orderDiff = (a.order_num || 0) - (b.order_num || 0);
          if (orderDiff === 0) {
            // order_num이 같을 경우, title로 추가 정렬 (Tab 1 < Tab 2 < Tab 3)
            const titleA = (a.props as { title?: string }).title || "";
            const titleB = (b.props as { title?: string }).title || "";
            return titleA.localeCompare(titleB);
          }
          return orderDiff;
        });

      const panels = children
        .filter((el) => el.tag === "Panel")
        .sort((a, b) => {
          const orderDiff = (a.order_num || 0) - (b.order_num || 0);
          if (orderDiff === 0) {
            // order_num이 같을 경우, title로 추가 정렬
            const titleA = (a.props as { title?: string }).title || "";
            const titleB = (b.props as { title?: string }).title || "";
            return titleA.localeCompare(titleB);
          }
          return orderDiff;
        });

      sorted = [];
      const usedPanelIds = new Set<string>();

      tabs.forEach((tab) => {
        sorted.push(tab);

        // Tab의 tabId와 일치하는 Panel 찾기
        const tabId = (tab.props as { tabId?: string }).tabId;
        if (tabId) {
          const matchingPanel = panels.find((panel) => {
            const panelTabId = (panel.props as { tabId?: string }).tabId;
            return panelTabId === tabId && !usedPanelIds.has(panel.id);
          });

          if (matchingPanel) {
            sorted.push(matchingPanel);
            usedPanelIds.add(matchingPanel.id);
          }
        }
      });

      // 매칭되지 않은 Panel들 추가 (orphaned)
      panels.forEach((panel) => {
        if (!usedPanelIds.has(panel.id)) {
          sorted.push(panel);
        }
      });

      console.log(
        `📋 Tabs 하위 요소 재정렬: ${tabs.length}개 Tab, ${panels.length}개 Panel`
      );
      console.log("📋 Tab 정렬 순서:");
      tabs.forEach((tab, index) => {
        console.log(
          `  ${index + 1}. ${(tab.props as { title?: string }).title} (order: ${
            tab.order_num
          }, tabId: ${(tab.props as { tabId?: string }).tabId?.slice(0, 8)}...)`
        );
      });
      console.log("📋 최종 정렬된 순서:");
      sorted.forEach((el, index) => {
        console.log(
          `  ${index + 1}. ${el.tag}: ${
            (el.props as { title?: string }).title
          } (new order: ${index + 1})`
        );
      });
    } else if (isTableHeaderChildren) {
      // TableHeader 하위의 ColumnGroup들 정렬
      console.log(
        `📊 ${parentTag} 하위 ColumnGroup 재정렬: ${children.length}개 그룹`
      );

      sorted = children.sort((a, b) => {
        const orderDiff = (a.order_num || 0) - (b.order_num || 0);
        if (orderDiff === 0) {
          // order_num이 같을 경우, label로 추가 정렬
          const labelA = (a.props as { label?: string }).label || "";
          const labelB = (b.props as { label?: string }).label || "";
          const comparison = String(labelA).localeCompare(String(labelB));

          if (comparison === 0) {
            // label도 같으면 ID로 정렬 (안정적인 순서 보장)
            return a.id.localeCompare(b.id);
          }
          return comparison;
        }
        return orderDiff;
      });

      console.log(`📊 ${parentTag} 정렬된 ColumnGroup 순서:`);
      sorted.forEach((group, index) => {
        const label = (group.props as { label?: string }).label || "Untitled";
        const span = (group.props as { span?: number }).span || 1;
        console.log(
          `  ${index + 1}. ColumnGroup: ${label} (span: ${span}, order: ${
            group.order_num
          } → ${index + 1})`
        );
      });
    } else if (
      isListBoxChildren ||
      isGridListChildren ||
      isMenuChildren ||
      isComboBoxChildren ||
      isSelectChildren ||
      isTreeChildren ||
      isToggleButtonChildren
    ) {
      // 컬렉션 컴포넌트들의 아이템 정렬 (ToggleButton 포함)
      console.log(
        `📋 ${parentTag} 하위 요소 재정렬: ${children.length}개 아이템`
      );

      sorted = children.sort((a, b) => {
        const orderDiff = (a.order_num || 0) - (b.order_num || 0);
        if (orderDiff === 0) {
          // order_num이 같을 경우, children 텍스트나 title, label로 추가 정렬
          const textA =
            (
              a.props as {
                children?: React.ReactNode;
                title?: string;
                label?: string;
              }
            ).children ||
            (
              a.props as {
                children?: React.ReactNode;
                title?: string;
                label?: string;
              }
            ).title ||
            (
              a.props as {
                children?: React.ReactNode;
                title?: string;
                label?: string;
              }
            ).label ||
            "";
          const textB =
            (
              b.props as {
                children?: React.ReactNode;
                title?: string;
                label?: string;
              }
            ).children ||
            (
              b.props as {
                children?: React.ReactNode;
                title?: string;
                label?: string;
              }
            ).title ||
            (
              b.props as {
                children?: React.ReactNode;
                title?: string;
                label?: string;
              }
            ).label ||
            "";
          const comparison = String(textA).localeCompare(String(textB));

          if (comparison === 0) {
            // 텍스트도 같으면 ID로 정렬 (안정적인 순서 보장)
            return a.id.localeCompare(b.id);
          }
          return comparison;
        }
        return orderDiff;
      });

      console.log(`📋 ${parentTag} 정렬된 순서:`);
      sorted.forEach((item, index) => {
        const text =
          (
            item.props as {
              children?: React.ReactNode;
              title?: string;
              label?: string;
            }
          ).children ||
          (
            item.props as {
              children?: React.ReactNode;
              title?: string;
              label?: string;
            }
          ).title ||
          (
            item.props as {
              children?: React.ReactNode;
              title?: string;
              label?: string;
            }
          ).label ||
          "Untitled";
        console.log(
          `  ${index + 1}. ${item.tag}: ${text} (order: ${item.order_num} → ${
            index + 1
          })`
        );
      });
    } else {
      // 일반적인 정렬 (기존 로직)
      sorted = children.sort((a, b) => {
        const orderDiff = (a.order_num || 0) - (b.order_num || 0);
        if (orderDiff === 0) {
          // order_num이 같을 경우 ID로 정렬 (안정적인 순서 보장)
          return a.id.localeCompare(b.id);
        }
        return orderDiff;
      });
    }

    sorted.forEach((child, index) => {
      const newOrderNum = index + 1;
      if (child.order_num !== newOrderNum) {
        updates.push({ id: child.id, order_num: newOrderNum });
        // 메모리에서도 업데이트 (스토어를 통해)
        updateElementOrder(child.id, newOrderNum);
      }
    });
  });

  // 데이터베이스 일괄 업데이트
  if (updates.length > 0) {
    try {
      // 각 요소를 개별적으로 업데이트 (일괄 업데이트 대신)
      const updatePromises = updates.map((update) =>
        supabase
          .from("elements")
          .update({ order_num: update.order_num })
          .eq("id", update.id)
      );

      const results = await Promise.all(updatePromises);

      // 오류 확인
      const errors = results.filter((result) => result.error);
      if (errors.length > 0) {
        console.error(
          "order_num 재정렬 실패:",
          errors.map((e) => e.error)
        );
      } else {
        console.log(`📊 order_num 재정렬 완료: ${updates.length}개 요소`);

        // 컬렉션 아이템 재정렬 결과 디버깅
        const collectionItems = elements.filter(
          (el) =>
            el.page_id === pageId &&
            (el.tag === "Tab" ||
              el.tag === "Panel" ||
              el.tag === "ListBoxItem" ||
              el.tag === "GridListItem" ||
              el.tag === "MenuItem" ||
              el.tag === "ComboBoxItem" ||
              el.tag === "SelectItem" ||
              el.tag === "TreeItem" ||
              el.tag === "ToggleButton")
        );

        if (collectionItems.length > 0) {
          console.log("🏷️ 재정렬 후 컬렉션 아이템 상태:");
          collectionItems
            .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
            .forEach((el) => {
              const text =
                (
                  el.props as {
                    children?: React.ReactNode;
                    title?: string;
                    label?: string;
                  }
                ).children ||
                (
                  el.props as {
                    children?: React.ReactNode;
                    title?: string;
                    label?: string;
                  }
                ).title ||
                (
                  el.props as {
                    children?: React.ReactNode;
                    title?: string;
                    label?: string;
                  }
                ).label ||
                "Untitled";
              const extraInfo =
                el.tag === "Tab" || el.tag === "Panel"
                  ? `, tabId: ${(el.props as { tabId?: string }).tabId}`
                  : "";
              console.log(
                `  ${el.tag}: ${text} (order: ${el.order_num}${extraInfo})`
              );
            });
        }
      }
    } catch (error) {
      console.error("order_num 재정렬 중 오류:", error);
    }
  }
};

export const sanitizeElement = (element: Element): Element => {
  try {
    // structuredClone 우선 사용 (최신 브라우저)
    if (typeof structuredClone !== "undefined") {
      return {
        id: element.id,
        tag: element.tag,
        props: structuredClone(element.props || {}),
        parent_id: element.parent_id,
        page_id: element.page_id,
        order_num: element.order_num,
      };
    }

    // fallback: JSON 방식
    return {
      id: element.id,
      tag: element.tag,
      props: JSON.parse(JSON.stringify(element.props || {})),
      parent_id: element.parent_id,
      page_id: element.page_id,
      order_num: element.order_num,
    };
  } catch (error) {
    console.error("Element sanitization error:", error);
    // 기본 값으로 대체
    return {
      id: element.id || "",
      tag: element.tag || "",
      props: {},
      parent_id: element.parent_id,
      page_id: element.page_id || "",
      order_num: element.order_num || 0,
    };
  }
};

// Helper function for element selection logic
const createCompleteProps = (
  element: Element,
  props?: ComponentElementProps
) => ({
  ...element.props,
  ...props,
  tag: element.tag,
});

// Helper function to find element by ID
const findElementById = (elements: Element[], id: string): Element | null => {
  for (const element of elements) {
    if (element.id === id) return element;
  }
  return null;
};

export const createElementsSlice: StateCreator<ElementsState> = (set, get) => ({
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

  undo: async () => {
    try {
      console.log("🎯 Undo 함수 시작");
      const state = get();
      const { currentPageId } = state;
      console.log("🎯 currentPageId:", currentPageId);
      if (!currentPageId) {
        console.log("🚫 currentPageId 없음, return");
        return;
      }

      // 히스토리 작업 시작 표시
      set({ historyOperationInProgress: true });

      console.log("🔄 Undo 시작");

      // historyManager에서 항목 가져오기
      const entry = historyManager.undo();
      if (!entry) {
        console.log("⚠️ Undo 불가능: 히스토리 항목 없음");
        set({ historyOperationInProgress: false });
        return;
      }

      console.log("🔍 Undo 항목 확인:", {
        type: entry.type,
        elementId: entry.elementId,
        hasData: !!entry.data,
        dataKeys: entry.data ? Object.keys(entry.data) : [],
      });

      // 1. 메모리 상태 업데이트 (우선) - 안전한 데이터 복사
      let elementIdsToRemove: string[] = [];
      const elementsToRestore: Element[] = [];
      let prevProps: ComponentElementProps | null = null;
      let prevElement: Element | null = null;

      // produce 밖에서 안전하게 데이터 준비
      try {
        switch (entry.type) {
          case "add": {
            elementIdsToRemove = [entry.elementId];
            if (
              entry.data.childElements &&
              entry.data.childElements.length > 0
            ) {
              elementIdsToRemove.push(
                ...entry.data.childElements.map((child: Element) => child.id)
              );
            }
            break;
          }

          case "update": {
            console.log("🔍 Update 케이스 데이터 준비:", {
              hasPrevProps: !!entry.data.prevProps,
              hasPrevElement: !!entry.data.prevElement,
              prevProps: entry.data.prevProps,
              prevElement: entry.data.prevElement,
            });

            if (entry.data.prevProps) {
              try {
                prevProps = JSON.parse(JSON.stringify(entry.data.prevProps));
                console.log("✅ prevProps 준비 완료:", prevProps);
              } catch (proxyError) {
                console.warn("⚠️ prevProps proxy 오류, 원본 사용:", proxyError);
                prevProps = entry.data.prevProps;
              }
            }
            if (entry.data.prevElement) {
              try {
                prevElement = JSON.parse(
                  JSON.stringify(entry.data.prevElement)
                );
                console.log("✅ prevElement 준비 완료:", prevElement);
              } catch (proxyError) {
                console.warn(
                  "⚠️ prevElement proxy 오류, 원본 사용:",
                  proxyError
                );
                prevElement = entry.data.prevElement;
              }
            }
            break;
          }

          case "remove": {
            if (entry.data.element) {
              try {
                elementsToRestore.push(
                  JSON.parse(JSON.stringify(entry.data.element))
                );
              } catch (proxyError) {
                console.warn("⚠️ element proxy 오류, 원본 사용:", proxyError);
                elementsToRestore.push(entry.data.element);
              }
            }
            if (
              entry.data.childElements &&
              entry.data.childElements.length > 0
            ) {
              try {
                elementsToRestore.push(
                  ...entry.data.childElements.map((child: Element) =>
                    JSON.parse(JSON.stringify(child))
                  )
                );
                console.log(
                  `🔄 Undo: 자식 요소 ${entry.data.childElements.length}개 복원`,
                  {
                    parent: entry.data.element?.tag,
                    children: entry.data.childElements.map(
                      (child: Element) => ({ id: child.id, tag: child.tag })
                    ),
                  }
                );
              } catch (proxyError) {
                console.warn(
                  "⚠️ childElements proxy 오류, 원본 사용:",
                  proxyError
                );
                elementsToRestore.push(...entry.data.childElements);
                console.log(
                  `🔄 Undo: 자식 요소 ${entry.data.childElements.length}개 복원 (원본)`,
                  {
                    parent: entry.data.element?.tag,
                    children: entry.data.childElements.map(
                      (child: Element) => ({ id: child.id, tag: child.tag })
                    ),
                  }
                );
              }
            }
            break;
          }
        }

        console.log("✅ 히스토리 데이터 준비 완료, try 블록 끝");
      } catch (error: unknown) {
        console.error("⚠️ 히스토리 데이터 준비 중 오류:", error);
        console.error("⚠️ 오류 상세:", {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          entryType: entry.type,
          elementId: entry.elementId,
        });
        set({ historyOperationInProgress: false });
        return;
      }

      console.log("🚀 produce 함수 호출 직전, entry.type:", entry.type);

      set(
        produce((state: ElementsState) => {
          console.log("🔧 Undo Produce 함수 실행됨, entry.type:", entry.type);
          switch (entry.type) {
            case "add": {
              // 추가된 요소 제거 (역작업)
              state.elements = state.elements.filter(
                (el) => !elementIdsToRemove.includes(el.id)
              );
              if (elementIdsToRemove.includes(state.selectedElementId || "")) {
                state.selectedElementId = null;
                state.selectedElementProps = {};
              }
              break;
            }

            case "update": {
              console.log("📥 Update 케이스 실행됨:", {
                elementId: entry.elementId,
                hasPrevProps: !!prevProps,
                hasPrevElement: !!prevElement,
              });

              // 이전 상태로 복원
              const element = findElementById(state.elements, entry.elementId);
              if (element && prevProps) {
                console.log("🔄 Undo: Props 복원", {
                  elementId: entry.elementId,
                  elementTag: element.tag,
                  currentProps: { ...element.props },
                  restoringTo: prevProps,
                });
                element.props = prevProps;

                // 선택된 요소가 업데이트된 경우 selectedElementProps도 업데이트
                if (state.selectedElementId === entry.elementId) {
                  console.log("🔄 Undo: 선택된 요소 props도 업데이트");
                  state.selectedElementProps = createCompleteProps(
                    element,
                    prevProps
                  );
                }
              } else if (element && prevElement) {
                console.log("🔄 Undo: 전체 요소 복원", {
                  elementId: entry.elementId,
                  prevElement,
                });
                // 전체 요소가 저장된 경우
                Object.assign(element, prevElement);
              } else {
                console.warn(
                  "⚠️ Undo 실패: 요소 또는 이전 데이터를 찾을 수 없음",
                  {
                    elementId: entry.elementId,
                    elementFound: !!element,
                    prevPropsFound: !!prevProps,
                    prevElementFound: !!prevElement,
                  }
                );
              }
              break;
            }

            case "remove": {
              // 삭제된 요소와 자식 요소들 복원
              console.log("🔄 Undo: 요소 복원 중:", {
                restoringCount: elementsToRestore.length,
              });

              elementsToRestore.forEach((el, index) => {
                console.log(`📥 복원 요소 ${index + 1}:`, {
                  id: el.id,
                  tag: el.tag,
                  tabId: (el.props as { tabId?: string }).tabId,
                  title: (el.props as { title?: string }).title,
                  order_num: el.order_num,
                });
              });

              state.elements.push(...elementsToRestore);
              break;
            }
          }
        })
      );

      // 2. iframe 업데이트
      if (typeof window !== "undefined" && window.parent) {
        try {
          const currentElements = get().elements;
          window.parent.postMessage(
            {
              type: "ELEMENTS_UPDATED",
              payload: { elements: currentElements.map(sanitizeElement) },
            },
            "*"
          );
        } catch (error) {
          console.warn("postMessage 직렬화 실패:", error);
        }
      }

      // 3. 데이터베이스 업데이트 (비동기, 실패해도 메모리는 유지)
      try {
        switch (entry.type) {
          case "add": {
            // 부모 요소와 자식 요소들을 모두 데이터베이스에서 삭제
            const elementIdsToDelete = [entry.elementId];
            if (
              entry.data.childElements &&
              entry.data.childElements.length > 0
            ) {
              elementIdsToDelete.push(
                ...entry.data.childElements.map((child) => child.id)
              );
            }

            await supabase
              .from("elements")
              .delete()
              .in("id", elementIdsToDelete);
            console.log(
              `✅ Undo: 데이터베이스에서 요소 삭제 완료 (부모 1개 + 자식 ${
                entry.data.childElements?.length || 0
              }개)`
            );
            break;
          }

          case "update": {
            // bulk_update는 가짜 ID이므로 데이터베이스 업데이트 건너뛰기
            if (entry.elementId === "bulk_update") {
              console.log(
                "⏭️ bulk_update는 가짜 ID이므로 데이터베이스 업데이트 건너뛰기"
              );
              break;
            }

            if (entry.data.prevElement) {
              await supabase
                .from("elements")
                .update({
                  props: entry.data.prevProps || entry.data.prevElement.props,
                  parent_id: entry.data.prevElement.parent_id,
                  order_num: entry.data.prevElement.order_num,
                })
                .eq("id", entry.elementId);
              console.log("✅ Undo: 데이터베이스에서 요소 복원 완료");
            }
            break;
          }

          case "remove": {
            if (entry.data.element) {
              // 부모 요소와 자식 요소들을 모두 데이터베이스에 복원
              const elementsToRestore = [entry.data.element];
              if (
                entry.data.childElements &&
                entry.data.childElements.length > 0
              ) {
                elementsToRestore.push(...entry.data.childElements);
              }

              await supabase
                .from("elements")
                .insert(elementsToRestore.map((el) => sanitizeElement(el)));
              console.log(
                `✅ Undo: 데이터베이스에서 요소 복원 완료 (부모 1개 + 자식 ${
                  entry.data.childElements?.length || 0
                }개)`
              );
            }
            break;
          }
        }
      } catch (dbError) {
        console.warn("⚠️ 데이터베이스 업데이트 실패 (메모리는 정상):", dbError);
      }

      console.log("✅ Undo 완료");

      // Undo 완료 후 order_num 재정렬 (충돌 해결)
      const { elements, updateElementOrder } = get();
      if (currentPageId) {
        setTimeout(() => {
          reorderElements(elements, currentPageId, updateElementOrder);
          console.log("📊 Undo 후 order_num 재정렬 완료");
        }, 100); // 다른 업데이트 완료 후 실행
      }
    } catch (error) {
      console.error("Undo 시 오류:", error);
    } finally {
      // 히스토리 작업 종료 표시
      set({ historyOperationInProgress: false });
    }
  },

  redo: async () => {
    try {
      const state = get();
      if (!state.currentPageId) return;

      // 히스토리 작업 시작 표시
      set({ historyOperationInProgress: true });

      console.log("🔄 Redo 시작");

      const entry = historyManager.redo();
      if (!entry) {
        console.log("⚠️ Redo 불가능: 히스토리 항목 없음");
        set({ historyOperationInProgress: false });
        return;
      }

      // 1. 메모리 상태 업데이트 (우선) - 안전한 데이터 복사
      const elementsToAdd: Element[] = [];
      let elementIdsToRemove: string[] = [];
      let propsToUpdate: ComponentElementProps | null = null;

      // produce 밖에서 안전하게 데이터 준비
      try {
        switch (entry.type) {
          case "add": {
            if (entry.data.element) {
              elementsToAdd.push(
                JSON.parse(JSON.stringify(entry.data.element))
              );
            }
            if (
              entry.data.childElements &&
              entry.data.childElements.length > 0
            ) {
              elementsToAdd.push(
                ...entry.data.childElements.map((child: Element) =>
                  JSON.parse(JSON.stringify(child))
                )
              );
              console.log(
                `🔄 Redo: 자식 요소 ${entry.data.childElements.length}개 추가`,
                {
                  parent: entry.data.element?.tag,
                  children: entry.data.childElements.map((child: Element) => ({
                    id: child.id,
                    tag: child.tag,
                  })),
                }
              );
            }
            break;
          }

          case "update": {
            if (entry.data.props) {
              propsToUpdate = JSON.parse(JSON.stringify(entry.data.props));
            }
            break;
          }

          case "remove": {
            elementIdsToRemove = [entry.elementId];
            if (
              entry.data.childElements &&
              entry.data.childElements.length > 0
            ) {
              elementIdsToRemove.push(
                ...entry.data.childElements.map((child: Element) => child.id)
              );
            }
            break;
          }
        }
      } catch (error) {
        console.warn("⚠️ 히스토리 데이터 준비 중 오류:", error);
        set({ historyOperationInProgress: false });
        return;
      }

      set(
        produce((state: ElementsState) => {
          switch (entry.type) {
            case "add": {
              // 요소와 자식 요소들 추가
              state.elements.push(...elementsToAdd);
              break;
            }

            case "update": {
              // 업데이트 적용
              const element = findElementById(state.elements, entry.elementId);
              if (element && propsToUpdate) {
                element.props = { ...element.props, ...propsToUpdate };
              }
              break;
            }

            case "remove": {
              // 요소와 자식 요소들 제거
              state.elements = state.elements.filter(
                (el) => !elementIdsToRemove.includes(el.id)
              );
              if (elementIdsToRemove.includes(state.selectedElementId || "")) {
                state.selectedElementId = null;
                state.selectedElementProps = {};
              }
              break;
            }
          }
        })
      );

      // 2. iframe 업데이트
      if (typeof window !== "undefined" && window.parent) {
        try {
          const currentElements = get().elements;
          window.parent.postMessage(
            {
              type: "ELEMENTS_UPDATED",
              payload: { elements: currentElements.map(sanitizeElement) },
            },
            "*"
          );
        } catch (error) {
          console.warn("postMessage 직렬화 실패:", error);
        }
      }

      // 3. 데이터베이스 업데이트 (비동기, 실패해도 메모리는 유지)
      try {
        switch (entry.type) {
          case "add": {
            if (entry.data.element) {
              // 부모 요소와 자식 요소들을 모두 데이터베이스에 추가
              const elementsToAdd = [entry.data.element];
              if (
                entry.data.childElements &&
                entry.data.childElements.length > 0
              ) {
                elementsToAdd.push(...entry.data.childElements);
              }

              await supabase
                .from("elements")
                .insert(elementsToAdd.map((el) => sanitizeElement(el)));
              console.log(
                `✅ Redo: 데이터베이스에서 요소 추가 완료 (부모 1개 + 자식 ${
                  entry.data.childElements?.length || 0
                }개)`
              );
            }
            break;
          }

          case "update": {
            // bulk_update는 가짜 ID이므로 데이터베이스 업데이트 건너뛰기
            if (entry.elementId === "bulk_update") {
              console.log(
                "⏭️ bulk_update는 가짜 ID이므로 데이터베이스 업데이트 건너뛰기"
              );
              break;
            }

            if (entry.data.props) {
              const element = findElementById(get().elements, entry.elementId);
              if (element) {
                await supabase
                  .from("elements")
                  .update({ props: { ...element.props, ...entry.data.props } })
                  .eq("id", entry.elementId);
                console.log("✅ Redo: 데이터베이스에서 요소 업데이트 완료");
              }
            }
            break;
          }

          case "remove": {
            // 부모 요소와 자식 요소들을 모두 데이터베이스에서 삭제
            const elementIdsToDelete = [entry.elementId];
            if (
              entry.data.childElements &&
              entry.data.childElements.length > 0
            ) {
              elementIdsToDelete.push(
                ...entry.data.childElements.map((child) => child.id)
              );
            }

            await supabase
              .from("elements")
              .delete()
              .in("id", elementIdsToDelete);
            console.log(
              `✅ Redo: 데이터베이스에서 요소 삭제 완료 (부모 1개 + 자식 ${
                entry.data.childElements?.length || 0
              }개)`
            );
            break;
          }
        }
      } catch (dbError) {
        console.warn("⚠️ 데이터베이스 업데이트 실패 (메모리는 정상):", dbError);
      }

      console.log("✅ Redo 완료");

      // Redo 완료 후 order_num 재정렬 (충돌 해결)
      const { elements, updateElementOrder } = get();
      const pageId = state.currentPageId;
      if (pageId) {
        setTimeout(() => {
          reorderElements(elements, pageId, updateElementOrder);
          console.log("📊 Redo 후 order_num 재정렬 완료");
        }, 100); // 다른 업데이트 완료 후 실행
      }
    } catch (error) {
      console.error("Redo 시 오류:", error);
    } finally {
      // 히스토리 작업 종료 표시
      set({ historyOperationInProgress: false });
    }
  },

  removeElement: async (elementId) => {
    console.log("🗑️ removeElement 시작:", { elementId });
    const state = get();
    const element = findElementById(state.elements, elementId);
    if (!element) {
      console.log("❌ removeElement: 요소를 찾을 수 없음", { elementId });
      return;
    }
    console.log("🔍 삭제할 요소:", {
      id: element.id,
      tag: element.tag,
      props: element.props,
    });

    // 자식 요소들 찾기 (재귀적으로)
    const findChildren = (parentId: string): Element[] => {
      const children = state.elements.filter((el) => el.parent_id === parentId);
      const allChildren: Element[] = [...children];

      // 각 자식의 자식들도 재귀적으로 찾기
      children.forEach((child) => {
        allChildren.push(...findChildren(child.id));
      });

      return allChildren;
    };

    let childElements = findChildren(elementId);

    // Table Column 삭제 시 특별 처리: 연관된 Cell들도 함께 삭제
    if (element.tag === "Column") {
      const tableElement = state.elements.find((el) => {
        const tableHeader = state.elements.find(
          (header) => header.id === element.parent_id
        );
        return (
          tableHeader && el.id === tableHeader.parent_id && el.tag === "Table"
        );
      });

      if (tableElement) {
        // 같은 Table의 TableBody에서 해당 순서의 Cell들 찾기
        const tableBody = state.elements.find(
          (el) => el.parent_id === tableElement.id && el.tag === "TableBody"
        );
        if (tableBody) {
          const rows = state.elements.filter(
            (el) => el.parent_id === tableBody.id && el.tag === "Row"
          );
          const cellsToRemove = rows.flatMap((row) =>
            state.elements.filter(
              (cell) =>
                cell.parent_id === row.id &&
                cell.tag === "Cell" &&
                cell.order_num === element.order_num
            )
          );

          childElements = [...childElements, ...cellsToRemove];
          console.log(
            `🔗 Column 삭제로 인한 연관 Cell 삭제: ${cellsToRemove.length}개`,
            {
              columnOrder: element.order_num,
              cellIds: cellsToRemove.map((c) => c.id),
            }
          );
        }
      }
    }

    // Table Cell 삭제 시 특별 처리: 대응하는 Column도 함께 삭제
    if (element.tag === "Cell") {
      const row = state.elements.find((el) => el.id === element.parent_id);
      if (row && row.tag === "Row") {
        const tableBody = state.elements.find((el) => el.id === row.parent_id);
        if (tableBody && tableBody.tag === "TableBody") {
          const tableElement = state.elements.find(
            (el) => el.id === tableBody.parent_id && el.tag === "Table"
          );
          if (tableElement) {
            // 같은 Table의 TableHeader에서 해당 순서의 Column 찾기
            const tableHeader = state.elements.find(
              (el) =>
                el.parent_id === tableElement.id && el.tag === "TableHeader"
            );
            if (tableHeader) {
              const columnToRemove = state.elements.find(
                (col) =>
                  col.parent_id === tableHeader.id &&
                  col.tag === "Column" &&
                  col.order_num === element.order_num
              );

              if (columnToRemove) {
                // 같은 order_num을 가진 다른 Row들의 Cell들도 함께 삭제
                const allRows = state.elements.filter(
                  (el) => el.parent_id === tableBody.id && el.tag === "Row"
                );
                const otherCellsToRemove = allRows.flatMap((r) =>
                  state.elements.filter(
                    (cell) =>
                      cell.parent_id === r.id &&
                      cell.tag === "Cell" &&
                      cell.order_num === element.order_num &&
                      cell.id !== element.id // 현재 삭제되는 Cell 제외
                  )
                );

                childElements = [
                  ...childElements,
                  columnToRemove,
                  ...otherCellsToRemove,
                ];
                console.log(
                  `🔗 Cell 삭제로 인한 연관 Column 및 다른 Cell 삭제: Column 1개, Cell ${otherCellsToRemove.length}개`,
                  {
                    cellOrder: element.order_num,
                    columnId: columnToRemove.id,
                    otherCellIds: otherCellsToRemove.map((c) => c.id),
                  }
                );
              }
            }
          }
        }
      }
    }

    // Tab 또는 Panel 삭제 시 특별 처리: 연결된 Panel 또는 Tab도 함께 삭제
    if (element.tag === "Tab" || element.tag === "Panel") {
      const tabId = (element.props as { tabId?: string }).tabId;

      console.log(
        `🔍 ${element.tag} 삭제 중 - tabId:`,
        tabId,
        "element.props:",
        element.props
      );

      if (tabId) {
        // Tab을 삭제할 때는 연결된 Panel을 찾아서 삭제
        // Panel을 삭제할 때는 연결된 Tab을 찾아서 삭제
        const parentElement = state.elements.find(
          (el) => el.id === element.parent_id
        );

        console.log(`🔍 부모 요소:`, parentElement?.tag, parentElement?.id);

        if (parentElement && parentElement.tag === "Tabs") {
          // 같은 부모 아래의 모든 Tab/Panel 요소들 확인
          const siblingElements = state.elements.filter(
            (el) => el.parent_id === parentElement.id
          );
          console.log(
            `🔍 형제 요소들:`,
            siblingElements.map((el) => ({
              id: el.id,
              tag: el.tag,
              tabId: (el.props as { tabId?: string }).tabId,
            }))
          );

          const relatedElement = state.elements.find(
            (el) =>
              el.parent_id === parentElement.id &&
              el.tag !== element.tag && // 다른 타입(Tab <-> Panel)
              (el.props as { tabId?: string }).tabId === tabId // 같은 tabId를 가진 요소
          );

          console.log(
            `🔍 연관 요소 찾기 결과:`,
            relatedElement
              ? {
                  id: relatedElement.id,
                  tag: relatedElement.tag,
                  tabId: (relatedElement.props as { tabId?: string }).tabId,
                }
              : "null"
          );

          if (relatedElement) {
            childElements = [...childElements, relatedElement];
            console.log(
              `🔗 ${element.tag} 삭제로 인한 연관 ${relatedElement.tag} 삭제:`,
              {
                tabId,
                deletedElementId: element.id,
                relatedElementId: relatedElement.id,
              }
            );
          } else {
            // tabId가 없는 경우 order_num을 기반으로 연관 요소 찾기 (fallback)
            console.log(
              `⚠️ tabId 기반 연관 요소를 찾을 수 없음. order_num 기반으로 fallback 시도`
            );

            const fallbackRelatedElement = state.elements.find(
              (el) =>
                el.parent_id === parentElement.id &&
                el.tag !== element.tag && // 다른 타입(Tab <-> Panel)
                Math.abs((el.order_num || 0) - (element.order_num || 0)) === 1 // 인접한 order_num
            );

            if (fallbackRelatedElement) {
              childElements = [...childElements, fallbackRelatedElement];
              console.log(
                `🔗 ${element.tag} 삭제로 인한 연관 ${fallbackRelatedElement.tag} 삭제 (order_num 기반):`,
                {
                  deletedElementOrder: element.order_num,
                  relatedElementOrder: fallbackRelatedElement.order_num,
                  deletedElementId: element.id,
                  relatedElementId: fallbackRelatedElement.id,
                }
              );
            }
          }
        }
      } else {
        // tabId가 없는 경우 order_num을 기반으로 연관 요소 찾기
        console.log(
          `⚠️ ${element.tag}에 tabId가 없음. order_num 기반으로 연관 요소 찾기 시도`
        );

        const parentElement = state.elements.find(
          (el) => el.id === element.parent_id
        );

        if (parentElement && parentElement.tag === "Tabs") {
          const relatedElement = state.elements.find(
            (el) =>
              el.parent_id === parentElement.id &&
              el.tag !== element.tag && // 다른 타입(Tab <-> Panel)
              Math.abs((el.order_num || 0) - (element.order_num || 0)) === 1 // 인접한 order_num
          );

          if (relatedElement) {
            childElements = [...childElements, relatedElement];
            console.log(
              `🔗 ${element.tag} 삭제로 인한 연관 ${relatedElement.tag} 삭제 (order_num 기반, tabId 없음):`,
              {
                deletedElementOrder: element.order_num,
                relatedElementOrder: relatedElement.order_num,
                deletedElementId: element.id,
                relatedElementId: relatedElement.id,
              }
            );
          }
        }
      }
    }

    const allElementsToRemove = [element, ...childElements];

    // 중복 제거 (같은 요소가 여러 번 포함될 수 있음)
    const uniqueElementsToRemove = allElementsToRemove.filter(
      (item, index, arr) => arr.findIndex((el) => el.id === item.id) === index
    );
    const elementIdsToRemove = uniqueElementsToRemove.map((el) => el.id);

    console.log(
      `🗑️ 요소 삭제: ${elementId}와 연관 요소 ${
        uniqueElementsToRemove.length - 1
      }개`,
      {
        parent: element.tag,
        relatedElements: uniqueElementsToRemove
          .slice(1)
          .map((child) => ({ id: child.id, tag: child.tag })),
      }
    );

    try {
      // 데이터베이스에서 모든 요소 삭제 (자식 요소들 포함)
      const { error } = await supabase
        .from("elements")
        .delete()
        .in("id", elementIdsToRemove);

      if (error) {
        console.error("데이터베이스 삭제 실패:", error);
        // 외래키 제약조건 오류인 경우 경고만 출력하고 계속 진행
        if (error.code === "23503") {
          console.warn(
            "외래키 제약조건으로 인한 삭제 실패, 메모리에서만 관리:",
            error.message
          );
        } else {
          throw error;
        }
      } else {
        console.log("데이터베이스에서 요소 삭제 완료:", elementIdsToRemove);
      }
    } catch (error) {
      console.error("요소 삭제 중 오류:", error);
      // 데이터베이스 삭제 실패해도 메모리에서는 삭제 진행
    }

    set(
      produce((state: ElementsState) => {
        // 히스토리 추가 (부모 요소와 모든 자식 요소들 정보 저장)
        if (state.currentPageId) {
          historyManager.addEntry({
            type: "remove",
            elementId: elementId,
            data: {
              element: { ...element },
              childElements: uniqueElementsToRemove
                .slice(1)
                .map((child) => ({ ...child })), // 첫 번째는 부모 요소이므로 제외
            },
          });
        }

        // 삭제 전 요소 개수 확인
        const beforeCount = state.elements.length;
        console.log("🔢 삭제 전 요소 개수:", beforeCount);
        console.log("🗑️ 삭제할 요소 ID들:", elementIdsToRemove);

        // Tab/Panel 삭제 시 추가 디버깅 정보
        elementIdsToRemove.forEach((id) => {
          const el = state.elements.find((e) => e.id === id);
          if (el && (el.tag === "Tab" || el.tag === "Panel")) {
            console.log(`🏷️ 삭제될 ${el.tag}:`, {
              id: el.id,
              tag: el.tag,
              tabId: (el.props as { tabId?: string }).tabId,
              title: (el.props as { title?: string }).title,
              order_num: el.order_num,
            });
          }
        });

        // 모든 요소 제거 (부모 + 자식들)
        state.elements = state.elements.filter(
          (el) => !elementIdsToRemove.includes(el.id)
        );

        // 삭제 후 요소 개수 확인
        const afterCount = state.elements.length;
        console.log(
          "🔢 삭제 후 요소 개수:",
          afterCount,
          "(삭제된 개수:",
          beforeCount - afterCount,
          ")"
        );

        // 선택된 요소가 제거된 경우 선택 해제
        if (elementIdsToRemove.includes(state.selectedElementId || "")) {
          state.selectedElementId = null;
          state.selectedElementProps = {};
        }

        // postMessage로 iframe에 전달
        if (typeof window !== "undefined" && window.parent) {
          window.parent.postMessage(
            {
              type: "ELEMENT_REMOVED",
              payload: { elementId: elementIdsToRemove },
            },
            "*"
          );
        }
      })
    );

    // order_num 재정렬 (삭제 후) - 컬렉션 아이템 삭제의 경우 Undo 후에만 재정렬
    const currentPageId = get().currentPageId;
    if (currentPageId) {
      // 컬렉션 컴포넌트의 아이템들 확인
      const isCollectionItem =
        element.tag === "Tab" ||
        element.tag === "Panel" ||
        element.tag === "ListBoxItem" ||
        element.tag === "GridListItem" ||
        element.tag === "MenuItem" ||
        element.tag === "ComboBoxItem" ||
        element.tag === "SelectItem" ||
        element.tag === "TreeItem" ||
        element.tag === "ToggleButton";

      if (isCollectionItem) {
        console.log(`⏸️ ${element.tag} 삭제 - Undo 후까지 재정렬 지연`);
        // 컬렉션 아이템 삭제 시에는 즉시 재정렬하지 않음 (Undo 후에만 재정렬)
        // 이렇게 하면 삭제 → Undo 과정에서 순서 변경이 한 번만 보임
      } else {
        setTimeout(() => {
          const { elements, updateElementOrder } = get();
          reorderElements(elements, currentPageId, updateElementOrder);
        }, 100); // 일반 요소는 기존처럼 재정렬
      }
    }
  },

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
});

// 기존 호환성을 위한 useStore export
export const useStore = create<ElementsState>(createElementsSlice);
