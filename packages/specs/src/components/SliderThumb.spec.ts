/**
 * SliderThumb Component Spec
 *
 * React Aria 기반 슬라이더 썸(핸들) 컴포넌트
 * Slider compound 컴포넌트의 child 요소 (드래그 가능한 원형 핸들)
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { SLIDER_FILL_COLORS, SLIDER_DIMENSIONS } from "./Slider.spec";

/**
 * SliderThumb Props
 */
export interface SliderThumbProps {
  variant?: "default" | "accent" | "neutral";
  size?: "S" | "M" | "L";
  /** 트랙 내 위치 계산용 (0-100 퍼센트) */
  value?: number;
  minValue?: number;
  maxValue?: number;
  isDisabled?: boolean;
  isDragging?: boolean;
  style?: Record<string, string | number | undefined>;
}

/** 사이즈별 썸 치수 */
export const SLIDER_THUMB_SIZES: Record<string, { thumbSize: number }> = {
  S: { thumbSize: 16 },
  M: { thumbSize: 20 },
  L: { thumbSize: 24 },
};

/**
 * SliderThumb Component Spec
 */
export const SliderThumbSpec: ComponentSpec<SliderThumbProps> = {
  name: "SliderThumb",
  description: "슬라이더 드래그 핸들 (원형) 렌더링",
  element: "div",

  defaultVariant: "default",
  defaultSize: "M",

  variants: {
    default: {
      background: "{color.accent}" as TokenRef,
      backgroundHover: "{color.accent}" as TokenRef,
      backgroundPressed: "{color.accent}" as TokenRef,
      text: "{color.on-accent}" as TokenRef,
    },
    accent: {
      background: "{color.accent}" as TokenRef,
      backgroundHover: "{color.accent}" as TokenRef,
      backgroundPressed: "{color.accent}" as TokenRef,
      text: "{color.on-accent}" as TokenRef,
    },
    neutral: {
      background: "{color.neutral-subtle}" as TokenRef,
      backgroundHover: "{color.neutral-subtle}" as TokenRef,
      backgroundPressed: "{color.neutral-subtle}" as TokenRef,
      text: "{color.white}" as TokenRef,
    },
  },

  sizes: {
    S: {
      height: 16,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 0,
    },
    M: {
      height: 20,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 0,
    },
    L: {
      height: 24,
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
      cursor: "not-allowed",
      pointerEvents: "none",
    },
    focusVisible: {
      outline: "2px solid var(--highlight-background)",
      outlineOffset: "2px",
    },
  },

  render: {
    shapes: (props, _variant) => {
      const sizeName = props.size ?? "M";
      // SLIDER_DIMENSIONS와 SLIDER_THUMB_SIZES 모두 참조해 일관성 유지
      const sliderDims = SLIDER_DIMENSIONS[sizeName] ?? SLIDER_DIMENSIONS.M;
      const thumbSize = sliderDims.thumbSize;
      const thumbRadius = thumbSize / 2;

      const variantName = props.variant ?? "default";
      const fillColors =
        SLIDER_FILL_COLORS[variantName] ?? SLIDER_FILL_COLORS.default;

      const fillColor = props.style?.backgroundColor ?? fillColors.handle;

      const shapes: Shape[] = [
        // 썸 원형
        {
          id: "thumb",
          type: "circle" as const,
          x: thumbRadius,
          y: thumbRadius,
          radius: thumbRadius,
          fill: fillColor,
        },
        // 흰 외곽 테두리
        {
          type: "border" as const,
          target: "thumb",
          borderWidth: 2,
          color: "{color.base}" as TokenRef,
          radius: thumbRadius,
        },
      ];

      return shapes;
    },

    react: (props) => ({
      role: "slider",
      "aria-valuemin": props.minValue ?? 0,
      "aria-valuemax": props.maxValue ?? 100,
      "aria-valuenow": props.value ?? 50,
      "data-disabled": props.isDisabled || undefined,
      "data-dragging": props.isDragging || undefined,
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ("none" as const) : ("static" as const),
      cursor: props.isDisabled ? "not-allowed" : "grab",
    }),
  },
};
