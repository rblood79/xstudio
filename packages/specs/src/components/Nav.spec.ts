/**
 * Nav Component Spec
 *
 * HTML5 nav 기반 네비게이션 컨테이너 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { parsePxValue } from "../primitives";
// ADR-908 Phase 3-A-2: Fill token dual-read seam
import { resolveFillTokens } from "../utils/fillTokens";
import { Tag } from "lucide-react";

/**
 * Nav Props
 */
export interface NavProps {
  variant?: "default" | "accent";
  size?: "sm" | "md" | "lg";
  "aria-label"?: string;
  children?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * Nav Component Spec
 */
export const NavSpec: ComponentSpec<NavProps> = {
  name: "Nav",
  description: "HTML5 nav 기반 네비게이션 컨테이너",
  element: "nav",

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.base}" as TokenRef,
      backgroundPressed: "{color.base}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    accent: {
      background: "{color.accent-subtle}" as TokenRef,
      backgroundHover: "{color.accent-subtle}" as TokenRef,
      backgroundPressed: "{color.accent-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 48,
      paddingX: 12,
      paddingY: 8,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 8,
    },
    md: {
      height: 56,
      paddingX: 16,
      paddingY: 12,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 12,
    },
    lg: {
      height: 64,
      paddingX: 20,
      paddingY: 16,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      gap: 16,
    },
  },

  states: {
    hover: {},
    pressed: {},
    disabled: {
      opacity: 0.38,
      pointerEvents: "none",
    },
    focusVisible: {
      focusRing: "{focus.ring.default}",
    },
  },

  render: {
    shapes: (props, size) => {
      const variant =
        NavSpec.variants![
          (props as { variant?: keyof typeof NavSpec.variants }).variant ??
            NavSpec.defaultVariant!
        ];
      const shapes: Shape[] = [];

      const fill = resolveFillTokens(variant);
      const bgColor = props.style?.backgroundColor ?? fill.default.base;

      const borderRadius = parsePxValue(
        props.style?.borderRadius,
        size.borderRadius as unknown as number,
      );

      // 배경
      shapes.push({
        id: "bg",
        type: "roundRect" as const,
        x: 0,
        y: 0,
        width: "auto",
        height: "auto",
        radius: borderRadius,
        fill: bgColor,
      });

      return shapes;
    },

    react: (props) => ({
      "aria-label": props["aria-label"] || "Navigation",
      role: "navigation",
    }),

    pixi: () => ({
      eventMode: "static" as const,
      cursor: "default",
    }),
  },

  properties: {
    sections: [
      {
        title: "Content",
        fields: [
          {
            key: "aria-label",
            type: "string",
            label: "aria-label",
            placeholder: "Main navigation",
            icon: Tag,
          },
        ],
      },
    ],
  },
};
