/**
 * Heading Component Spec
 *
 * ADR-058 Phase 2: Spec-First 마이그레이션
 * - archetype "text" (Text와 동일 — display:block + width:100%)
 * - auto-generated CSS (skipCSSGeneration 제거)
 * - render.shapes() 실제 text shape 반환 → buildSpecNodeData 경로
 * - element: 함수형 — props.level 기반 `h1~h6` 동적 해석 (ADR-058 Phase 2 인프라 확장)
 * - sizes xs~3xl 7개 (Text와 동일 스케일)
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { Heading as HeadingIcon } from "lucide-react";
import { fontFamily } from "../primitives/typography";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";

/**
 * Heading Props
 */
export interface HeadingProps {
  children?: string;
  text?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  style?: Record<string, string | number | undefined>;
}

/**
 * level prop → 유효한 h1~h6 태그로 정규화.
 * - Number 변환 (문자열 "3" 허용)
 * - Math.round로 소수점 정리 (1.5 → 2)
 * - clamp 1~6
 * - 유효하지 않으면 기본값 h3
 */
function resolveHeadingElement(props: Record<string, unknown>): string {
  const raw = props?.level;
  const num =
    typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(num)) return "h3";
  const level = Math.max(1, Math.min(6, Math.round(num)));
  return `h${level}`;
}

/**
 * Heading Component Spec
 */
export const HeadingSpec: ComponentSpec<HeadingProps> = {
  name: "Heading",
  description: "제목 텍스트 (h1~h6)",
  element: resolveHeadingElement,
  archetype: "text",

  // ADR-083 Phase 7: text archetype base 의 layout primitive 2 필드 리프팅.
  containerStyles: {
    display: "block",
    width: "100%",
  },

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
            icon: HeadingIcon,
          },
          {
            key: "level",
            type: "enum",
            label: "Heading Level",
            icon: HeadingIcon,
            defaultValue: 3,
            options: [
              { value: "1", label: "H1" },
              { value: "2", label: "H2" },
              { value: "3", label: "H3" },
              { value: "4", label: "H4" },
              { value: "5", label: "H5" },
              { value: "6", label: "H6" },
            ],
            valueTransform: "number",
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
      const variant =
        HeadingSpec.variants![
          (props as { variant?: keyof typeof HeadingSpec.variants }).variant ??
            HeadingSpec.defaultVariant!
        ];
      const text = String(props.children ?? props.text ?? "");
      if (!text) return [];

      // props.size가 명시적으로 설정된 경우 size.fontSize를 우선 사용
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
            : parseInt(String(fwRaw), 10) || 700
          : 700;

      const ff = (props.style?.fontFamily as string) || fontFamily.sans;
      const textColor = props.style?.color ?? variant.text;

      const textAlign =
        (props.style?.textAlign as "left" | "center" | "right") || "left";

      // Heading은 block-level paragraph. Text와 동일하게 baseline "top" + y:0
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
