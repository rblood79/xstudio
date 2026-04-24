/**
 * ProgressBarValue Component Spec
 *
 * ProgressBar compound 컴포넌트의 child 요소 (현재 값 텍스트 표시)
 * 부모에서 value/formatOptions를 delegation 받아 표시
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";

/**
 * ProgressBarValue Props
 */
export interface ProgressBarValueProps {
  variant?: "default";
  size?: "sm" | "md" | "lg" | "xl";
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

  // ADR-083 Phase 10: progress archetype base 의 layout primitive 1 필드 리프팅.
  containerStyles: {
    display: "grid",
  },

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      fill: {
        default: {
          base: "{color.transparent}" as TokenRef,
          hover: "{color.transparent}" as TokenRef,
          pressed: "{color.transparent}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 16,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      lineHeight: 16,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    md: {
      height: 20,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      lineHeight: 20,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    lg: {
      height: 24,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      lineHeight: 24,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    xl: {
      height: 28,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      lineHeight: 28,
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
    shapes: (props, size) => {
      const variant =
        ProgressBarValueSpec.variants![
          (props as { variant?: keyof typeof ProgressBarValueSpec.variants })
            .variant ?? ProgressBarValueSpec.defaultVariant!
        ];
      const text = props.children ?? "";
      if (!text) return [];

      const fontSize = resolveSpecFontSize(
        props.size ? size.fontSize : (props.style?.fontSize ?? size.fontSize),
        14,
      );

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
