/**
 * DatePicker Component Spec
 *
 * DateField 입력 패턴 + 우측 캘린더 버튼
 * Compositional 자식이 있으면 빈 shapes 반환 (부모 투명 컨테이너)
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";
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
  ToggleLeft,
  HelpCircle,
  Calendar,
} from "lucide-react";

export interface DatePickerProps {
  size?: "sm" | "md" | "lg" | "xl";
  value?: string;
  placeholder?: string;
  label?: string;
  locale?: string;
  calendarSystem?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isQuiet?: boolean;
  labelPosition?: "top" | "side";
  firstDayOfWeek?: "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
  maxVisibleMonths?: number;
  shouldFlip?: boolean;
  contextualHelp?: string;
  name?: string;
  style?: Record<string, string | number | undefined>;
}

/** DateInput 높이 metric (sm/md/lg). DateRangePicker.spec.ts에서도 import.
 * DateInputSpec.sizes[size].height 와 동일 값 (ADR-091 Phase 3에서 검증됨). */
export const DATE_PICKER_INPUT_HEIGHT: Record<string, number> = {
  sm: 22,
  md: 30,
  lg: 42,
};
export const DATE_PICKER_INPUT_PADDING: Record<
  string,
  { top: number; right: number; left: number }
> = {
  sm: { top: 2, right: 2, left: 8 },
  md: { top: 4, right: 4, left: 12 },
  lg: { top: 8, right: 8, left: 16 },
};
export const DATE_PICKER_BORDER_RADIUS: Record<string, number> = {
  sm: 6,
  md: 8,
  lg: 10,
};
export const DATE_PICKER_ICON_SIZE: Record<string, number> = {
  sm: 14,
  md: 16,
  lg: 20,
};

/** locale 기반 날짜 placeholder */
export function buildDatePlaceholder(locale: string): string {
  const isAsian =
    locale.startsWith("ko") ||
    locale.startsWith("ja") ||
    locale.startsWith("zh");
  const isEuropean =
    locale.startsWith("de") ||
    locale.startsWith("fr") ||
    locale.startsWith("es") ||
    locale.startsWith("it") ||
    locale.startsWith("pt");
  if (isAsian) return "YYYY / MM / DD";
  if (isEuropean) return "DD / MM / YYYY";
  return "MM / DD / YYYY";
}

/** DatePicker / DateRangePicker 공유 shapes 빌더 */
export interface DatePickerShapesInput {
  props: Record<string, unknown>;
  sizeEntry: Record<string, unknown>;
  displayText: string;
  hasValue: boolean;
  defaultContainerWidth?: number;
}

export function buildDatePickerShapes(input: DatePickerShapesInput): Shape[] {
  const { props, sizeEntry, displayText, hasValue } = input;
  const defaultCW = input.defaultContainerWidth ?? 200;

  const sizeName = (props.size as string) || "md";
  const inputHeight =
    DATE_PICKER_INPUT_HEIGHT[sizeName] ?? DATE_PICKER_INPUT_HEIGHT.md;
  const pad =
    DATE_PICKER_INPUT_PADDING[sizeName] ?? DATE_PICKER_INPUT_PADDING.md;
  const borderRadius =
    DATE_PICKER_BORDER_RADIUS[sizeName] ?? DATE_PICKER_BORDER_RADIUS.md;
  const iconSz = DATE_PICKER_ICON_SIZE[sizeName] ?? DATE_PICKER_ICON_SIZE.md;
  const gap = 4;

  const containerWidth =
    (props._containerWidth as number) ||
    ((props.style as Record<string, unknown> | undefined)?.width as number) ||
    defaultCW;

  const style = (props.style as Record<string, unknown> | undefined) ?? {};
  const fontSize = resolveSpecFontSize(
    (style.fontSize as string | number | undefined) ??
      (sizeEntry.fontSize as string | number | undefined),
    14,
  );
  const ff = (style.fontFamily as string) || fontFamily.sans;

  const textColor =
    (style.color as string | undefined) ??
    (hasValue
      ? ("{color.neutral}" as TokenRef)
      : ("{color.neutral-subdued}" as TokenRef));
  const bgColor =
    (style.backgroundColor as string | undefined) ??
    ("{color.layer-2}" as TokenRef);
  const borderColor =
    (style.borderColor as string | undefined) ?? ("{color.border}" as TokenRef);

  const btnAreaWidth = iconSz + pad.right + gap;
  const textMaxWidth = containerWidth - pad.left - btnAreaWidth;
  const btnX = containerWidth - pad.right - iconSz;

  return [
    {
      id: "input-bg",
      type: "roundRect" as const,
      x: 0,
      y: 0,
      width: containerWidth,
      height: inputHeight,
      radius: borderRadius,
      fill: bgColor,
    },
    {
      type: "border" as const,
      target: "input-bg",
      borderWidth: 1,
      color: borderColor ?? ("{color.border}" as TokenRef),
      radius: borderRadius,
    },
    {
      type: "text" as const,
      x: pad.left,
      y: 0,
      text: displayText,
      fontSize,
      fontFamily: ff,
      fontWeight: 400,
      fill: textColor,
      align: "left" as const,
      baseline: "middle" as const,
      maxWidth: textMaxWidth,
    },
    {
      type: "icon_font" as const,
      iconName: "calendar",
      x: btnX + iconSz / 2,
      y: inputHeight / 2,
      fontSize: iconSz,
      fill: "{color.neutral-subdued}" as TokenRef,
      strokeWidth: 2,
    },
  ];
}

/** DatePicker/DateRangePicker 공유 sizes */
export const DATE_PICKER_SIZES = {
  xs: {
    height: 20,
    paddingX: 4,
    paddingY: 1,
    fontSize: "{typography.text-2xs}" as TokenRef,
    borderRadius: "{radius.xs}" as TokenRef,
    iconSize: 10,
    gap: 2,
  },
  sm: {
    height: 22,
    paddingX: 8,
    paddingY: 2,
    fontSize: "{typography.text-xs}" as TokenRef,
    borderRadius: "{radius.sm}" as TokenRef,
    iconSize: 14,
    gap: 4,
  },
  md: {
    height: 30,
    paddingX: 12,
    paddingY: 4,
    fontSize: "{typography.text-sm}" as TokenRef,
    borderRadius: "{radius.md}" as TokenRef,
    iconSize: 16,
    gap: 4,
  },
  lg: {
    height: 42,
    paddingX: 16,
    paddingY: 8,
    fontSize: "{typography.text-base}" as TokenRef,
    borderRadius: "{radius.lg}" as TokenRef,
    iconSize: 20,
    gap: 4,
  },
  xl: {
    height: 52,
    paddingX: 20,
    paddingY: 12,
    fontSize: "{typography.text-lg}" as TokenRef,
    borderRadius: "{radius.xl}" as TokenRef,
    iconSize: 24,
    gap: 8,
  },
};

/** DatePicker/DateRangePicker 공유 states */
export const DATE_PICKER_STATES = {
  hover: {},
  pressed: {},
  disabled: { opacity: 0.38, pointerEvents: "none" as const },
  focusVisible: {
    focusRing: "{focus.ring.default}" as const,
  },
};

export const DatePickerSpec: ComponentSpec<DatePickerProps> = {
  name: "DatePicker",
  description: "DateField 입력 + 캘린더 버튼",
  element: "div",
  skipCSSGeneration: false,

  // ADR-087 SP4: outer container static display 리프팅.
  //   flexDirection 은 labelPosition prop runtime 결정 (implicitStyles 잔존).
  containerStyles: {
    display: "flex",
  },

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
        selector: '.react-aria-Popover[data-trigger="DatePicker"]',
        styles: { "max-width": "unset" },
        nested: [
          {
            selector: ".react-aria-Dialog .react-aria-Calendar",
            styles: {
              background: "transparent",
              border: "none",
              padding: "0",
            },
          },
        ],
      },
      {
        selector: ".react-aria-DatePicker-time-field",
        styles: { width: "100%" },
      },
    ],
    delegation: [
      {
        childSelector: ".react-aria-Label",
        prefix: "dp-label",
        variables: {
          xs: {
            "--dp-label-size": "var(--text-2xs)",
            "--dp-label-line-height": "var(--text-2xs--line-height)",
          },
          sm: {
            "--dp-label-size": "var(--text-xs)",
            "--dp-label-line-height": "var(--text-xs--line-height)",
          },
          md: {
            "--dp-label-size": "var(--text-sm)",
            "--dp-label-line-height": "var(--text-sm--line-height)",
          },
          lg: {
            "--dp-label-size": "var(--text-base)",
            "--dp-label-line-height": "var(--text-base--line-height)",
          },
          xl: {
            "--dp-label-size": "var(--text-lg)",
            "--dp-label-line-height": "var(--text-lg--line-height)",
          },
        },
        bridges: {
          "--label-font-size": "var(--dp-label-size)",
          "--label-line-height": "var(--dp-label-line-height)",
          "--label-font-weight": "600",
        },
      },
      {
        childSelector: ".react-aria-Group",
        prefix: "dp-group",
        variables: {
          xs: {
            "--dp-group-padding":
              "var(--spacing-3xs) var(--spacing-3xs) var(--spacing-3xs) var(--spacing-xs)",
            "--dp-group-font-size": "var(--text-2xs)",
            "--dp-group-line-height": "var(--text-2xs--line-height)",
            "--dp-group-gap": "var(--spacing-2xs)",
          },
          sm: {
            "--dp-group-padding":
              "var(--spacing-2xs) var(--spacing-2xs) var(--spacing-2xs) var(--spacing-sm)",
            "--dp-group-font-size": "var(--text-xs)",
            "--dp-group-line-height": "var(--text-xs--line-height)",
            "--dp-group-gap": "var(--spacing-xs)",
          },
          md: {
            "--dp-group-padding":
              "var(--spacing-xs) var(--spacing-xs) var(--spacing-xs) var(--spacing-md)",
            "--dp-group-font-size": "var(--text-sm)",
            "--dp-group-line-height": "var(--text-sm--line-height)",
            "--dp-group-gap": "var(--spacing-xs)",
          },
          lg: {
            "--dp-group-padding":
              "var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) var(--spacing-lg)",
            "--dp-group-font-size": "var(--text-base)",
            "--dp-group-line-height": "var(--text-base--line-height)",
            "--dp-group-gap": "var(--spacing-xs)",
          },
          xl: {
            "--dp-group-padding":
              "var(--spacing-md) var(--spacing-md) var(--spacing-md) var(--spacing-xl)",
            "--dp-group-font-size": "var(--text-lg)",
            "--dp-group-line-height": "var(--text-lg--line-height)",
            "--dp-group-gap": "var(--spacing-sm)",
          },
        },
        bridges: {
          display: "flex",
          "align-items": "center",
          width: "100%",
          gap: "var(--dp-group-gap)",
          padding: "var(--dp-group-padding)",
          border: "1px solid var(--border)",
          "border-radius": "var(--border-radius)",
          background: "var(--bg-inset)",
          color: "var(--fg)",
          "white-space": "nowrap",
          "forced-color-adjust": "none",
          "font-size": "var(--dp-group-font-size)",
          "line-height": "var(--dp-group-line-height)",
          transition: "border-color 200ms ease, background-color 200ms ease",
          cursor: "text",
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
        prefix: "dp-input",
        bridges: {
          display: "inline-flex",
          flex: "1",
          "min-width": "0",
          padding: "0",
          border: "none",
          outline: "none",
          background: "transparent",
          color: "var(--fg)",
          "font-size": "var(--dp-group-font-size)",
          "white-space": "nowrap",
        },
      },
      {
        childSelector: ".react-aria-DateSegment",
        prefix: "dp-segment",
        variables: {
          xs: { "--dp-segment-size": "var(--text-2xs)" },
          sm: { "--dp-segment-size": "var(--text-xs)" },
          md: { "--dp-segment-size": "var(--text-sm)" },
          lg: { "--dp-segment-size": "var(--text-base)" },
          xl: { "--dp-segment-size": "var(--text-lg)" },
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
          "font-size": "var(--dp-segment-size)",
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
        childSelector: ".react-aria-Button",
        prefix: "dp-btn",
        variables: {
          xs: {
            "--dp-btn-width": "var(--text-sm)",
            "--dp-btn-height": "var(--text-sm)",
          },
          sm: {
            "--dp-btn-width": "var(--text-base)",
            "--dp-btn-height": "var(--text-base)",
          },
          md: {
            "--dp-btn-width": "var(--text-xl)",
            "--dp-btn-height": "var(--text-xl)",
          },
          lg: {
            "--dp-btn-width": "var(--text-2xl)",
            "--dp-btn-height": "var(--text-2xl)",
          },
          xl: {
            "--dp-btn-width": "var(--text-3xl)",
            "--dp-btn-height": "var(--text-3xl)",
          },
        },
        bridges: {
          background: "transparent",
          color: "var(--fg-muted)",
          "forced-color-adjust": "none",
          border: "none",
          width: "var(--dp-btn-width)",
          height: "var(--dp-btn-height)",
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
        prefix: "dp-hint",
        variables: {
          xs: { "--dp-hint-size": "var(--text-2xs)" },
          sm: { "--dp-hint-size": "var(--text-xs)" },
          md: { "--dp-hint-size": "var(--text-xs)" },
          lg: { "--dp-hint-size": "var(--text-sm)" },
          xl: { "--dp-hint-size": "var(--text-sm)" },
        },
        bridges: {
          "--error-font-size": "var(--dp-hint-size)",
        },
      },
      {
        childSelector: '[slot="description"]',
        bridges: {
          "font-size": "var(--dp-hint-size)",
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
          { key: "minValue", type: "string", label: "Min Value", icon: Hash },
          { key: "maxValue", type: "string", label: "Max Value", icon: Hash },
          {
            key: "defaultValue",
            type: "string",
            label: "Default Value",
            icon: Hash,
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
      { parentProp: "size", childPath: "Label", override: true },
      // size → Calendar 서브트리
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

      // maxVisibleMonths → Calendar
      {
        parentProp: "maxVisibleMonths",
        childPath: "Calendar",
        childProp: "maxVisibleMonths",
        override: true,
      },

      // locale → Calendar 서브트리
      { parentProp: "locale", childPath: "Calendar" },
      { parentProp: "locale", childPath: ["Calendar", "CalendarHeader"] },
      { parentProp: "locale", childPath: ["Calendar", "CalendarGrid"] },

      // calendarSystem → Calendar 서브트리
      { parentProp: "calendarSystem", childPath: "Calendar" },
      {
        parentProp: "calendarSystem",
        childPath: ["Calendar", "CalendarHeader"],
      },
      {
        parentProp: "calendarSystem",
        childPath: ["Calendar", "CalendarGrid"],
      },

      // defaultToday → CalendarGrid only
      { parentProp: "defaultToday", childPath: ["Calendar", "CalendarGrid"] },
    ],
  },

  render: {
    shapes: (props, _size, _state = "default") => {
      // Compositional: 자식이 있으면 투명 컨테이너
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return [];

      const locale = props.locale || "en-US";
      const displayText =
        props.value || props.placeholder || buildDatePlaceholder(locale);

      return buildDatePickerShapes({
        props: props as unknown as Record<string, unknown>,
        sizeEntry: _size as unknown as Record<string, unknown>,
        displayText,
        hasValue: !!props.value,
        defaultContainerWidth: 200,
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
