/**
 * Kbd Component Spec
 *
 * ADR-058 Phase 3: Spec-First 마이그레이션 (신설)
 * - semantic element: `<kbd>` (키보드 입력)
 * - archetype "simple" (inline-flex, center align, fit-content)
 * - monospace font, border + padding으로 키 모양 시각화
 * - 기본 한 줄 유지하되 매우 긴 키 조합은 자연 wrap 허용 (white-space: normal)
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { Keyboard } from "lucide-react";
import { fontFamily } from "../primitives/typography";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";

export interface KbdProps {
  size?: "xs" | "sm" | "md" | "lg";
  children?: string;
  text?: string;
  style?: Record<string, string | number | undefined>;
}

export const KbdSpec: ComponentSpec<KbdProps> = {
  name: "Kbd",
  description: "키보드 입력 표시",
  element: "kbd",
  archetype: "simple",

  // ADR-083 Phase 11: simple archetype base 의 layout primitive 2 필드 리프팅.
  containerStyles: {
    display: "inline-flex",
    alignItems: "center",
  },

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
            label: "Key",
            icon: Keyboard,
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
      background: "{color.layer-2}" as TokenRef,
      backgroundHover: "{color.layer-2}" as TokenRef,
      backgroundPressed: "{color.neutral-pressed}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
  },

  sizes: {
    xs: {
      height: 18,
      paddingX: 4,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.xs}" as TokenRef,
      borderWidth: 1,
      lineHeight: "{typography.text-xs--line-height}" as TokenRef,
    },
    sm: {
      height: 22,
      paddingX: 6,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      borderWidth: 1,
      lineHeight: "{typography.text-sm--line-height}" as TokenRef,
    },
    md: {
      height: 26,
      paddingX: 8,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      borderWidth: 1,
      lineHeight: "{typography.text-base--line-height}" as TokenRef,
    },
    lg: {
      height: 32,
      paddingX: 10,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      borderWidth: 1,
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
    shapes: (props, size) => {
      const variant = KbdSpec.variants![(props as { variant?: keyof typeof KbdSpec.variants }).variant ?? KbdSpec.defaultVariant!];
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
          fontWeight: 500,
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
