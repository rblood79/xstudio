/**
 * Badge Component Spec
 *
 * React Aria 기반 배지 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveStateColors } from "../utils/stateEffect";
import { resolveToken } from "../renderers/utils/tokenResolver";
import { Type, Parentheses, Circle, Activity } from "lucide-react";

/**
 * Badge Props
 */
export interface BadgeProps {
  variant?:
    | "accent"
    | "informative"
    | "neutral"
    | "positive"
    | "notice"
    | "negative"
    | "gray"
    | "red"
    | "orange"
    | "yellow"
    | "green"
    | "blue"
    | "purple"
    | "indigo"
    | "cyan"
    | "pink"
    | "turquoise"
    | "fuchsia"
    | "magenta";
  fillStyle?: "bold" | "subtle" | "outline";
  size?: "sm" | "md" | "lg";
  children?: string;
  text?: string;
  isDot?: boolean;
  isPulsing?: boolean;
  isLoading?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * Badge Component Spec
 */
export const BadgeSpec: ComponentSpec<BadgeProps> = {
  name: "Badge",
  description: "React Aria 기반 배지 컴포넌트",
  archetype: "simple",
  element: "span",

  defaultVariant: "accent",
  defaultSize: "sm",

  properties: {
    sections: [
      {
        title: "Content",
        fields: [
          {
            key: "children",
            type: "string",
            label: "Text",
            placeholder: "5",
            icon: Type,
          },
        ],
      },
      {
        title: "Appearance",
        fields: [
          {
            type: "variant",
            label: "Variant",
            icon: Parentheses,
          },
          {
            key: "fillStyle",
            type: "enum",
            label: "Fill Style",
            icon: Parentheses,
            options: [
              { value: "bold", label: "Bold" },
              { value: "subtle", label: "Subtle" },
              { value: "outline", label: "Outline" },
            ],
          },
          {
            type: "size",
            label: "Size",
            options: [
              { value: "xs", label: "XS" },
              { value: "sm", label: "S" },
              { value: "md", label: "M" },
              { value: "lg", label: "L" },
              { value: "xl", label: "XL" },
            ],
          },
        ],
      },
      {
        title: "State",
        fields: [
          {
            key: "isDot",
            type: "boolean",
            label: "Dot Badge",
            icon: Circle,
          },
          {
            key: "isPulsing",
            type: "boolean",
            label: "Pulsing Animation",
            icon: Activity,
          },
        ],
      },
    ],
  },

  variants: {
    accent: {
      background: "{color.accent}" as TokenRef,
      backgroundHover: "{color.accent}" as TokenRef,
      backgroundPressed: "{color.accent}" as TokenRef,
      text: "{color.on-accent}" as TokenRef,
    },
    informative: {
      background: "{color.informative}" as TokenRef,
      backgroundHover: "{color.informative}" as TokenRef,
      backgroundPressed: "{color.informative}" as TokenRef,
      text: "{color.white}" as TokenRef,
    },
    neutral: {
      background: "{color.neutral}" as TokenRef,
      backgroundHover: "{color.neutral}" as TokenRef,
      backgroundPressed: "{color.neutral}" as TokenRef,
      text: "{color.base}" as TokenRef,
    },
    positive: {
      background: "{color.positive}" as TokenRef,
      backgroundHover: "{color.positive}" as TokenRef,
      backgroundPressed: "{color.positive}" as TokenRef,
      text: "{color.white}" as TokenRef,
    },
    notice: {
      background: "{color.notice}" as TokenRef,
      backgroundHover: "{color.notice}" as TokenRef,
      backgroundPressed: "{color.notice}" as TokenRef,
      text: "{color.white}" as TokenRef,
    },
    negative: {
      background: "{color.negative}" as TokenRef,
      backgroundHover: "{color.negative}" as TokenRef,
      backgroundPressed: "{color.negative}" as TokenRef,
      text: "{color.on-negative}" as TokenRef,
    },
    // Named color variants (S2)
    gray: {
      background: "{color.gray}" as TokenRef,
      backgroundHover: "{color.gray}" as TokenRef,
      backgroundPressed: "{color.gray}" as TokenRef,
      text: "{color.white}" as TokenRef,
    },
    red: {
      background: "{color.red}" as TokenRef,
      backgroundHover: "{color.red}" as TokenRef,
      backgroundPressed: "{color.red}" as TokenRef,
      text: "{color.white}" as TokenRef,
    },
    orange: {
      background: "{color.orange}" as TokenRef,
      backgroundHover: "{color.orange}" as TokenRef,
      backgroundPressed: "{color.orange}" as TokenRef,
      text: "{color.white}" as TokenRef,
    },
    yellow: {
      background: "{color.yellow}" as TokenRef,
      backgroundHover: "{color.yellow}" as TokenRef,
      backgroundPressed: "{color.yellow}" as TokenRef,
      text: "{color.black}" as TokenRef,
    },
    green: {
      background: "{color.green-named}" as TokenRef,
      backgroundHover: "{color.green-named}" as TokenRef,
      backgroundPressed: "{color.green-named}" as TokenRef,
      text: "{color.white}" as TokenRef,
    },
    blue: {
      background: "{color.blue}" as TokenRef,
      backgroundHover: "{color.blue}" as TokenRef,
      backgroundPressed: "{color.blue}" as TokenRef,
      text: "{color.white}" as TokenRef,
    },
    purple: {
      background: "{color.purple}" as TokenRef,
      backgroundHover: "{color.purple}" as TokenRef,
      backgroundPressed: "{color.purple}" as TokenRef,
      text: "{color.white}" as TokenRef,
    },
    indigo: {
      background: "{color.indigo}" as TokenRef,
      backgroundHover: "{color.indigo}" as TokenRef,
      backgroundPressed: "{color.indigo}" as TokenRef,
      text: "{color.white}" as TokenRef,
    },
    cyan: {
      background: "{color.cyan}" as TokenRef,
      backgroundHover: "{color.cyan}" as TokenRef,
      backgroundPressed: "{color.cyan}" as TokenRef,
      text: "{color.white}" as TokenRef,
    },
    pink: {
      background: "{color.pink}" as TokenRef,
      backgroundHover: "{color.pink}" as TokenRef,
      backgroundPressed: "{color.pink}" as TokenRef,
      text: "{color.white}" as TokenRef,
    },
    turquoise: {
      background: "{color.turquoise}" as TokenRef,
      backgroundHover: "{color.turquoise}" as TokenRef,
      backgroundPressed: "{color.turquoise}" as TokenRef,
      text: "{color.white}" as TokenRef,
    },
    fuchsia: {
      background: "{color.fuchsia}" as TokenRef,
      backgroundHover: "{color.fuchsia}" as TokenRef,
      backgroundPressed: "{color.fuchsia}" as TokenRef,
      text: "{color.white}" as TokenRef,
    },
    magenta: {
      background: "{color.magenta}" as TokenRef,
      backgroundHover: "{color.magenta}" as TokenRef,
      backgroundPressed: "{color.magenta}" as TokenRef,
      text: "{color.white}" as TokenRef,
    },
  },

  sizes: {
    xs: {
      height: 0,
      paddingX: 4,
      paddingY: 1,
      fontSize: "{typography.text-2xs}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 2,
      lineHeight: "{typography.text-2xs--line-height}" as unknown as number,
      borderWidth: 1,
    },
    sm: {
      height: 0,
      paddingX: 8,
      paddingY: 2,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 4,
      lineHeight: "{typography.text-xs--line-height}" as unknown as number,
      borderWidth: 1,
    },
    md: {
      height: 0,
      paddingX: 12,
      paddingY: 4,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 4,
      lineHeight: "{typography.text-sm--line-height}" as unknown as number,
      borderWidth: 1,
    },
    lg: {
      height: 0,
      paddingX: 16,
      paddingY: 8,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 6,
      lineHeight: "{typography.text-base--line-height}" as unknown as number,
      borderWidth: 1,
    },
    xl: {
      height: 0,
      paddingX: 24,
      paddingY: 12,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 8,
      lineHeight: "{typography.text-lg--line-height}" as unknown as number,
      borderWidth: 1,
    },
  },

  states: {
    disabled: {
      opacity: 0.38,
    },
  },

  render: {
    shapes: (props, variant, size, state = "default") => {
      // 사용자 스타일 우선, 없으면 spec 기본값
      const styleBr = props.style?.borderRadius;
      const borderRadius =
        styleBr != null
          ? typeof styleBr === "number"
            ? styleBr
            : parseFloat(String(styleBr)) || 0
          : size.borderRadius;

      const bgColor =
        props.style?.backgroundColor ??
        resolveStateColors(variant, state).background;

      const shapes: Shape[] = [];

      if (props.isDot) {
        // Dot 모드: 원형 점만 표시
        const dotSize = size.height === 20 ? 8 : size.height === 24 ? 10 : 12;
        shapes.push({
          type: "circle" as const,
          x: dotSize / 2,
          y: dotSize / 2,
          radius: dotSize / 2,
          fill: bgColor,
        });
      } else {
        // 일반 모드: pill 형태 배경 + 텍스트
        shapes.push({
          id: "bg",
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width: "auto",
          height: "auto" as unknown as number,
          radius: borderRadius as unknown as number,
          fill: bgColor,
        });

        // Child Composition: 자식 Element가 있으면 shell만 반환
        const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
        if (hasChildren) return shapes;

        const text = props.children || props.text;
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
          const textColor = props.style?.color ?? variant.text;

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
      }

      return shapes;
    },

    react: (props) => ({
      "data-dot": props.isDot || undefined,
      "data-pulsing": props.isPulsing || undefined,
      "data-loading": props.isLoading || undefined,
    }),

    pixi: () => ({
      eventMode: "none" as const,
    }),
  },
};
