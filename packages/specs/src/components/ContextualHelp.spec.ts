/**
 * ContextualHelp Component Spec
 *
 * 도움말/정보 아이콘 버튼 컴포넌트 (Spectrum 2 ContextualHelp)
 * Single Source of Truth - React와 Skia 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";

/**
 * ContextualHelp Props
 */
export interface ContextualHelpProps {
  variant?: "help" | "info";
  size?: "sm" | "md" | "lg";
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * ContextualHelp Component Spec
 */
export const ContextualHelpSpec: ComponentSpec<ContextualHelpProps> = {
  name: "ContextualHelp",
  description: "도움말/정보 아이콘 버튼 컴포넌트",
  element: "button",

  defaultVariant: "help",
  defaultSize: "md",

  variants: {
    help: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.neutral-subtle}" as TokenRef,
      backgroundPressed: "{color.neutral-subtle}" as TokenRef,
      text: "{color.neutral-subdued}" as TokenRef,
      border: "{color.transparent}" as TokenRef,
    },
    info: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.neutral-subtle}" as TokenRef,
      backgroundPressed: "{color.neutral-subtle}" as TokenRef,
      text: "{color.informative}" as TokenRef,
      border: "{color.transparent}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 24,
      width: 24,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 0,
    },
    md: {
      height: 28,
      width: 28,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 0,
    },
    lg: {
      height: 32,
      width: 32,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 0,
    },
  },

  states: {
    disabled: {
      opacity: 0.38,
    },
  },

  render: {
    shapes: (props, variant, size, _state = "default") => {
      const diameter = (size as unknown as { height: number }).height ?? 28;
      const radius = diameter / 2;
      const bgColor = variant.background;
      const textColor = props.style?.color ?? variant.text;

      const shapes: Shape[] = [
        {
          id: "bg",
          type: "circle" as const,
          x: radius,
          y: radius,
          radius,
          fill: bgColor,
        },
      ];

      // Child Composition: 자식 Element가 있으면 shell만 반환
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // 아이콘 문자 (? 또는 i)
      const iconChar = props.variant === "info" ? "i" : "?";
      const rawFontSize = size.fontSize;
      const resolvedFs =
        typeof rawFontSize === "number"
          ? rawFontSize
          : typeof rawFontSize === "string" && rawFontSize.startsWith("{")
            ? resolveToken(rawFontSize as TokenRef)
            : rawFontSize;
      const fontSize = typeof resolvedFs === "number" ? resolvedFs : 14;
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;

      shapes.push({
        type: "text" as const,
        x: radius,
        y: radius,
        text: iconChar,
        fontSize,
        fontFamily: ff,
        fontWeight: 600,
        fill: textColor,
        align: "center" as const,
        baseline: "middle" as const,
      });

      return shapes;
    },

    react: (props) => ({
      role: "button",
      "aria-label": props.variant === "info" ? "Information" : "Help",
    }),

    pixi: () => ({
      eventMode: "static" as const,
      cursor: "pointer",
    }),
  },
};
