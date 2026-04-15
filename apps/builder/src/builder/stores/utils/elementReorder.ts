import {
  Element,
  ComponentElementProps,
} from "../../../types/core/store.types";
import { supabase } from "../../../env/supabase.client";

/**
 * Helper function to safely get a string property from element props
 */
function getPropValue(
  props: ComponentElementProps | Record<string, unknown>,
  key: string,
): string {
  const value = (props as Record<string, unknown>)[key];
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value != null && typeof value === "object" && "toString" in value) {
    return String(value);
  }
  return "";
}

/**
 * Helper function to get text content for sorting (children, title, or label)
 */
function getTextContent(
  props: ComponentElementProps | Record<string, unknown>,
): string {
  return (
    getPropValue(props, "children") ||
    getPropValue(props, "title") ||
    getPropValue(props, "label")
  );
}

/**
 * order_num 재정렬 업데이트 계산 (순수 함수 — side effect 없음)
 *
 * 페이지의 모든 요소를 부모별로 그룹화하여 올바른 order_num을 계산합니다.
 * 변경이 필요한 요소들만 { id, order_num } 배열로 반환합니다.
 *
 * 특별 정렬 로직:
 * - Tabs: Tab-Panel 쌍을 tabId 기반으로 정렬
 * - Collection 컴포넌트: 아이템을 order_num, 텍스트 순으로 정렬
 * - TableHeader: ColumnGroup을 order_num, label 순으로 정렬
 */
export function computeReorderUpdates(
  elements: Element[],
  pageId: string,
): Array<{ id: string; order_num: number }> {
  // 페이지별, 부모별로 그룹화
  const groups = elements
    .filter((el) => el.page_id === pageId)
    .reduce(
      (acc, element) => {
        const key = element.parent_id || "root";
        if (!acc[key]) acc[key] = [];
        acc[key].push(element);
        return acc;
      },
      {} as Record<string, Element[]>,
    );

  const updates: Array<{ id: string; order_num: number }> = [];

  // 각 그룹별로 order_num 재정렬
  Object.entries(groups).forEach(([parentKey, children]) => {
    let sorted: Element[];

    // 부모 요소 확인
    const parentElement = elements.find(
      (el) => el.id === (parentKey === "root" ? null : parentKey),
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

    if (isTabsChildren) {
      // Tabs 하위의 Tab과 Panel을 tabId 기반으로 쌍을 맞춰서 정렬
      const tabs = children
        .filter((el) => el.tag === "Tab")
        .sort((a, b) => {
          const orderDiff = (a.order_num || 0) - (b.order_num || 0);
          if (orderDiff === 0) {
            const titleA = getPropValue(a.props, "title");
            const titleB = getPropValue(b.props, "title");
            return titleA.localeCompare(titleB);
          }
          return orderDiff;
        });

      const panels = children
        .filter((el) => el.tag === "TabPanel")
        .sort((a, b) => {
          const orderDiff = (a.order_num || 0) - (b.order_num || 0);
          if (orderDiff === 0) {
            const titleA = getPropValue(a.props, "title");
            const titleB = getPropValue(b.props, "title");
            return titleA.localeCompare(titleB);
          }
          return orderDiff;
        });

      sorted = [];
      const usedPanelIds = new Set<string>();

      tabs.forEach((tab) => {
        sorted.push(tab);
        const tabId = getPropValue(tab.props, "tabId");
        if (tabId) {
          const matchingPanel = panels.find((panel) => {
            const panelTabId = getPropValue(panel.props, "tabId");
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
    } else if (isTableHeaderChildren) {
      sorted = [...children].sort((a, b) => {
        const orderDiff = (a.order_num || 0) - (b.order_num || 0);
        if (orderDiff === 0) {
          const labelA = getPropValue(a.props, "label");
          const labelB = getPropValue(b.props, "label");
          const comparison = labelA.localeCompare(labelB);
          if (comparison === 0) {
            return a.id.localeCompare(b.id);
          }
          return comparison;
        }
        return orderDiff;
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
      sorted = [...children].sort((a, b) => {
        const orderDiff = (a.order_num || 0) - (b.order_num || 0);
        if (orderDiff === 0) {
          const textA = getTextContent(a.props);
          const textB = getTextContent(b.props);
          const comparison = textA.localeCompare(textB);
          if (comparison === 0) {
            return a.id.localeCompare(b.id);
          }
          return comparison;
        }
        return orderDiff;
      });
    } else {
      // 일반적인 정렬
      sorted = [...children].sort((a, b) => {
        const orderDiff = (a.order_num || 0) - (b.order_num || 0);
        if (orderDiff === 0) {
          return a.id.localeCompare(b.id);
        }
        return orderDiff;
      });
    }

    sorted.forEach((child, index) => {
      // order_num은 0부터 시작 (0-based indexing)
      const newOrderNum = index;
      if (child.order_num !== newOrderNum) {
        updates.push({ id: child.id, order_num: newOrderNum });
      }
    });
  });

  return updates;
}

/**
 * order_num 재정렬 실행 함수
 *
 * computeReorderUpdates()로 계산된 업데이트를 batch로 적용합니다.
 * - 메모리: batchUpdateElementOrders() 단일 set() 호출
 * - DB: Supabase 일괄 업데이트 (백그라운드)
 */
export const reorderElements = async (
  elements: Element[],
  pageId: string,
  batchUpdateElementOrders: (
    updates: Array<{ id: string; order_num: number }>,
  ) => void,
): Promise<void> => {
  const updates = computeReorderUpdates(elements, pageId);

  if (updates.length === 0) return;

  // 1. 메모리 일괄 업데이트 (단일 set())
  batchUpdateElementOrders(updates);

  // 2. 데이터베이스 일괄 업데이트 (백그라운드)
  try {
    const updatePromises = updates.map((update) =>
      supabase
        .from("elements")
        .update({ order_num: update.order_num })
        .eq("id", update.id),
    );

    const results = await Promise.all(updatePromises);

    const errors = results.filter((result) => result.error);
    if (errors.length > 0) {
      console.error(
        "order_num 재정렬 DB 실패:",
        errors.map((e) => e.error),
      );
    }
  } catch (error) {
    console.error("order_num 재정렬 중 오류:", error);
  }
};
