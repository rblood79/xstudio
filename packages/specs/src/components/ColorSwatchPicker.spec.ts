/**
 * ColorSwatchPicker Component Spec
 *
 * React Aria 기반 색상 스와치 그리드 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { parsePxValue } from "../primitives";
import { Circle, LayoutGrid, Hash, Sliders, PointerOff } from "lucide-react";

/**
 * ColorSwatchPicker Props
 */
export interface ColorSwatchPickerProps {
  variant?: "default" | "accent";
  size?: "sm" | "md" | "lg";
  value?: string;
  colors?: string[];
  columns?: number;
  layout?: "grid" | "stack";
  colorSpace?: "rgb" | "hsl" | "hsb";
  density?: "compact" | "regular" | "spacious";
  rounding?: "default" | "none" | "full";
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * ColorSwatchPicker Component Spec
 */
export const ColorSwatchPickerSpec: ComponentSpec<ColorSwatchPickerProps> = {
  name: "ColorSwatchPicker",
  description: "React Aria 기반 색상 스와치 그리드 (swatch grid)",
  element: "div",
  skipCSSGeneration: true,

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.base}" as TokenRef,
      backgroundPressed: "{color.base}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
    accent: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.base}" as TokenRef,
      backgroundPressed: "{color.base}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.accent}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 4,
      paddingY: 4,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      iconSize: 20,
      gap: 4,
    },
    md: {
      height: 0,
      paddingX: 6,
      paddingY: 6,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      iconSize: 28,
      gap: 6,
    },
    lg: {
      height: 0,
      paddingX: 8,
      paddingY: 8,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.xl}" as TokenRef,
      iconSize: 36,
      gap: 8,
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

  properties: {
    sections: [
      {
        title: "Appearance",
        fields: [
          {
            key: "density",
            type: "enum",
            label: "Density",
            icon: LayoutGrid,
            options: [
              { value: "compact", label: "Compact" },
              { value: "regular", label: "Regular" },
              { value: "spacious", label: "Spacious" },
            ],
            defaultValue: "regular",
          },
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
      {
        title: "Layout",
        fields: [
          {
            key: "layout",
            type: "enum",
            label: "Layout",
            icon: LayoutGrid,
            options: [
              { value: "grid", label: "Grid" },
              { value: "stack", label: "Stack" },
            ],
            defaultValue: "grid",
          },
        ],
      },
      {
        title: "Colors",
        fields: [
          {
            key: "defaultValue",
            type: "string",
            label: "Default Value",
            icon: Hash,
          },
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
        title: "State",
        fields: [{ key: "isDisabled", type: "boolean", icon: PointerOff }],
      },
    ],
  },

  render: {
    shapes: (props, size, _state = "default") => {
      const variant =
        ColorSwatchPickerSpec.variants![
          (props as { variant?: keyof typeof ColorSwatchPickerSpec.variants })
            .variant ?? ColorSwatchPickerSpec.defaultVariant!
        ];
      // 사용자 스타일 우선, 없으면 spec 기본값
      const bgColor = props.style?.backgroundColor ?? variant.background;

      const borderRadius = parsePxValue(
        props.style?.borderRadius,
        size.borderRadius,
      );

      const padding = parsePxValue(
        props.style?.paddingTop ?? props.style?.padding,
        size.paddingY,
      );

      const swatchSize = size.iconSize ?? 28;
      const columns = props.columns ?? 6;

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
      ];

      // Child Composition: 자식 Element가 있으면 그리드 컨테이너 스킵
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // 그리드 컨테이너
      shapes.push({
        type: "container" as const,
        x: 0,
        y: 0,
        width: "auto",
        height: "auto",
        children: [],
        layout: {
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, ${swatchSize}px)`,
          gap: size.gap,
          padding,
        },
      });

      return shapes;
    },

    react: (props) => ({
      role: "listbox",
      "aria-label": "Color swatches",
      "data-disabled": props.isDisabled || undefined,
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ("none" as const) : ("static" as const),
      cursor: "default",
    }),
  },
};
