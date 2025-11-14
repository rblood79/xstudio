import { Element, ComponentElementProps } from "../../../types/core/store.types";
import { supabase } from "../../../env/supabase.client";

/**
 * Helper function to safely get a string property from element props
 */
function getPropValue(props: ComponentElementProps | Record<string, unknown>, key: string): string {
  const value = (props as Record<string, unknown>)[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value != null && typeof value === 'object' && 'toString' in value) {
    return String(value);
  }
  return '';
}

/**
 * Helper function to get text content for sorting (children, title, or label)
 */
function getTextContent(props: ComponentElementProps | Record<string, unknown>): string {
  return getPropValue(props, 'children') ||
         getPropValue(props, 'title') ||
         getPropValue(props, 'label');
}

/**
 * order_num 재정렬 유틸리티 함수
 *
 * 페이지의 모든 요소를 부모별로 그룹화하여 order_num을 재정렬합니다.
 * 특별 정렬 로직:
 * - Tabs: Tab-Panel 쌍을 tabId 기반으로 정렬
 * - Collection 컴포넌트: 아이템을 order_num, 텍스트 순으로 정렬
 * - TableHeader: ColumnGroup을 order_num, label 순으로 정렬
 */
export const reorderElements = async (
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
            const titleA = getPropValue(a.props, 'title');
            const titleB = getPropValue(b.props, 'title');
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
            const titleA = getPropValue(a.props, 'title');
            const titleB = getPropValue(b.props, 'title');
            return titleA.localeCompare(titleB);
          }
          return orderDiff;
        });

      sorted = [];
      const usedPanelIds = new Set<string>();

      tabs.forEach((tab) => {
        sorted.push(tab);

        // Tab의 tabId와 일치하는 Panel 찾기
        const tabId = getPropValue(tab.props, 'tabId');
        if (tabId) {
          const matchingPanel = panels.find((panel) => {
            const panelTabId = getPropValue(panel.props, 'tabId');
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
        const title = getPropValue(tab.props, 'title');
        const tabId = getPropValue(tab.props, 'tabId');
        console.log(
          `  ${index + 1}. ${title} (order: ${tab.order_num}, tabId: ${tabId.slice(0, 8)}...)`
        );
      });
      console.log("📋 최종 정렬된 순서:");
      sorted.forEach((el, index) => {
        const title = getPropValue(el.props, 'title');
        console.log(
          `  ${index + 1}. ${el.tag}: ${title} (new order: ${index + 1})`
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
          const labelA = getPropValue(a.props, 'label');
          const labelB = getPropValue(b.props, 'label');
          const comparison = labelA.localeCompare(labelB);

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
        const label = getPropValue(group.props, 'label') || "Untitled";
        const span = getPropValue(group.props, 'span') || "1";
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
          const textA = getTextContent(a.props);
          const textB = getTextContent(b.props);
          const comparison = textA.localeCompare(textB);

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
        const text = getTextContent(item.props) || "Untitled";
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
              const text = getTextContent(el.props) || "Untitled";
              const extraInfo =
                el.tag === "Tab" || el.tag === "Panel"
                  ? `, tabId: ${getPropValue(el.props, 'tabId')}`
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
