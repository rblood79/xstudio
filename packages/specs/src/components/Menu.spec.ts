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
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";
import {
  Tag,
  PointerOff,
  List,
  AlignStartVertical,
  ArrowDown,
  ToggleRight,
} from "lucide-react";

/**
 * Menu Props (S2 기준)
 */
export interface MenuProps {
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

/**
 * Menu Component Spec (S2)
 *
 * Builder Canvas에서 Menu element는 트리거 버튼으로 렌더됨 (Button 파생).
 * Popover/MenuItem overlay는 런타임 오픈 시에만 표시. sizes는 Button과 정합.
 *
 * overlay: popover (포털, 배경 클릭으로 닫기)
 */
export const MenuSpec: ComponentSpec<MenuProps> = {
  name: "Menu",
  description: "React Aria 기반 드롭다운 메뉴 컴포넌트",
  archetype: "collection",
  element: "div",
  skipCSSGeneration: false,

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

  // @sync ButtonSpec.sizes — Menu는 Button 파생 트리거. padding/fontSize/lineHeight/iconSize 동일
  sizes: {
    xs: {
      height: 0,
      paddingX: 4,
      paddingY: 1,
      fontSize: "{typography.text-2xs}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      iconSize: 12,
      gap: 4,
      lineHeight: "{typography.text-2xs--line-height}" as TokenRef,
      borderWidth: 1,
      iconGap: 4,
    },
    sm: {
      height: 0,
      paddingX: 8,
      paddingY: 2,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      iconSize: 14,
      gap: 6,
      lineHeight: "{typography.text-xs--line-height}" as TokenRef,
      borderWidth: 1,
      iconGap: 6,
    },
    md: {
      height: 0,
      paddingX: 12,
      paddingY: 4,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      iconSize: 16,
      gap: 8,
      lineHeight: "{typography.text-sm--line-height}" as TokenRef,
      borderWidth: 1,
      iconGap: 8,
    },
    lg: {
      height: 0,
      paddingX: 16,
      paddingY: 8,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      iconSize: 20,
      gap: 10,
      lineHeight: "{typography.text-base--line-height}" as TokenRef,
      borderWidth: 1,
      iconGap: 10,
    },
    xl: {
      height: 0,
      paddingX: 24,
      paddingY: 12,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.xl}" as TokenRef,
      iconSize: 24,
      gap: 12,
      lineHeight: "{typography.text-lg--line-height}" as TokenRef,
      borderWidth: 1,
      iconGap: 12,
    },
  },

  states: {
    hover: {},
    focusVisible: {
      focusRing: "{focus.ring.default}",
    },
    disabled: {
      opacity: 0.38,
      pointerEvents: "none",
    },
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
            defaultValue: "start",
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
            defaultValue: "bottom",
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
            key: "shouldFlip",
            type: "boolean",
            label: "Should Flip",
            icon: ToggleRight,
            defaultValue: true,
          },
          { key: "isDisabled", type: "boolean", icon: PointerOff },
        ],
      },
    ],
  },

  render: {
    shapes: (props, size, state = "default") => {
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
          ? ("{color.neutral-hover}" as TokenRef)
          : state === "pressed"
            ? ("{color.neutral-pressed}" as TokenRef)
            : ("{color.neutral}" as TokenRef));

      const textColor = props.style?.color ?? ("{color.base}" as TokenRef);

      const borderColor =
        props.style?.borderColor ?? ("{color.border}" as TokenRef);

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

      const fontSize = resolveSpecFontSize(
        props.size ? size.fontSize : (props.style?.fontSize ?? size.fontSize),
        14,
      );
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
