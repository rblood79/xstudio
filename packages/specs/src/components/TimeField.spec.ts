/**
 * TimeField Component Spec
 *
 * 투명 column 컨테이너. 실제 입력 영역은 자식 DateInput Spec이 렌더링.
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import {
  Layout,
  Clock,
  Hash,
  EyeOff,
  AlertTriangle,
  PointerOff,
  PenOff,
  CheckSquare,
  FormInput,
  HelpCircle,
  FileText,
} from "lucide-react";

export interface TimeFieldProps {
  variant?: "default" | "accent" | "negative";
  size?: "sm" | "md" | "lg" | "xl";
  label?: string;
  description?: string;
  errorMessage?: string;
  granularity?: "hour" | "minute" | "second";
  hourCycle?: 12 | 24;
  locale?: string;
  form?: string;
  defaultValue?: string;
  placeholderValue?: string;
  value?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  contextualHelp?: string;
  labelPosition?: "top" | "side";
  labelAlign?: "start" | "end";
  style?: Record<string, string | number | undefined>;
}

export const TimeFieldSpec: ComponentSpec<TimeFieldProps> = {
  name: "TimeField",
  description: "투명 column 컨테이너 — DateInput이 입력 영역 렌더링",
  element: "div",
  skipCSSGeneration: true,

  defaultVariant: "default",
  defaultSize: "md",

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
      fontSize: "{typography.text-base}" as TokenRef,
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
    xl: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xl}" as TokenRef,
      borderRadius: 0 as unknown as TokenRef,
      gap: 10,
    },
  },

  propagation: {
    rules: [
      { parentProp: "size", childPath: "Label", override: true },
      { parentProp: "size", childPath: "TimeSegment", override: true },
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
        title: "Content",
        fields: [
          {
            key: "label",
            type: "string",
            label: "Label",
            icon: Layout,
            emptyToUndefined: true,
          },
          {
            key: "description",
            type: "string",
            label: "Description",
            icon: FileText,
            emptyToUndefined: true,
          },
          {
            key: "errorMessage",
            type: "string",
            label: "Error Message",
            icon: AlertTriangle,
            emptyToUndefined: true,
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
            key: "granularity",
            type: "enum",
            label: "Granularity",
            icon: Clock,
            options: [
              { value: "hour", label: "Hour" },
              { value: "minute", label: "Minute" },
              { value: "second", label: "Second" },
            ],
            defaultValue: "minute",
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
            defaultValue: "top",
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
        fields: [],
      },
      {
        title: "State",
        fields: [
          {
            key: "minValue",
            type: "string",
            label: "Min Value",
            icon: Hash,
            placeholder: "09:00",
          },
          {
            key: "maxValue",
            type: "string",
            label: "Max Value",
            icon: Hash,
            placeholder: "18:00",
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
            key: "name",
            type: "string",
            label: "Name",
            icon: FormInput,
            emptyToUndefined: true,
            placeholder: "time-field-name",
          },
          {
            key: "form",
            type: "string",
            label: "Form",
            icon: FormInput,
            emptyToUndefined: true,
          },
          {
            key: "placeholderValue",
            type: "string",
            label: "Placeholder",
            icon: FileText,
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
            defaultValue: "aria",
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
