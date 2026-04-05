/**
 * StatusLight Component Spec
 *
 * 상태 표시 라이트 컴포넌트 (Spectrum 2 StatusLight)
 * Single Source of Truth - React와 Skia 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";
import { Type, Parentheses } from "lucide-react";

/**
 * StatusLight Props
 */
export interface StatusLightProps {
  variant?:
    | "neutral"
    | "informative"
    | "positive"
    | "notice"
    | "negative"
    | "celery"
    | "chartreuse"
    | "cyan"
    | "fuchsia"
    | "indigo"
    | "magenta"
    | "purple"
    | "yellow"
    | "seafoam"
    | "pink"
    | "turquoise"
    | "cinnamon"
    | "brown"
    | "silver";
  size?: "sm" | "md" | "lg" | "xl";
  children?: string;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/** StatusLight size dimensions (layout engine 공유) */
export const STATUSLIGHT_DIMENSIONS: Record<
  string,
  { height: number; dotSize: number; gap: number; fontSize: number }
> = {
  sm: { height: 20, dotSize: 8, gap: 8, fontSize: 12 },
  md: { height: 24, dotSize: 10, gap: 8, fontSize: 14 },
  lg: { height: 28, dotSize: 12, gap: 8, fontSize: 16 },
  xl: { height: 32, dotSize: 14, gap: 8, fontSize: 18 },
};

/**
 * StatusLight Component Spec
 */
export const StatusLightSpec: ComponentSpec<StatusLightProps> = {
  name: "StatusLight",
  description: "상태 표시 라이트 컴포넌트",
  element: "div",
  archetype: "simple",

  defaultVariant: "neutral",
  defaultSize: "md",

  properties: {
    sections: [
      {
        title: "Content",
        fields: [
          {
            key: "children",
            type: "string",
            label: "Text",
            placeholder: "Status text",
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
            type: "size",
            label: "Size",
            options: [
              { value: "sm", label: "S" },
              { value: "md", label: "M" },
              { value: "lg", label: "L" },
              { value: "xl", label: "XL" },
            ],
          },
          {
            key: "isDisabled",
            type: "boolean",
            label: "Disabled",
            icon: Parentheses,
          },
        ],
      },
      {
        title: "State",
        fields: [],
      },
    ],
  },

  variants: {
    neutral: {
      background: "{color.neutral-subdued}" as TokenRef,
      backgroundHover: "{color.neutral-subdued}" as TokenRef,
      backgroundPressed: "{color.neutral-subdued}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    informative: {
      background: "{color.informative}" as TokenRef,
      backgroundHover: "{color.informative}" as TokenRef,
      backgroundPressed: "{color.informative}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    positive: {
      background: "{color.positive}" as TokenRef,
      backgroundHover: "{color.positive}" as TokenRef,
      backgroundPressed: "{color.positive}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    notice: {
      background: "{color.notice}" as TokenRef,
      backgroundHover: "{color.notice}" as TokenRef,
      backgroundPressed: "{color.notice}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    negative: {
      background: "{color.negative}" as TokenRef,
      backgroundHover: "{color.negative}" as TokenRef,
      backgroundPressed: "{color.negative}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    celery: {
      background: "{color.celery}" as TokenRef,
      backgroundHover: "{color.celery}" as TokenRef,
      backgroundPressed: "{color.celery}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    chartreuse: {
      background: "{color.chartreuse}" as TokenRef,
      backgroundHover: "{color.chartreuse}" as TokenRef,
      backgroundPressed: "{color.chartreuse}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    cyan: {
      background: "{color.cyan}" as TokenRef,
      backgroundHover: "{color.cyan}" as TokenRef,
      backgroundPressed: "{color.cyan}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    fuchsia: {
      background: "{color.fuchsia}" as TokenRef,
      backgroundHover: "{color.fuchsia}" as TokenRef,
      backgroundPressed: "{color.fuchsia}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    indigo: {
      background: "{color.indigo}" as TokenRef,
      backgroundHover: "{color.indigo}" as TokenRef,
      backgroundPressed: "{color.indigo}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    magenta: {
      background: "{color.magenta}" as TokenRef,
      backgroundHover: "{color.magenta}" as TokenRef,
      backgroundPressed: "{color.magenta}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    purple: {
      background: "{color.purple}" as TokenRef,
      backgroundHover: "{color.purple}" as TokenRef,
      backgroundPressed: "{color.purple}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    yellow: {
      background: "{color.yellow}" as TokenRef,
      backgroundHover: "{color.yellow}" as TokenRef,
      backgroundPressed: "{color.yellow}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    seafoam: {
      background: "{color.seafoam}" as TokenRef,
      backgroundHover: "{color.seafoam}" as TokenRef,
      backgroundPressed: "{color.seafoam}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    pink: {
      background: "{color.pink}" as TokenRef,
      backgroundHover: "{color.pink}" as TokenRef,
      backgroundPressed: "{color.pink}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    turquoise: {
      background: "{color.turquoise}" as TokenRef,
      backgroundHover: "{color.turquoise}" as TokenRef,
      backgroundPressed: "{color.turquoise}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    cinnamon: {
      background: "{color.cinnamon}" as TokenRef,
      backgroundHover: "{color.cinnamon}" as TokenRef,
      backgroundPressed: "{color.cinnamon}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    brown: {
      background: "{color.brown}" as TokenRef,
      backgroundHover: "{color.brown}" as TokenRef,
      backgroundPressed: "{color.brown}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    silver: {
      background: "{color.silver}" as TokenRef,
      backgroundHover: "{color.silver}" as TokenRef,
      backgroundPressed: "{color.silver}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 20,
      dotSize: 8,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 8,
    },
    md: {
      height: 24,
      dotSize: 10,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 8,
    },
    lg: {
      height: 28,
      dotSize: 12,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 8,
    },
    xl: {
      height: 32,
      dotSize: 14,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 8,
    },
  },

  states: {
    disabled: {
      opacity: 0.38,
    },
  },

  render: {
    shapes: (props, variant, size, _state = "default") => {
      const dotSize = size.dotSize ?? 10;
      const dotRadius = dotSize / 2;
      const gap = size.gap ?? 8;
      const h = size.height ?? 24;
      const centerY = h / 2;

      const dotColor = props.style?.backgroundColor ?? variant.background;
      const textColor = props.style?.color ?? variant.text;

      const shapes: Shape[] = [
        // 상태 표시 dot (수직 중앙 정렬)
        {
          id: "dot",
          type: "circle" as const,
          x: dotRadius,
          y: centerY,
          radius: dotRadius,
          fill: dotColor,
        },
      ];

      // Child Composition: 자식 Element가 있으면 shell만 반환
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // 라벨 텍스트
      const text = props.children;
      if (text) {
        const rawFontSize = props.style?.fontSize ?? size.fontSize;
        const resolvedFs =
          typeof rawFontSize === "number"
            ? rawFontSize
            : typeof rawFontSize === "string" && rawFontSize.startsWith("{")
              ? resolveToken(rawFontSize as TokenRef)
              : rawFontSize;
        const fontSize = typeof resolvedFs === "number" ? resolvedFs : 14;
        const fwRaw = props.style?.fontWeight;
        const fw =
          fwRaw != null
            ? typeof fwRaw === "number"
              ? fwRaw
              : parseInt(String(fwRaw), 10) || 400
            : 400;
        const ff = (props.style?.fontFamily as string) || fontFamily.sans;

        shapes.push({
          type: "text" as const,
          x: dotSize + gap,
          y: centerY,
          text,
          fontSize,
          fontFamily: ff,
          fontWeight: fw,
          fill: textColor,
          align: "left" as const,
          baseline: "middle" as const,
        });
      }

      return shapes;
    },

    react: () => ({}),

    pixi: () => ({
      eventMode: "none" as const,
    }),
  },
};
