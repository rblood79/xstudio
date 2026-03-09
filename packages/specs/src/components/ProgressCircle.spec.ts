/**
 * ProgressCircle Component Spec
 *
 * React Aria 기반 원형 진행률 표시 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";

/**
 * ProgressCircle Props
 */
export interface ProgressCircleProps {
  variant?: "default";
  size?: "S" | "M" | "L";
  value?: number;
  isIndeterminate?: boolean;
  isDisabled?: boolean;
  staticColor?: "white" | "black";
  style?: Record<string, string | number | undefined>;
}

/** variant별 채우기 색상 */
export const PROGRESSCIRCLE_FILL_COLORS: Record<string, TokenRef> = {
  default: "{color.accent}" as TokenRef,
};

/** 사이즈별 원형 치수 */
export const PROGRESSCIRCLE_DIMENSIONS: Record<
  string,
  { diameter: number; strokeWidth: number }
> = {
  S: { diameter: 24, strokeWidth: 3 },
  M: { diameter: 32, strokeWidth: 3 },
  L: { diameter: 64, strokeWidth: 4 },
};

/**
 * ProgressCircle Component Spec
 */
export const ProgressCircleSpec: ComponentSpec<ProgressCircleProps> = {
  name: "ProgressCircle",
  description: "React Aria 기반 원형 진행률 표시 컴포넌트",
  element: "div",

  defaultVariant: "default",
  defaultSize: "M",

  variants: {
    default: {
      background: "{color.neutral-subtle}" as TokenRef,
      backgroundHover: "{color.neutral-subtle}" as TokenRef,
      backgroundPressed: "{color.neutral-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    S: {
      height: 24,
      width: 24,
      strokeWidth: 3,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 0,
    },
    M: {
      height: 32,
      width: 32,
      strokeWidth: 3,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 0,
    },
    L: {
      height: 64,
      width: 64,
      strokeWidth: 4,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-md}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
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

  render: {
    shapes: (props, variant, size, _state = "default") => {
      const sizeName = props.size ?? "M";
      const dims =
        PROGRESSCIRCLE_DIMENSIONS[sizeName] ?? PROGRESSCIRCLE_DIMENSIONS.M;
      const diameter = (props.style?.width as number) || dims.diameter;
      const radius = diameter / 2;
      const cx = radius;
      const cy = radius;

      const variantName = props.variant ?? "default";
      const fillColor =
        PROGRESSCIRCLE_FILL_COLORS[variantName] ??
        PROGRESSCIRCLE_FILL_COLORS.default;

      const bgColor = props.style?.backgroundColor ?? variant.background;
      const textColor = props.style?.color ?? variant.text;

      const rawFontSize = props.style?.fontSize ?? size.fontSize;
      const resolvedFs =
        typeof rawFontSize === "number"
          ? rawFontSize
          : typeof rawFontSize === "string" && rawFontSize.startsWith("{")
            ? resolveToken(rawFontSize as TokenRef)
            : rawFontSize;
      const fontSize = typeof resolvedFs === "number" ? resolvedFs : 12;
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;

      const value = Math.max(0, Math.min(100, props.value ?? 0));

      // Child Composition: 자식 Element가 있으면 스킵
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) {
        return [];
      }

      const shapes: Shape[] = [];

      // 트랙 배경 원
      shapes.push({
        id: "track",
        type: "circle" as const,
        x: cx,
        y: cy,
        radius,
        fill: bgColor,
      });

      // 내부 빈 원 (도넛 효과를 위한 컷아웃 - 단순 구현으로 내부 원을 배경색으로)
      const innerRadius = radius - dims.strokeWidth;
      if (innerRadius > 0) {
        shapes.push({
          id: "inner",
          type: "circle" as const,
          x: cx,
          y: cy,
          radius: innerRadius,
          fill: "{color.layer-1}" as TokenRef,
        });
      }

      // value 텍스트 (determinate 모드, L 사이즈에만 표시)
      if (!props.isIndeterminate && sizeName === "L") {
        shapes.push({
          id: "value-text",
          type: "text" as const,
          x: cx,
          y: cy,
          text: `${Math.round(value)}%`,
          fontSize,
          fontFamily: ff,
          fill: textColor,
          align: "center" as const,
          baseline: "middle" as const,
        });
      }

      // Indeterminate: 강조 원 표시 (정적 표현, arc 구현은 CSS에서 처리)
      if (props.isIndeterminate) {
        shapes.push({
          id: "indeterminate-arc",
          type: "circle" as const,
          x: cx,
          y: cy,
          radius: radius - dims.strokeWidth,
          fill: fillColor,
          fillAlpha: 0.3,
        });
      }

      return shapes;
    },

    react: (props) => ({
      role: "progressbar",
      "aria-valuemin": 0,
      "aria-valuemax": 100,
      "aria-valuenow": props.isIndeterminate ? undefined : (props.value ?? 0),
      "data-indeterminate": props.isIndeterminate || undefined,
    }),

    pixi: (props) => ({
      eventMode: "static" as const,
      cursor: props.isDisabled ? "not-allowed" : "default",
    }),
  },
};
