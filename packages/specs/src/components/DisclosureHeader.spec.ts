/**
 * DisclosureHeader Component Spec (properties-only)
 *
 * Disclosure 컴포넌트의 트리거 헤더 요소
 * heading level을 지정하여 접근성 시맨틱 구조 제공
 *
 * @packageDocumentation
 */

import type { ComponentSpec, TokenRef } from "../types";
import { Heading } from "lucide-react";

export interface DisclosureHeaderProps {
  children?: string;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  style?: Record<string, string | number | undefined>;
}

export const DisclosureHeaderSpec: ComponentSpec<DisclosureHeaderProps> = {
  name: "DisclosureHeader",
  description: "Disclosure 트리거 헤더 (h1~h6 시맨틱)",
  element: "h3",
  archetype: "simple",
  skipCSSGeneration: false,

  defaultVariant: "default",
  defaultSize: "md",

  properties: {
    sections: [
      {
        title: "Content",
        fields: [
          {
            key: "headingLevel",
            type: "enum",
            label: "Heading Level",
            icon: Heading,
            defaultValue: 3,
            options: [
              { value: "1", label: "H1" },
              { value: "2", label: "H2" },
              { value: "3", label: "H3" },
              { value: "4", label: "H4" },
              { value: "5", label: "H5" },
              { value: "6", label: "H6" },
            ],
            valueTransform: "number",
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
    md: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
  },

  states: {},

  render: {
    shapes: () => [],
  },
};
