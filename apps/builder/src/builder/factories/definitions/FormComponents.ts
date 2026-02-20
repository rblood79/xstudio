import { ComponentElementProps } from "../../../types/core/store.types";
import { HierarchyManager } from "../../utils/HierarchyManager";
import { ComponentDefinition, ComponentCreationContext } from "../types";

/**
 * TextField 컴포넌트 정의
 * TextField는 단순 컴포넌트로, Label/Input/Description/FieldError를 내부적으로 렌더링합니다.
 * 따라서 children 없이 TextField 하나만 생성합니다.
 */
export function createTextFieldDefinition(
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
    tag: "TextField",
    parent: {
      tag: "TextField",
      props: {
        label: "Text Field",
        description: "",
        errorMessage: "",
        placeholder: "Enter text...",
        value: "",
        type: "text",
        isRequired: false,
        isDisabled: false,
        isReadOnly: false,
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [], // TextField는 children이 없는 단순 컴포넌트
  };
}

/**
 * Form 컴포넌트 정의 (복합 컴포넌트)
 *
 * CSS DOM 구조:
 * Form (parent, tag="Form")
 *   ├─ FormField (tag="FormField", flex column, gap 4px)
 *   │  ├─ Label (tag="Label", children="Field Label")
 *   │  └─ TextField (tag="TextField", placeholder "Enter value...")
 *   └─ FormField (tag="FormField", flex column, gap 4px)
 *      ├─ Label (tag="Label", children="Another Field")
 *      └─ TextField (tag="TextField", placeholder "Enter value...")
 *
 * 주의: Form 안의 TextField 자식은 단순 Element로 정의
 * (tag만 지정, 내부 구조는 TextField의 Spec이 처리)
 */
export function createFormDefinition(
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
    tag: "Form",
    parent: {
      tag: "Form",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          width: "100%",
        },
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "FormField",
        props: {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            width: "100%",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
        children: [
          {
            tag: "Label",
            props: {
              children: "Field Label",
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 1,
          },
          {
            tag: "TextField",
            props: {
              label: "Text Field",
              placeholder: "Enter value...",
              value: "",
              type: "text",
              isRequired: false,
              isDisabled: false,
              isReadOnly: false,
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 2,
          },
        ],
      },
      {
        tag: "FormField",
        props: {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            width: "100%",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
        children: [
          {
            tag: "Label",
            props: {
              children: "Another Field",
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 1,
          },
          {
            tag: "TextField",
            props: {
              label: "Text Field",
              placeholder: "Enter value...",
              value: "",
              type: "text",
              isRequired: false,
              isDisabled: false,
              isReadOnly: false,
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
 * Toast 컴포넌트 정의 (복합 컴포넌트)
 *
 * CSS DOM 구조:
 * Toast (parent, tag="Toast")
 *   ├─ Heading (tag="Heading", fontSize 14px, fontWeight 600)
 *   └─ Description (tag="Description", fontSize 14px)
 */
export function createToastDefinition(
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
    tag: "Toast",
    parent: {
      tag: "Toast",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          padding: "12px 16px",
          borderRadius: "8px",
          width: "fit-content",
        },
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "Heading",
        props: {
          children: "Toast Title",
          level: 3,
          style: {
            display: "block",
            fontSize: "14px",
            fontWeight: "600",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "Description",
        props: {
          children: "Toast message content.",
          style: {
            display: "block",
            fontSize: "14px",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
      },
    ],
  };
}

/**
 * Toolbar 컴포넌트 정의 (복합 컴포넌트)
 *
 * CSS DOM 구조:
 * Toolbar (parent, tag="Toolbar")
 *   ├─ Button (tag="Button", children="Action 1")
 *   ├─ Button (tag="Button", children="Action 2")
 *   ├─ Separator (tag="Separator")
 *   └─ Button (tag="Button", children="Action 3")
 */
/**
 * NumberField 복합 컴포넌트 정의
 *
 * CSS DOM 구조:
 * NumberField (parent, tag="NumberField")
 *   ├─ Label (tag="Label", children="Number")
 *   ├─ Input (tag="Input", type="number")
 *   ├─ Button (tag="Button", children="+", slot="increment")
 *   └─ Button (tag="Button", children="−", slot="decrement")
 */
export function createNumberFieldDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

  return {
    tag: "NumberField",
    parent: {
      tag: "NumberField",
      props: {
        defaultValue: 0,
        minValue: 0,
        maxValue: 100,
        step: 1,
        isDisabled: false,
        style: {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "4px",
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
          children: "Number",
          style: {
            display: "block",
            fontSize: "14px",
            fontWeight: "500",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "Button",
        props: {
          children: "−",
          slot: "decrement",
          variant: "default",
          size: "sm",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
      },
      {
        tag: "Input",
        props: {
          type: "number",
          placeholder: "0",
          style: {
            display: "block",
            width: "60px",
            textAlign: "center",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 3,
      },
      {
        tag: "Button",
        props: {
          children: "+",
          slot: "increment",
          variant: "default",
          size: "sm",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 4,
      },
    ],
  };
}

/**
 * SearchField 복합 컴포넌트 정의
 *
 * CSS DOM 구조:
 * SearchField (parent, tag="SearchField")
 *   ├─ Label (tag="Label", children="Search")
 *   ├─ Input (tag="Input", type="search")
 *   └─ Button (tag="Button", children="✕", slot="clear")
 */
export function createSearchFieldDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

  return {
    tag: "SearchField",
    parent: {
      tag: "SearchField",
      props: {
        isDisabled: false,
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "4px",
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
          children: "Search",
          style: {
            display: "block",
            fontSize: "14px",
            fontWeight: "500",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "Input",
        props: {
          type: "search",
          placeholder: "Search...",
          style: {
            display: "block",
            width: "100%",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
      },
      {
        tag: "Button",
        props: {
          children: "✕",
          slot: "clear",
          variant: "default",
          size: "sm",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 3,
      },
    ],
  };
}

export function createToolbarDefinition(
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
    tag: "Toolbar",
    parent: {
      tag: "Toolbar",
      props: {
        "aria-label": "Toolbar",
        style: {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "4px",
          width: "fit-content",
        },
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "Button",
        props: {
          children: "Action 1",
          variant: "default",
          size: "sm",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "Button",
        props: {
          children: "Action 2",
          variant: "default",
          size: "sm",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
      },
      {
        tag: "Separator",
        props: {
          orientation: "vertical",
          style: {
            width: "1px",
            height: "20px",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 3,
      },
      {
        tag: "Button",
        props: {
          children: "Action 3",
          variant: "default",
          size: "sm",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 4,
      },
    ],
  };
}
