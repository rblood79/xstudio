/**
 * Text Component Spec
 *
 * 텍스트 요소의 size 프리셋과 properties 정의.
 * TEXT_TAGS 경로(buildTextNodeData)로 렌더링되므로 shapes는 빈 배열.
 * skipCSSGeneration: true — CSS 자동 생성 불필요.
 */

import type { ComponentSpec, TokenRef } from "../types";
import { Type } from "lucide-react";

export interface TextProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  children?: string;
  text?: string;
  style?: Record<string, string | number | undefined>;
}

export const TextSpec: ComponentSpec<TextProps> = {
  name: "Text",
  description: "텍스트 요소",
  element: "p",
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
              { value: "xl", label: "XL" },
              { value: "2xl", label: "2XL" },
              { value: "3xl", label: "3XL" },
            ],
          },
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
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      lineHeight: "{typography.text-xs--line-height}" as TokenRef,
    },
    sm: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      lineHeight: "{typography.text-sm--line-height}" as TokenRef,
    },
    md: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      lineHeight: "{typography.text-base--line-height}" as TokenRef,
    },
    lg: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      lineHeight: "{typography.text-lg--line-height}" as TokenRef,
    },
    xl: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xl}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      lineHeight: "{typography.text-xl--line-height}" as TokenRef,
    },
    "2xl": {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-2xl}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      lineHeight: "{typography.text-2xl--line-height}" as TokenRef,
    },
    "3xl": {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-3xl}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      lineHeight: "{typography.text-3xl--line-height}" as TokenRef,
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
    shapes: () => [],
  },
};
