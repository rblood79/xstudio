/**
 * SegmentedControl Component Spec
 *
 * iOS 스타일 세그먼트 전환 버튼 컴포넌트 (Spectrum 2)
 * Single Source of Truth - React와 Skia 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { resolveToken } from "../renderers/utils/tokenResolver";

/**
 * SegmentedControl Props
 */
export interface SegmentedControlProps {
  selectedKey?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  isJustified?: boolean;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * SegmentedControl Component Spec
 */
export const SegmentedControlSpec: ComponentSpec<SegmentedControlProps> = {
  name: "SegmentedControl",
  description: "iOS 스타일 세그먼트 전환 버튼 컴포넌트",
  element: "div",

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.neutral-subtle}" as TokenRef,
      backgroundHover: "{color.neutral-hover}" as TokenRef,
      backgroundPressed: "{color.neutral-pressed}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    xs: {
      height: 24,
      paddingX: 2,
      paddingY: 2,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      gap: 2,
    },
    sm: {
      height: 28,
      paddingX: 2,
      paddingY: 2,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      gap: 2,
    },
    md: {
      height: 32,
      paddingX: 3,
      paddingY: 3,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.xl}" as TokenRef,
      gap: 2,
    },
    lg: {
      height: 40,
      paddingX: 4,
      paddingY: 4,
      fontSize: "{typography.text-md}" as TokenRef,
      borderRadius: "{radius.xl}" as TokenRef,
      gap: 2,
    },
    xl: {
      height: 48,
      paddingX: 4,
      paddingY: 4,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.xl}" as TokenRef,
      gap: 4,
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

  render: {
    shapes: (props, variant, size, _state = "default") => {
      const bgColor = props.style?.backgroundColor ?? variant.background;

      const rawBr = props.style?.borderRadius ?? size.borderRadius;
      const br =
        typeof rawBr === "number" ? rawBr : resolveToken(rawBr as TokenRef);
      const resolvedBr = typeof br === "number" ? br : 8;

      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;

      const shapes: Shape[] = [
        // 컨테이너 배경
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
      ];

      if (hasChildren) return shapes;

      return shapes;
    },

    react: () => ({
      role: "radiogroup",
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ("none" as const) : ("static" as const),
      cursor: props.isDisabled ? "not-allowed" : "default",
    }),
  },
};
