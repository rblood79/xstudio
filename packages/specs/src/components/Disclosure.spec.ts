/**
 * Disclosure Component Spec
 *
 * React Aria 기반 디스클로저 (아코디언) 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveStateColors } from "../utils/stateEffect";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";
import { Type, ToggleLeft, PointerOff, Parentheses } from "lucide-react";

/**
 * Disclosure Props
 */
export interface DisclosureProps {
  variant?: "default" | "accent" | "surface";
  size?: "sm" | "md" | "lg";
  isExpanded?: boolean;
  title?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * Disclosure Component Spec
 */
export const DisclosureSpec: ComponentSpec<DisclosureProps> = {
  name: "Disclosure",
  description: "React Aria 기반 디스클로저 (아코디언) 컴포넌트",
  element: "div",
  skipCSSGeneration: true,

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.layer-2}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
    accent: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.accent-subtle}" as TokenRef,
      backgroundPressed: "{color.accent-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.accent}" as TokenRef,
    },
    surface: {
      background: "{color.layer-2}" as TokenRef,
      backgroundHover: "{color.layer-1}" as TokenRef,
      backgroundPressed: "{color.neutral-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 8,
      paddingY: 2,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      lineHeight: "{typography.text-xs--line-height}" as TokenRef,
      borderWidth: 1,
      iconSize: 14,
      gap: 6,
    },
    md: {
      height: 0,
      paddingX: 12,
      paddingY: 4,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      lineHeight: "{typography.text-sm--line-height}" as TokenRef,
      borderWidth: 1,
      iconSize: 16,
      gap: 8,
    },
    lg: {
      height: 0,
      paddingX: 16,
      paddingY: 8,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      lineHeight: "{typography.text-base--line-height}" as TokenRef,
      borderWidth: 1,
      iconSize: 20,
      gap: 10,
    },
  },

  states: {
    hover: {},
    disabled: {
      opacity: 0.38,
      pointerEvents: "none",
    },
    focusVisible: {
      focusRing: "{focus.ring.default}",
    },
  },

  render: {
    shapes: (props, size, state = "default") => {
      const variant = DisclosureSpec.variants![(props as { variant?: keyof typeof DisclosureSpec.variants }).variant ?? DisclosureSpec.defaultVariant!];
      const title = props.title || "Disclosure";

      // 사용자 스타일 우선
      const styleBr = props.style?.borderRadius;
      const borderRadius =
        styleBr != null
          ? typeof styleBr === "number"
            ? styleBr
            : parseFloat(String(styleBr)) || 0
          : size.borderRadius;

      const styleBw = props.style?.borderWidth;
      const borderWidth =
        styleBw != null
          ? typeof styleBw === "number"
            ? styleBw
            : parseFloat(String(styleBw)) || 0
          : 1;

      const bgColor =
        props.style?.backgroundColor ??
        resolveStateColors(variant, state).background;
      const borderColor =
        props.style?.borderColor ??
        (variant.border || ("{color.border}" as TokenRef));

      const textColor = props.style?.color ?? variant.text;
      const fontSize = resolveSpecFontSize(props.style?.fontSize ?? size.fontSize, 16);
      const fwRaw = props.style?.fontWeight;
      const fw =
        fwRaw != null
          ? typeof fwRaw === "number"
            ? fwRaw
            : parseInt(String(fwRaw), 10) || 500
          : 500;
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;
      const textAlign =
        (props.style?.textAlign as "left" | "center" | "right") || "left";

      const stylePx =
        props.style?.paddingLeft ??
        props.style?.paddingRight ??
        props.style?.padding;
      const paddingX =
        stylePx != null
          ? typeof stylePx === "number"
            ? stylePx
            : parseFloat(String(stylePx)) || 0
          : size.paddingX;

      const stylePy =
        props.style?.paddingTop ??
        props.style?.paddingBottom ??
        props.style?.padding;
      const paddingY =
        stylePy != null
          ? typeof stylePy === "number"
            ? stylePy
            : parseFloat(String(stylePy)) || 0
          : size.paddingY;

      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      const shapes: Shape[] = [
        // 배경
        {
          id: "bg",
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width: "auto",
          height: "auto",
          radius: borderRadius as unknown as number,
          fill: bgColor,
        },
        // 테두리
        {
          type: "border" as const,
          target: "bg",
          borderWidth,
          color: borderColor,
          radius: borderRadius as unknown as number,
        },
      ];
      if (hasChildren) return shapes;

      // 헤더 + 콘텐츠 (standalone 전용)
      shapes.push(
        // 헤더 (클릭 영역)
        {
          type: "container" as const,
          x: 0,
          y: 0,
          width: "auto",
          height: size.height,
          children: [
            // 타이틀 텍스트
            {
              type: "text" as const,
              x: paddingX,
              y: size.height / 2,
              text: title,
              fontSize,
              fontFamily: ff,
              fontWeight: fw,
              fill: textColor,
              baseline: "middle" as const,
              align: textAlign,
            },
          ],
          layout: {
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: [0, paddingX, 0, paddingX],
          },
        },
        // 콘텐츠 패널 (isExpanded일 때만 표시)
        {
          type: "container" as const,
          x: 0,
          y: 0,
          width: "auto",
          height: props.isExpanded ? "auto" : 0,
          children: [],
          layout: {
            display: props.isExpanded ? "flex" : "none",
            flexDirection: "column",
            padding: [0, paddingX, paddingY, paddingX],
            gap: size.gap,
          },
        },
      );

      return shapes;
    },

    react: (props) => ({
      "data-expanded": props.isExpanded || undefined,
    }),

    pixi: () => ({
      eventMode: "static" as const,
      cursor: "pointer",
    }),
  },

  properties: {
    sections: [
      {
        title: "Content",
        fields: [
          {
            key: "title",
            type: "string",
            label: "Title",
            placeholder: "Click to expand",
            icon: Type,
          },
        ],
      },
      {
        title: "Appearance",
        fields: [{ type: "variant", icon: Parentheses }, { type: "size" }],
      },
      {
        title: "State",
        fields: [
          {
            key: "defaultExpanded",
            type: "boolean",
            label: "Default Expanded",
            icon: ToggleLeft,
          },
          {
            key: "isExpanded",
            type: "boolean",
            label: "Expanded (Controlled)",
            icon: ToggleLeft,
          },

          { key: "isDisabled", type: "boolean", icon: PointerOff },
        ],
      },
    ],
  },
};
