/**
 * Toolbar Component Spec
 *
 * React Aria 기반 툴바 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { ArrowLeftRight } from "lucide-react";

/**
 * Toolbar Props
 */
export interface ToolbarProps {
  variant?: "default" | "accent";
  size?: "sm" | "md" | "lg";
  orientation?: "horizontal" | "vertical";
  style?: Record<string, string | number | undefined>;
}

/**
 * Toolbar Component Spec
 */
export const ToolbarSpec: ComponentSpec<ToolbarProps> = {
  name: "Toolbar",
  description: "React Aria 기반 툴바 컴포넌트",
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
      background: "{color.accent-subtle}" as TokenRef,
      backgroundHover: "{color.accent-subtle}" as TokenRef,
      backgroundPressed: "{color.accent-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.accent}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 8,
      paddingY: 4,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 4,
    },
    md: {
      height: 0,
      paddingX: 12,
      paddingY: 6,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 8,
    },
    lg: {
      height: 0,
      paddingX: 16,
      paddingY: 8,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      gap: 10,
    },
  },

  states: {
    disabled: {
      opacity: 0.38,
      pointerEvents: "none",
    },
    focusVisible: {
      outline: "2px solid var(--accent)",
      outlineOffset: "2px",
    },
  },

  render: {
    shapes: (props, variant, size, _state = "default") => {
      const isVertical = props.orientation === "vertical";

      // 사용자 스타일 우선, 없으면 spec 기본값
      const styleBr = props.style?.borderRadius;
      const borderRadius =
        styleBr != null
          ? typeof styleBr === "number"
            ? styleBr
            : parseFloat(String(styleBr)) || 0
          : size.borderRadius;

      const bgColor = props.style?.backgroundColor ?? variant.background;

      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      const shapes: Shape[] = [
        // 배경
        {
          id: "bg",
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width: "auto",
          height: "auto" as unknown as number,
          radius: borderRadius as unknown as number,
          fill: bgColor,
        },
      ];
      if (hasChildren) return shapes;

      // 도구 아이템 컨테이너 (standalone 전용)
      shapes.push({
        type: "container" as const,
        x: 0,
        y: 0,
        width: "auto",
        height: "auto",
        children: [],
        layout: {
          display: "flex",
          flexDirection: isVertical ? "column" : "row",
          alignItems: "center",
          gap: size.gap,
          padding: [size.paddingY, size.paddingX, size.paddingY, size.paddingX],
        },
      });

      return shapes;
    },

    react: (props) => ({
      role: "toolbar",
      "aria-orientation": props.orientation || "horizontal",
    }),

    pixi: () => ({
      eventMode: "static" as const,
    }),
  },

  properties: {
    sections: [
      {
        title: "Appearance",
        fields: [
          {
            key: "orientation",
            type: "enum",
            label: "Orientation",
            icon: ArrowLeftRight,
            options: [
              { value: "horizontal", label: "Horizontal" },
              { value: "vertical", label: "Vertical" },
            ],
          },
        ],
      },
    ],
  },
};
