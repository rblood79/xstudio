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
  name?: string;
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

  // ADR-059 v2 Pre-Phase 0-B: Composite delegation SSOT 선언
  // 주의: prefix는 `time-field-*` (TextField `tf-*` 와 충돌 차단)
  composition: {
    layout: "flex-column",
    gap: "var(--spacing-xs)",
    delegation: [
      {
        childSelector: ".react-aria-Label",
        prefix: "time-field-label",
        variables: {
          sm: { "--time-field-label-size": "var(--text-xs)" },
          md: { "--time-field-label-size": "var(--text-sm)" },
          lg: { "--time-field-label-size": "var(--text-base)" },
          xl: { "--time-field-label-size": "var(--text-lg)" },
        },
      },
      {
        childSelector: ".react-aria-DateInput",
        prefix: "time-field-input",
        variables: {
          sm: {
            "--time-field-input-padding": "var(--spacing-2xs) var(--spacing-sm)",
            "--time-field-input-size": "var(--text-xs)",
            "--time-field-input-line-height": "var(--text-xs--line-height)",
          },
          md: {
            "--time-field-input-padding": "var(--spacing-xs) var(--spacing-md)",
            "--time-field-input-size": "var(--text-sm)",
            "--time-field-input-line-height": "var(--text-sm--line-height)",
          },
          lg: {
            "--time-field-input-padding": "var(--spacing-sm) var(--spacing-lg)",
            "--time-field-input-size": "var(--text-base)",
            "--time-field-input-line-height": "var(--text-base--line-height)",
          },
          xl: {
            "--time-field-input-padding": "var(--spacing-md) var(--spacing-xl)",
            "--time-field-input-size": "var(--text-lg)",
            "--time-field-input-line-height": "var(--text-lg--line-height)",
          },
        },
      },
      // 0-F.3: DateSegment (React Aria TimeField 내부 시간 편집 요소)
      {
        childSelector: ".react-aria-DateSegment",
        prefix: "time-field-segment",
        variables: {
          sm: { "--time-field-segment-size": "var(--text-xs)" },
          md: { "--time-field-segment-size": "var(--text-sm)" },
          lg: { "--time-field-segment-size": "var(--text-base)" },
          xl: { "--time-field-segment-size": "var(--text-lg)" },
        },
      },
      {
        childSelector: ".react-aria-FieldError",
        prefix: "time-field-hint",
        variables: {
          sm: { "--time-field-hint-size": "var(--text-xs)" },
          md: { "--time-field-hint-size": "var(--text-xs)" },
          lg: { "--time-field-hint-size": "var(--text-sm)" },
          xl: { "--time-field-hint-size": "var(--text-base)" },
        },
      },
    ],
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
            key: "placeholderValue",
            type: "string",
            label: "Placeholder",
            icon: FileText,
            emptyToUndefined: true,
          },
        ],
      },
    ],
  },

  states: {
    hover: {},
    pressed: {},
    disabled: { opacity: 0.38 },
    focusVisible: {
      focusRing: "{focus.ring.default}",
    },
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
