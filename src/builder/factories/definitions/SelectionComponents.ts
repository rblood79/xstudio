import { ComponentElementProps } from "../../../types/core/store.types";
import { HierarchyManager } from "../../utils/HierarchyManager";
import { ComponentDefinition, ComponentCreationContext } from "../types";

/**
 * Select 컴포넌트 정의
 */
export function createSelectDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  return {
    tag: "Select",
    parent: {
      tag: "Select",
      props: {
        label: "Select",
        placeholder: "Choose an option...",
        selectedKey: undefined,
      } as ComponentElementProps,
      page_id: pageId,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "SelectItem",
        props: {
          label: "Option 1",
          value: "option1",
          isDisabled: false,
        } as ComponentElementProps,
        page_id: pageId,
        order_num: 1,
      },
    ],
  };
}

/**
 * ComboBox 컴포넌트 정의
 */
export function createComboBoxDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  return {
    tag: "ComboBox",
    parent: {
      tag: "ComboBox",
      props: {
        label: "Combo Box",
        placeholder: "Type or select...",
        inputValue: "",
        allowsCustomValue: true,
        selectedKey: undefined,
      } as ComponentElementProps,
      page_id: pageId,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "ComboBoxItem",
        props: {
          label: "Option 1",
          value: "option1",
          isDisabled: false,
        } as ComponentElementProps,
        page_id: pageId,
        order_num: 1,
      },
    ],
  };
}

/**
 * ListBox 컴포넌트 정의
 */
export function createListBoxDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  return {
    tag: "ListBox",
    parent: {
      tag: "ListBox",
      props: {
        orientation: "vertical",
        selectionMode: "single",
      } as ComponentElementProps,
      page_id: pageId,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "ListBoxItem",
        props: {
          label: "Item 1",
          value: "item1",
          isDisabled: false,
        } as ComponentElementProps,
        page_id: pageId,
        order_num: 1,
      },
    ],
  };
}

/**
 * GridList 컴포넌트 정의
 */
export function createGridListDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  return {
    tag: "GridList",
    parent: {
      tag: "GridList",
      props: {
        selectionMode: "none",
      } as ComponentElementProps,
      page_id: pageId,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "GridListItem",
        props: {
          label: "Item 1",
          value: "item1",
          isDisabled: false,
        } as ComponentElementProps,
        page_id: pageId,
        order_num: 1,
      },
    ],
  };
}
