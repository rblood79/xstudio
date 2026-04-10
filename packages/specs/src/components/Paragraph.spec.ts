/**
 * Paragraph Component Spec
 *
 * ADR-058 Phase 3: Spec-First 마이그레이션
 * - archetype "text" (display:block + width:100%)
 * - auto-generated CSS
 * - render.shapes() text shape 반환 → buildSpecNodeData 경로
 * - Text와 거의 동일하나 semantic element만 `<p>` 고정 (Text도 `<p>`이지만 Paragraph는
 *   명시적 문단 강조용도 — 추후 margin-bottom 등 문단 스타일 추가 여지)
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { AlignLeft } from "lucide-react";
import { fontFamily } from "../primitives/typography";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";

export interface ParagraphProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  children?: string;
  text?: string;
  style?: Record<string, string | number | undefined>;
}

export const ParagraphSpec: ComponentSpec<ParagraphProps> = {
  name: "Paragraph",
  description: "문단 텍스트",
  element: "p",
  archetype: "text",

  defaultVariant: "default",
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
            icon: AlignLeft,
          },
        ],
      },
      {
        title: "Appearance",
        fields: [
          {
            type: "size",
            label: "Size",
            options: [
              { value: "xs", label: "XS" },
              { value: "sm", label: "S" },
              { value: "md", label: "M" },
              { value: "lg", label: "L" },
              { value: "xl", label: "XL" },
              { value: "2xl", label: "2XL" },
              { value: "3xl", label: "3XL" },
            ],
          },
        ],
      },
    ],
  },

  variants: {
    default: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    xs: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      lineHeight: "{typography.text-xs--line-height}" as TokenRef,
    },
    sm: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      lineHeight: "{typography.text-sm--line-height}" as TokenRef,
    },
    md: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      lineHeight: "{typography.text-base--line-height}" as TokenRef,
    },
    lg: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      lineHeight: "{typography.text-lg--line-height}" as TokenRef,
    },
    xl: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xl}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      lineHeight: "{typography.text-xl--line-height}" as TokenRef,
    },
    "2xl": {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-2xl}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      lineHeight: "{typography.text-2xl--line-height}" as TokenRef,
    },
    "3xl": {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-3xl}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      lineHeight: "{typography.text-3xl--line-height}" as TokenRef,
    },
  },

  states: {
    hover: {},
    pressed: {},
    disabled: {
      opacity: 0.38,
    },
    focusVisible: {},
  },

  render: {
    shapes: (props, variant, size) => {
      const text = String(props.children ?? props.text ?? "");
      if (!text) return [];

      const fontSize = resolveSpecFontSize(
        props.size ? size.fontSize : (props.style?.fontSize ?? size.fontSize),
        16,
      );

      const fwRaw = props.style?.fontWeight;
      const fontWeight =
        fwRaw != null
          ? typeof fwRaw === "number"
            ? fwRaw
            : parseInt(String(fwRaw), 10) || 400
          : 400;

      const ff = (props.style?.fontFamily as string) || fontFamily.sans;
      const textColor = props.style?.color ?? variant.text;

      const textAlign =
        (props.style?.textAlign as "left" | "center" | "right") || "left";

      const shapes: Shape[] = [
        {
          type: "text" as const,
          x: 0,
          y: 0,
          text,
          fontSize,
          fontFamily: ff,
          fontWeight,
          fill: textColor,
          align: textAlign,
          baseline: "top" as const,
          lineHeight: size.lineHeight as unknown as number,
        },
      ];

      return shapes;
    },

    react: (props) => ({
      "data-size": props.size || "md",
    }),

    pixi: () => ({
      eventMode: "none" as const,
    }),
  },
};
