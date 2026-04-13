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
  CheckSquare,
  Tag,
  FileText,
  HelpCircle,
} from "lucide-react";

export interface DateFieldProps {
  size?: "sm" | "md" | "lg" | "xl";
  isQuiet?: boolean;
  label?: string;
  granularity?: "day" | "hour" | "minute" | "second";
  hourCycle?: 12 | 24;
  locale?: string;
  calendar?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  labelPosition?: "top" | "side";
  contextualHelp?: string;
  name?: string;
  style?: Record<string, string | number | undefined>;
}

export const DateFieldSpec: ComponentSpec<DateFieldProps> = {
  name: "DateField",
  description: "투명 column 컨테이너 — DateInput이 입력 영역 렌더링",
  element: "div",
  skipCSSGeneration: true,

  defaultSize: "md",

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
  composition: {
    layout: "flex-column",
    gap: "var(--spacing-xs)",
    delegation: [
      {
        childSelector: ".react-aria-Label",
        prefix: "df-label",
        variables: {
          sm: { "--df-label-size": "var(--text-xs)" },
          md: { "--df-label-size": "var(--text-sm)" },
          lg: { "--df-label-size": "var(--text-base)" },
          xl: { "--df-label-size": "var(--text-lg)" },
        },
      },
      {
        childSelector: ".react-aria-DateInput",
        prefix: "df-input",
        variables: {
          sm: {
            "--df-input-padding": "var(--spacing-2xs) var(--spacing-sm)",
            "--df-input-size": "var(--text-xs)",
            "--df-input-line-height": "var(--text-xs--line-height)",
          },
          md: {
            "--df-input-padding": "var(--spacing-xs) var(--spacing-md)",
            "--df-input-size": "var(--text-sm)",
            "--df-input-line-height": "var(--text-sm--line-height)",
          },
          lg: {
            "--df-input-padding": "var(--spacing-sm) var(--spacing-lg)",
            "--df-input-size": "var(--text-base)",
            "--df-input-line-height": "var(--text-base--line-height)",
          },
          xl: {
            "--df-input-padding": "var(--spacing-md) var(--spacing-xl)",
            "--df-input-size": "var(--text-lg)",
            "--df-input-line-height": "var(--text-lg--line-height)",
          },
        },
      },
      // 0-F.3: DateSegment (내부 숫자 편집 요소) 전용 계약
      {
        childSelector: ".react-aria-DateSegment",
        prefix: "df-segment",
        variables: {
          sm: { "--df-segment-size": "var(--text-xs)" },
          md: { "--df-segment-size": "var(--text-sm)" },
          lg: { "--df-segment-size": "var(--text-base)" },
          xl: { "--df-segment-size": "var(--text-lg)" },
        },
      },
      {
        childSelector: ".react-aria-FieldError",
        prefix: "df-hint",
        variables: {
          sm: { "--df-hint-size": "var(--text-xs)" },
          md: { "--df-hint-size": "var(--text-xs)" },
          lg: { "--df-hint-size": "var(--text-sm)" },
          xl: { "--df-hint-size": "var(--text-base)" },
        },
      },
    ],
  },

  propagation: {
    rules: [
      { parentProp: "size", childPath: "Label", override: true },
      { parentProp: "size", childPath: "DateInput", override: true },
      { parentProp: "size", childPath: "DateSegment", override: true },
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
          { key: "label", type: "string", label: "Label", icon: Tag },
          {
            key: "description",
            type: "string",
            label: "Description",
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
