/**
 * TextArea Component Spec
 *
 * React Aria 기반 멀티라인 텍스트 입력 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily, getLabelLineHeight } from "../primitives/typography";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";
import {
  Layout,
  PointerOff,
  AlertTriangle,
  PenOff,
  Hash,
  CheckSquare,
  HelpCircle,
} from "lucide-react";

/**
 * TextArea Props
 */
export interface TextAreaProps {
  variant?: "default" | "accent" | "negative";
  size?: "sm" | "md" | "lg" | "xl";
  label?: string;
  placeholder?: string;
  name?: string;
  defaultValue?: string;
  value?: string;
  description?: string;
  errorMessage?: string;
  rows?: number;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  autoFocus?: boolean;
  form?: string;
  contextualHelp?: string;
  labelPosition?: "top" | "side";
  labelAlign?: "start" | "end";
  inputMode?:
    | "none"
    | "text"
    | "tel"
    | "url"
    | "email"
    | "numeric"
    | "decimal"
    | "search";
  spellCheck?: boolean;
  autoCorrect?: "on" | "off";
  enterKeyHint?:
    | "enter"
    | "done"
    | "go"
    | "next"
    | "previous"
    | "search"
    | "send";
  minLength?: number;
  children?: string;
  /** ElementSprite 주입: 엔진 계산 최종 폭 */
  _containerWidth?: number;
  style?: Record<string, string | number | undefined>;
}

/**
 * TextArea Component Spec
 */
export const TextAreaSpec: ComponentSpec<TextAreaProps> = {
  name: "TextArea",
  description: "React Aria 기반 멀티라인 텍스트 입력 컴포넌트",
  element: "div",
  archetype: "input-base",

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.layer-2}" as TokenRef,
      backgroundHover: "{color.layer-1}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
      borderHover: "{color.border-hover}" as TokenRef,
    },
    accent: {
      background: "{color.layer-2}" as TokenRef,
      backgroundHover: "{color.layer-1}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.accent}" as TokenRef,
      borderHover: "{color.accent-hover}" as TokenRef,
    },
    negative: {
      background: "{color.layer-2}" as TokenRef,
      backgroundHover: "{color.negative-subtle}" as TokenRef,
      backgroundPressed: "{color.negative-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.negative}" as TokenRef,
      borderHover: "{color.negative-hover}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 64,
      paddingX: 10,
      paddingY: 6,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      gap: 4,
    },
    md: {
      height: 80,
      paddingX: 14,
      paddingY: 10,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 6,
    },
    lg: {
      height: 120,
      paddingX: 16,
      paddingY: 12,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 8,
    },
    xl: {
      height: 160,
      paddingX: 24,
      paddingY: 16,
      fontSize: "{typography.text-xl}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      gap: 10,
    },
  },

  propagation: {
    rules: [{ parentProp: "size", childPath: "Label", override: true }],
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
            placeholder: "Description",
            icon: Layout,
          },
          {
            key: "placeholder",
            type: "string",
            label: "Placeholder",
            icon: Layout,
            emptyToUndefined: true,
          },
          {
            key: "description",
            type: "string",
            label: "Description",
            icon: Layout,
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
        ],
      },
      {
        title: "State",
        fields: [
          { key: "isDisabled", type: "boolean", icon: PointerOff },
          { key: "isReadOnly", type: "boolean", icon: PenOff },

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
          { key: "maxLength", type: "number", label: "Max Length", icon: Hash },
          {
            key: "minLength",
            type: "number",
            label: "Min Length",
            icon: Hash,
            min: 0,
          },
        ],
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
      focusRing: "{focus.ring.default}",
    },
  },

  render: {
    shapes: (props, variant, size, state = "default") => {
      const width =
        typeof props._containerWidth === "number" && props._containerWidth > 0
          ? props._containerWidth
          : (props.style?.width as number) || 240;
      const rows = props.rows || 3;
      const fontSize = resolveSpecFontSize(
        props.style?.fontSize ?? size.fontSize,
        16,
      );
      const lineHeight = getLabelLineHeight(fontSize);
      const height = Math.max(
        size.height,
        rows * lineHeight + size.paddingY * 2,
      );

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
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // label offset 동적 계산 (fontSize 기반)
      const labelFontSize = fontSize - 2;
      const labelHeight = getLabelLineHeight(labelFontSize);
      const labelGap = size.gap ?? 8;
      const labelOffset = props.label ? labelHeight + labelGap : 0;

      // 라벨
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

      // 입력 영역 배경
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
      // NOTE: lineHeight 미명시 — specShapeConverter의 getLabelLineHeight fallback
      //       경로 통일. (strutStyle heightMultiplier 분기 회피)
      const displayText = props.value || props.placeholder || "";
      if (displayText) {
        shapes.push({
          type: "text" as const,
          x: paddingX,
          y: labelOffset + size.paddingY,
          text: displayText,
          fontSize,
          fontFamily: ff,
          fill: props.value
            ? textColor
            : ("{color.neutral-subdued}" as TokenRef),
          align: textAlign,
          baseline: "top" as const,
          maxWidth: width - paddingX * 2,
        });
      }

      // 설명 / 에러 메시지
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
          fontSize: fontSize - 2,
          fontFamily: ff,
          fill: props.isInvalid
            ? ("{color.negative}" as TokenRef)
            : ("{color.neutral-subdued}" as TokenRef),
          align: textAlign,
          baseline: "top" as const,
        });
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
