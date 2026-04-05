/**
 * SearchField Component Spec
 *
 * React Aria 기반 검색 입력 컴포넌트 (검색 아이콘 + 클리어 버튼)
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";
import {
  Layout,
  Keyboard,
  AlertTriangle,
  Hash,
  CheckSquare,
  PointerOff,
  PenOff,
  FileText,
  Tag,
  AlignLeft,
  HelpCircle,
  Image,
  Type,
  SpellCheck2,
  CornerDownLeft,
} from "lucide-react";

/**
 * SearchField Props
 */
export interface SearchFieldProps {
  variant?: "default" | "accent";
  size?: "sm" | "md" | "lg" | "xl";
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  description?: string;
  errorMessage?: string;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  isInvalid?: boolean;
  autoFocus?: boolean;
  name?: string;
  form?: string;
  labelPosition?: "top" | "side";
  labelAlign?: "start" | "end";
  necessityIndicator?: "icon" | "label";
  inputMode?:
    | "none"
    | "text"
    | "tel"
    | "url"
    | "email"
    | "numeric"
    | "decimal"
    | "search";
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  contextualHelp?: string;
  icon?: string;
  autoCorrect?: "on" | "off";
  spellCheck?: boolean;
  enterKeyHint?:
    | "enter"
    | "done"
    | "go"
    | "next"
    | "previous"
    | "search"
    | "send";
  type?: "text" | "search" | "url" | "tel" | "email";
  validationBehavior?: "native" | "aria";
  children?: string;
  /** ElementSprite 주입: 엔진 계산 최종 폭 */
  _containerWidth?: number;
  style?: Record<string, string | number | undefined>;
}

/**
 * SearchField Component Spec
 */
export const SearchFieldSpec: ComponentSpec<SearchFieldProps> = {
  name: "SearchField",
  description: "React Aria 기반 검색 입력 컴포넌트",
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
            placeholder: "Search...",
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
            key: "labelAlign",
            type: "enum",
            label: "Label Align",
            icon: AlignLeft,
            options: [
              { value: "start", label: "Start" },
              { value: "end", label: "End" },
            ],
            defaultValue: "start",
          },
        ],
      },
      {
        title: "Input Mode",
        fields: [
          {
            key: "inputMode",
            type: "enum",
            label: "Input Mode",
            icon: Keyboard,
            emptyToUndefined: true,
            options: [
              { value: "", label: "None" },
              { value: "text", label: "Text" },
              { value: "search", label: "Search" },
            ],
          },
        ],
      },
      {
        title: "State",
        fields: [
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
            key: "errorMessage",
            type: "string",
            label: "Error Message",
            icon: AlertTriangle,
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
          {
            key: "icon",
            type: "string",
            label: "Icon",
            icon: Image,
            emptyToUndefined: true,
          },
          {
            key: "autoCorrect",
            type: "enum",
            label: "Auto Correct",
            icon: CheckSquare,
            options: [
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ],
            defaultValue: "off",
          },
          {
            key: "spellCheck",
            type: "boolean",
            label: "Spell Check",
            icon: SpellCheck2,
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
            key: "type",
            type: "enum",
            label: "Input Type",
            icon: Type,
            options: [
              { value: "search", label: "Search" },
              { value: "text", label: "Text" },
            ],
            defaultValue: "search",
          },
        ],
      },
    ],
  },

  // 컨테이너는 투명 — .searchfield-container가 border/background 담당
  variants: {
    default: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    accent: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      iconSize: 14,
      gap: 6,
    },
    md: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      iconSize: 18,
      gap: 8,
    },
    lg: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      iconSize: 22,
      gap: 10,
    },
    xl: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.xl}" as TokenRef,
      iconSize: 28,
      gap: 10,
    },
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

  propagation: {
    rules: [
      { parentProp: "size", childPath: "SearchFieldWrapper", override: true },
      { parentProp: "size", childPath: "SearchInput", override: true },
      { parentProp: "size", childPath: "SearchIcon", override: true },
      { parentProp: "size", childPath: "SearchClearButton", override: true },
      { parentProp: "size", childPath: "Label", override: true },
      {
        parentProp: "label",
        childPath: "Label",
        childProp: "children",
        override: true,
      },
      {
        parentProp: "placeholder",
        childPath: ["SearchFieldWrapper", "SearchInput"],
        childProp: "placeholder",
        override: true,
      },
    ],
  },

  render: {
    shapes: (props, variant, size, state = "default") => {
      const width =
        typeof props._containerWidth === "number" && props._containerWidth > 0
          ? props._containerWidth
          : (props.style?.width as number) || 280;
      const height = size.height;
      const iconSize = size.iconSize ?? 18;

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
      const borderWidth =
        styleBw != null
          ? typeof styleBw === "number"
            ? styleBw
            : parseFloat(String(styleBw)) || 0
          : 1;

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

      const textColor =
        props.style?.color ??
        (props.value ? variant.text : ("{color.neutral-subdued}" as TokenRef));

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

      // 라벨
      const labelFontSize = fontSize - 2;
      const labelHeight = Math.ceil(labelFontSize * 1.2);
      const labelGap = size.gap ?? 8;
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
          fill: variant.text,
          align: textAlign,
          baseline: "top" as const,
        });
      }

      // 배경
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
          color: borderColor,
          radius: borderRadius,
        });
      }

      // 검색 아이콘 (원 + 선으로 표현)
      const iconX = paddingX + iconSize / 2;
      const iconY = labelOffset + height / 2;
      shapes.push({
        type: "circle" as const,
        x: iconX - 2,
        y: iconY - 2,
        radius: iconSize / 3,
        fill: "{color.neutral-subdued}" as TokenRef,
        fillAlpha: 0,
      });
      shapes.push({
        type: "line" as const,
        x1: iconX + iconSize / 5,
        y1: iconY + iconSize / 5,
        x2: iconX + iconSize / 2.5,
        y2: iconY + iconSize / 2.5,
        stroke: "{color.neutral-subdued}" as TokenRef,
        strokeWidth: 2,
      });

      // 텍스트
      const displayText = props.value || props.placeholder || "Search...";
      shapes.push({
        type: "text" as const,
        x: paddingX + iconSize + (size.gap ?? 8),
        y: labelOffset + height / 2,
        text: displayText,
        fontSize,
        fontFamily: ff,
        fill: textColor,
        align: textAlign,
        baseline: "middle" as const,
      });

      // 클리어 버튼 (값이 있을 때)
      if (props.value) {
        shapes.push({
          id: "clear",
          type: "circle" as const,
          x: width - paddingX - iconSize / 2,
          y: labelOffset + height / 2,
          radius: iconSize / 2.5,
          fill: "{color.neutral-subdued}" as TokenRef,
          fillAlpha: 0.15,
        });
        // X 마크
        const cx = width - paddingX - iconSize / 2;
        const cy = labelOffset + height / 2;
        const cs = iconSize / 5;
        shapes.push({
          type: "line" as const,
          x1: cx - cs,
          y1: cy - cs,
          x2: cx + cs,
          y2: cy + cs,
          stroke: "{color.neutral-subdued}" as TokenRef,
          strokeWidth: 2,
        });
        shapes.push({
          type: "line" as const,
          x1: cx + cs,
          y1: cy - cs,
          x2: cx - cs,
          y2: cy + cs,
          stroke: "{color.neutral-subdued}" as TokenRef,
          strokeWidth: 2,
        });
      }

      return shapes;
    },

    react: (props) => ({
      "data-disabled": props.isDisabled || undefined,
      role: "search",
    }),

    pixi: (props) => ({
      eventMode: "static" as const,
      cursor: props.isDisabled ? "not-allowed" : "text",
    }),
  },
};
