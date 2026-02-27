import { ComponentElementProps } from "../../../types/core/store.types";
import { HierarchyManager } from "../../utils/HierarchyManager";
import { ComponentDefinition, ComponentCreationContext } from "../types";

/**
 * DatePicker 복합 컴포넌트 정의 (Compositional Architecture)
 *
 * ComboBox 패턴: DatePicker는 투명 컨테이너, 자식이 개별 렌더링
 *   DatePicker (parent, flex column, gap:8px, width:284px)
 *     ├─ DateField       (trigger, width:100%)
 *     └─ Calendar        (flex column, padding:12px, width:100%)
 *         ├─ CalendarHeader  (nav: ← 월/년 →)
 *         └─ CalendarGrid    (요일 + 날짜 셀)
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

  // Calendar 현재 월 데이터
  const now = new Date();
  const calYear = now.getFullYear();
  const calMonth = now.getMonth();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const calTotalDays = new Date(calYear, calMonth + 1, 0).getDate();
  const monthText = new Intl.DateTimeFormat(
    (typeof navigator !== 'undefined' && navigator.language) || 'ko-KR',
    { year: 'numeric', month: 'long' }
  ).format(now);

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
          width: "284px", // Calendar intrinsic width (cellSize*7 + gap*6 + padding*2)
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
            width: "100%",
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
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            padding: "12px",
            width: "100%",
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 2,
        children: [
          {
            tag: "CalendarHeader",
            props: {
              variant: "default",
              size: "md",
              children: monthText,
              style: {
                display: "block",
                width: "100%",
              },
            } as ComponentElementProps,
            ...ownerFields,
            order_num: 1,
          },
          {
            tag: "CalendarGrid",
            props: {
              variant: "default",
              size: "md",
              defaultToday: true,
              dayOffset: firstDay,
              totalDays: calTotalDays,
              todayDate: now.getDate(),
              style: {
                display: "block",
                width: "100%",
              },
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
 * CalendarHeader / CalendarGrid 는 TAG_SPEC_MAP에 등록된 Spec 컴포넌트
 * (Compositional Architecture — 각 자식이 자체 spec shapes를 렌더링)
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

  // Calendar intrinsic width: cellSize*7 + gap*6 + paddingX*2 (md: 32*7+6*6+12*2 = 284)
  const now = new Date();
  const calYear = now.getFullYear();
  const calMonth = now.getMonth();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const calTotalDays = new Date(calYear, calMonth + 1, 0).getDate();

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
          gap: "6px",
          padding: "12px",
          width: "284px", // intrinsic: cellSize*7 + gap*6 + paddingX*2
          // height 미지정 → calculateContentHeight 자동 계산 (Card 패턴)
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
          variant: "default",
          size: "md",
          children: new Intl.DateTimeFormat(navigator.language || 'ko-KR', { year: 'numeric', month: 'long' }).format(now),
          style: {
            display: "block",
            width: "100%",
            // height 미지정 → calculateContentHeight 자동 계산
          },
        } as ComponentElementProps,
        ...ownerFields,
        order_num: 1,
      },
      {
        tag: "CalendarGrid",
        props: {
          variant: "default",
          size: "md",
          defaultToday: true,
          dayOffset: firstDay,
          totalDays: calTotalDays,
          todayDate: now.getDate(),
          style: {
            display: "block",
            width: "100%",
            // height 미지정 → calculateContentHeight 자동 계산
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

/**
 * ColorSwatchPicker 컴포넌트 정의
 *
 * CSS DOM 구조 대응:
 *   ColorSwatchPicker (parent, tag="ColorSwatchPicker", flex wrap)
 *     ├─ ColorSwatch (#FF0000)
 *     ├─ ColorSwatch (#00FF00)
 *     ├─ ColorSwatch (#0000FF)
 *     ├─ ColorSwatch (#FFFF00)
 *     ├─ ColorSwatch (#FF00FF)
 *     └─ ColorSwatch (#00FFFF)
 */
export function createColorSwatchPickerDefinition(
  context: ComponentCreationContext
): ComponentDefinition {
  const { parentElement, pageId, elements, layoutId } = context;
  const parentId = parentElement?.id || null;
  const orderNum = HierarchyManager.calculateNextOrderNum(parentId, elements);

  const ownerFields = layoutId
    ? { page_id: null as null, layout_id: layoutId }
    : { page_id: pageId, layout_id: null as null };

  const defaultColors = ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"];

  return {
    tag: "ColorSwatchPicker",
    parent: {
      tag: "ColorSwatchPicker",
      props: {
        columns: 6,
        style: {
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 6,
        },
      } as ComponentElementProps,
      ...ownerFields,
      parent_id: parentId,
      order_num: orderNum,
    },
    children: defaultColors.map((color, index) => ({
      tag: "ColorSwatch",
      props: {
        color,
        style: {
          width: 28,
          height: 28,
        },
      } as ComponentElementProps,
      ...ownerFields,
      order_num: index + 1,
    })),
  };
}
