/**
 * TailSwatch Component Spec (properties-only)
 *
 * color picker(PropertyColorPicker)는 SpecField에서 지원하지 않으므로
 * value 필드를 string 타입으로 정의하여 hex 값을 직접 입력받는다.
 */
import type { ComponentSpec, TokenRef } from "../types";
import { Paintbrush, Palette, PointerOff } from "lucide-react";

export interface TailSwatchProps {
  value?: string;
  defaultValue?: string;
  colorSpace?: "rgb" | "hsl" | "hsb";
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

export const TailSwatchSpec: ComponentSpec<TailSwatchProps> = {
  name: "TailSwatch",
  description: "색상 스왓치 컴포넌트",
  archetype: "simple",
  element: "div",
  skipCSSGeneration: false,

  defaultVariant: "default",
  defaultSize: "md",

  properties: {
    sections: [
      {
        title: "Color Value",
        fields: [
          {
            key: "value",
            type: "string",
            label: "Color",
            icon: Paintbrush,
            placeholder: "#3b82f6",
          },
          {
            key: "defaultValue",
            type: "string",
            label: "Default Value",
            icon: Palette,
            placeholder: "#3b82f6",
          },
        ],
      },
      {
        title: "Color Space",
        fields: [
          {
            key: "colorSpace",
            type: "enum",
            label: "Color Space",
            icon: Palette,
            options: [
              { value: "rgb", label: "RGB" },
              { value: "hsl", label: "HSL" },
              { value: "hsb", label: "HSB (Default)" },
            ],
           defaultValue: "hsb" },
        ],
      },
      {
        title: "State",
        fields: [{ key: "isDisabled", type: "boolean", icon: PointerOff }],
      },
    ],
  },

  variants: {
    default: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
  },
  sizes: {
    md: {
      height: 32,
      paddingX: 4,
      paddingY: 4,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 4,
    },
  },
  states: {},

  render: {
    shapes: () => [],
  },
};
