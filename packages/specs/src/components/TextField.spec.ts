/**
 * TextField Component Spec
 *
 * React Aria 기반 텍스트 입력 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";
import {
  Keyboard,
  SpellCheck2,
  AlertTriangle,
  Hash,
  CheckSquare,
  Focus,
  PointerOff,
  PenOff,
  FileText,
  Tag,
  Layout,
  HelpCircle,
  Minimize2,
  CornerDownLeft,
  Image,
} from "lucide-react";

/**
 * TextField Props
 */
export interface TextFieldProps {
  variant?:
    | "default"
    | "accent"
    | "neutral"
    | "purple"
    | "negative"
    | "positive";
  size?: "sm" | "md" | "lg" | "xl";
  label?: string;
  placeholder?: string;
  name?: string;
  value?: string;
  description?: string;
  errorMessage?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  isQuiet?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
  autoCorrect?: "on" | "off";
  inputMode?:
    | "none"
    | "text"
    | "tel"
    | "url"
    | "email"
    | "numeric"
    | "decimal"
    | "search";
  enterKeyHint?:
    | "enter"
    | "done"
    | "go"
    | "next"
    | "previous"
    | "search"
    | "send";
  icon?: string;
  labelPosition?: "top" | "side";
  labelAlign?: "start" | "end";
  necessityIndicator?: "icon" | "label";
  form?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  contextualHelp?: string;
  children?: string;
  /** ElementSprite 주입: 엔진 계산 최종 폭 */
  _containerWidth?: number;
  style?: Record<string, string | number | undefined>;
}

/**
 * TextField Component Spec
 */
export const TextFieldSpec: ComponentSpec<TextFieldProps> = {
  name: "TextField",
  description: "React Aria 기반 텍스트 입력 컴포넌트",
  element: "div",
  skipCSSGeneration: true,

  defaultVariant: "default",
  defaultSize: "md",

  properties: {
    sections: [
      {
        title: "Content",
        fields: [
          {
            key: "label",
            type: "string",
            label: "Label",
            icon: Tag,
          },
          {
            key: "value",
            type: "string",
            label: "Value",
            icon: Hash,
          },
          {
            key: "placeholder",
            type: "string",
            label: "Placeholder",
            icon: FileText,
            placeholder: "Enter text...",
          },
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
            key: "isQuiet",
            type: "boolean",
            label: "Quiet",
            icon: Minimize2,
          },
          {
            key: "icon",
            type: "string",
            label: "Icon",
            icon: Image,
            emptyToUndefined: true,
            placeholder: "icon-name",
          },
        ],
      },
      {
        title: "Input Type",
        fields: [
          {
            key: "type",
            type: "enum",
            label: "Input Type",
            icon: Keyboard,
            options: [
              { value: "text", label: "Text" },
              { value: "email", label: "Email" },
              { value: "password", label: "Password" },
              { value: "search", label: "Search" },
              { value: "tel", label: "Tel" },
              { value: "url", label: "URL" },
              { value: "number", label: "Number" },
            ],
            defaultValue: "text",
          },
          {
            key: "inputMode",
            type: "enum",
            label: "Input Mode",
            icon: Keyboard,
            emptyToUndefined: true,
            options: [
              { value: "", label: "None" },
              { value: "text", label: "Text" },
              { value: "numeric", label: "Numeric" },
              { value: "decimal", label: "Decimal" },
              { value: "tel", label: "Tel" },
              { value: "email", label: "Email" },
              { value: "url", label: "URL" },
              { value: "search", label: "Search" },
            ],
          },
          {
            key: "autoComplete",
            type: "enum",
            label: "Autocomplete",
            icon: SpellCheck2,
            emptyToUndefined: true,
            options: [
              { value: "", label: "Off" },
              { value: "on", label: "On" },
              { value: "name", label: "Name" },
              { value: "email", label: "Email" },
              { value: "username", label: "Username" },
              { value: "new-password", label: "New Password" },
              { value: "current-password", label: "Current Password" },
              { value: "tel", label: "Tel" },
              { value: "url", label: "URL" },
            ],
          },
        ],
      },
      {
        title: "State",
        fields: [
          {
            key: "autoFocus",
            type: "boolean",
            label: "Auto Focus",
            icon: Focus,
          },
          {
            key: "isDisabled",
            type: "boolean",
            label: "Disabled",
            icon: PointerOff,
          },
          {
            key: "isReadOnly",
            type: "boolean",
            label: "Read Only",
            icon: PenOff,
          },
          {
            key: "isInvalid",
            type: "boolean",
            label: "Invalid",
            icon: AlertTriangle,
          },
          {
            key: "spellCheck",
            type: "boolean",
            label: "Spell Check",
            icon: SpellCheck2,
          },
          {
            key: "autoCorrect",
            type: "enum",
            label: "Auto Correct",
            icon: SpellCheck2,
            options: [
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ],
            defaultValue: "off",
          },
          {
            key: "enterKeyHint",
            type: "enum",
            label: "Enter Key Hint",
            icon: CornerDownLeft,
            emptyToUndefined: true,
            options: [
              { value: "", label: "Default" },
              { value: "enter", label: "Enter" },
              { value: "done", label: "Done" },
              { value: "go", label: "Go" },
              { value: "next", label: "Next" },
              { value: "previous", label: "Previous" },
              { value: "search", label: "Search" },
              { value: "send", label: "Send" },
            ],
          },

          {
            key: "name",
            type: "string",
            label: "Name",
            icon: Tag,
            emptyToUndefined: true,
            placeholder: "field-name",
          },
          {
            key: "form",
            type: "string",
            label: "Form",
            icon: FileText,
            emptyToUndefined: true,
            placeholder: "form-id",
          },
          {
            key: "errorMessage",
            type: "string",
            label: "Error Message",
            icon: AlertTriangle,
          },
          {
            key: "pattern",
            type: "string",
            label: "Pattern",
            icon: AlertTriangle,
            emptyToUndefined: true,
            placeholder: "Regular expression",
          },
          {
            key: "minLength",
            type: "number",
            label: "Min Length",
            icon: Hash,
          },
          {
            key: "maxLength",
            type: "number",
            label: "Max Length",
            icon: Hash,
          },
          {
            key: "necessityIndicator",
            type: "enum",
            label: "Required",
            icon: CheckSquare,
            options: [
              { value: "", label: "None" },
              { value: "icon", label: "Icon (*)" },
              { value: "label", label: "Label (required/optional)" },
            ],
            derivedUpdateFn: (value) => {
              if (value === "") {
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
        ],
      },
    ],
  },

  variants: {
    default: {
      background: "{color.layer-2}" as TokenRef,
      backgroundHover: "{color.layer-1}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
      borderHover: "{color.accent}" as TokenRef,
    },
    accent: {
      background: "{color.layer-2}" as TokenRef,
      backgroundHover: "{color.layer-1}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
      borderHover: "{color.accent}" as TokenRef,
    },
    neutral: {
      background: "{color.layer-2}" as TokenRef,
      backgroundHover: "{color.layer-1}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
      borderHover: "{color.neutral-subtle}" as TokenRef,
    },
    purple: {
      background: "{color.layer-2}" as TokenRef,
      backgroundHover: "{color.layer-1}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
      borderHover: "{color.purple}" as TokenRef,
    },
    negative: {
      background: "{color.layer-2}" as TokenRef,
      backgroundHover: "{color.negative-subtle}" as TokenRef,
      backgroundPressed: "{color.negative-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.negative}" as TokenRef,
      borderHover: "{color.negative-hover}" as TokenRef,
    },
    positive: {
      background: "{color.layer-2}" as TokenRef,
      backgroundHover: "{color.layer-1}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.accent}" as TokenRef,
      borderHover: "{color.accent-hover}" as TokenRef,
    },
  },

  // @sync Button.spec.ts sizes — Input height = Button height
  sizes: {
    sm: {
      height: 22,
      paddingX: 8,
      paddingY: 2,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      gap: 4,
    },
    md: {
      height: 30,
      paddingX: 12,
      paddingY: 4,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 6,
    },
    lg: {
      height: 42,
      paddingX: 16,
      paddingY: 8,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      gap: 8,
    },
    xl: {
      height: 54,
      paddingX: 24,
      paddingY: 12,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.xl}" as TokenRef,
      gap: 10,
    },
  },

  // ADR-036 Phase 3a: Tier 2 Composite CSS 생성 메타데이터
  composition: {
    layout: "flex-column",
    gap: "var(--spacing-xs)",
    delegation: [
      {
        childSelector: ".react-aria-Label",
        variables: {
          xs: { "--tf-label-size": "var(--text-2xs)" },
          sm: { "--tf-label-size": "var(--text-xs)" },
          md: { "--tf-label-size": "var(--text-sm)" },
          lg: { "--tf-label-size": "var(--text-base)" },
        },
      },
      {
        childSelector: ".react-aria-Input",
        variables: {
          xs: {
            "--tf-input-padding": "var(--spacing-3xs) var(--spacing-xs)",
            "--tf-input-size": "var(--text-2xs)",
            "--tf-input-line-height": "var(--text-2xs--line-height)",
          },
          sm: {
            "--tf-input-padding": "var(--spacing-2xs) var(--spacing-sm)",
            "--tf-input-size": "var(--text-xs)",
            "--tf-input-line-height": "var(--text-xs--line-height)",
          },
          md: {
            "--tf-input-padding": "var(--spacing-xs) var(--spacing-md)",
            "--tf-input-size": "var(--text-sm)",
            "--tf-input-line-height": "var(--text-sm--line-height)",
          },
          lg: {
            "--tf-input-padding": "var(--spacing-sm) var(--spacing-lg)",
            "--tf-input-size": "var(--text-base)",
            "--tf-input-line-height": "var(--text-base--line-height)",
          },
        },
      },
      {
        childSelector: ".react-aria-FieldError",
        variables: {
          xs: { "--tf-hint-size": "var(--text-2xs)" },
          sm: { "--tf-hint-size": "var(--text-xs)" },
          md: { "--tf-hint-size": "var(--text-xs)" },
          lg: { "--tf-hint-size": "var(--text-sm)" },
        },
      },
    ],
  },

  propagation: {
    rules: [
      { parentProp: "size", childPath: "Label", override: true },
      { parentProp: "size", childPath: "Input", override: true },
      {
        parentProp: "label",
        childPath: "Label",
        childProp: "children",
        override: true,
      },
      {
        parentProp: "placeholder",
        childPath: "Input",
        childProp: "placeholder",
        override: true,
      },
    ],
  },

  states: {
    hover: {},
    pressed: {},
    disabled: {
      opacity: 0.38,
      cursor: "not-allowed",
      pointerEvents: "none",
    },
    focusVisible: {
      outline: "2px solid var(--accent)",
      outlineOffset: "2px",
    },
  },

  render: {
    shapes: (props, variant, size, state = "default") => {
      const width =
        typeof props._containerWidth === "number" && props._containerWidth > 0
          ? props._containerWidth
          : (props.style?.width as number) || 240;
      const height = size.height;

      const styleBr = props.style?.borderRadius;
      const borderRadius =
        styleBr != null
          ? typeof styleBr === "number"
            ? styleBr
            : parseFloat(String(styleBr)) || 0
          : (size.borderRadius as unknown as number);

      const bgColor =
        props.style?.backgroundColor ??
        (state === "hover"
          ? variant.backgroundHover
          : state === "pressed"
            ? variant.backgroundPressed
            : variant.background);

      const borderColor =
        props.style?.borderColor ??
        (state === "hover" && variant.borderHover
          ? variant.borderHover
          : variant.border);

      const styleBw = props.style?.borderWidth;
      const defaultBw = props.isInvalid ? 2 : 1;
      const borderWidth =
        styleBw != null
          ? typeof styleBw === "number"
            ? styleBw
            : parseFloat(String(styleBw)) || 0
          : defaultBw;

      // fontSize: Propagation은 size prop만 변경하므로 props.size 있으면 size.fontSize 우선
      const rawFontSize = props.size
        ? size.fontSize
        : (props.style?.fontSize ?? size.fontSize);
      const resolvedFs =
        typeof rawFontSize === "number"
          ? rawFontSize
          : typeof rawFontSize === "string" && rawFontSize.startsWith("{")
            ? resolveToken(rawFontSize as TokenRef)
            : rawFontSize;
      const fontSize = typeof resolvedFs === "number" ? resolvedFs : 16;

      const fwRaw = props.style?.fontWeight;
      const fontWeight =
        fwRaw != null
          ? typeof fwRaw === "number"
            ? fwRaw
            : parseInt(String(fwRaw), 10) || 500
          : 500;

      const ff = (props.style?.fontFamily as string) || fontFamily.sans;

      const textAlign =
        (props.style?.textAlign as "left" | "center" | "right") || "left";

      const textColor = props.style?.color ?? variant.text;

      const stylePx =
        props.style?.paddingLeft ??
        props.style?.paddingRight ??
        props.style?.padding;
      const paddingX =
        stylePx != null
          ? typeof stylePx === "number"
            ? stylePx
            : parseFloat(String(stylePx)) || 0
          : size.paddingX;

      const shapes: Shape[] = [];
      // CONTAINER_TAGS에 등록된 경우 자식 Element가 시각 렌더링 담당
      // (Label→라벨텍스트, Input→배경/테두리/placeholder, FieldError→에러텍스트)
      // TextField 자체에는 배경/테두리가 없으므로 Card와 동일한 패턴:
      // spec = 자신의 시각 요소만, 자식 = 자식의 시각 요소
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // fallback: 자식이 없는 레거시 데이터 → 전체 렌더링
      const labelFontSize = fontSize - 2;
      const descFontSize = labelFontSize - 2;
      const labelHeight = Math.ceil(labelFontSize * 1.2);
      const labelGap = size.gap ?? 6;
      const labelOffset = props.label ? labelHeight + labelGap : 0;

      if (props.label) {
        shapes.push({
          type: "text" as const,
          x: 0,
          y: 0,
          text: props.label,
          fontSize: labelFontSize,
          fontFamily: ff,
          fontWeight,
          fill: textColor,
          align: textAlign,
          baseline: "top" as const,
        });
      }

      // 입력 필드 배경
      shapes.push({
        id: "bg",
        type: "roundRect" as const,
        x: 0,
        y: labelOffset,
        width,
        height,
        radius: borderRadius,
        fill: bgColor,
      });

      // 테두리
      if (borderColor) {
        shapes.push({
          type: "border" as const,
          target: "bg",
          borderWidth,
          color: props.isInvalid
            ? ("{color.negative}" as TokenRef)
            : borderColor,
          radius: borderRadius,
        });
      }

      // 입력 텍스트 / 플레이스홀더
      const displayText = props.value || props.placeholder || "";
      if (displayText) {
        shapes.push({
          type: "text" as const,
          x: paddingX,
          y: labelOffset + height / 2,
          text: displayText,
          fontSize,
          fontFamily: ff,
          fill: props.value
            ? textColor
            : ("{color.neutral-subdued}" as TokenRef),
          align: textAlign,
          baseline: "middle" as const,
        });
      }

      // 설명 / 에러 메시지
      {
        const descText =
          props.isInvalid && props.errorMessage
            ? props.errorMessage
            : props.description;
        if (descText) {
          shapes.push({
            type: "text" as const,
            x: 0,
            y: labelOffset + height + 4,
            text: descText,
            fontSize: descFontSize,
            fontFamily: ff,
            fill: props.isInvalid
              ? ("{color.negative}" as TokenRef)
              : ("{color.neutral-subdued}" as TokenRef),
            align: textAlign,
            baseline: "top" as const,
          });
        }
      }

      return shapes;
    },

    react: (props) => ({
      "data-invalid": props.isInvalid || undefined,
      "data-disabled": props.isDisabled || undefined,
      "data-required": props.isRequired || undefined,
    }),

    pixi: (props) => ({
      eventMode: "static" as const,
      cursor: props.isDisabled ? "not-allowed" : "text",
    }),
  },
};
