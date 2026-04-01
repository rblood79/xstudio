/**
 * DisclosureGroup Component Spec
 *
 * React Aria 기반 디스클로저 그룹 (아코디언 그룹) 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { resolveStateColors } from "../utils/stateEffect";
import { ToggleLeft, PointerOff } from "lucide-react";

/**
 * DisclosureGroup Props
 */
export interface DisclosureGroupProps {
  variant?: "default" | "accent";
  size?: "sm" | "md" | "lg";
  allowsMultipleExpanded?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * DisclosureGroup Component Spec
 */
export const DisclosureGroupSpec: ComponentSpec<DisclosureGroupProps> = {
  name: "DisclosureGroup",
  description: "React Aria 기반 디스클로저 그룹 컴포넌트",
  element: "div",
  skipCSSGeneration: true,

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.base}" as TokenRef,
      backgroundPressed: "{color.base}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
    accent: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.base}" as TokenRef,
      backgroundPressed: "{color.base}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.accent}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 0,
    },
    md: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 0,
    },
    lg: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      gap: 0,
    },
  },

  states: {
    disabled: {
      opacity: 0.38,
      pointerEvents: "none",
    },
    focusVisible: {
      outline: "2px solid var(--accent)",
      outlineOffset: "2px",
    },
  },

  render: {
    shapes: (_props, variant, size, state = "default") => {
      const borderRadius = size.borderRadius;

      const hasChildren = !!(_props as Record<string, unknown>)._hasChildren;
      const shapes: Shape[] = [
        // 배경
        {
          id: "bg",
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width: "auto",
          height: "auto",
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
      if (hasChildren) return shapes;

      // 디스클로저 아이템 컨테이너 (standalone 전용)
      shapes.push({
        type: "container" as const,
        x: 0,
        y: 0,
        width: "auto",
        height: "auto",
        children: [],
        layout: {
          display: "flex",
          flexDirection: "column",
        },
      });

      return shapes;
    },

    react: () => ({
      role: "group",
    }),

    pixi: () => ({
      eventMode: "static" as const,
    }),
  },

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
};
