/**
 * Accordion Component Spec (properties-only)
 */
import { ToggleLeft, PointerOff } from "lucide-react";
import type { ComponentSpec, TokenRef } from "../types";

export interface AccordionProps {
  allowsMultipleExpanded?: boolean;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

export const AccordionSpec: ComponentSpec<AccordionProps> = {
  name: "Accordion",
  description: "아코디언 컴포넌트",
  archetype: undefined,
  element: "div",
  skipCSSGeneration: true,

  defaultVariant: "default",
  defaultSize: "md",

  properties: {
    sections: [
      {
        title: "State",
        fields: [
          {
            key: "allowsMultipleExpanded",
            type: "boolean",
            label: "Allow Multiple Expanded",
            icon: ToggleLeft,
          },
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
    md: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 0,
    },
  },
  states: {},

  render: {
    shapes: () => [],
  },
};
