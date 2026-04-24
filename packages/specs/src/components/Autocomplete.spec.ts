/**
 * Autocomplete Component Spec (properties-only)
 */
import type { ComponentSpec, TokenRef } from "../types";
import { Tag, Search, PointerOff, Focus, Type } from "lucide-react";

export interface AutocompleteProps {
  label?: string;
  placeholder?: string;
  defaultInputValue?: string;
  isDisabled?: boolean;
  disableAutoFocusFirst?: boolean;
  disableVirtualFocus?: boolean;
  filterSensitivity?: "base" | "case" | "accent" | "variant";
  style?: Record<string, string | number | undefined>;
}

export const AutocompleteSpec: ComponentSpec<AutocompleteProps> = {
  name: "Autocomplete",
  description: "자동완성 컴포넌트",
  archetype: "collection",
  element: "div",

  // ADR-083 Phase 6: collection archetype base 의 layout primitive 2 필드 리프팅.
  //   box-sizing 은 ContainerStylesSchema 미지원 → archetype table 잔존.
  containerStyles: {
    display: "flex",
    flexDirection: "column",
  },

  defaultVariant: "default",
  defaultSize: "md",

  properties: {
    sections: [
      {
        title: "Content",
        fields: [
          { key: "label", type: "string", label: "Label", icon: Tag },
          {
            key: "placeholder",
            type: "string",
            label: "Placeholder",
            icon: Search,
            placeholder: "Search...",
          },
          {
            key: "defaultInputValue",
            type: "string",
            label: "Default Input Value",
            icon: Type,
          },
        ],
      },
      {
        title: "State",
        fields: [
          { key: "isDisabled", type: "boolean", icon: PointerOff },
          {
            key: "disableAutoFocusFirst",
            type: "boolean",
            label: "Disable Auto Focus First",
            icon: Focus,
          },
          {
            key: "disableVirtualFocus",
            type: "boolean",
            label: "Disable Virtual Focus",
            icon: Focus,
          },
        ],
      },
      {
        title: "Filtering",
        fields: [
          {
            key: "filterSensitivity",
            type: "enum",
            label: "Filter Sensitivity",
            icon: Search,
            options: [
              { value: "base", label: "Base (Case insensitive)" },
              { value: "case", label: "Case sensitive" },
              { value: "accent", label: "Accent sensitive" },
              { value: "variant", label: "Full sensitivity" },
            ],
            defaultValue: "base",
          },
        ],
      },
    ],
  },

  variants: {
    default: {
      fill: {
        default: {
          base: "{color.transparent}" as TokenRef,
          hover: "{color.transparent}" as TokenRef,
          pressed: "{color.transparent}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
    },
  },
  sizes: {
    sm: {
      height: 28,
      paddingX: 8,
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
  },
  states: {},

  composition: {
    containerStyles: {},
    staticSelectors: {
      ".react-aria-SearchField": {
        width: "100%",
      },
      ".react-aria-Menu[data-empty]": {
        "align-items": "center",
        "justify-content": "center",
        "font-style": "italic",
      },
      ".react-aria-MenuItem[href]": {
        "text-decoration": "none",
        cursor: "pointer",
      },
    },
    delegation: [],
  },

  render: {
    shapes: () => [],
  },
};
