/**
 * ToggleButton Component Spec
 *
 * React Aria 기반 토글 버튼 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";
import {
  Type,
  Eye,
  ToggleLeft,
  Focus,
  PointerOff,
  PenOff,
  FormInput,
  Hash,
} from "lucide-react";
import { STATIC_COLOR_FIELD } from "../utils/sharedSections";

/**
 * ToggleButton Props (S2)
 *
 * S2에서는 variant 대신 isEmphasized/isQuiet boolean으로 시각 모드 제어:
 * - 기본: neutral 배경, selected 시 neutral-subtle
 * - isEmphasized: selected 시 accent(highlight) 배경
 * - isQuiet: 배경/테두리 없음
 */
export interface ToggleButtonProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  children?: string;
  text?: string;
  label?: string;
  isSelected?: boolean;
  isEmphasized?: boolean;
  isQuiet?: boolean;
  staticColor?: "white" | "black";
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
  /** 그룹 내 위치 정보 (ToggleButtonGroup 자식일 때 주입) */
  _groupPosition?: {
    orientation: "horizontal" | "vertical";
    isFirst: boolean;
    isLast: boolean;
    isOnly: boolean;
  };
}

/** isSelected 시 컬러 (S2: default = Button primary 색상, emphasized = accent) */
export const TOGGLE_SELECTED_COLORS = {
  default: {
    bg: "{color.neutral}" as TokenRef,
    text: "{color.base}" as TokenRef,
    border: "{color.neutral}" as TokenRef,
  },
  emphasized: {
    bg: "{color.accent}" as TokenRef,
    text: "{color.on-accent}" as TokenRef,
    border: "{color.accent}" as TokenRef,
  },
};

/**
 * ToggleButton Component Spec
 */
export const ToggleButtonSpec: ComponentSpec<ToggleButtonProps> = {
  name: "ToggleButton",
  description: "React Aria 기반 토글 버튼 컴포넌트",
  archetype: "button",
  element: "button",

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    /** S2 기본 스타일: neutral-200 배경, 투명 테두리 */
    default: {
      background: "{color.neutral-subtle}" as TokenRef,
      backgroundHover: "{color.neutral-hover}" as TokenRef,
      backgroundPressed: "{color.neutral-pressed}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.transparent}" as TokenRef,
    },
  },

  sizes: {
    xs: {
      height: 0,
      paddingX: 4,
      paddingY: 1,
      fontSize: "{typography.text-2xs}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      gap: 4,
      lineHeight: 16,
      borderWidth: 1,
    },
    sm: {
      height: 0,
      paddingX: 8,
      paddingY: 2,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      gap: 6,
      lineHeight: 16,
      borderWidth: 1,
    },
    md: {
      height: 0,
      paddingX: 12,
      paddingY: 4,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 8,
      lineHeight: 20,
      borderWidth: 1,
    },
    lg: {
      height: 0,
      paddingX: 16,
      paddingY: 8,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      gap: 10,
      lineHeight: 24,
      borderWidth: 1,
    },
    xl: {
      height: 0,
      paddingX: 24,
      paddingY: 12,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      gap: 12,
      lineHeight: 28,
      borderWidth: 1,
    },
  },

  states: {
    hover: {},
    pressed: {
      boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)",
    },
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

  properties: {
    sections: [
      {
        title: "Content",
        fields: [
          { key: "children", type: "string", label: "Label", icon: Type },
        ],
      },
      {
        title: "Appearance",
        visibleWhen: { parentTagNot: "ToggleButtonGroup" },
        fields: [
          { key: "isEmphasized", type: "boolean", icon: Eye },
          { key: "isQuiet", type: "boolean", label: "Quiet", icon: Eye },
          { type: "size" },
          STATIC_COLOR_FIELD,
        ],
      },
      {
        title: "State",
        fields: [
          { key: "isSelected", type: "boolean", icon: ToggleLeft },
          { key: "autoFocus", type: "boolean", icon: Focus },
          { key: "isDisabled", type: "boolean", icon: PointerOff },
          { key: "isReadOnly", type: "boolean", icon: PenOff },

          {
            key: "name",
            type: "string",
            label: "Name",
            emptyToUndefined: true,
            placeholder: "toggle-name",
            icon: FormInput,
          },
          {
            key: "value",
            type: "string",
            label: "Value",
            emptyToUndefined: true,
            placeholder: "toggle-value",
            icon: Hash,
          },
          {
            key: "form",
            type: "string",
            label: "Form",
            emptyToUndefined: true,
            placeholder: "form-id",
            icon: FormInput,
          },
        ],
      },
    ],
  },

  render: {
    shapes: (props, variant, size, state = "default") => {
      // S2: isEmphasized → selected 시 accent, 기본 → selected 시 neutral-subtle
      const selectedKey = props.isEmphasized ? "emphasized" : "default";

      // 사용자 스타일 우선, 없으면 spec 기본값
      const styleBr = props.style?.borderRadius;
      const baseBorderRadius =
        styleBr != null
          ? typeof styleBr === "number"
            ? styleBr
            : parseFloat(String(styleBr)) || 0
          : size.borderRadius;

      // 🚀 CSS 규칙: ToggleButtonGroup 내 위치에 따른 모서리별 border-radius
      // horizontal: first → [r,0,0,r], last → [0,r,r,0], middle → [0,0,0,0]
      // vertical:   first → [r,r,0,0], last → [0,0,r,r], middle → [0,0,0,0]
      const gp = props._groupPosition;
      let borderRadius: number | [number, number, number, number] =
        baseBorderRadius as number;
      if (gp && !gp.isOnly) {
        const r = baseBorderRadius as number;
        if (gp.orientation === "horizontal") {
          if (gp.isFirst) borderRadius = [r, 0, 0, r];
          else if (gp.isLast) borderRadius = [0, r, r, 0];
          else borderRadius = [0, 0, 0, 0];
        } else {
          if (gp.isFirst) borderRadius = [r, r, 0, 0];
          else if (gp.isLast) borderRadius = [0, 0, r, r];
          else borderRadius = [0, 0, 0, 0];
        }
      }

      const styleBw = props.style?.borderWidth;
      const borderWidth =
        styleBw != null
          ? typeof styleBw === "number"
            ? styleBw
            : parseFloat(String(styleBw)) || 0
          : 1;

      // isSelected 시 색상 반전 (S2: isEmphasized 여부로 분기)
      let bgColor: TokenRef | string | number | undefined;
      let textColor: TokenRef | string | number | undefined;
      let borderColor: TokenRef | string | number | undefined;

      if (props.isQuiet && !props.isSelected) {
        // quiet 모드: 배경/테두리 없음
        bgColor =
          props.style?.backgroundColor ?? ("{color.transparent}" as TokenRef);
        textColor = props.style?.color ?? variant.text;
        borderColor =
          props.style?.borderColor ?? ("{color.transparent}" as TokenRef);
      } else if (props.isSelected) {
        const selected = TOGGLE_SELECTED_COLORS[selectedKey];
        bgColor = props.style?.backgroundColor ?? selected.bg;
        textColor = props.style?.color ?? selected.text;
        borderColor = props.style?.borderColor ?? selected.border;
      } else {
        bgColor =
          props.style?.backgroundColor ??
          (state === "hover"
            ? variant.backgroundHover
            : state === "pressed"
              ? variant.backgroundPressed
              : variant.background);
        textColor =
          props.style?.color ??
          (state === "hover" && variant.textHover
            ? variant.textHover
            : variant.text);
        borderColor =
          props.style?.borderColor ??
          (state === "hover" && variant.borderHover
            ? variant.borderHover
            : variant.border);
      }

      const shapes: Shape[] = [
        // 배경
        {
          id: "bg",
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width: "auto" as const,
          height: "auto" as unknown as number,
          radius: borderRadius as number | [number, number, number, number],
          fill: bgColor,
        },
      ];

      // 테두리
      if (borderColor) {
        shapes.push({
          type: "border" as const,
          target: "bg",
          borderWidth,
          color: borderColor,
          radius: borderRadius as number | [number, number, number, number],
        });
      }

      // Child Composition: 자식 Element가 있으면 shell만 반환
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // 텍스트
      const text = props.children || props.text || props.label;
      if (text) {
        // 사용자 스타일 padding 우선, 없으면 spec 기본값
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

        // 사용자 스타일 font 속성 우선, 없으면 spec 기본값
        const rawFontSize = props.style?.fontSize ?? size.fontSize;
        const resolvedFs =
          typeof rawFontSize === "number"
            ? rawFontSize
            : typeof rawFontSize === "string" && rawFontSize.startsWith("{")
              ? resolveToken(rawFontSize as TokenRef)
              : rawFontSize;
        const fontSize = typeof resolvedFs === "number" ? resolvedFs : 16;
        const fwRaw = props.style?.fontWeight;
        const fw =
          fwRaw != null
            ? typeof fwRaw === "number"
              ? fwRaw
              : parseInt(String(fwRaw), 10) || 500
            : 500;
        const ff = (props.style?.fontFamily as string) || fontFamily.sans;
        const textAlign =
          (props.style?.textAlign as "left" | "center" | "right") || "center";

        shapes.push({
          type: "text" as const,
          x: paddingX,
          y: 0,
          text,
          fontSize,
          fontFamily: ff,
          fontWeight: fw,
          fill: textColor,
          align: textAlign,
          baseline: "middle" as const,
        });
      }

      return shapes;
    },

    react: (props) => ({
      "data-selected": props.isSelected || undefined,
      "aria-pressed": props.isSelected || undefined,
    }),

    pixi: (props) => ({
      eventMode: "static" as const,
      cursor: props.isDisabled ? "not-allowed" : "pointer",
    }),
  },
};
