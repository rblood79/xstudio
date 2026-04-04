/**
 * CardView Component Spec
 *
 * Card 그리드/워터폴 컬렉션 레이아웃 컴포넌트 (Spectrum 2)
 * Single Source of Truth - React와 Skia 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, TokenRef } from "../types";
import { LayoutGrid, Hash, List } from "lucide-react";

/**
 * CardView Props
 */
export interface CardViewProps {
  layout?: "grid" | "waterfall";
  size?: "sm" | "md" | "lg";
  density?: "compact" | "regular" | "spacious";
  variant?: "primary" | "secondary" | "tertiary" | "quiet";
  selectionMode?: "none" | "single" | "multiple";
  selectionStyle?: "checkbox" | "highlight";
  columns?: number;
  gap?: number;
  style?: Record<string, string | number | undefined>;
}

/** density별 gap 기본값 */
export const CARDVIEW_DENSITY_GAP: Record<string, number> = {
  compact: 8,
  regular: 16,
  spacious: 24,
};

/**
 * CardView Component Spec
 */
export const CardViewSpec: ComponentSpec<CardViewProps> = {
  name: "CardView",
  description: "Card 그리드/워터폴 컬렉션 레이아웃",
  element: "div",

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: "auto" as unknown as number,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: 0 as unknown as TokenRef,
      gap: 12,
    },
    md: {
      height: "auto" as unknown as number,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: 0 as unknown as TokenRef,
      gap: 16,
    },
    lg: {
      height: "auto" as unknown as number,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: 0 as unknown as TokenRef,
      gap: 20,
    },
  },

  states: {},

  properties: {
    sections: [
      {
        title: "Appearance",
        fields: [
          {
            key: "layout",
            type: "enum",
            label: "Layout",
            icon: LayoutGrid,
            options: [
              { value: "grid", label: "Grid" },
              { value: "waterfall", label: "Waterfall" },
            ],
           defaultValue: "grid" },
          { type: "variant" },
          { type: "size" },
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
           defaultValue: "regular" },
          { key: "columns", type: "number", label: "Columns", icon: Hash , defaultValue: 3 },
          { key: "gap", type: "number", label: "Gap", icon: Hash , defaultValue: 16 },
        ],
      },
      {
        title: "State",
        fields: [
          {
            key: "selectionMode",
            type: "enum",
            label: "Selection Mode",
            icon: List,
            options: [
              { value: "none", label: "None" },
              { value: "single", label: "Single" },
              { value: "multiple", label: "Multiple" },
            ],
           defaultValue: "none" },
          {
            key: "selectionStyle",
            type: "enum",
            label: "Selection Style",
            icon: List,
            options: [
              { value: "checkbox", label: "Checkbox" },
              { value: "highlight", label: "Highlight" },
            ],
           defaultValue: "checkbox" },
        ],
      },
    ],
  },

  render: {
    shapes: (_props, _variant, _size, _state = "default") => {
      // CardView는 순수 컨테이너 — 자식 Card가 실제 렌더링
      return [];
    },

    react: () => ({
      role: "grid",
      "aria-label": "Card collection",
    }),

    pixi: () => ({
      eventMode: "static" as const,
      cursor: "default",
    }),
  },
};
