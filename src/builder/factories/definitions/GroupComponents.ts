import { ComponentElementProps } from "../../../types/core/store.types";
import { HierarchyManager } from "../../utils/HierarchyManager";
import { ComponentDefinition, ComponentCreationContext } from "../types";

/**
 * ToggleButtonGroup 컴포넌트 정의
 */
export function createToggleButtonGroupDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  return {
    tag: "ToggleButtonGroup",
    parent: {
      tag: "ToggleButtonGroup",
      props: {
        tag: "ToggleButtonGroup",
        variant: "default",
        size: "sm",
        orientation: "horizontal",
        selectionMode: "single",
        value: [],
      } as ComponentElementProps,
      page_id: pageId,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "ToggleButton",
        props: {
          children: "Toggle 1",
          variant: "default",
          size: "sm",
          isSelected: false,
          isDisabled: false,
        } as ComponentElementProps,
        page_id: pageId,
        order_num: 1,
      },
      {
        tag: "ToggleButton",
        props: {
          children: "Toggle 2",
          variant: "default",
          size: "sm",
          isSelected: false,
          isDisabled: false,
        } as ComponentElementProps,
        page_id: pageId,
        order_num: 2,
      },
    ],
  };
}

/**
 * CheckboxGroup 컴포넌트 정의
 */
export function createCheckboxGroupDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  return {
    tag: "CheckboxGroup",
    parent: {
      tag: "CheckboxGroup",
      props: {
        tag: "CheckboxGroup",
        label: "Checkbox Group",
        orientation: "vertical",
        value: [],
      } as ComponentElementProps,
      page_id: pageId,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "Checkbox",
        props: {
          children: "Option 1",
          isSelected: false,
          isDisabled: false,
        } as ComponentElementProps,
        page_id: pageId,
        order_num: 1,
      },
      {
        tag: "Checkbox",
        props: {
          children: "Option 2",
          isSelected: false,
          isDisabled: false,
        } as ComponentElementProps,
        page_id: pageId,
        order_num: 2,
      },
    ],
  };
}

/**
 * RadioGroup 컴포넌트 정의
 */
export function createRadioGroupDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  return {
    tag: "RadioGroup",
    parent: {
      tag: "RadioGroup",
      props: {
        label: "Radio Group",
        orientation: "vertical",
        value: "",
      } as ComponentElementProps,
      page_id: pageId,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "Radio",
        props: {
          children: "Option 1",
          value: "option1",
          isDisabled: false,
        } as ComponentElementProps,
        page_id: pageId,
        order_num: 1,
      },
      {
        tag: "Radio",
        props: {
          children: "Option 2",
          value: "option2",
          isDisabled: false,
        } as ComponentElementProps,
        page_id: pageId,
        order_num: 2,
      },
    ],
  };
}

/**
 * TagGroup 컴포넌트 정의
 */
export function createTagGroupDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  return {
    tag: "TagGroup",
    parent: {
      tag: "TagGroup",
      props: {
        label: "Tag Group",
        allowsRemoving: false,
        selectionMode: "multiple",
      } as ComponentElementProps,
      page_id: pageId,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "Tag",
        props: {
          children: "Tag 1",
          isDisabled: false,
        } as ComponentElementProps,
        page_id: pageId,
        order_num: 1,
      },
      {
        tag: "Tag",
        props: {
          children: "Tag 2",
          isDisabled: false,
        } as ComponentElementProps,
        page_id: pageId,
        order_num: 2,
      },
    ],
  };
}

/**
 * Breadcrumbs 컴포넌트 정의
 */
export function createBreadcrumbsDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  return {
    tag: "Breadcrumbs",
    parent: {
      tag: "Breadcrumbs",
      props: {
        "aria-label": "Breadcrumbs",
        isDisabled: false,
      } as ComponentElementProps,
      page_id: pageId,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "Breadcrumb",
        props: {
          children: "Home",
          href: "/",
        } as ComponentElementProps,
        page_id: pageId,
        order_num: 1,
      },
      {
        tag: "Breadcrumb",
        props: {
          children: "Category",
          href: "/category",
        } as ComponentElementProps,
        page_id: pageId,
        order_num: 2,
      },
      {
        tag: "Breadcrumb",
        props: {
          children: "Page",
          href: "/category/page",
        } as ComponentElementProps,
        page_id: pageId,
        order_num: 3,
      },
    ],
  };
}
