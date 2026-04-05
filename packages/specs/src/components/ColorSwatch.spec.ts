/**
 * ColorSwatch Component Spec
 *
 * React Aria 기반 색상 프리뷰 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { Circle, Palette, Sliders } from "lucide-react";

/**
 * ColorSwatch Props
 */
export interface ColorSwatchProps {
  variant?: "default" | "selected";
  size?: "sm" | "md" | "lg";
  color?: string;
  rounding?: "default" | "none" | "full";
  isDisabled?: boolean;
  isSelected?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * ColorSwatch Component Spec
 */
export const ColorSwatchSpec: ComponentSpec<ColorSwatchProps> = {
  name: "ColorSwatch",
  description: "React Aria 기반 색상 프리뷰 스와치",
  archetype: "simple",
  element: "div",

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
    selected: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.layer-2}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.accent}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 20,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      gap: 0,
    },
    md: {
      height: 28,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 0,
    },
    lg: {
      height: 36,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 0,
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
      outline: "2px solid var(--accent)",
      outlineOffset: "2px",
    },
  },

  properties: {
    sections: [
      {
        title: "Color",
        fields: [
          { key: "color", type: "string", label: "Color Value", icon: Palette },
          {
            key: "colorSpace",
            type: "enum",
            label: "Color Space",
            icon: Sliders,
            emptyToUndefined: true,
            options: [
              { value: "", label: "Auto" },
              { value: "rgb", label: "RGB" },
              { value: "hsl", label: "HSL" },
              { value: "hsb", label: "HSB" },
            ],
          },
        ],
      },
      {
        title: "Appearance",
        fields: [
          {
            key: "rounding",
            type: "enum",
            label: "Rounding",
            icon: Circle,
            options: [
              { value: "default", label: "Default" },
              { value: "none", label: "None" },
              { value: "full", label: "Full" },
            ],
            defaultValue: "default",
          },
        ],
      },
    ],
  },

  render: {
    shapes: (props, variant, size, _state = "default") => {
      const swatchSize = size.height;

      // 사용자 스타일 우선, 없으면 spec 기본값
      const styleBr = props.style?.borderRadius;
      const borderRadius =
        styleBr != null
          ? typeof styleBr === "number"
            ? styleBr
            : parseFloat(String(styleBr)) || 0
          : size.borderRadius;

      const borderColor =
        props.style?.borderColor ??
        (props.isSelected
          ? ("{color.accent}" as TokenRef)
          : (variant.border ?? ("{color.border}" as TokenRef)));
      const styleBw = props.style?.borderWidth;
      const defaultBw = props.isSelected ? 2 : 1;
      const borderWidth =
        styleBw != null
          ? typeof styleBw === "number"
            ? styleBw
            : parseFloat(String(styleBw)) || 0
          : defaultBw;

      const shapes: Shape[] = [
        // 체크 패턴 배경 (투명도 표시용)
        {
          id: "checker",
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width: swatchSize,
          height: swatchSize,
          radius: borderRadius as unknown as number,
          fill: "{color.layer-2}" as TokenRef,
        },
        // 색상 채우기
        {
          id: "color",
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width: swatchSize,
          height: swatchSize,
          radius: borderRadius as unknown as number,
          fill: props.color || "#3B82F6",
        },
        // 테두리
        {
          type: "border" as const,
          target: "color",
          borderWidth,
          color: borderColor,
          radius: borderRadius as unknown as number,
        },
      ];

      return shapes;
    },

    react: (props) => ({
      role: "option",
      "aria-selected": props.isSelected || undefined,
      "data-color": props.color,
      "data-disabled": props.isDisabled || undefined,
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ("none" as const) : ("static" as const),
      cursor: props.isDisabled ? "not-allowed" : "pointer",
    }),
  },
};
