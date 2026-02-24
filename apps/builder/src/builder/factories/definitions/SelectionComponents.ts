import { ComponentElementProps } from "../../../types/core/store.types";
import { HierarchyManager } from "../../utils/HierarchyManager";
import { ComponentDefinition, ComponentCreationContext } from "../types";

/**
 * Select 컴포넌트 정의
 */
export function createSelectDefinition(
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
    tag: "Select",
    parent: {
      tag: "Select",
      props: {
        label: "Select",
        placeholder: "Choose an option...",
        selectedKey: undefined,
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "Label",
        props: {
          children: "Select",
          style: { fontSize: 14, fontWeight: 500, width: 'fit-content' },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 0,
      },
      {
        tag: "SelectTrigger",
        props: {
          style: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            backgroundColor: 'transparent',
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
        children: [
          {
            tag: "SelectValue",
            props: {
              children: "Choose an option...",
              style: { flex: 1, fontSize: 14, backgroundColor: 'transparent' },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 0,
          },
          {
            tag: "SelectIcon",
            props: {
              children: "",
              style: { width: 18, height: 18, flexShrink: 0, backgroundColor: 'transparent' },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 1,
          },
        ],
      },
      {
        tag: "SelectItem",
        props: {
          label: "Option 1",
          value: "option1",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
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
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  // ⭐ Layout/Slot System
  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

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
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "Label",
        props: {
          children: "Combo Box",
          style: { fontSize: 14, fontWeight: 500, width: 'fit-content' },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 0,
      },
      {
        tag: "ComboBoxWrapper",
        props: {
          style: {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            backgroundColor: 'transparent',
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
        children: [
          {
            tag: "ComboBoxInput",
            props: {
              children: "",
              placeholder: "Type or select...",
              style: { flex: 1, fontSize: 14, backgroundColor: 'transparent' },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 0,
          },
          {
            tag: "ComboBoxTrigger",
            props: {
              children: "",
              style: { width: 18, height: 18, flexShrink: 0, backgroundColor: 'transparent' },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 1,
          },
        ],
      },
      {
        tag: "ComboBoxItem",
        props: {
          label: "Option 1",
          value: "option1",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
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
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  // ⭐ Layout/Slot System
  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

  return {
    tag: "ListBox",
    parent: {
      tag: "ListBox",
      props: {
        orientation: "vertical",
        selectionMode: "single",
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "ListBoxItem",
        props: {
          children: "Item 1",
          value: "item1",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "ListBoxItem",
        props: {
          children: "Item 2",
          value: "item2",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
      },
      {
        tag: "ListBoxItem",
        props: {
          children: "Item 3",
          value: "item3",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 3,
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
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  // ⭐ Layout/Slot System
  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

  return {
    tag: "GridList",
    parent: {
      tag: "GridList",
      props: {
        selectionMode: "none",
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "GridListItem",
        props: {
          children: "Item 1",
          value: "item1",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "GridListItem",
        props: {
          children: "Item 2",
          value: "item2",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
      },
      {
        tag: "GridListItem",
        props: {
          children: "Item 3",
          value: "item3",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 3,
      },
      {
        tag: "GridListItem",
        props: {
          children: "Item 4",
          value: "item4",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 4,
      },
    ],
  };
}

/**
 * List 컴포넌트 정의
 */
export function createListDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

  return {
    tag: "List",
    parent: {
      tag: "List",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 4,
        },
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "ListItem",
        props: {
          children: "Item 1",
          style: { fontSize: 14 },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "ListItem",
        props: {
          children: "Item 2",
          style: { fontSize: 14 },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
      },
      {
        tag: "ListItem",
        props: {
          children: "Item 3",
          style: { fontSize: 14 },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 3,
      },
    ],
  };
}
