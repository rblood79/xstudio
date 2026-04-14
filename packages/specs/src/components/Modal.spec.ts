/**
 * Modal Component Spec (properties-only)
 */
import type { ComponentSpec, TokenRef } from "../types";
import { MessageSquare } from "lucide-react";

export interface ModalProps {
  children?: string;
  style?: Record<string, string | number | undefined>;
}

export const ModalSpec: ComponentSpec<ModalProps> = {
  name: "Modal",
  description: "모달 오버레이 컴포넌트",
  archetype: "overlay",
  element: "div",
  skipCSSGeneration: false,

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
            icon: MessageSquare,
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
      paddingX: 24,
      paddingY: 24,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      gap: 8,
    },
  },
  states: {},

  render: {
    shapes: () => [],
  },
};
