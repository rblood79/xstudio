/**
 * Heading Component Spec (properties-only)
 *
 * Dialog, Popover 등 compound 컴포넌트의 제목 요소
 * TEXT_TAGS로 렌더링되므로 render.shapes()는 사용하지 않음
 *
 * @packageDocumentation
 */

import type { ComponentSpec, TokenRef } from "../types";
import { Heading as HeadingIcon } from "lucide-react";

/**
 * Heading Props
 */
export interface HeadingProps {
  children?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  style?: Record<string, string | number | undefined>;
}

/**
 * Heading Component Spec
 *
 * TEXT_TAGS 기반 TextSprite 렌더링 — render.shapes() 불필요
 * properties만 정의하여 에디터 UI 제공
 */
export const HeadingSpec: ComponentSpec<HeadingProps> = {
  name: "Heading",
  description: "compound 컴포넌트의 제목 텍스트 (h1~h6)",
  element: "h3",
  archetype: "simple",
  skipCSSGeneration: true,

  defaultVariant: "default",
  defaultSize: "md",

  properties: {
    sections: [
      {
        title: "Content",
        fields: [
          {
            key: "level",
            type: "enum",
            label: "Heading Level",
            icon: HeadingIcon,
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
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
  },

  states: {},

  render: {
    shapes: () => [],
  },
};
