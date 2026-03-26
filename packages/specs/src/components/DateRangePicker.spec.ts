/**
 * DateRangePicker Component Spec
 *
 * DatePicker와 동일한 시각 구조 — displayText만 range 형식.
 * 공유 상수/shapes 빌더는 DatePicker.spec.ts에서 import.
 */

import type { ComponentSpec } from "../types";
import {
  buildDatePlaceholder,
  buildDatePickerShapes,
  DATE_PICKER_VARIANTS,
  DATE_PICKER_SIZES,
  DATE_PICKER_STATES,
} from "./DatePicker.spec";

export interface DateRangePickerProps {
  variant?: "default" | "accent";
  size?: "sm" | "md" | "lg";
  startDate?: string;
  endDate?: string;
  placeholder?: string;
  label?: string;
  locale?: string;
  calendarSystem?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  style?: Record<string, string | number | undefined>;
}

/** locale 기반 range placeholder */
function buildRangePlaceholder(locale: string): string {
  const single = buildDatePlaceholder(locale);
  return `${single} – ${single}`;
}

export const DateRangePickerSpec: ComponentSpec<DateRangePickerProps> = {
  name: "DateRangePicker",
  description: "DateField range 입력 + 캘린더 버튼",
  element: "div",
  skipCSSGeneration: true,

  defaultVariant: "default",
  defaultSize: "md",

  variants: DATE_PICKER_VARIANTS,
  sizes: DATE_PICKER_SIZES,
  states: DATE_PICKER_STATES,

  propagation: {
    rules: [
      // label → Label children (항상 덮어쓰기 — 부모 label이 Label.children의 단일 소스)
      {
        parentProp: "label",
        childPath: "Label",
        childProp: "children",
        override: true,
      },

      // size → 직접 자식
      { parentProp: "size", childPath: "DateInput" },
      { parentProp: "size", childPath: "Calendar" },
      { parentProp: "size", childPath: "RangeCalendar" },
      { parentProp: "size", childPath: "Label" },
      // size → Calendar/RangeCalendar 서브트리
      { parentProp: "size", childPath: ["Calendar", "CalendarHeader"] },
      { parentProp: "size", childPath: ["Calendar", "CalendarGrid"] },
      { parentProp: "size", childPath: ["RangeCalendar", "CalendarHeader"] },
      { parentProp: "size", childPath: ["RangeCalendar", "CalendarGrid"] },

      // variant
      { parentProp: "variant", childPath: "Calendar" },
      { parentProp: "variant", childPath: "RangeCalendar" },
      { parentProp: "variant", childPath: "Label" },
      { parentProp: "variant", childPath: ["Calendar", "CalendarHeader"] },
      { parentProp: "variant", childPath: ["Calendar", "CalendarGrid"] },
      {
        parentProp: "variant",
        childPath: ["RangeCalendar", "CalendarHeader"],
      },
      {
        parentProp: "variant",
        childPath: ["RangeCalendar", "CalendarGrid"],
      },

      // locale
      { parentProp: "locale", childPath: "Calendar" },
      { parentProp: "locale", childPath: ["Calendar", "CalendarHeader"] },
      { parentProp: "locale", childPath: ["Calendar", "CalendarGrid"] },
      { parentProp: "locale", childPath: "RangeCalendar" },
      {
        parentProp: "locale",
        childPath: ["RangeCalendar", "CalendarHeader"],
      },
      {
        parentProp: "locale",
        childPath: ["RangeCalendar", "CalendarGrid"],
      },

      // calendarSystem
      { parentProp: "calendarSystem", childPath: "Calendar" },
      {
        parentProp: "calendarSystem",
        childPath: ["Calendar", "CalendarHeader"],
      },
      {
        parentProp: "calendarSystem",
        childPath: ["Calendar", "CalendarGrid"],
      },
      { parentProp: "calendarSystem", childPath: "RangeCalendar" },
      {
        parentProp: "calendarSystem",
        childPath: ["RangeCalendar", "CalendarHeader"],
      },
      {
        parentProp: "calendarSystem",
        childPath: ["RangeCalendar", "CalendarGrid"],
      },

      // defaultToday → CalendarGrid only
      { parentProp: "defaultToday", childPath: ["Calendar", "CalendarGrid"] },
      {
        parentProp: "defaultToday",
        childPath: ["RangeCalendar", "CalendarGrid"],
      },
    ],
  },

  render: {
    shapes: (props, variant, _size, _state = "default") => {
      // Compositional: 자식이 있으면 투명 컨테이너
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return [];

      const locale = props.locale || "en-US";
      const displayText = (() => {
        if (props.startDate && props.endDate)
          return `${props.startDate} – ${props.endDate}`;
        return props.placeholder || buildRangePlaceholder(locale);
      })();

      return buildDatePickerShapes({
        props: props as unknown as Record<string, unknown>,
        variant: variant as unknown as Record<string, unknown>,
        sizeEntry: _size as unknown as Record<string, unknown>,
        displayText,
        hasValue: !!(props.startDate && props.endDate),
        defaultContainerWidth: 320,
      });
    },

    react: (props) => ({
      "aria-invalid": props.isInvalid || undefined,
      "data-disabled": props.isDisabled || undefined,
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ("none" as const) : ("static" as const),
      cursor: props.isDisabled ? "not-allowed" : "pointer",
    }),
  },
};
