/**
 * ActionMenu Component Spec (properties-only)
 */
import type { ComponentSpec, Shape, TokenRef } from "../types";
import { Type, ToggleLeft, Layout, PointerOff } from "lucide-react";

export interface ActionMenuProps {
  children?: string;
  label?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  align?: "start" | "end";
  isQuiet?: boolean;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

export const ActionMenuSpec: ComponentSpec<ActionMenuProps> = {
  name: "ActionMenu",
  description: "액션 메뉴 컴포넌트",
  archetype: "overlay",
  element: "div",
  skipCSSGeneration: true,

  defaultVariant: "default",
  defaultSize: "md",

  properties: {
    sections: [
      {
        title: "Content",
        fields: [
          {
            key: "children",
            type: "string",
            label: "Text",
            icon: Type,
            placeholder: "Menu",
          },
        ],
      },
      {
        title: "Appearance",
        fields: [
          { type: "size" },
          {
            key: "align",
            type: "enum",
            label: "Align",
            icon: Layout,
            options: [
              { value: "start", label: "Start" },
              { value: "end", label: "End" },
            ],
          },
        ],
      },
      {
        title: "State",
        fields: [
          { key: "isQuiet", type: "boolean", label: "Quiet", icon: ToggleLeft },
          { key: "isDisabled", type: "boolean", icon: PointerOff },
        ],
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
    xs: {
      height: 24,
      paddingX: 8,
      paddingY: 2,
      fontSize: "{typography.text-2xs}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      gap: 4,
    },
    sm: {
      height: 28,
      paddingX: 10,
      paddingY: 4,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 4,
    },
    md: {
      height: 32,
      paddingX: 12,
      paddingY: 6,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 6,
    },
    lg: {
      height: 40,
      paddingX: 16,
      paddingY: 8,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 8,
    },
    xl: {
      height: 48,
      paddingX: 20,
      paddingY: 10,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      gap: 8,
    },
  },
  states: {},

  render: {
    shapes: (props, variant, size) => {
      const text = String(props.children || props.label || "Actions");
      const height = size.height;
      const paddingX = size.paddingX;

      const styleBr = props.style?.borderRadius;
      const borderRadius =
        styleBr != null
          ? typeof styleBr === "number"
            ? styleBr
            : parseFloat(String(styleBr)) || 0
          : (size.borderRadius as unknown as number);

      const bgColor =
        props.style?.backgroundColor ?? ("{color.neutral-subtle}" as TokenRef);

      const shapes: Shape[] = [
        {
          type: "roundRect",
          x: 0,
          y: 0,
          width: "auto",
          height,
          radius: borderRadius,
          fill: bgColor,
        },
        {
          type: "text",
          x: paddingX,
          y: 0,
          text: `${text} ▾`,
          fontSize: size.fontSize as unknown as number,
          fontWeight: 500,
          fill: variant.text,
          align: "left",
          baseline: "middle",
          fontFamily: "Inter, system-ui, sans-serif",
        },
      ];
      return shapes;
    },
  },
};
