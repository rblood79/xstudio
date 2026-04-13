/**
 * DateSegment Component Spec
 *
 * React Aria 기반 날짜/시간 세그먼트 컴포넌트
 * DateField, TimeField compound 컴포넌트의 child 요소
 * TimeSegment도 동일한 spec으로 재사용
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";

/**
 * 세그먼트 타입 - 날짜 또는 시간 단위
 */
export type DateSegmentType =
  | "month"
  | "day"
  | "year"
  | "hour"
  | "minute"
  | "second"
  | "dayPeriod"
  | "era"
  | "literal";

/**
 * DateSegment Props
 */
export interface DateSegmentProps {
  variant?: "default" | "accent" | "negative";
  size?: "sm" | "md" | "lg";
  /** 세그먼트 타입 (month, day, year, hour, minute, second 등) */
  segmentType?: DateSegmentType;
  /** 표시할 값 (숫자 또는 텍스트) */
  value?: string | number;
  /** placeholder (값이 없을 때 표시) */
  placeholder?: string;
  /** 현재 세그먼트가 포커스 상태인지 */
  isFocused?: boolean;
  /** 읽기 전용 여부 (literal 세그먼트: /, : 등) */
  isLiteral?: boolean;
  isDisabled?: boolean;
  /** ElementSprite 주입: 엔진 계산 최종 폭 */
  _containerWidth?: number;
  style?: Record<string, string | number | undefined>;
}

/**
 * DateSegment Component Spec
 * TimeSegment에서도 동일하게 재사용
 */
export const DateSegmentSpec: ComponentSpec<DateSegmentProps> = {
  name: "DateSegment",
  description: "날짜/시간 세그먼트 박스 렌더링 (DateField, TimeField 공용)",
  element: "div",
  archetype: "simple",
  skipCSSGeneration: true,

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.layer-2}" as TokenRef,
      backgroundHover: "{color.layer-2}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
      borderHover: "{color.border-hover}" as TokenRef,
    },
    accent: {
      background: "{color.accent-subtle}" as TokenRef,
      backgroundHover: "{color.accent-subtle}" as TokenRef,
      backgroundPressed: "{color.accent-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.accent}" as TokenRef,
      borderHover: "{color.accent}" as TokenRef,
    },
    negative: {
      background: "{color.negative-subtle}" as TokenRef,
      backgroundHover: "{color.negative-subtle}" as TokenRef,
      backgroundPressed: "{color.negative-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.negative}" as TokenRef,
      borderHover: "{color.negative}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 24,
      paddingX: 4,
      paddingY: 2,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      gap: 0,
    },
    md: {
      height: 32,
      paddingX: 6,
      paddingY: 4,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      gap: 0,
    },
    lg: {
      height: 40,
      paddingX: 8,
      paddingY: 6,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
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
      focusRing: "{focus.ring.default}",
    },
  },

  render: {
    shapes: (props, size, state = "default") => {
      const variant = DateSegmentSpec.variants![(props as { variant?: keyof typeof DateSegmentSpec.variants }).variant ?? DateSegmentSpec.defaultVariant!];
      // literal 세그먼트(/, : 등)는 배경 없이 텍스트만 렌더링
      if (props.isLiteral) {
        const literalText = String(props.value ?? props.placeholder ?? "");
        if (!literalText) return [];

        const fontSize = resolveSpecFontSize(props.size ? size.fontSize : (props.style?.fontSize ?? size.fontSize), 14);
        const ff = (props.style?.fontFamily as string) || fontFamily.mono;

        return [
          {
            type: "text" as const,
            x: 2,
            y: 0,
            text: literalText,
            fontSize,
            fontFamily: ff,
            fontWeight: 400,
            fill: variant.text,
            align: "center" as const,
            baseline: "middle" as const,
          },
        ];
      }

      const styleBr = props.style?.borderRadius;
      const borderRadius =
        styleBr != null
          ? typeof styleBr === "number"
            ? styleBr
            : parseFloat(String(styleBr)) || 0
          : (size.borderRadius as unknown as number);

      const width =
        typeof props._containerWidth === "number" && props._containerWidth > 0
          ? props._containerWidth
          : (props.style?.width as number) || 32;
      const height = size.height;

      // 포커스 시 primary 배경, 기본은 반투명 표면 색상
      const bgColor =
        props.style?.backgroundColor ??
        (props.isFocused
          ? ("{color.accent-subtle}" as TokenRef)
          : state === "hover"
            ? variant.backgroundHover
            : variant.background);

      const bgAlpha = props.isFocused ? 1.0 : 0.7;

      const fontSize = resolveSpecFontSize(props.size ? size.fontSize : (props.style?.fontSize ?? size.fontSize), 14);

      const fwRaw = props.style?.fontWeight;
      const fontWeight =
        fwRaw != null
          ? typeof fwRaw === "number"
            ? fwRaw
            : parseInt(String(fwRaw), 10) || 400
          : 400;

      const ff = (props.style?.fontFamily as string) || fontFamily.mono;

      const displayText = String(
        props.value ??
          props.placeholder ??
          (props as Record<string, unknown>).children ??
          "",
      );
      const textColor =
        props.style?.color ??
        (props.isFocused
          ? ("{color.neutral}" as TokenRef)
          : props.value != null
            ? variant.text
            : ("{color.neutral-subdued}" as TokenRef));

      const stylePx =
        props.style?.paddingLeft ??
        props.style?.paddingRight ??
        props.style?.padding;
      const paddingX =
        stylePx != null
          ? typeof stylePx === "number"
            ? stylePx
            : parseFloat(String(stylePx)) || 0
          : size.paddingX;

      const shapes: Shape[] = [
        // 세그먼트 배경 (반투명)
        {
          id: "bg",
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width,
          height,
          radius: borderRadius,
          fill: bgColor,
          fillAlpha: bgAlpha,
        },
      ];

      // 텍스트 렌더링 (값 또는 placeholder)
      if (displayText) {
        shapes.push({
          type: "text" as const,
          x: paddingX,
          y: 0,
          text: displayText,
          fontSize,
          fontFamily: ff,
          fontWeight,
          fill: textColor,
          align: "center" as const,
          baseline: "middle" as const,
        });
      }

      return shapes;
    },

    react: (props) => ({
      role: "spinbutton",
      "aria-label": props.segmentType,
      "data-type": props.segmentType,
      "data-focused": props.isFocused || undefined,
      "data-disabled": props.isDisabled || undefined,
      "data-placeholder": props.value == null || undefined,
    }),

    pixi: (props) => ({
      eventMode:
        props.isDisabled || props.isLiteral
          ? ("none" as const)
          : ("static" as const),
      cursor: props.isDisabled ? "not-allowed" : "text",
    }),
  },
};
