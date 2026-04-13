/**
 * Tree Component Spec
 *
 * React Aria 기반 트리 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveStateColors } from "../utils/stateEffect";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";
import {
  Tag,
  FileText,
  FolderTree,
  Workflow,
  SquareX,
  PointerOff,
  ChevronsUpDown,
  Hash,
} from "lucide-react";

function parseCsvList(value: unknown): string[] {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Tree Props
 */
export interface TreeProps {
  variant?: "default" | "accent";
  size?: "sm" | "md" | "lg";
  label?: string;
  description?: string;
  selectionMode?: "none" | "single" | "multiple";
  selectionBehavior?: "replace" | "toggle";
  disallowEmptySelection?: boolean;
  selectedKeys?: string[];
  expandedKeys?: string[];
  defaultSelectedKeys?: string[];
  defaultExpandedKeys?: string[];
  isDisabled?: boolean;
  autoFocus?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * Tree Component Spec
 */
export const TreeSpec: ComponentSpec<TreeProps> = {
  name: "Tree",
  description: "React Aria 기반 트리 컴포넌트",
  element: "div",
  skipCSSGeneration: true,

  defaultVariant: "default",
  defaultSize: "md",

  properties: {
    sections: [
      {
        title: "Content",
        fields: [
          { key: "label", type: "string", label: "Label", icon: Tag },
          {
            key: "description",
            type: "string",
            label: "Description",
            icon: FileText,
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
            icon: FolderTree,
            options: [
              { value: "none", label: "None" },
              { value: "single", label: "Single" },
              { value: "multiple", label: "Multiple" },
            ],
            defaultValue: "none",
          },
          {
            key: "selectionBehavior",
            type: "enum",
            label: "Selection Behavior",
            icon: Workflow,
            options: [
              { value: "replace", label: "Replace" },
              { value: "toggle", label: "Toggle" },
            ],
            defaultValue: "toggle",
          },
          {
            key: "disallowEmptySelection",
            type: "boolean",
            label: "Disallow Empty Selection",
            icon: SquareX,
          },
          {
            key: "expandedKeys",
            type: "string",
            label: "Expanded Keys",
            icon: ChevronsUpDown,
            placeholder: "item1, item2, item3",
            derivedUpdateFn: (value) => ({
              expandedKeys: parseCsvList(value),
            }),
          },
          {
            key: "selectedKeys",
            type: "string",
            label: "Selected Keys",
            icon: Hash,
            placeholder: "item1, item2",
            derivedUpdateFn: (value) => ({
              selectedKeys: parseCsvList(value),
            }),
          },
          {
            key: "defaultExpandedKeys",
            type: "string",
            label: "Default Expanded Keys",
            icon: ChevronsUpDown,
            placeholder: "item1, item2",
            derivedUpdateFn: (value) => ({
              defaultExpandedKeys: parseCsvList(value),
            }),
          },
          {
            key: "defaultSelectedKeys",
            type: "string",
            label: "Default Selected Keys",
            icon: Hash,
            placeholder: "item1",
            derivedUpdateFn: (value) => ({
              defaultSelectedKeys: parseCsvList(value),
            }),
          },

          {
            key: "isDisabled",
            type: "boolean",
            label: "Disabled",
            icon: PointerOff,
          },
        ],
      },
      {
        title: "Item Management",
        fields: [
          {
            key: "items",
            type: "children-manager",
            label: "Tree Items",
            childTag: "TreeItem",
            defaultChildProps: {
              children: "Item",
              value: "",
            },
            labelProp: "children",
          },
        ],
      },
    ],
  },

  variants: {
    default: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.layer-2}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
    accent: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.accent-subtle}" as TokenRef,
      backgroundPressed: "{color.accent-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 28,
      paddingX: 8,
      paddingY: 4,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      iconSize: 14,
      gap: 2,
    },
    md: {
      height: 36,
      paddingX: 12,
      paddingY: 6,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      iconSize: 16,
      gap: 4,
    },
    lg: {
      height: 44,
      paddingX: 16,
      paddingY: 8,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      iconSize: 20,
      gap: 6,
    },
  },

  states: {
    hover: {},
    pressed: {},
    disabled: {
      opacity: 0.38,
      pointerEvents: "none",
    },
    focusVisible: {
      focusRing: "{focus.ring.default}",
    },
  },

  render: {
    shapes: (_props, variant, size, state = "default") => {
      const borderRadius = size.borderRadius;

      const ff = fontFamily.sans;
      const itemHeight = 32;
      const indent = 20;

      // Phase C: 기본 트리 아이템 (3레벨 중첩)
      const treeItems = [
        { label: "Root", level: 0, expanded: true },
        { label: "Documents", level: 1, expanded: true },
        { label: "file.txt", level: 2, expanded: false },
        { label: "readme.md", level: 2, expanded: false },
        { label: "Images", level: 1, expanded: false },
      ];

      const paddingY = (size.paddingY as unknown as number) || 8;

      const fontSize = resolveSpecFontSize(size.fontSize, 14);

      const totalHeight = paddingY * 2 + treeItems.length * itemHeight;

      const shapes: Shape[] = [
        // 배경
        {
          id: "bg",
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width: "auto",
          height: totalHeight,
          radius: borderRadius as unknown as number,
          fill: resolveStateColors(variant, state).background,
        },
        // 테두리
        {
          type: "border" as const,
          target: "bg",
          borderWidth: 1,
          color: variant.border || ("{color.border}" as TokenRef),
          radius: borderRadius as unknown as number,
        },
      ];

      // 트리 아이템 Shape 생성
      let y = paddingY;
      for (const item of treeItems) {
        const x = size.paddingX + item.level * indent;

        // expand/collapse 아이콘 (자식이 있는 경우)
        if (item.level < 2) {
          shapes.push({
            type: "icon_font" as const,
            iconName: item.expanded ? "chevron-down" : "chevron-right",
            x: x - 4,
            y: y + itemHeight / 2,
            fontSize: 14,
            fill: variant.text,
            strokeWidth: 2,
          });
        }

        // 아이템 텍스트
        shapes.push({
          type: "text" as const,
          x: x + 12,
          y: y + itemHeight / 2,
          text: item.label,
          fontSize,
          fontFamily: ff,
          fontWeight: item.level === 0 ? 600 : 400,
          fill: variant.text,
          align: "left" as const,
          baseline: "middle" as const,
        });

        y += itemHeight;
      }

      return shapes;
    },

    react: () => ({
      role: "tree",
    }),

    pixi: () => ({
      eventMode: "static" as const,
      cursor: "default",
    }),
  },
};
