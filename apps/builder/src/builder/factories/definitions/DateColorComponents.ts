import { ComponentElementProps } from "../../../types/core/store.types";
import { HierarchyManager } from "../../utils/HierarchyManager";
import { ComponentDefinition, ComponentCreationContext } from "../types";

/**
 * DatePicker 복합 컴포넌트 정의
 *
 * CSS DOM 구조와 동일:
 *   DatePicker (parent)
 *     ├─ DateField  (tag="DateField", display:block)
 *     └─ Calendar   (tag="Calendar",  display:block)
 */
export function createDatePickerDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  // ⭐ Layout/Slot System
  const ownerFields = layoutId
    ? { page_id: null as null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null as null };

  return {
    tag: "DatePicker",
    parent: {
      tag: "DatePicker",
      props: {
        isDisabled: false,
        isReadOnly: false,
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        },
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "DateField",
        props: {
          placeholder: "YYYY-MM-DD",
          style: {
            display: "block",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "Calendar",
        props: {
          isDisabled: false,
          isReadOnly: false,
          style: {
            display: "block",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
      },
    ],
  };
}

/**
 * DateRangePicker 복합 컴포넌트 정의
 *
 * CSS DOM 구조와 동일:
 *   DateRangePicker (parent)
 *     ├─ DateField  (tag="DateField", placeholder="Start date", display:block)
 *     ├─ Separator  (tag="Separator", display:block)
 *     └─ DateField  (tag="DateField", placeholder="End date",   display:block)
 */
export function createDateRangePickerDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  // ⭐ Layout/Slot System
  const ownerFields = layoutId
    ? { page_id: null as null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null as null };

  return {
    tag: "DateRangePicker",
    parent: {
      tag: "DateRangePicker",
      props: {
        isDisabled: false,
        isReadOnly: false,
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        },
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "DateField",
        props: {
          placeholder: "Start date",
          style: {
            display: "block",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "Separator",
        props: {
          style: {
            display: "block",
            width: "100%",
            height: "1px",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
      },
      {
        tag: "DateField",
        props: {
          placeholder: "End date",
          style: {
            display: "block",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 3,
      },
    ],
  };
}

/**
 * Calendar 복합 컴포넌트 정의
 *
 * CSS DOM 구조와 동일:
 *   Calendar (parent)
 *     ├─ CalendarHeader (tag="CalendarHeader", children="February 2026")
 *     └─ CalendarGrid  (tag="CalendarGrid",  display:grid)
 *
 * CalendarHeader / CalendarGrid 는 TAG_SPEC_MAP 미등록 태그이므로
 * 일반 Element로 렌더링됩니다. Spec 렌더링이 필요한 경우 별도 등록 필요.
 */
export function createCalendarDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  // ⭐ Layout/Slot System
  const ownerFields = layoutId
    ? { page_id: null as null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null as null };

  return {
    tag: "Calendar",
    parent: {
      tag: "Calendar",
      props: {
        isDisabled: false,
        isReadOnly: false,
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        },
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "CalendarHeader",
        props: {
          children: "February 2026",
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "CalendarGrid",
        props: {
          style: {
            display: "grid",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
      },
    ],
  };
}

/**
 * DateField 복합 컴포넌트 정의
 *
 * CSS DOM 구조:
 *   DateField (parent)
 *     ├─ Label      (tag="Label", children="Date")
 *     ├─ DateSegment (tag="DateSegment", segment="month")
 *     ├─ DateSegment (tag="DateSegment", segment="day")
 *     └─ DateSegment (tag="DateSegment", segment="year")
 */
export function createDateFieldDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  const ownerFields = layoutId
    ? { page_id: null as null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null as null };

  return {
    tag: "DateField",
    parent: {
      tag: "DateField",
      props: {
        isDisabled: false,
        isReadOnly: false,
        style: {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "2px",
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
          children: "Date",
          style: {
            display: "block",
            fontSize: "14px",
            fontWeight: "500",
            marginRight: "8px",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "DateSegment",
        props: {
          segment: "month",
          children: "MM",
          style: { display: "inline-block" },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
      },
      {
        tag: "DateSegment",
        props: {
          segment: "day",
          children: "DD",
          style: { display: "inline-block" },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 3,
      },
      {
        tag: "DateSegment",
        props: {
          segment: "year",
          children: "YYYY",
          style: { display: "inline-block" },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 4,
      },
    ],
  };
}

/**
 * TimeField 복합 컴포넌트 정의
 *
 * CSS DOM 구조:
 *   TimeField (parent)
 *     ├─ Label       (tag="Label", children="Time")
 *     ├─ TimeSegment (tag="TimeSegment", segment="hour")
 *     ├─ TimeSegment (tag="TimeSegment", segment="minute")
 *     └─ TimeSegment (tag="TimeSegment", segment="second")
 */
export function createTimeFieldDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  const ownerFields = layoutId
    ? { page_id: null as null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null as null };

  return {
    tag: "TimeField",
    parent: {
      tag: "TimeField",
      props: {
        isDisabled: false,
        isReadOnly: false,
        style: {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "2px",
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
          children: "Time",
          style: {
            display: "block",
            fontSize: "14px",
            fontWeight: "500",
            marginRight: "8px",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "TimeSegment",
        props: {
          segment: "hour",
          children: "HH",
          style: { display: "inline-block" },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
      },
      {
        tag: "TimeSegment",
        props: {
          segment: "minute",
          children: "MM",
          style: { display: "inline-block" },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 3,
      },
      {
        tag: "TimeSegment",
        props: {
          segment: "second",
          children: "SS",
          style: { display: "inline-block" },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 4,
      },
    ],
  };
}

/**
 * ColorField 복합 컴포넌트 정의
 *
 * CSS DOM 구조:
 *   ColorField (parent)
 *     ├─ Label      (tag="Label", children="Color")
 *     ├─ Input      (tag="Input", placeholder="#000000")
 *     └─ ColorSwatch (tag="ColorSwatch", preview swatch)
 */
export function createColorFieldDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  const ownerFields = layoutId
    ? { page_id: null as null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null as null };

  return {
    tag: "ColorField",
    parent: {
      tag: "ColorField",
      props: {
        isDisabled: false,
        style: {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "8px",
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
          children: "Color",
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
          type: "text",
          placeholder: "#000000",
          style: {
            display: "block",
            width: "80px",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
      },
      {
        tag: "ColorSwatch",
        props: {
          color: "#000000",
          style: {
            width: "24px",
            height: "24px",
            borderRadius: "4px",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 3,
      },
    ],
  };
}

/**
 * ColorPicker 복합 컴포넌트 정의
 *
 * CSS DOM 구조와 동일:
 *   ColorPicker (parent)
 *     ├─ ColorArea   (tag="ColorArea",   width:200px, height:200px)
 *     ├─ ColorSlider (tag="ColorSlider", channel:"hue", display:block)
 *     └─ ColorField  (tag="ColorField",  placeholder:"#000000", display:block)
 */
export function createColorPickerDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  // ⭐ Layout/Slot System
  const ownerFields = layoutId
    ? { page_id: null as null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null as null };

  return {
    tag: "ColorPicker",
    parent: {
      tag: "ColorPicker",
      props: {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        },
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: [
      {
        tag: "ColorArea",
        props: {
          style: {
            width: "200px",
            height: "200px",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "ColorSlider",
        props: {
          channel: "hue",
          style: {
            display: "block",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
      },
      {
        tag: "ColorField",
        props: {
          placeholder: "#000000",
          style: {
            display: "block",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 3,
      },
    ],
  };
}
