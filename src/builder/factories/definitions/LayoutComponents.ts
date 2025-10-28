import { ComponentElementProps } from "../../../types/store";
import { ElementUtils } from "../../../utils/elementUtils";
import { HierarchyManager } from "../../utils/HierarchyManager";
import { ComponentDefinition, ComponentCreationContext } from "../types";

/**
 * Tabs 컴포넌트 정의
 */
export function createTabsDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  // 초기 Tab들을 위한 UUID 생성
  const tab1Id = ElementUtils.generateId();
  const tab2Id = ElementUtils.generateId();

  return {
    tag: "Tabs",
    parent: {
      tag: "Tabs",
      props: {
        defaultSelectedKey: tab1Id,
        orientation: "horizontal",
      } as ComponentElementProps,
      page_id: pageId,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "Tab",
        props: {
          title: "Tab 1",
          tabId: tab1Id,
        } as ComponentElementProps,
        page_id: pageId,
        order_num: 1,
      },
      {
        tag: "Panel",
        props: {
          title: "Panel 1",
          variant: "tab",
          tabId: tab1Id,
        } as ComponentElementProps,
        page_id: pageId,
        order_num: 2,
      },
      {
        tag: "Tab",
        props: {
          title: "Tab 2",
          tabId: tab2Id,
        } as ComponentElementProps,
        page_id: pageId,
        order_num: 3,
      },
      {
        tag: "Panel",
        props: {
          title: "Panel 2",
          variant: "tab",
          tabId: tab2Id,
        } as ComponentElementProps,
        page_id: pageId,
        order_num: 4,
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
  const { parentElement, pageId, elements } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  return {
    tag: "Tree",
    parent: {
      tag: "Tree",
      props: {
        "aria-label": "Tree",
        selectionMode: "single",
        selectionBehavior: "replace",
      } as ComponentElementProps,
      page_id: pageId,
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
        page_id: pageId,
        order_num: 1,
      },
      {
        tag: "TreeItem",
        props: {
          title: "Node 2",
          hasChildren: false,
        } as ComponentElementProps,
        page_id: pageId,
        order_num: 2,
      },
    ],
  };
}

/**
 * PanelGroup 컴포넌트 정의 (크기 조정 가능한 패널)
 */
export function createPanelGroupDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  // 패널 ID 생성
  const panel1Id = ElementUtils.generateId();
  const panel2Id = ElementUtils.generateId();

  return {
    tag: "PanelGroup",
    parent: {
      tag: "PanelGroup",
      props: {
        direction: "horizontal",
      } as ComponentElementProps,
      page_id: pageId,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "ResizablePanel",
        props: {
          id: panel1Id,
          defaultSize: 50,
          minSize: 20,
          maxSize: 80,
        } as ComponentElementProps,
        page_id: pageId,
        order_num: 1,
      },
      {
        tag: "PanelResizeHandle",
        props: {} as ComponentElementProps,
        page_id: pageId,
        order_num: 2,
      },
      {
        tag: "ResizablePanel",
        props: {
          id: panel2Id,
          defaultSize: 50,
          minSize: 20,
          maxSize: 80,
        } as ComponentElementProps,
        page_id: pageId,
        order_num: 3,
      },
    ],
  };
}
