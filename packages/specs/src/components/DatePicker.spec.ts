/**
 * DatePicker Component Spec
 *
 * DateField 입력 패턴 + 우측 캘린더 버튼
 * Compositional 자식이 있으면 빈 shapes 반환 (부모 투명 컨테이너)
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";
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
  Focus,
  FormInput,
  ToggleLeft,
} from "lucide-react";

export interface DatePickerProps {
  variant?: "default" | "accent";
  size?: "sm" | "md" | "lg";
  value?: string;
  placeholder?: string;
  label?: string;
  locale?: string;
  calendarSystem?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  labelPosition?: "top" | "side";
  visibleMonths?: number;
  style?: Record<string, string | number | undefined>;
}

/** @sync DateInput.spec.ts — DateRangePicker.spec.ts에서도 import */
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
  variant: Record<string, unknown>;
  sizeEntry: Record<string, unknown>;
  displayText: string;
  hasValue: boolean;
  defaultContainerWidth?: number;
}

export function buildDatePickerShapes(input: DatePickerShapesInput): Shape[] {
  const { props, variant, sizeEntry, displayText, hasValue } = input;
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
  const rawFontSize = style.fontSize ?? sizeEntry.fontSize;
  const resolvedFs =
    typeof rawFontSize === "number"
      ? rawFontSize
      : typeof rawFontSize === "string" && rawFontSize.startsWith("{")
        ? resolveToken(rawFontSize as TokenRef)
        : rawFontSize;
  const fontSize = typeof resolvedFs === "number" ? resolvedFs : 14;
  const ff = (style.fontFamily as string) || fontFamily.sans;

  const textColor =
    (style.color as string | undefined) ??
    (hasValue
      ? (variant.text as string)
      : ("{color.neutral-subdued}" as TokenRef));
  const bgColor =
    (style.backgroundColor as string | undefined) ??
    (variant.background as string);
  const borderColor =
    (style.borderColor as string | undefined) ??
    (variant.border as string | undefined);

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

/** DatePicker/DateRangePicker 공유 variants */
export const DATE_PICKER_VARIANTS = {
  default: {
    background: "{color.layer-2}" as TokenRef,
    backgroundHover: "{color.layer-2}" as TokenRef,
    backgroundPressed: "{color.layer-2}" as TokenRef,
    text: "{color.neutral}" as TokenRef,
    border: "{color.border}" as TokenRef,
  },
  accent: {
    background: "{color.layer-2}" as TokenRef,
    backgroundHover: "{color.layer-2}" as TokenRef,
    backgroundPressed: "{color.layer-2}" as TokenRef,
    text: "{color.neutral}" as TokenRef,
    border: "{color.accent}" as TokenRef,
  },
};

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
    outline: "2px solid var(--accent)",
    outlineOffset: "2px",
  },
};

export const DatePickerSpec: ComponentSpec<DatePickerProps> = {
  name: "DatePicker",
  description: "DateField 입력 + 캘린더 버튼",
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
          },
          {
            key: "visibleMonths",
            type: "number",
            label: "Visible Months",
            icon: Columns,
            min: 1,
            max: 3,
            step: 1,
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
          { key: "autoFocus", type: "boolean", icon: Focus },
          {
            key: "shouldCloseOnSelect",
            type: "boolean",
            label: "Close On Select",
            icon: CheckSquare,
          },

          {
            key: "name",
            type: "string",
            label: "Name",
            icon: FormInput,
            emptyToUndefined: true,
          },
          {
            key: "form",
            type: "string",
            label: "Form",
            icon: FormInput,
            emptyToUndefined: true,
          },
          {
            key: "autoComplete",
            type: "string",
            label: "Autocomplete",
            icon: FormInput,
            emptyToUndefined: true,
          },
          {
            key: "validationBehavior",
            type: "enum",
            label: "Validation Behavior",
            icon: CheckSquare,
            options: [
              { value: "native", label: "Native" },
              { value: "aria", label: "ARIA" },
            ],
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

      // visibleMonths → Calendar
      { parentProp: "visibleMonths", childPath: "Calendar", override: true },

      // variant → 직접 자식
      { parentProp: "variant", childPath: "Calendar" },
      { parentProp: "variant", childPath: "Label" },
      // variant → Calendar 서브트리
      { parentProp: "variant", childPath: ["Calendar", "CalendarHeader"] },
      { parentProp: "variant", childPath: ["Calendar", "CalendarGrid"] },

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
    shapes: (props, variant, _size, _state = "default") => {
      // Compositional: 자식이 있으면 투명 컨테이너
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return [];

      const locale = props.locale || "en-US";
      const displayText =
        props.value || props.placeholder || buildDatePlaceholder(locale);

      return buildDatePickerShapes({
        props: props as unknown as Record<string, unknown>,
        variant: variant as unknown as Record<string, unknown>,
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
