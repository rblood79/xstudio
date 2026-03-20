import { ComponentElementProps } from "../../../types/core/store.types";
import { HierarchyManager } from "../../utils/HierarchyManager";
import { ComponentDefinition, ComponentCreationContext } from "../types";

/**
 * TextField 복합 컴포넌트 정의
 *
 * CSS DOM 구조:
 * TextField (parent, tag="TextField", display flex column)
 *   ├─ Label (tag="Label", children="Text Field")
 *   ├─ Input (tag="Input", type="text")
 *   └─ FieldError (tag="FieldError")
 */
export function createTextFieldDefinition(
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
    tag: "TextField",
    parent: {
      tag: "TextField",
      props: {
        label: "Text Field",
        name: "",
        description: "",
        errorMessage: "",
        placeholder: "Enter text...",
        value: "",
        type: "text",
        size: "md",
        isRequired: false,
        isDisabled: false,
        isReadOnly: false,
        isInvalid: false,
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 6,
          width: 240,
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
          children: "Text Field",
          variant: "default",
          size: "md",
          style: {
            width: "fit-content",
            height: "fit-content",
            fontSize: 14,
            fontWeight: 500,
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 0,
      },
      {
        tag: "Input",
        props: {
          type: "text",
          size: "md",
          placeholder: "Enter text...",
          style: {
            width: "100%",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "FieldError",
        props: {
          children: "",
          style: {
            fontSize: 12,
            display: "none",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
      },
    ],
  };
}

/**
 * TextArea 복합 컴포넌트 정의
 *
 * CSS DOM 구조:
 * TextArea (parent, tag="TextArea", display flex column)
 *   ├─ Label (tag="Label", children="Text Area")
 *   ├─ Input (tag="Input", height: 80, multiline)
 *   └─ FieldError (tag="FieldError")
 */
export function createTextAreaDefinition(
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
    tag: "TextArea",
    parent: {
      tag: "TextArea",
      props: {
        label: "Text Area",
        name: "",
        description: "",
        errorMessage: "",
        placeholder: "Enter text...",
        value: "",
        rows: 3,
        isRequired: false,
        isDisabled: false,
        isReadOnly: false,
        isInvalid: false,
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 6,
          width: 240,
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
          children: "Text Area",
          variant: "default",
          style: {
            width: "fit-content",
            height: "fit-content",
            fontSize: 14,
            fontWeight: 500,
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 0,
      },
      {
        tag: "Input",
        props: {
          type: "text",
          placeholder: "Enter text...",
          style: {
            width: "100%",
            height: 80,
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "FieldError",
        props: {
          children: "",
          style: {
            fontSize: 12,
            display: "none",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
      },
    ],
  };
}

/**
 * Form 컴포넌트 정의 (복합 컴포넌트)
 *
 * CSS DOM 구조:
 * Form (parent, tag="Form")
 *   ├─ Heading (tag="Heading", children="Form Title")
 *   ├─ Description (tag="Description", children="")
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
        tag: "Heading",
        props: {
          children: "Form Title",
          level: 3,
          style: {
            display: "block",
            fontSize: "18px",
            fontWeight: "600",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 0,
      },
      {
        tag: "Description",
        props: {
          children: "",
          style: {
            display: "block",
            fontSize: "14px",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 0.5,
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
        order_num: 1,
        children: [
          {
            tag: "Label",
            props: {
              children: "Field Label",
              variant: "default",
              style: { width: "fit-content", height: "fit-content" },
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
              variant: "default",
              style: { width: "fit-content", height: "fit-content" },
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
 * CSS DOM 구조 (@sync ComboBox):
 * NumberField (parent, tag="NumberField", display flex column)
 *   ├─ Label (tag="Label", children="Number")
 *   ├─ ComboBoxWrapper (tag="ComboBoxWrapper", display flex row, bg+border)
 *   │    ├─ ComboBoxInput (tag="ComboBoxInput", placeholder="0")
 *   │    ├─ ComboBoxTrigger (tag="ComboBoxTrigger", iconName="minus")
 *   │    └─ ComboBoxTrigger (tag="ComboBoxTrigger", iconName="plus")
 *   └─ FieldError (tag="FieldError")
 */
export function createNumberFieldDefinition(
  context: ComponentCreationContext,
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
        label: "Number",
        name: "",
        defaultValue: 0,
        minValue: 0,
        maxValue: 100,
        step: 1,
        isDisabled: false,
        isInvalid: false,
        isReadOnly: false,
        isRequired: false,
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 6,
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
          variant: "default",
          style: {
            display: "block",
            fontSize: "14px",
            fontWeight: "500",
            width: "fit-content",
            height: "fit-content",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "ComboBoxWrapper",
        props: {
          style: {
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
        children: [
          {
            tag: "ComboBoxInput",
            props: {
              placeholder: "0",
              style: {
                display: "block",
              },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 1,
          },
          {
            tag: "ComboBoxTrigger",
            props: {
              iconName: "minus",
              slot: "decrement",
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 2,
          },
          {
            tag: "ComboBoxTrigger",
            props: {
              iconName: "plus",
              slot: "increment",
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 3,
          },
        ],
      },
      {
        tag: "FieldError",
        props: {
          children: "",
          style: {
            fontSize: 12,
            display: "none",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 3,
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
/**
 * SearchField 컴포넌트 정의 (ComboBox 동일 패턴)
 *
 * CSS DOM 구조:
 * SearchField (parent, flex column)
 *   ├─ Label (tag="Label")
 *   └─ SearchFieldWrapper (tag="SearchFieldWrapper", flex row)
 *        ├─ SearchIcon (tag="SearchIcon", 🔍)
 *        ├─ SearchInput (tag="SearchInput", flex:1)
 *        └─ SearchClearButton (tag="SearchClearButton", ✕)
 */
export function createSearchFieldDefinition(
  context: ComponentCreationContext,
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
        label: "Search",
        name: "",
        placeholder: "Search...",
        isDisabled: false,
        isInvalid: false,
        isReadOnly: false,
        isRequired: false,
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
          variant: "default",
          style: {
            fontWeight: 500,
            width: "fit-content",
            height: "fit-content",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 0,
      },
      {
        tag: "SearchFieldWrapper",
        props: {
          style: {
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
        children: [
          {
            tag: "SearchIcon",
            props: {
              iconName: "search",
              children: "",
              style: { width: 18, height: 18, flexShrink: 0 },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 0,
          },
          {
            tag: "SearchInput",
            props: {
              children: "",
              placeholder: "Search...",
              style: { flex: 1, fontSize: 14 },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 1,
          },
          {
            tag: "SearchClearButton",
            props: {
              iconName: "x",
              children: "",
              style: { width: 18, height: 18, flexShrink: 0 },
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
 * Slider 복합 컴포넌트 정의
 *
 * CSS DOM 구조:
 * Slider (parent, tag="Slider", display grid)
 *   ├─ Label (tag="Label", grid-area: label)
 *   ├─ SliderOutput (tag="SliderOutput", grid-area: output)
 *   └─ SliderTrack (tag="SliderTrack", grid-area: track, position relative)
 *        └─ SliderThumb (tag="SliderThumb", border-radius 50%)
 */
export function createSliderDefinition(
  context: ComponentCreationContext,
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  const ownerFields = layoutId
    ? { page_id: null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null };

  return {
    tag: "Slider",
    parent: {
      tag: "Slider",
      props: {
        label: "Slider",
        name: "",
        value: 50,
        minValue: 0,
        maxValue: 100,
        step: 1,
        isDisabled: false,
        isRequired: false,
        orientation: "horizontal",
        showValue: true,
        style: {
          display: "grid",
          width: 200,
          height: 45,
          maxWidth: 300,
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
          children: "Slider",
          variant: "default",
          style: {
            fontSize: 14,
            fontWeight: 500,
            width: "fit-content",
            height: "fit-content",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 0,
      },
      {
        tag: "SliderOutput",
        props: {
          children: "50",
          style: {
            fontSize: 14,
            width: "fit-content",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "SliderTrack",
        props: {
          style: {
            display: "flex",
            alignItems: "center",
            width: "100%",
            height: 24,
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
        children: [
          {
            tag: "SliderThumb",
            props: {
              style: {
                width: 18,
                height: 18,
                borderRadius: "50%",
              },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 0,
          },
        ],
      },
    ],
  };
}

export function createToolbarDefinition(
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
    tag: "Toolbar",
    parent: {
      tag: "Toolbar",
      props: {
        "aria-label": "Toolbar",
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
          size: "S",
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
          size: "S",
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
          size: "S",
          isDisabled: false,
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 4,
      },
    ],
  };
}
