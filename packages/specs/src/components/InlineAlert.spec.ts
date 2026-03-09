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

/**
 * InlineAlert Props
 */
export interface InlineAlertProps {
  variant?: "neutral" | "informative" | "positive" | "notice" | "negative";
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
  element: "div",

  defaultVariant: "informative",
  defaultSize: "md",

  variants: {
    neutral: {
      background: "{color.neutral-subtle}" as TokenRef,
      backgroundHover: "{color.neutral-subtle}" as TokenRef,
      backgroundPressed: "{color.neutral-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.neutral-subdued}" as TokenRef,
    },
    informative: {
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
    md: {
      height: "auto" as unknown as number,
      paddingX: 16,
      paddingY: 12,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      accentWidth: 4,
      gap: 8,
    },
  },

  states: {},

  render: {
    shapes: (props, variant, size, _state = "default") => {
      // variant.background = subtle 배경, variant.border = accent 색상
      const bgColor = props.style?.backgroundColor ?? variant.background;
      const accentColor = variant.border ?? variant.text;
      const accentWidth =
        (size as unknown as { accentWidth: number }).accentWidth ?? 4;

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
        // 좌측 accent 라인 (border shape로 left side만)
        {
          type: "border" as const,
          target: "bg",
          borderWidth: accentWidth,
          color: accentColor ?? variant.text,
          radius: resolvedBr,
          sides: { left: true, top: false, right: false, bottom: false },
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
