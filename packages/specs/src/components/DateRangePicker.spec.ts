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
  skipCSSGeneration: false,

  defaultSize: "md",

  sizes: DATE_PICKER_SIZES,
  states: DATE_PICKER_STATES,

  composition: {
    layout: "flex-column",
    gap: "var(--spacing-xs)",
    containerStyles: {
      color: "var(--fg)",
    },
    containerVariants: {
      "label-position": {
        side: {
          styles: {
            "flex-direction": "row",
            "align-items": "flex-start",
          },
        },
      },
      quiet: {
        true: {
          nested: [
            {
              selector: ".react-aria-Group",
              styles: {
                background: "transparent",
                "border-color": "transparent",
                "box-shadow": "none",
                "border-radius": "0",
                "border-bottom": "1px solid var(--border)",
              },
            },
            {
              selector:
                ".react-aria-Group[data-hovered]:not([data-focus-within]):not([data-focused])",
              styles: {
                background: "transparent",
                "border-color": "transparent",
                "box-shadow": "none",
                "border-bottom-color": "var(--border-hover)",
              },
            },
            {
              selector: ".react-aria-Group[data-focus-within]",
              styles: {
                outline: "none",
                background: "transparent",
                "border-color": "transparent",
                "box-shadow": "none",
                "border-bottom-color": "var(--accent)",
              },
            },
            {
              selector: ".react-aria-Group[data-invalid]",
              styles: {
                "border-color": "transparent",
                "border-bottom-color": "var(--negative)",
              },
            },
          ],
        },
      },
    },
    externalStyles: [
      {
        selector: '.react-aria-Popover[data-trigger="DateRangePicker"]',
        styles: { "max-width": "unset" },
        nested: [
          {
            selector: ".react-aria-Dialog .react-aria-RangeCalendar",
            styles: {
              background: "transparent",
              border: "none",
              padding: "0",
            },
          },
        ],
      },
      {
        selector: ".react-aria-DateRangePicker-start-time",
        styles: { width: "100%" },
      },
      {
        selector: ".react-aria-DateRangePicker-end-time",
        styles: { width: "100%" },
      },
    ],
    delegation: [
      {
        childSelector: ".react-aria-Label",
        prefix: "drp-label",
        variables: {
          xs: {
            "--drp-label-size": "var(--text-2xs)",
            "--drp-label-line-height": "var(--text-2xs--line-height)",
          },
          sm: {
            "--drp-label-size": "var(--text-xs)",
            "--drp-label-line-height": "var(--text-xs--line-height)",
          },
          md: {
            "--drp-label-size": "var(--text-sm)",
            "--drp-label-line-height": "var(--text-sm--line-height)",
          },
          lg: {
            "--drp-label-size": "var(--text-base)",
            "--drp-label-line-height": "var(--text-base--line-height)",
          },
          xl: {
            "--drp-label-size": "var(--text-lg)",
            "--drp-label-line-height": "var(--text-lg--line-height)",
          },
        },
        bridges: {
          "--label-font-size": "var(--drp-label-size)",
          "--label-line-height": "var(--drp-label-line-height)",
          "--label-font-weight": "600",
        },
      },
      {
        childSelector: ".react-aria-Group",
        prefix: "drp-group",
        variables: {
          xs: {
            "--drp-group-padding":
              "var(--spacing-3xs) var(--spacing-3xs) var(--spacing-3xs) var(--spacing-xs)",
            "--drp-group-font-size": "var(--text-2xs)",
            "--drp-group-line-height": "var(--text-2xs--line-height)",
            "--drp-group-gap": "var(--spacing-2xs)",
          },
          sm: {
            "--drp-group-padding":
              "var(--spacing-2xs) var(--spacing-2xs) var(--spacing-2xs) var(--spacing-sm)",
            "--drp-group-font-size": "var(--text-xs)",
            "--drp-group-line-height": "var(--text-xs--line-height)",
            "--drp-group-gap": "var(--spacing-xs)",
          },
          md: {
            "--drp-group-padding":
              "var(--spacing-xs) var(--spacing-xs) var(--spacing-xs) var(--spacing-md)",
            "--drp-group-font-size": "var(--text-sm)",
            "--drp-group-line-height": "var(--text-sm--line-height)",
            "--drp-group-gap": "var(--spacing-xs)",
          },
          lg: {
            "--drp-group-padding":
              "var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) var(--spacing-lg)",
            "--drp-group-font-size": "var(--text-base)",
            "--drp-group-line-height": "var(--text-base--line-height)",
            "--drp-group-gap": "var(--spacing-xs)",
          },
          xl: {
            "--drp-group-padding":
              "var(--spacing-md) var(--spacing-md) var(--spacing-md) var(--spacing-xl)",
            "--drp-group-font-size": "var(--text-lg)",
            "--drp-group-line-height": "var(--text-lg--line-height)",
            "--drp-group-gap": "var(--spacing-sm)",
          },
        },
        bridges: {
          display: "flex",
          "align-items": "center",
          width: "100%",
          gap: "var(--drp-group-gap)",
          padding: "var(--drp-group-padding)",
          border: "1px solid var(--border)",
          "border-radius": "var(--border-radius)",
          background: "var(--bg-inset)",
          color: "var(--fg)",
          "white-space": "nowrap",
          "forced-color-adjust": "none",
          "font-size": "var(--drp-group-font-size)",
          "line-height": "var(--drp-group-line-height)",
          transition: "border-color 200ms ease, background-color 200ms ease",
        },
        states: {
          "[data-hovered]": {
            "border-color": "var(--border-hover)",
            background: "var(--bg-overlay)",
          },
          "[data-focus-within]": {
            outline: "2px solid var(--accent)",
            "outline-offset": "-1px",
            "border-color": "var(--accent)",
            background: "var(--bg-overlay)",
          },
          "[data-invalid]": {
            "border-color": "var(--negative)",
          },
          "[data-disabled]": {
            opacity: "0.38",
            cursor: "not-allowed",
            background: "var(--bg-muted)",
          },
        },
      },
      {
        childSelector: ".react-aria-DateInput",
        bridges: {
          width: "unset",
          "min-width": "unset",
          padding: "unset",
          border: "unset",
          background: "transparent",
          outline: "unset",
          "font-size": "var(--drp-group-font-size)",
        },
        states: {
          "[data-focus-within]": {
            outline: "0px solid transparent",
          },
        },
      },
      {
        childSelector: ".react-aria-DateSegment",
        prefix: "drp-segment",
        variables: {
          xs: { "--drp-segment-size": "var(--text-2xs)" },
          sm: { "--drp-segment-size": "var(--text-xs)" },
          md: { "--drp-segment-size": "var(--text-sm)" },
          lg: { "--drp-segment-size": "var(--text-base)" },
          xl: { "--drp-segment-size": "var(--text-lg)" },
        },
        bridges: {
          padding: "0 2px",
          border: "none",
          background: "transparent",
          height: "auto",
          "font-variant-numeric": "tabular-nums",
          "text-align": "end",
          color: "var(--fg)",
          "border-radius": "var(--radius-xs)",
          "font-size": "var(--drp-segment-size)",
          transition: "all 150ms ease",
        },
        states: {
          '[data-type="literal"]': { padding: "0" },
          "[data-placeholder]": {
            color: "var(--fg-muted)",
            opacity: "0.6",
          },
          ":focus": {
            color: "var(--fg)",
            background: "var(--accent-subtle)",
            outline: "none",
            "border-radius": "var(--radius-xs)",
            "caret-color": "transparent",
          },
          "[data-invalid]": { color: "var(--negative)" },
          "[data-invalid]:focus": {
            background: "color-mix(in srgb, var(--negative) 15%, transparent)",
            color: "var(--negative)",
          },
          "[data-disabled]": {
            color: "color-mix(in srgb, var(--fg) 38%, transparent)",
            cursor: "not-allowed",
          },
        },
      },
      {
        childSelector: '[slot="start"] + span',
        bridges: {
          padding: "0 4px",
          color: "var(--fg-muted)",
        },
      },
      {
        childSelector: '[slot="end"]',
        bridges: {
          flex: "1",
        },
      },
      {
        childSelector: ".react-aria-Button",
        prefix: "drp-btn",
        variables: {
          xs: {
            "--drp-btn-width": "var(--text-sm)",
            "--drp-btn-height": "var(--text-sm)",
          },
          sm: {
            "--drp-btn-width": "var(--text-base)",
            "--drp-btn-height": "var(--text-base)",
          },
          md: {
            "--drp-btn-width": "var(--text-xl)",
            "--drp-btn-height": "var(--text-xl)",
          },
          lg: {
            "--drp-btn-width": "var(--text-2xl)",
            "--drp-btn-height": "var(--text-2xl)",
          },
          xl: {
            "--drp-btn-width": "var(--text-3xl)",
            "--drp-btn-height": "var(--text-3xl)",
          },
        },
        bridges: {
          background: "transparent",
          color: "var(--fg-muted)",
          "forced-color-adjust": "none",
          border: "none",
          width: "var(--drp-btn-width)",
          height: "var(--drp-btn-height)",
          padding: "0",
          cursor: "default",
          "flex-shrink": "0",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
        },
        states: {
          "[data-pressed]": {
            "box-shadow": "none",
            background: "var(--bg-muted)",
          },
          "[data-focus-visible]": {
            outline: "2px solid var(--accent)",
            "outline-offset": "2px",
          },
        },
      },
      {
        childSelector: ".react-aria-FieldError",
        prefix: "drp-hint",
        variables: {
          xs: { "--drp-hint-size": "var(--text-2xs)" },
          sm: { "--drp-hint-size": "var(--text-xs)" },
          md: { "--drp-hint-size": "var(--text-xs)" },
          lg: { "--drp-hint-size": "var(--text-sm)" },
          xl: { "--drp-hint-size": "var(--text-sm)" },
        },
        bridges: {
          "--error-font-size": "var(--drp-hint-size)",
        },
      },
      {
        childSelector: '[slot="description"]',
        bridges: {
          "font-size": "var(--drp-hint-size)",
          color: "var(--fg-muted)",
        },
      },
    ],
  },

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
