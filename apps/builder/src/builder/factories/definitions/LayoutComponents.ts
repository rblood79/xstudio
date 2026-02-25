import { ComponentElementProps } from "../../../types/core/store.types";
import { ElementUtils } from "../../../utils/element/elementUtils";
import { HierarchyManager } from "../../utils/HierarchyManager";
import { ComponentDefinition, ComponentCreationContext } from "../types";

/**
 * Tabs 컴포넌트 정의
 */
export function createTabsDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  // 초기 Tab들을 위한 UUID 생성
  const tab1Id = ElementUtils.generateId();
  const tab2Id = ElementUtils.generateId();

  // ⭐ Layout/Slot System
  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

  return {
    tag: "Tabs",
    parent: {
      tag: "Tabs",
      props: {
        defaultSelectedKey: tab1Id,
        orientation: "horizontal",
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "TabList",
        props: {
          style: {
            display: "flex",
            flexDirection: "row",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
        children: [
          {
            tag: "Tab",
            props: {
              title: "Tab 1",
              tabId: tab1Id,
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 1,
          },
          {
            tag: "Tab",
            props: {
              title: "Tab 2",
              tabId: tab2Id,
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 2,
          },
        ],
      },
      {
        tag: "TabPanels",
        props: {
          style: {
            display: "flex",
            flexDirection: "column",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
        children: [
          {
            tag: "Panel",
            props: {
              title: "Panel 1",
              variant: "tab",
              tabId: tab1Id,
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 1,
          },
          {
            tag: "Panel",
            props: {
              title: "Panel 2",
              variant: "tab",
              tabId: tab2Id,
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 2,
          },
        ],
      },
    ],
  };
}

/**
 * Card 컴포넌트 정의
 *
 * Card를 복합 컴포넌트로 생성하여 title(Heading)과 description(p)을
 * 별도 Element로 관리합니다.
 * → 더블클릭으로 자식 선택, 레이어 트리에서 계층 구조 확인 가능
 */
export function createCardDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  // ⭐ Layout/Slot System
  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

  return {
    tag: "Card",
    parent: {
      tag: "Card",
      props: {
        variant: "default",
        size: "md",
        orientation: "vertical",
        title: "Card Title",
        description: "Card description text goes here.",
        style: {
          display: "flex",
          flexDirection: "column",
          padding: "16px",
          borderWidth: "1px",
          gap: "8px",
        },
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "CardHeader",
        props: {
          style: {
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "8px",
            width: "100%",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
        children: [
          {
            tag: "Heading",
            props: {
              children: "Card Title",
              level: 3,
              className: "card-title",
              style: {
                display: "block",
                fontSize: "16px",
                fontWeight: "600",
                lineHeight: "1.4",
                margin: "0",
                flex: 1,
              },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 1,
          },
        ],
      },
      {
        tag: "CardContent",
        props: {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            width: "100%",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
        children: [
          {
            tag: "Description",
            props: {
              children: "Card description text goes here.",
              style: {
                display: "block",
                fontSize: "14px",
                fontWeight: "400",
                lineHeight: "1.5",
                color: "#49454f",
              },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 1,
          },
        ],
      },
    ],
  };
}

/**
 * Tree 컴포넌트 정의
 */
export function createTreeDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  // ⭐ Layout/Slot System
  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

  return {
    tag: "Tree",
    parent: {
      tag: "Tree",
      props: {
        "aria-label": "Tree",
        selectionMode: "single",
        selectionBehavior: "replace",
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "TreeItem",
        props: {
          title: "Node 1",
          hasChildren: true,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "TreeItem",
        props: {
          title: "Node 2",
          hasChildren: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
      },
    ],
  };
}
