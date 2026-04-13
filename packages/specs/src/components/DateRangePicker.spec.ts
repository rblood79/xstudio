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
import {
  Layout,
  Globe,
  Tag,
  FileText,
  AlertTriangle,
  Clock,
  ArrowLeftRight,
  Hash,
  EyeOff,
  Columns,
  CheckSquare,
  PointerOff,
  PenOff,
  FormInput,
  ToggleLeft,
  HelpCircle,
  Calendar,
} from "lucide-react";

export interface DateRangePickerProps {
  variant?: "default" | "accent";
  size?: "sm" | "md" | "lg" | "xl";
  startDate?: string;
  endDate?: string;
  placeholder?: string;
  label?: string;
  locale?: string;
  calendarSystem?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isQuiet?: boolean;
  form?: string;
  labelPosition?: "top" | "side";
  firstDayOfWeek?: "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
  maxVisibleMonths?: number;
  shouldFlip?: boolean;
  contextualHelp?: string;
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

  properties: {
    sections: [
      {
        title: "Content",
        fields: [
          { key: "label", type: "string", label: "Label", icon: Tag },
          {
            key: "description",
            type: "string",
            label: "Description",
            icon: FileText,
          },
          {
            key: "errorMessage",
            type: "string",
            label: "Error Message",
            icon: AlertTriangle,
          },
          {
            key: "placeholderValue",
            type: "string",
            label: "Placeholder",
            icon: FileText,
          },
          {
            key: "contextualHelp",
            type: "string",
            label: "Contextual Help",
            icon: HelpCircle,
            emptyToUndefined: true,
          },
        ],
      },
      {
        title: "Appearance",
        fields: [
          { type: "variant" },
          { type: "size" },
          {
            key: "labelPosition",
            type: "enum",
            label: "Label Position",
            icon: Layout,
            options: [
              { value: "top", label: "Top" },
              { value: "side", label: "Side" },
            ],
            defaultValue: "top",
          },
          { key: "isQuiet", type: "boolean", label: "Quiet", icon: EyeOff },
          {
            key: "firstDayOfWeek",
            type: "enum",
            label: "First Day of Week",
            icon: Calendar,
            emptyToUndefined: true,
            options: [
              { value: "", label: "Auto" },
              { value: "sun", label: "Sunday" },
              { value: "mon", label: "Monday" },
              { value: "tue", label: "Tuesday" },
              { value: "wed", label: "Wednesday" },
              { value: "thu", label: "Thursday" },
              { value: "fri", label: "Friday" },
              { value: "sat", label: "Saturday" },
            ],
          },
          {
            key: "granularity",
            type: "enum",
            label: "Granularity",
            icon: Clock,
            emptyToUndefined: true,
            options: [
              { value: "", label: "Day" },
              { value: "hour", label: "Hour" },
              { value: "minute", label: "Minute" },
              { value: "second", label: "Second" },
            ],
          },
          {
            key: "hourCycle",
            type: "enum",
            label: "Hour Cycle",
            icon: Clock,
            emptyToUndefined: true,
            valueTransform: "number" as const,
            options: [
              { value: "", label: "Auto" },
              { value: "12", label: "12 Hour" },
              { value: "24", label: "24 Hour" },
            ],
          },
          {
            key: "hideTimeZone",
            type: "boolean",
            label: "Hide Timezone",
            icon: EyeOff,
          },
          {
            key: "shouldForceLeadingZeros",
            type: "boolean",
            label: "Force Leading Zeros",
            icon: Hash,
          },
          {
            key: "pageBehavior",
            type: "enum",
            label: "Page Behavior",
            icon: ArrowLeftRight,
            options: [
              { value: "visible", label: "Visible" },
              { value: "single", label: "Single" },
            ],
            defaultValue: "visible",
          },
          {
            key: "maxVisibleMonths",
            type: "number",
            label: "Max Visible Months",
            icon: Columns,
            min: 1,
            max: 3,
            step: 1,
            defaultValue: 1,
          },
          {
            key: "shouldFlip",
            type: "boolean",
            label: "Should Flip",
            icon: ArrowLeftRight,
            defaultValue: true,
          },
        ],
      },
      {
        title: "Locale",
        fields: [
          {
            key: "locale",
            type: "enum",
            label: "Locale",
            icon: Globe,
            emptyToUndefined: true,
            options: [
              { value: "", label: "Auto" },
              { value: "ko-KR", label: "한국어" },
              { value: "en-US", label: "English (US)" },
              { value: "en-GB", label: "English (UK)" },
              { value: "ja-JP", label: "日本語" },
              { value: "zh-CN", label: "中文" },
              { value: "de-DE", label: "Deutsch" },
              { value: "fr-FR", label: "Français" },
            ],
          },
          {
            key: "calendarSystem",
            type: "enum",
            label: "Calendar System",
            icon: Globe,
            emptyToUndefined: true,
            options: [
              { value: "", label: "Default" },
              { value: "buddhist", label: "Buddhist" },
              { value: "hebrew", label: "Hebrew" },
              { value: "islamic-civil", label: "Islamic (Civil)" },
              { value: "persian", label: "Persian" },
            ],
          },
        ],
      },
      {
        title: "State",
        fields: [
          {
            key: "defaultToday",
            type: "boolean",
            label: "Default to Today",
            icon: ToggleLeft,
          },
          {
            key: "minValue",
            type: "string",
            label: "Min Value",
            icon: Hash,
            placeholder: "2024-01-01",
          },
          {
            key: "maxValue",
            type: "string",
            label: "Max Value",
            icon: Hash,
            placeholder: "2024-12-31",
          },
          {
            key: "necessityIndicator",
            type: "enum",
            label: "Required",
            icon: CheckSquare,
            emptyToUndefined: true,
            options: [
              { value: "", label: "None" },
              { value: "icon", label: "Icon (*)" },
              { value: "label", label: "Label (required/optional)" },
            ],
            derivedUpdateFn: (value) => {
              if (value === undefined || value === "") {
                return {
                  isRequired: false,
                  necessityIndicator: undefined,
                };
              }
              return {
                isRequired: true,
                necessityIndicator: value as "icon" | "label",
              };
            },
          },
          { key: "isInvalid", type: "boolean", icon: AlertTriangle },

          { key: "isDisabled", type: "boolean", icon: PointerOff },
          { key: "isReadOnly", type: "boolean", icon: PenOff },
          {
            key: "shouldCloseOnSelect",
            type: "boolean",
            label: "Close On Select",
            icon: CheckSquare,
            defaultValue: true,
          },

          {
            key: "startName",
            type: "string",
            label: "Start Name",
            icon: FormInput,
            emptyToUndefined: true,
            placeholder: "start-date",
          },
          {
            key: "endName",
            type: "string",
            label: "End Name",
            icon: FormInput,
            emptyToUndefined: true,
            placeholder: "end-date",
          },
        ],
      },
    ],
  },

  propagation: {
    rules: [
      // label → Label children (항상 덮어쓰기 — 부모 label이 Label.children의 단일 소스)
      {
        parentProp: "label",
        childPath: "Label",
        childProp: "children",
        override: true,
      },

      // granularity → DateInput
      {
        parentProp: "granularity",
        childPath: "DateInput",
        childProp: "_granularity",
        override: true,
      },

      // size → 직접 자식
      { parentProp: "size", childPath: "DateInput", override: true },
      { parentProp: "size", childPath: "Calendar", override: true },
      { parentProp: "size", childPath: "RangeCalendar", override: true },
      { parentProp: "size", childPath: "Label", override: true },
      // size → Calendar/RangeCalendar 서브트리
      {
        parentProp: "size",
        childPath: ["Calendar", "CalendarHeader"],
        override: true,
      },
      {
        parentProp: "size",
        childPath: ["Calendar", "CalendarGrid"],
        override: true,
      },
      {
        parentProp: "size",
        childPath: ["RangeCalendar", "CalendarHeader"],
        override: true,
      },
      {
        parentProp: "size",
        childPath: ["RangeCalendar", "CalendarGrid"],
        override: true,
      },

      // maxVisibleMonths → RangeCalendar
      {
        parentProp: "maxVisibleMonths",
        childPath: "RangeCalendar",
        childProp: "maxVisibleMonths",
        override: true,
      },

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
    shapes: (props, _size, _state = "default") => {
      const variant = DateRangePickerSpec.variants![(props as { variant?: keyof typeof DateRangePickerSpec.variants }).variant ?? DateRangePickerSpec.defaultVariant!];
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
