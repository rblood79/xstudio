/**
 * SliderOutput Component Spec
 *
 * React Aria 기반 슬라이더 값 출력 컴포넌트
 * Slider compound 컴포넌트의 child 요소 (현재 값 텍스트 표시)
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";

/**
 * SliderOutput Props
 */
export interface SliderOutputProps {
  size?: "sm" | "md" | "lg" | "xl";
  /** 표시할 값 텍스트 (포맷팅된 문자열) */
  children?: string;
  style?: Record<string, string | number | undefined>;
}

/**
 * SliderOutput Component Spec
 */
export const SliderOutputSpec: ComponentSpec<SliderOutputProps> = {
  name: "SliderOutput",
  description: "슬라이더 현재 값 텍스트 렌더링",
  element: "output",
  archetype: "simple",

  // ADR-083 Phase 11: simple archetype base 의 layout primitive 2 필드 리프팅.
  containerStyles: {
    display: "inline-flex",
    alignItems: "center",
  },
  skipCSSGeneration: false,

  defaultSize: "md",

  sizes: {
    sm: {
      height: 16,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      lineHeight: 16,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    md: {
      height: 20,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      lineHeight: 20,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    lg: {
      height: 24,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      lineHeight: 24,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    xl: {
      height: 28,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      lineHeight: 28,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
  },

  states: {
    hover: {},
    pressed: {},
    disabled: {
      opacity: 0.38,
    },
    focusVisible: {},
  },

  render: {
    shapes: (props, size) => {
      const text = props.children ?? "";
      if (!text) return [];

      const fontSize = resolveSpecFontSize(
        props.size ? size.fontSize : (props.style?.fontSize ?? size.fontSize),
        14,
      );

      const fwRaw = props.style?.fontWeight;
      const fontWeight =
        fwRaw != null
          ? typeof fwRaw === "number"
            ? fwRaw
            : parseInt(String(fwRaw), 10) || 500
          : 500;

      const ff = (props.style?.fontFamily as string) || fontFamily.sans;

      const textColor = props.style?.color ?? ("{color.neutral}" as TokenRef);

      const textAlign =
        (props.style?.textAlign as "left" | "center" | "right") || "right";

      const shapes: Shape[] = [
        {
          type: "text" as const,
          x: 0,
          y: 0,
          text,
          fontSize,
          fontFamily: ff,
          fontWeight,
          fill: textColor,
          align: textAlign,
          baseline: "top" as const,
        },
      ];

      return shapes;
    },

    react: () => ({
      "aria-live": "off",
    }),

    pixi: () => ({
      eventMode: "none" as const,
    }),
  },
};
