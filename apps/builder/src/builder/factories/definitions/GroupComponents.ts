import { ComponentElementProps } from "../../../types/core/store.types";
import { HierarchyManager } from "../../utils/HierarchyManager";
import { ComponentDefinition, ComponentCreationContext } from "../types";

/**
 * Group 컴포넌트 정의 (Element Grouping Container)
 * Phase 4: Grouping & Organization
 */
export function createGroupDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  // ⭐ Layout/Slot System: layoutId가 있으면 layout_id 사용, 없으면 page_id 사용
  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

  return {
    tag: "Group",
    parent: {
      tag: "Group",
      props: {
        label: "Element Group",
        style: {
          display: "block",
          position: "relative",
        },
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [],
  };
}

/**
 * ToggleButtonGroup 컴포넌트 정의
 */
export function createToggleButtonGroupDefinition(
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
        style: {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          width: "fit-content",
        },
      } as ComponentElementProps,
      ...ownerFields,
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
        ...ownerFields,
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
        ...ownerFields,
        order_num: 2,
      },
    ],
  };
}

/**
 * Switcher 컴포넌트 정의 (탭형 전환)
 *
 * CSS DOM 구조:
 * Switcher (parent, tag="Switcher", flex row)
 *   ├─ ToggleButton (tag="ToggleButton", children="Tab 1", transparent bg)
 *   └─ ToggleButton (tag="ToggleButton", children="Tab 2", transparent bg)
 */
export function createSwitcherDefinition(
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
    tag: "Switcher",
    parent: {
      tag: "Switcher",
      props: {
        items: ["Tab 1", "Tab 2"],
        activeIndex: 0,
        isDisabled: false,
        style: {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          width: 240,
          height: 40,
        },
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "ToggleButton",
        props: {
          children: "Tab 1",
          isSelected: true,
          isDisabled: false,
          style: {
            flex: 1,
            backgroundColor: 'transparent',
            textAlign: 'center',
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "ToggleButton",
        props: {
          children: "Tab 2",
          isSelected: false,
          isDisabled: false,
          style: {
            flex: 1,
            backgroundColor: 'transparent',
            textAlign: 'center',
          },
        } as ComponentElementProps,
        ...ownerFields,
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
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  // ⭐ Layout/Slot System
  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

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
      ...ownerFields,
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
          style: {
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "Checkbox",
        props: {
          children: "Option 2",
          isSelected: false,
          isDisabled: false,
          style: {
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          },
        } as ComponentElementProps,
        ...ownerFields,
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
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  // ⭐ Layout/Slot System
  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

  return {
    tag: "RadioGroup",
    parent: {
      tag: "RadioGroup",
      props: {
        label: "Radio Group",
        orientation: "vertical",
        value: "",
      } as ComponentElementProps,
      ...ownerFields,
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
          style: {
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "Radio",
        props: {
          children: "Option 2",
          value: "option2",
          isDisabled: false,
          style: {
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          },
        } as ComponentElementProps,
        ...ownerFields,
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
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  // ⭐ Layout/Slot System
  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

  // 웹 CSS 구조: TagGroup (column) → Label + TagList (row wrap) → Tags
  return {
    tag: "TagGroup",
    parent: {
      tag: "TagGroup",
      props: {
        label: "Tag Group",
        allowsRemoving: false,
        selectionMode: "multiple",
        style: { display: "flex", flexDirection: "column", gap: 2, width: "fit-content" },
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "Label",
        props: {
          children: "Tag Group",
          style: { fontSize: 14, fontWeight: 500, width: 'fit-content' },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "TagList",
        props: {
          style: { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 4 },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
        children: [
          {
            tag: "Tag",
            props: {
              children: "Tag 1",
              isDisabled: false,
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 1,
          },
          {
            tag: "Tag",
            props: {
              children: "Tag 2",
              isDisabled: false,
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
 * Breadcrumbs 컴포넌트 정의
 */
export function createBreadcrumbsDefinition(
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
    tag: "Breadcrumbs",
    parent: {
      tag: "Breadcrumbs",
      props: {
        "aria-label": "Breadcrumbs",
        isDisabled: false,
      } as ComponentElementProps,
      ...ownerFields,
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
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "Breadcrumb",
        props: {
          children: "Category",
          href: "/category",
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
      },
      {
        tag: "Breadcrumb",
        props: {
          children: "Page",
          href: "/category/page",
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 3,
      },
    ],
  };
}

/**
 * Checkbox 복합 컴포넌트 정의
 *
 * CSS DOM 구조:
 * Checkbox (parent, tag="Checkbox", flex row, alignItems center)
 *   └─ Label (tag="Label", children="Checkbox")
 */
export function createCheckboxDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

  return {
    tag: "Checkbox",
    parent: {
      tag: "Checkbox",
      props: {
        children: "Checkbox",
        isSelected: false,
        isDisabled: false,
        isIndeterminate: false,
        style: {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        },
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "Label",
        props: {
          children: "Checkbox",
          style: {
            fontSize: 14,
            backgroundColor: 'transparent',
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
    ],
  };
}

/**
 * Radio 복합 컴포넌트 정의
 *
 * CSS DOM 구조:
 * Radio (parent, tag="Radio", flex row, alignItems center)
 *   └─ Label (tag="Label", children="Radio")
 */
export function createRadioDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

  return {
    tag: "Radio",
    parent: {
      tag: "Radio",
      props: {
        children: "Radio",
        value: "radio",
        isSelected: false,
        isDisabled: false,
        style: {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        },
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "Label",
        props: {
          children: "Radio",
          style: {
            fontSize: 14,
            backgroundColor: 'transparent',
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
    ],
  };
}

/**
 * Switch 복합 컴포넌트 정의
 *
 * CSS DOM 구조:
 * Switch (parent, tag="Switch", flex row, alignItems center)
 *   └─ Label (tag="Label", children="Switch")
 */
export function createSwitchDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

  return {
    tag: "Switch",
    parent: {
      tag: "Switch",
      props: {
        children: "Switch",
        isSelected: false,
        isDisabled: false,
        style: {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        },
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "Label",
        props: {
          children: "Switch",
          style: {
            fontSize: 14,
            backgroundColor: 'transparent',
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
    ],
  };
}
