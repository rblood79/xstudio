/**
 * Separator Component Spec
 *
 * React Aria 기반 구분선 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";

/**
 * Separator Props
 */
export interface SeparatorProps {
  variant?:
    | "default"
    | "solid"
    | "dashed"
    | "dotted"
    | "accent"
    | "neutral"
    | "surface";
  size?: "S" | "M" | "L";
  orientation?: "horizontal" | "vertical";
}

/**
 * Separator Component Spec
 *
 * size.height = 선 두께 (px)
 * size.paddingY = 전후 margin (px)
 * variant.border = 선 색상
 * backgroundAlpha: 0 (배경 없음)
 */
export const SeparatorSpec: ComponentSpec<SeparatorProps> = {
  name: "Separator",
  description: "React Aria 기반 구분선 컴포넌트",
  archetype: "simple",
  element: "hr",

  defaultVariant: "default",
  defaultSize: "M",

  variants: {
    default: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.base}" as TokenRef,
      backgroundPressed: "{color.base}" as TokenRef,
      backgroundAlpha: 0,
      text: "{color.border}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
    solid: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.base}" as TokenRef,
      backgroundPressed: "{color.base}" as TokenRef,
      backgroundAlpha: 0,
      text: "{color.border}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
    dashed: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.base}" as TokenRef,
      backgroundPressed: "{color.base}" as TokenRef,
      backgroundAlpha: 0,
      text: "{color.border}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
    dotted: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.base}" as TokenRef,
      backgroundPressed: "{color.base}" as TokenRef,
      backgroundAlpha: 0,
      text: "{color.border}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
    accent: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.base}" as TokenRef,
      backgroundPressed: "{color.base}" as TokenRef,
      backgroundAlpha: 0,
      text: "{color.accent}" as TokenRef,
      border: "{color.accent}" as TokenRef,
    },
    neutral: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.base}" as TokenRef,
      backgroundPressed: "{color.base}" as TokenRef,
      backgroundAlpha: 0,
      text: "{color.neutral-subtle}" as TokenRef,
      border: "{color.neutral-subtle}" as TokenRef,
    },
    surface: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.base}" as TokenRef,
      backgroundPressed: "{color.base}" as TokenRef,
      backgroundAlpha: 0,
      text: "{color.border-hover}" as TokenRef,
      border: "{color.border-hover}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 1,
      paddingX: 0,
      paddingY: 4,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
    },
    md: {
      height: 1,
      paddingX: 0,
      paddingY: 8,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
    },
    lg: {
      height: 1,
      paddingX: 0,
      paddingY: 16,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
    },
  },

  states: {},

  render: {
    shapes: (props, variant, size) => {
      const isVertical = props.orientation === "vertical";
      const fillColor = variant.border ?? variant.text;
      const thickness = size.height;

      const shapes: Shape[] = [];

      // Separator를 얇은 rect로 렌더링 (line shape는 containerWidth=0일 때 안 보임)
      shapes.push({
        type: "rect" as const,
        x: 0,
        y: 0,
        width: isVertical ? thickness : ("auto" as unknown as number),
        height: isVertical ? ("auto" as unknown as number) : thickness,
        fill: fillColor,
      });

      return shapes;
    },

    react: (props) => ({
      "aria-orientation": props.orientation || "horizontal",
    }),

    pixi: () => ({
      eventMode: "none" as const,
    }),
  },
};
