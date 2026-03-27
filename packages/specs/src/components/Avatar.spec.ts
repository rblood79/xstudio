/**
 * Avatar Component Spec
 *
 * 사용자 아바타 컴포넌트
 * Single Source of Truth - React와 Skia 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";

/**
 * Avatar Props
 */
export interface AvatarProps {
  src?: string;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  initials?: string;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * Avatar Component Spec
 */
export const AvatarSpec: ComponentSpec<AvatarProps> = {
  name: "Avatar",
  description: "사용자 아바타 컴포넌트",
  element: "div",
  archetype: "simple",

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.neutral-subtle}" as TokenRef,
      backgroundHover: "{color.neutral-subtle}" as TokenRef,
      backgroundPressed: "{color.neutral-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    xs: {
      height: 24,
      width: 24,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-2xs}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 0,
    },
    sm: {
      height: 28,
      width: 28,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 0,
    },
    md: {
      height: 32,
      width: 32,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 0,
    },
    lg: {
      height: 40,
      width: 40,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 0,
    },
    xl: {
      height: 48,
      width: 48,
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

  properties: {
    sections: [
      {
        title: "Content",
        fields: [
          {
            key: "src",
            type: "string",
            label: "Image URL",
            placeholder: "https://...",
          },
          { key: "alt", type: "string", label: "Alt Text" },
          { key: "initials", type: "string", label: "Initials" },
        ],
      },
      {
        title: "Appearance",
        fields: [{ type: "size" }],
      },
      {
        title: "State",
        fields: [{ key: "isDisabled", type: "boolean" }],
      },
    ],
  },

  render: {
    shapes: (props, variant, size, _state = "default") => {
      const diameter = (size as unknown as { height: number }).height ?? 32;
      const radius = diameter / 2;

      const bgColor = props.style?.backgroundColor ?? variant.background;

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

      // 이미지가 있으면 image shape
      if (props.src) {
        shapes.push({
          type: "image" as const,
          x: 0,
          y: 0,
          width: diameter,
          height: diameter,
          src: props.src,
          radius,
        });
        return shapes;
      }

      // 이니셜 텍스트
      const text =
        props.initials || props.alt?.slice(0, 2).toUpperCase() || "?";
      const rawFontSize = props.style?.fontSize ?? size.fontSize;
      const resolvedFs =
        typeof rawFontSize === "number"
          ? rawFontSize
          : typeof rawFontSize === "string" && rawFontSize.startsWith("{")
            ? resolveToken(rawFontSize as TokenRef)
            : rawFontSize;
      const fontSize = typeof resolvedFs === "number" ? resolvedFs : 12;
      const fwRaw = props.style?.fontWeight;
      const fw =
        fwRaw != null
          ? typeof fwRaw === "number"
            ? fwRaw
            : parseInt(String(fwRaw), 10) || 500
          : 500;
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;
      const textColor = props.style?.color ?? variant.text;

      shapes.push({
        type: "text" as const,
        x: radius,
        y: radius,
        text,
        fontSize,
        fontFamily: ff,
        fontWeight: fw,
        fill: textColor,
        align: "center" as const,
        baseline: "middle" as const,
      });

      return shapes;
    },

    react: (props) => ({
      role: "img",
      "aria-label": props.alt || props.initials || "Avatar",
    }),

    pixi: () => ({
      eventMode: "none" as const,
    }),
  },
};
