/**
 * DateField Component Spec
 *
 * 투명 column 컨테이너. _hasChildren일 때 빈 shapes 반환.
 * 실제 입력 영역은 자식 DateInput Spec이 렌더링.
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import {
  Layout,
  Globe,
  Clock,
  Hash,
  EyeOff,
  AlertTriangle,
  PointerOff,
  PenOff,
  Focus,
  CheckSquare,
  FormInput,
} from "lucide-react";

export interface DateFieldProps {
  variant?: "default" | "accent" | "negative";
  size?: "S" | "M" | "L";
  label?: string;
  granularity?: "day" | "hour" | "minute" | "second";
  hourCycle?: 12 | 24;
  locale?: string;
  calendar?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  labelPosition?: "top" | "side";
  style?: Record<string, string | number | undefined>;
}

export const DateFieldSpec: ComponentSpec<DateFieldProps> = {
  name: "DateField",
  description: "투명 column 컨테이너 — DateInput이 입력 영역 렌더링",
  element: "div",
  skipCSSGeneration: true,

  defaultVariant: "default",
  defaultSize: "M",

  variants: {
    default: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.transparent}" as TokenRef,
    },
    accent: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.transparent}" as TokenRef,
    },
    negative: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.transparent}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: 0 as unknown as TokenRef,
      gap: 4,
    },
    md: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-md}" as TokenRef,
      borderRadius: 0 as unknown as TokenRef,
      gap: 6,
    },
    lg: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: 0 as unknown as TokenRef,
      gap: 8,
    },
  },

  propagation: {
    rules: [
      { parentProp: "size", childPath: "Label" },
      { parentProp: "size", childPath: "DateInput" },
      { parentProp: "size", childPath: "DateSegment" },
      {
        parentProp: "label",
        childPath: "Label",
        childProp: "children",
        override: true,
      },
    ],
  },

  properties: {
    sections: [
      {
        title: "Appearance",
        fields: [
          { type: "size" },
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
            valueTransform: "number",
            options: [
              { value: "", label: "Auto" },
              { value: "12", label: "12 Hour" },
              { value: "24", label: "24 Hour" },
            ],
          },
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
              { value: "en-US", label: "English (US)" },
              { value: "en-GB", label: "English (UK)" },
              { value: "ko-KR", label: "한국어" },
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
              { value: "gregory", label: "Gregorian" },
              { value: "japanese", label: "Japanese" },
              { value: "buddhist", label: "Buddhist" },
              { value: "hebrew", label: "Hebrew" },
            ],
          },
        ],
      },
      {
        title: "State",
        fields: [
          { key: "minValue", type: "string", label: "Min Value", icon: Hash },
          { key: "maxValue", type: "string", label: "Max Value", icon: Hash },
          {
            key: "necessityIndicator",
            type: "enum",
            label: "Required",
            icon: CheckSquare,
            emptyToUndefined: true,
            options: [
              { value: "", label: "None" },
              { value: "icon", label: "Icon" },
              { value: "label", label: "Label" },
            ],
          },
          { key: "isInvalid", type: "boolean", icon: AlertTriangle },
          { key: "isDisabled", type: "boolean", icon: PointerOff },
          { key: "isReadOnly", type: "boolean", icon: PenOff },
          { key: "autoFocus", type: "boolean", icon: Focus },

          {
            key: "name",
            type: "string",
            label: "Name",
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

  states: {
    hover: {},
    pressed: {},
    disabled: { opacity: 0.38 },
    focusVisible: {},
  },

  render: {
    shapes: () => {
      // 투명 컨테이너 — 자식(Label, DateInput, FieldError)이 개별 렌더링
      return [] as Shape[];
    },

    react: (props) => ({
      "aria-invalid": props.isInvalid || undefined,
      "data-disabled": props.isDisabled || undefined,
      role: "group",
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ("none" as const) : ("static" as const),
      cursor: props.isDisabled ? "not-allowed" : "text",
    }),
  },
};
