/**
 * ProgressBarValue Component Spec
 *
 * ProgressBar compound 컴포넌트의 child 요소 (현재 값 텍스트 표시)
 * 부모에서 value/valueFormat을 delegation 받아 표시
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";

/**
 * ProgressBarValue Props
 */
export interface ProgressBarValueProps {
  variant?: "default";
  size?: "sm" | "md" | "lg";
  /** 표시할 값 텍스트 (부모에서 delegation) */
  children?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * ProgressBarValue Component Spec
 */
export const ProgressBarValueSpec: ComponentSpec<ProgressBarValueProps> = {
  name: "ProgressBarValue",
  description: "프로그레스바 현재 값 텍스트 렌더링",
  element: "output",
  archetype: "progress",

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 16,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    md: {
      height: 20,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    lg: {
      height: 24,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-md}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
  },

  states: {
    hover: {},
    pressed: {},
    disabled: { opacity: 0.38 },
    focusVisible: {},
  },

  render: {
    shapes: (props, variant, size) => {
      const text = props.children ?? "";
      if (!text) return [];

      const rawFontSize = props.size
        ? size.fontSize
        : (props.style?.fontSize ?? size.fontSize);
      const resolvedFs =
        typeof rawFontSize === "number"
          ? rawFontSize
          : typeof rawFontSize === "string" && rawFontSize.startsWith("{")
            ? resolveToken(rawFontSize as TokenRef)
            : rawFontSize;
      const fontSize = typeof resolvedFs === "number" ? resolvedFs : 14;

      const fwRaw = props.style?.fontWeight;
      const fontWeight =
        fwRaw != null
          ? typeof fwRaw === "number"
            ? fwRaw
            : parseInt(String(fwRaw), 10) || 500
          : 500;

      const ff = (props.style?.fontFamily as string) || fontFamily.sans;
      const textColor = props.style?.color ?? variant.text;

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
          align: "right" as const,
          baseline: "top" as const,
        },
      ];

      return shapes;
    },

    react: () => ({
      "aria-live": "off",
    }),

    pixi: () => ({
      eventMode: "none" as const,
    }),
  },
};
