/**
 * TableView Component Spec
 *
 * 강화된 Table 컴포넌트 (정렬, 컬럼 리사이즈, DnD) (Spectrum 2)
 * Single Source of Truth - React와 Skia 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { resolveToken } from "../renderers/utils/tokenResolver";
import { Layout, ToggleLeft, Columns } from "lucide-react";

/**
 * TableView Props
 */
export interface TableViewProps {
  density?: "compact" | "regular" | "spacious";
  overflowMode?: "wrap" | "truncate";
  selectionMode?: "none" | "single" | "multiple";
  allowsResizingColumns?: boolean;
  allowsSorting?: boolean;
  isStriped?: boolean;
  isQuiet?: boolean;
  style?: Record<string, string | number | undefined>;
}

/** density별 행 높이 */
export const TABLEVIEW_ROW_HEIGHTS: Record<string, number> = {
  compact: 32,
  regular: 40,
  spacious: 48,
};

/**
 * TableView Component Spec
 */
export const TableViewSpec: ComponentSpec<TableViewProps> = {
  name: "TableView",
  description: "강화된 Table — 정렬, 컬럼 리사이즈, 밀도 조절",
  element: "div",

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.layer-1}" as TokenRef,
      backgroundHover: "{color.neutral-subtle}" as TokenRef,
      backgroundPressed: "{color.neutral-pressed}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
    quiet: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.neutral-subtle}" as TokenRef,
      backgroundPressed: "{color.neutral-pressed}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.transparent}" as TokenRef,
    },
  },

  sizes: {
    md: {
      height: "auto" as unknown as number,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 0,
    },
  },

  states: {
    hover: {},
    pressed: {},
    disabled: {
      opacity: 0.38,
      pointerEvents: "none",
    },
    focusVisible: {},
  },

  properties: {
    sections: [
      {
        title: "Appearance",
        fields: [
          {
            key: "density",
            type: "enum",
            label: "Density",
            icon: Layout,
            options: [
              { value: "compact", label: "Compact" },
              { value: "regular", label: "Regular" },
              { value: "spacious", label: "Spacious" },
            ],
          },
          {
            key: "overflowMode",
            type: "enum",
            label: "Overflow Mode",
            icon: Columns,
            options: [
              { value: "truncate", label: "Truncate" },
              { value: "wrap", label: "Wrap" },
            ],
          },
          { key: "isQuiet", type: "boolean", label: "Quiet", icon: ToggleLeft },
          {
            key: "isStriped",
            type: "boolean",
            label: "Striped",
            icon: ToggleLeft,
          },
        ],
      },
      {
        title: "Selection",
        fields: [
          {
            key: "selectionMode",
            type: "enum",
            label: "Selection Mode",
            options: [
              { value: "none", label: "None" },
              { value: "single", label: "Single" },
              { value: "multiple", label: "Multiple" },
            ],
          },
        ],
      },
      {
        title: "Features",
        fields: [
          { key: "allowsSorting", type: "boolean", label: "Allow Sorting" },
          {
            key: "allowsResizingColumns",
            type: "boolean",
            label: "Allow Resizing Columns",
          },
        ],
      },
    ],
  },

  render: {
    shapes: (props, variant, size, _state = "default") => {
      const bgColor = props.style?.backgroundColor ?? variant.background;
      const borderColor = variant.border ?? ("{color.border}" as TokenRef);

      const rawBr = props.style?.borderRadius ?? size.borderRadius;
      const br =
        typeof rawBr === "number" ? rawBr : resolveToken(rawBr as TokenRef);
      const resolvedBr = typeof br === "number" ? br : 6;

      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;

      const shapes: Shape[] = [
        // 테이블 래퍼 배경
        {
          id: "bg",
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width: "auto",
          height: "auto" as unknown as number,
          radius: resolvedBr,
          fill: bgColor,
        },
        // 테두리
        {
          type: "border" as const,
          target: "bg",
          borderWidth: props.isQuiet ? 0 : 1,
          color: borderColor,
          radius: resolvedBr,
        },
      ];

      if (hasChildren) return shapes;

      return shapes;
    },

    react: () => ({
      role: "grid",
    }),

    pixi: () => ({
      eventMode: "static" as const,
      cursor: "default",
    }),
  },
};
