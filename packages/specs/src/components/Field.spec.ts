/**
 * Field Component Spec (properties-only)
 */
import type { ComponentSpec, TokenRef } from "../types";
import { Tag, Type, Eye, Tags } from "lucide-react";

export interface FieldProps {
  key?: string;
  label?: string;
  visible?: boolean;
  showLabel?: boolean;
  type?: "string" | "number" | "email" | "url" | "date" | "boolean" | "image";
  style?: Record<string, string | number | undefined>;
}

export const FieldSpec: ComponentSpec<FieldProps> = {
  name: "Field",
  description: "데이터 필드 매핑 컴포넌트",
  archetype: "simple",
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
            key: "key",
            type: "string",
            label: "Data Key",
            icon: Tag,
            placeholder: "id, name, email...",
          },
          {
            key: "label",
            type: "string",
            label: "Label",
            icon: Type,
            placeholder: "Field label",
          },
        ],
      },
      {
        title: "State",
        fields: [
          { key: "visible", type: "boolean", label: "Visible", icon: Eye , defaultValue: true },
          {
            key: "showLabel",
            type: "boolean",
            label: "Show Label",
            icon: Tags,
           defaultValue: true },
        ],
      },
      {
        title: "Appearance",
        fields: [
          {
            key: "type",
            type: "enum",
            label: "Type",
            icon: Type,
            options: [
              { value: "string", label: "String" },
              { value: "number", label: "Number" },
              { value: "email", label: "Email" },
              { value: "url", label: "URL" },
              { value: "date", label: "Date" },
              { value: "boolean", label: "Boolean" },
              { value: "image", label: "Image" },
            ],
           defaultValue: "string" },
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
      height: 32,
      paddingX: 12,
      paddingY: 6,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 6,
    },
  },
  states: {},

  render: {
    shapes: () => [],
  },
};
