/**
 * Text Component Spec
 *
 * ADR-058 Phase 1: Spec-First 마이그레이션
 * - archetype "text" (display:block + width:100%)
 * - auto-generated CSS (skipCSSGeneration 제거)
 * - render.shapes() 실제 text shape 반환 → buildSpecNodeData 경로로 라우팅
 * - 5-point patch 제거 후에도 fontSize/lineHeight가 spec source에서 SSOT
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { Type } from "lucide-react";
import { fontFamily } from "../primitives/typography";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";

export interface TextProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  children?: string;
  text?: string;
  style?: Record<string, string | number | undefined>;
}

export const TextSpec: ComponentSpec<TextProps> = {
  name: "Text",
  description: "텍스트 요소",
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
            icon: Type,
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
    shapes: (props, size) => {
      const variant = TextSpec.variants![(props as { variant?: keyof typeof TextSpec.variants }).variant ?? TextSpec.defaultVariant!];
      const text = String(props.children ?? props.text ?? "");
      if (!text) return [];

      // props.size가 명시적으로 설정된 경우 size.fontSize를 우선 사용.
      // (size propagation은 props.size만 변경하고 style.fontSize는 갱신하지 않음)
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

      // Text는 block-level paragraph. baseline: "top" + y: 0으로
      // 컨테이너 상단에서부터 텍스트 흐름 시작.
      // lineHeight는 size preset의 TokenRef를 그대로 전달 → specShapeConverter가 resolve.
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
