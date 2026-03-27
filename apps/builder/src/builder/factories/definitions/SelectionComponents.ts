import { ComponentElementProps } from "../../../types/core/store.types";
import { HierarchyManager } from "../../utils/HierarchyManager";
import { ComponentDefinition, ComponentCreationContext } from "../types";

/**
 * Select 컴포넌트 정의
 */
export function createSelectDefinition(
  context: ComponentCreationContext,
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
        name: "",
        placeholder: "Choose an option...",
        selectedKey: undefined,
        isDisabled: false,
        isInvalid: false,
        isReadOnly: false,
        isRequired: false,
        style: {
          width: "100%",
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
          children: "Select",
          style: {
            fontSize: 14,
            fontWeight: 500,
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 0,
      },
      {
        tag: "SelectTrigger",
        props: {
          style: {
            width: "100%",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
        children: [
          {
            tag: "SelectValue",
            props: {
              placeholder: "Choose an option...",
              style: { flex: 1, fontSize: 14 },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 0,
          },
          {
            tag: "SelectIcon",
            props: {
              children: "",
              style: { width: 18, height: 18, flexShrink: 0 },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 1,
          },
        ],
      },
      {
        tag: "SelectItem",
        props: {
          label: "Aardvark",
          value: "aardvark",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
      },
      {
        tag: "SelectItem",
        props: {
          label: "Cat",
          value: "cat",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 3,
      },
      {
        tag: "SelectItem",
        props: {
          label: "Dog",
          value: "dog",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 4,
      },
      {
        tag: "SelectItem",
        props: {
          label: "Kangaroo",
          value: "kangaroo",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 5,
      },
    ],
  };
}

/**
 * ComboBox 컴포넌트 정의
 */
export function createComboBoxDefinition(
  context: ComponentCreationContext,
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
        name: "",
        placeholder: "Type or select...",
        inputValue: "",
        allowsCustomValue: true,
        selectedKey: undefined,
        isDisabled: false,
        isInvalid: false,
        isReadOnly: false,
        isRequired: false,
        style: {
          width: "100%",
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
          children: "Combo Box",
          style: {
            fontSize: 14,
            fontWeight: 500,
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 0,
      },
      {
        tag: "ComboBoxWrapper",
        props: {
          style: {
            width: "100%",
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
              style: { flex: 1, fontSize: 14 },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 0,
          },
          {
            tag: "ComboBoxTrigger",
            props: {
              children: "",
              style: { width: 18, height: 18, flexShrink: 0 },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 1,
          },
        ],
      },
      {
        tag: "ComboBoxItem",
        props: {
          label: "Aardvark",
          value: "aardvark",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
      },
      {
        tag: "ComboBoxItem",
        props: {
          label: "Cat",
          value: "cat",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 3,
      },
      {
        tag: "ComboBoxItem",
        props: {
          label: "Dog",
          value: "dog",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 4,
      },
      {
        tag: "ComboBoxItem",
        props: {
          label: "Kangaroo",
          value: "kangaroo",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 5,
      },
    ],
  };
}

/**
 * ListBox 컴포넌트 정의
 * React Aria Composition 패턴: ListBoxItem 내부에 Text 자식 Element 조합
 */
export function createListBoxDefinition(
  context: ComponentCreationContext,
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
          textValue: "Aardvark",
          value: "aardvark",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
        children: [
          {
            tag: "Text",
            props: {
              children: "Aardvark",
              style: { fontSize: 14, fontWeight: 500 },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 0,
          },
          {
            tag: "Description",
            props: {
              children: "A nocturnal burrowing mammal",
              style: { fontSize: 12 },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 1,
          },
        ],
      },
      {
        tag: "ListBoxItem",
        props: {
          textValue: "Cat",
          value: "cat",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
        children: [
          {
            tag: "Text",
            props: {
              children: "Cat",
              style: { fontSize: 14, fontWeight: 500 },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 0,
          },
          {
            tag: "Description",
            props: {
              children: "A small domesticated carnivore",
              style: { fontSize: 12 },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 1,
          },
        ],
      },
      {
        tag: "ListBoxItem",
        props: {
          textValue: "Kangaroo",
          value: "kangaroo",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 3,
        children: [
          {
            tag: "Text",
            props: {
              children: "Kangaroo",
              style: { fontSize: 14, fontWeight: 500 },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 0,
          },
          {
            tag: "Description",
            props: {
              children: "A large marsupial native to Australia",
              style: { fontSize: 12 },
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
 * GridList 컴포넌트 정의
 * React Aria Composition 패턴: GridListItem 내부에 Text + Description 자식 Element 조합
 */
export function createGridListDefinition(
  context: ComponentCreationContext,
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
        layout: "stack",
        selectionMode: "none",
        style: {
          width: "100%",
        },
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "GridListItem",
        props: {
          textValue: "Desert Sunset",
          value: "desert-sunset",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
        children: [
          {
            tag: "Text",
            props: {
              children: "Desert Sunset",
              style: { fontSize: 14, fontWeight: 600 },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 0,
          },
          {
            tag: "Description",
            props: {
              children: "PNG • 2/3/2024",
              style: { fontSize: 12 },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 1,
          },
        ],
      },
      {
        tag: "GridListItem",
        props: {
          textValue: "Hiking Trail",
          value: "hiking-trail",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
        children: [
          {
            tag: "Text",
            props: {
              children: "Hiking Trail",
              style: { fontSize: 14, fontWeight: 600 },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 0,
          },
          {
            tag: "Description",
            props: {
              children: "JPEG • 1/10/2022",
              style: { fontSize: 12 },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 1,
          },
        ],
      },
      {
        tag: "GridListItem",
        props: {
          textValue: "Mountain Sunrise",
          value: "mountain-sunrise",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 3,
        children: [
          {
            tag: "Text",
            props: {
              children: "Mountain Sunrise",
              style: { fontSize: 14, fontWeight: 600 },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 0,
          },
          {
            tag: "Description",
            props: {
              children: "PNG • 3/15/2015",
              style: { fontSize: 12 },
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
 * List 컴포넌트 정의
 */
export function createListDefinition(
  context: ComponentCreationContext,
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
