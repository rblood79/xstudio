/**
 * ProgressCircle Component Spec
 *
 * React Aria 기반 원형 진행률 표시 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * Skia 렌더링: circle + stroke 방식으로 도넛 링 표현
 * - 외부 링: circle (fill=transparent, stroke=bgColor) → 트랙
 * - 내부 링: circle (fill=transparent, stroke=accentColor) → 진행 표시 (전체 원)
 * - 내부 채우기: circle (fill=bgFill) → 도넛 구멍 효과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, ArcShape, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";

/**
 * ProgressCircle Props
 */
export interface ProgressCircleProps {
  variant?: "default";
  size?: "sm" | "md" | "lg";
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
  sm: { diameter: 24, strokeWidth: 3 },
  md: { diameter: 32, strokeWidth: 3 },
  lg: { diameter: 64, strokeWidth: 4 },
};

/**
 * ProgressCircle Component Spec
 */
export const ProgressCircleSpec: ComponentSpec<ProgressCircleProps> = {
  name: "ProgressCircle",
  description: "React Aria 기반 원형 진행률 표시 컴포넌트",
  element: "div",

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.neutral-subtle}" as TokenRef,
      backgroundHover: "{color.neutral-subtle}" as TokenRef,
      backgroundPressed: "{color.neutral-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 24,
      width: 24,
      strokeWidth: 3,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 0,
    },
    md: {
      height: 32,
      width: 32,
      strokeWidth: 3,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 0,
    },
    lg: {
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
      const sizeName = props.size ?? "md";
      const dims =
        PROGRESSCIRCLE_DIMENSIONS[sizeName] ?? PROGRESSCIRCLE_DIMENSIONS.md;
      const diameter = dims.diameter;
      const outerRadius = diameter / 2;
      const cx = outerRadius;
      const cy = outerRadius;

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

      // 트랙 링: 외부 원에 stroke로 링 표현
      // strokeWidth만큼 안쪽으로 반지름을 줄여 외곽에 걸치지 않도록 보정
      const trackRadius = outerRadius - dims.strokeWidth / 2;

      // 트랙 배경 링 — arc(360°)로 렌더링하여 indicator arc와 동일 경로 사용
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
        strokeCap: "butt",
      } satisfies ArcShape & { id: string });

      if (props.isIndeterminate) {
        // Indeterminate: accent 색상 75% 호 (CSS에서 회전 애니메이션 처리)
        shapes.push({
          id: "indicator",
          type: "arc" as const,
          x: cx,
          y: cy,
          radius: trackRadius,
          startAngle: -90,
          sweepAngle: 270,
          strokeWidth: dims.strokeWidth,
          stroke: fillColor,
          strokeCap: "round",
        } satisfies ArcShape & { id: string });
      } else {
        // Determinate: value 비율만큼 호(arc)로 진행률 표현
        if (value > 0) {
          const sweepAngle = (value / 100) * 360;
          shapes.push({
            id: "indicator",
            type: "arc" as const,
            x: cx,
            y: cy,
            radius: trackRadius,
            startAngle: -90, // 12시 방향 시작
            sweepAngle,
            strokeWidth: dims.strokeWidth,
            stroke: fillColor,
            strokeCap: "round",
          } satisfies ArcShape & { id: string });
        }

        // value 텍스트 (L 사이즈에만 표시)
        if (sizeName === "lg") {
          shapes.push({
            id: "value-text",
            type: "text" as const,
            x: 0,
            y: 0,
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
