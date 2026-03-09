/**
 * ProgressCircle Component Spec
 *
 * React Aria 기반 원형 진행률 표시 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, ArcShape, TokenRef } from "../types";
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
      const trackRadius = radius - dims.strokeWidth / 2;

      // 트랙 배경 링 (360° stroke arc)
      shapes.push({
        id: "track",
        type: "arc" as const,
        x: cx,
        y: cy,
        radius: trackRadius,
        startAngle: 0,
        sweepAngle: 360,
        strokeWidth: dims.strokeWidth,
        stroke: bgColor,
      } as ArcShape & { id: string });

      if (props.isIndeterminate) {
        // Indeterminate: 75% arc (정적 표현, CSS에서 회전 애니메이션)
        shapes.push({
          id: "indeterminate-arc",
          type: "arc" as const,
          x: cx,
          y: cy,
          radius: trackRadius,
          startAngle: -90,
          sweepAngle: 270,
          strokeWidth: dims.strokeWidth,
          stroke: fillColor,
          strokeCap: "round" as const,
        } as ArcShape & { id: string });
      } else {
        // Determinate: value에 해당하는 arc
        const sweepAngle = (value / 100) * 360;
        if (sweepAngle > 0) {
          shapes.push({
            id: "value-arc",
            type: "arc" as const,
            x: cx,
            y: cy,
            radius: trackRadius,
            startAngle: -90,
            sweepAngle,
            strokeWidth: dims.strokeWidth,
            stroke: fillColor,
            strokeCap: "round" as const,
          } as ArcShape & { id: string });
        }

        // value 텍스트 (L 사이즈에만 표시)
        if (sizeName === "L") {
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
