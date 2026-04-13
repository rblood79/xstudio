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
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";
import {
  Layout,
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
  Minimize2,
} from "lucide-react";

/**
 * SearchField Props
 */
export interface SearchFieldProps {
  size?: "sm" | "md" | "lg" | "xl";
  isQuiet?: boolean;
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
            key: "isQuiet",
            type: "boolean",
            label: "Quiet",
            icon: Minimize2,
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
        ],
      },
    ],
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
      focusRing: "{focus.ring.default}",
    },
  },

  // ADR-059 v2 Pre-Phase 0-B: Composite delegation SSOT 선언
  // (skipCSSGeneration: true 유지 — 이 단계는 prefix/selector 선언만, CSS 출력 변화 없음)
  composition: {
    layout: "flex-column",
    gap: "var(--spacing-xs)",
    delegation: [
      {
        childSelector: ".react-aria-Label",
        prefix: "sf-label",
        variables: {
          sm: { "--sf-label-size": "var(--text-xs)" },
          md: { "--sf-label-size": "var(--text-sm)" },
          lg: { "--sf-label-size": "var(--text-base)" },
          xl: { "--sf-label-size": "var(--text-lg)" },
        },
      },
      {
        childSelector: ".react-aria-Input",
        prefix: "sf-input",
        variables: {
          sm: {
            "--sf-input-size": "var(--text-xs)",
            "--sf-input-line-height": "var(--text-xs--line-height)",
          },
          md: {
            "--sf-input-size": "var(--text-sm)",
            "--sf-input-line-height": "var(--text-sm--line-height)",
          },
          lg: {
            "--sf-input-size": "var(--text-base)",
            "--sf-input-line-height": "var(--text-base--line-height)",
          },
          xl: {
            "--sf-input-size": "var(--text-lg)",
            "--sf-input-line-height": "var(--text-lg--line-height)",
          },
        },
      },
      {
        childSelector: ".react-aria-FieldError",
        prefix: "sf-hint",
        variables: {
          sm: { "--sf-hint-size": "var(--text-xs)" },
          md: { "--sf-hint-size": "var(--text-xs)" },
          lg: { "--sf-hint-size": "var(--text-sm)" },
          xl: { "--sf-hint-size": "var(--text-base)" },
        },
      },
      // 0-F.2: SearchField 고유 — 검색 아이콘 (leading)
      {
        childSelector: ".search-icon",
        prefix: "sf-icon",
        variables: {
          sm: { "--sf-icon-size": "12px" },
          md: { "--sf-icon-size": "16px" },
          lg: { "--sf-icon-size": "18px" },
          xl: { "--sf-icon-size": "22px" },
        },
      },
      // 0-F.2: SearchField 고유 — Clear 버튼 (trailing)
      {
        childSelector: ".react-aria-Button",
        prefix: "sf-btn",
        variables: {
          sm: { "--sf-btn-size": "14px" },
          md: { "--sf-btn-size": "18px" },
          lg: { "--sf-btn-size": "22px" },
          xl: { "--sf-btn-size": "28px" },
        },
      },
    ],
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
    shapes: (props, size, _state = "default") => {
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
        ("{color.transparent}" as TokenRef);

      const borderColor = props.style?.borderColor;

      const styleBw = props.style?.borderWidth;
      const borderWidth =
        styleBw != null
          ? typeof styleBw === "number"
            ? styleBw
            : parseFloat(String(styleBw)) || 0
          : 1;

      const fontSize = resolveSpecFontSize(
        props.size ? size.fontSize : (props.style?.fontSize ?? size.fontSize),
        16,
      );

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
        (props.value ? ("{color.neutral}" as TokenRef) : ("{color.neutral-subdued}" as TokenRef));

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
          fill: "{color.neutral}" as TokenRef,
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
