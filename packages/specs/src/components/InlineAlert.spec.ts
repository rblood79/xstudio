/**
 * InlineAlert Component Spec
 *
 * 인라인 알림 컴포넌트 (Spectrum 2 InlineAlert)
 * Single Source of Truth - React와 Skia 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { resolveToken } from "../renderers/utils/tokenResolver";
import { Heading, Type, Parentheses } from "lucide-react";

/**
 * InlineAlert Props
 */
export interface InlineAlertProps {
  variant?: "neutral" | "info" | "positive" | "notice" | "negative";
  children?: string;
  heading?: string;
  autoFocus?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * InlineAlert Component Spec
 */
export const InlineAlertSpec: ComponentSpec<InlineAlertProps> = {
  name: "InlineAlert",
  description: "인라인 알림 컴포넌트",
  archetype: "alert",
  element: "div",

  // ADR-083 Phase 1: alert archetype base 의 layout primitive 4 필드를 Spec SSOT 로 리프팅.
  //   CSS / Skia layout (implicitStyles Phase 0 공통 선주입) / Style Panel 3경로 동일 소스.
  //   box-sizing / font-family 는 ContainerStylesSchema 미지원 → archetype table 에 잔존.
  containerStyles: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    width: "100%",
  },

  defaultVariant: "info",
  defaultSize: "md",

  variants: {
    neutral: {
      background: "{color.neutral-subtle}" as TokenRef,
      backgroundHover: "{color.neutral-subtle}" as TokenRef,
      backgroundPressed: "{color.neutral-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.neutral-subdued}" as TokenRef,
    },
    info: {
      background: "{color.informative-subtle}" as TokenRef,
      backgroundHover: "{color.informative-subtle}" as TokenRef,
      backgroundPressed: "{color.informative-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.informative}" as TokenRef,
    },
    positive: {
      background: "{color.positive-subtle}" as TokenRef,
      backgroundHover: "{color.positive-subtle}" as TokenRef,
      backgroundPressed: "{color.positive-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.positive}" as TokenRef,
    },
    notice: {
      background: "{color.notice-subtle}" as TokenRef,
      backgroundHover: "{color.notice-subtle}" as TokenRef,
      backgroundPressed: "{color.notice-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.notice}" as TokenRef,
    },
    negative: {
      background: "{color.negative-subtle}" as TokenRef,
      backgroundHover: "{color.negative-subtle}" as TokenRef,
      backgroundPressed: "{color.negative-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.negative}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: "auto" as unknown as number,
      paddingX: 8,
      paddingY: 8,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      accentWidth: 3,
      gap: 8,
      headingFontSize: 14,
      headingFontWeight: 700,
      descFontSize: 12,
      descFontWeight: 400,
    },
    md: {
      height: "auto" as unknown as number,
      paddingX: 16,
      paddingY: 16,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      accentWidth: 4,
      gap: 12,
      headingFontSize: 16,
      headingFontWeight: 700,
      descFontSize: 14,
      descFontWeight: 400,
    },
    lg: {
      height: "auto" as unknown as number,
      paddingX: 24,
      paddingY: 24,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.xl}" as TokenRef,
      accentWidth: 4,
      gap: 16,
      headingFontSize: 18,
      headingFontWeight: 700,
      descFontSize: 16,
      descFontWeight: 400,
    },
  },

  states: {},

  properties: {
    sections: [
      {
        title: "Content",
        fields: [
          {
            key: "heading",
            type: "string",
            label: "Heading",
            icon: Heading,
            placeholder: "Alert heading",
          },
          {
            key: "children",
            type: "string",
            label: "Description",
            icon: Type,
            placeholder: "Alert message",
            multiline: true,
          },
        ],
      },
      {
        title: "Appearance",
        fields: [{ type: "variant", icon: Parentheses }],
      },
    ],
  },

  render: {
    shapes: (props, size, _state = "default") => {
      const variant =
        InlineAlertSpec.variants![
          (props as { variant?: keyof typeof InlineAlertSpec.variants })
            .variant ?? InlineAlertSpec.defaultVariant!
        ];
      const bgColor = props.style?.backgroundColor ?? variant.background;

      const styleBr = props.style?.borderRadius;
      const borderRadius =
        styleBr != null
          ? typeof styleBr === "number"
            ? styleBr
            : parseFloat(String(styleBr)) || 0
          : size.borderRadius;
      const br =
        typeof borderRadius === "number"
          ? borderRadius
          : resolveToken(borderRadius as TokenRef);
      const resolvedBr = typeof br === "number" ? br : 6;

      const borderColor =
        (props.style?.borderColor as string | undefined) ??
        variant.border ??
        ("{color.border}" as TokenRef);

      const shapes: Shape[] = [
        // 배경 roundRect
        {
          id: "bg",
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width: "auto",
          height: "auto" as unknown as number,
          radius: resolvedBr,
          fill: bgColor,
        },
        // 테두리 (CSS border: 1px solid 대응)
        {
          type: "border" as const,
          target: "bg",
          borderWidth: 1,
          color: borderColor,
        },
      ];

      // Child Composition: 자식 Element가 있으면 shell만 반환
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      return shapes;
    },

    react: (props) => ({
      role: "alert",
      "aria-live": "polite",
      ...(props.autoFocus ? { autoFocus: true } : {}),
    }),

    pixi: () => ({
      eventMode: "none" as const,
    }),
  },
};
