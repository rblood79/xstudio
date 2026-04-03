/**
 * Menu Component Spec
 *
 * React Aria 기반 메뉴 컴포넌트 (S2 패턴)
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";
import {
  Tag,
  PointerOff,
  Focus,
  List,
  AlignStartVertical,
  ArrowDown,
  ToggleRight,
  ToggleLeft,
} from "lucide-react";

/**
 * Menu Props (S2 기준)
 */
export interface MenuProps {
  variant?: "primary" | "secondary" | "accent" | "negative";
  size?: "sm" | "md" | "lg" | "xl";
  align?: "start" | "end";
  direction?: "bottom" | "top" | "left" | "right";
  selectionMode?: "none" | "single" | "multiple";
  shouldFlip?: boolean;
  isQuiet?: boolean;
  isDisabled?: boolean;
  children?: string;
  style?: Record<string, string | number | undefined>;
}

/** S2 size별 MenuItem 치수 */
export const MENU_ITEM_DIMENSIONS: Record<
  string,
  { minHeight: number; edgeToText: number; iconSize: number }
> = {
  sm: { minHeight: 24, edgeToText: 9, iconSize: 14 },
  md: { minHeight: 32, edgeToText: 12, iconSize: 20 },
  lg: { minHeight: 40, edgeToText: 15, iconSize: 20 },
  xl: { minHeight: 48, edgeToText: 18, iconSize: 20 },
};

/**
 * Menu Component Spec (S2)
 *
 * overlay: popover (포털, 배경 클릭으로 닫기)
 */
export const MenuSpec: ComponentSpec<MenuProps> = {
  name: "Menu",
  description: "React Aria 기반 드롭다운 메뉴 컴포넌트",
  archetype: "collection",
  element: "div",
  skipCSSGeneration: true,

  defaultVariant: "primary",
  defaultSize: "md",

  overlay: {
    usePortal: true,
    type: "popover",
    hasBackdrop: false,
    closeOnBackdropClick: true,
    closeOnEscape: true,
    trapFocus: true,
    pixiLayer: "overlay",
  },

  variants: {
    primary: {
      background: "{color.neutral}" as TokenRef,
      backgroundHover: "{color.neutral-hover}" as TokenRef,
      backgroundPressed: "{color.neutral-pressed}" as TokenRef,
      text: "{color.base}" as TokenRef,
      border: "{color.neutral}" as TokenRef,
    },
    secondary: {
      background: "{color.layer-1}" as TokenRef,
      backgroundHover: "{color.neutral-subtle}" as TokenRef,
      backgroundPressed: "{color.neutral-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
    accent: {
      background: "{color.accent}" as TokenRef,
      backgroundHover: "{color.accent-hover}" as TokenRef,
      backgroundPressed: "{color.accent-pressed}" as TokenRef,
      text: "{color.on-accent}" as TokenRef,
      border: "{color.accent}" as TokenRef,
    },
    negative: {
      background: "{color.negative}" as TokenRef,
      backgroundHover: "{color.negative-hover}" as TokenRef,
      backgroundPressed: "{color.negative-pressed}" as TokenRef,
      text: "{color.on-negative}" as TokenRef,
      border: "{color.negative}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 8,
      paddingY: 2,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      lineHeight: "{typography.text-xs--line-height}" as TokenRef,
      borderWidth: 1,
      gap: 6,
    },
    md: {
      height: 0,
      paddingX: 12,
      paddingY: 4,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      lineHeight: "{typography.text-sm--line-height}" as TokenRef,
      borderWidth: 1,
      gap: 8,
    },
    lg: {
      height: 0,
      paddingX: 16,
      paddingY: 8,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      lineHeight: "{typography.text-base--line-height}" as TokenRef,
      borderWidth: 1,
      gap: 10,
    },
    xl: {
      height: 0,
      paddingX: 24,
      paddingY: 12,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.xl}" as TokenRef,
      lineHeight: "{typography.text-lg--line-height}" as TokenRef,
      borderWidth: 1,
      gap: 12,
    },
  },

  states: {
    hover: {},
    focusVisible: {
      outline: "2px solid var(--focus-ring)",
      outlineOffset: "2px",
    },
    disabled: {
      opacity: 0.38,
      pointerEvents: "none",
    },
  },

  propagation: {
    rules: [{ parentProp: "size", childPath: "MenuItem", override: true }],
  },

  properties: {
    sections: [
      {
        title: "Content",
        fields: [
          {
            key: "children",
            type: "string",
            label: "Text",
            icon: Tag,
            placeholder: "Menu",
          },
        ],
      },
      {
        title: "Appearance",
        fields: [
          { type: "variant" },
          { type: "size" },
          {
            key: "align",
            type: "enum",
            label: "Align",
            icon: AlignStartVertical,
            options: [
              { value: "start", label: "Start" },
              { value: "end", label: "End" },
            ],
          },
          {
            key: "direction",
            type: "enum",
            label: "Direction",
            icon: ArrowDown,
            options: [
              { value: "bottom", label: "Bottom" },
              { value: "top", label: "Top" },
              { value: "left", label: "Left" },
              { value: "right", label: "Right" },
            ],
          },
          {
            key: "isQuiet",
            type: "boolean",
            label: "Quiet",
            icon: ToggleLeft,
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
          },
          {
            key: "shouldFlip",
            type: "boolean",
            label: "Should Flip",
            icon: ToggleRight,
          },
          {
            key: "autoFocus",
            type: "boolean",
            label: "Auto Focus",
            icon: Focus,
          },
          { key: "isDisabled", type: "boolean", icon: PointerOff },
        ],
      },
      {
        title: "Item Management",
        fields: [
          {
            key: "items",
            type: "children-manager",
            label: "Menu Items",
            childTag: "MenuItem",
            defaultChildProps: { children: "Menu Item", textValue: "" },
            labelProp: "children",
          },
        ],
      },
    ],
  },

  render: {
    shapes: (props, variant, size, state = "default") => {
      const width = "auto" as const;

      const styleBr = props.style?.borderRadius;
      const borderRadius =
        styleBr != null
          ? typeof styleBr === "number"
            ? styleBr
            : parseFloat(String(styleBr)) || 0
          : size.borderRadius;
      const styleBw = props.style?.borderWidth;
      const borderWidth =
        styleBw != null
          ? typeof styleBw === "number"
            ? styleBw
            : parseFloat(String(styleBw)) || 0
          : 1;

      const bgColor =
        props.style?.backgroundColor ??
        (state === "hover"
          ? variant.backgroundHover
          : state === "pressed"
            ? variant.backgroundPressed
            : variant.background);

      const textColor = props.style?.color ?? variant.text;

      const borderColor =
        props.style?.borderColor ??
        (variant.border || ("{color.border}" as TokenRef));

      const shapes: Shape[] = [
        {
          id: "bg",
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width,
          height: "auto" as unknown as number,
          radius: borderRadius as unknown as number,
          fill: bgColor,
        },
        {
          type: "border" as const,
          target: "bg",
          borderWidth,
          color: borderColor,
          radius: borderRadius as unknown as number,
        },
      ];

      // Menu는 트리거 버튼이므로 자식(MenuItem) 유무와 무관하게 항상 텍스트 렌더링
      const text = props.children || "Menu";

      const rawFontSize = props.size
        ? size.fontSize
        : (props.style?.fontSize ?? size.fontSize);
      const resolvedFs =
        typeof rawFontSize === "number"
          ? rawFontSize
          : typeof rawFontSize === "string" && rawFontSize.startsWith("{")
            ? resolveToken(rawFontSize as TokenRef)
            : rawFontSize;
      const fontSize = typeof resolvedFs === "number" ? resolvedFs : 14;
      const fwRaw = props.style?.fontWeight;
      const fw =
        fwRaw != null
          ? typeof fwRaw === "number"
            ? fwRaw
            : parseInt(String(fwRaw), 10) || 500
          : 500;
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;
      const paddingX = size.paddingX;

      shapes.push({
        type: "text" as const,
        x: paddingX,
        y: 0,
        text,
        fontSize,
        fontFamily: ff,
        fontWeight: fw,
        fill: textColor,
        align: "left" as const,
        baseline: "middle" as const,
      });

      return shapes;
    },

    react: (props) => ({
      role: "menu",
      "data-disabled": props.isDisabled || undefined,
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ("none" as const) : ("static" as const),
    }),
  },
};
