/**
 * Code Component Spec
 *
 * ADR-058 Phase 3: Spec-First 마이그레이션 (신설)
 * - semantic element: `<code>` (인라인 코드)
 * - archetype "simple" (inline-flex, center align, fit-content)
 * - monospace font, muted 배경으로 인라인 코드 시각화
 * - 긴 코드 스니펫은 자연 wrap 허용 (white-space: normal)
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { Code as CodeIcon } from "lucide-react";
import { fontFamily } from "../primitives/typography";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";

export interface CodeProps {
  size?: "xs" | "sm" | "md" | "lg";
  children?: string;
  text?: string;
  style?: Record<string, string | number | undefined>;
}

export const CodeSpec: ComponentSpec<CodeProps> = {
  name: "Code",
  description: "인라인 코드",
  element: "code",
  archetype: "simple",

  defaultVariant: "default",
  defaultSize: "sm",

  properties: {
    sections: [
      {
        title: "Content",
        fields: [
          {
            key: "children",
            type: "string",
            label: "Code",
            icon: CodeIcon,
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
            ],
          },
        ],
      },
    ],
  },

  variants: {
    default: {
      background: "{color.neutral-subtle}" as TokenRef,
      backgroundHover: "{color.neutral-subtle}" as TokenRef,
      backgroundPressed: "{color.neutral-pressed}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    xs: {
      height: 18,
      paddingX: 4,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.xs}" as TokenRef,
      lineHeight: "{typography.text-xs--line-height}" as TokenRef,
    },
    sm: {
      height: 22,
      paddingX: 6,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      lineHeight: "{typography.text-sm--line-height}" as TokenRef,
    },
    md: {
      height: 26,
      paddingX: 8,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      lineHeight: "{typography.text-base--line-height}" as TokenRef,
    },
    lg: {
      height: 32,
      paddingX: 10,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      lineHeight: "{typography.text-lg--line-height}" as TokenRef,
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
        13,
      );

      const ff = (props.style?.fontFamily as string) || fontFamily.mono;
      const textColor = props.style?.color ?? variant.text;

      const shapes: Shape[] = [
        {
          type: "text" as const,
          x: 0,
          y: 0,
          text,
          fontSize,
          fontFamily: ff,
          fontWeight: 400,
          fill: textColor,
          align: "center",
          baseline: "middle" as const,
          lineHeight: size.lineHeight as unknown as number,
        },
      ];

      return shapes;
    },

    react: (props) => ({
      "data-size": props.size || "sm",
    }),

    pixi: () => ({
      eventMode: "none" as const,
    }),
  },
};
