/**
 * CardView Component Spec
 *
 * Card 그리드/워터폴 컬렉션 레이아웃 컴포넌트 (Spectrum 2)
 * Single Source of Truth - React와 Skia 모두에서 동일한 시각적 결과
 *
 * ADR-104 (098-f 슬롯): `CardView` 이름은 RSP classic (`@react-spectrum/card/src/index.ts`)
 * + S2 (`CardView.tsx`) 공식 이름과 완전 일치. BC 재평가: `tag:"CardView"` factory 직렬화 확인
 * (`DisplayComponents.ts:753`) — BC HIGH. 대안 A (정당화 유지, 이름 일치 확증) 채택.
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
            defaultValue: "grid",
          },
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
            defaultValue: "regular",
          },
          {
            key: "columns",
            type: "number",
            label: "Columns",
            icon: Hash,
            defaultValue: 3,
          },
          {
            key: "gap",
            type: "number",
            label: "Gap",
            icon: Hash,
            defaultValue: 16,
          },
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
            defaultValue: "none",
          },
          {
            key: "selectionStyle",
            type: "enum",
            label: "Selection Style",
            icon: List,
            options: [
              { value: "checkbox", label: "Checkbox" },
              { value: "highlight", label: "Highlight" },
            ],
            defaultValue: "checkbox",
          },
        ],
      },
    ],
  },

  render: {
    shapes: (_props, _size, _state = "default") => {
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
