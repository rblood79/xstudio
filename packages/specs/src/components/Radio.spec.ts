/**
 * Radio Component Spec
 *
 * React Aria 기반 라디오 버튼 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveStateColors } from "../utils/stateEffect";
import { resolveToken } from "../renderers/utils/tokenResolver";

/**
 * Radio Props
 */
export interface RadioProps {
  variant?: "default" | "accent" | "neutral" | "negative";
  size?: "sm" | "md" | "lg";
  children?: string;
  label?: string;
  text?: string;
  value?: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/** variant별 비선택 시 ring 테두리 색상 (Skia shapes 전용) */
export const RADIO_RING_BORDER: Record<string, TokenRef> = {
  default: "{color.border-hover}" as TokenRef,
  accent: "{color.border-hover}" as TokenRef,
  neutral: "{color.border-hover}" as TokenRef,
  negative: "{color.negative}" as TokenRef,
};

/** variant별 선택 시 색상 */
export const RADIO_SELECTED_COLORS: Record<
  string,
  { ring: TokenRef; dot: TokenRef }
> = {
  default: {
    ring: "{color.accent}" as TokenRef,
    dot: "{color.accent}" as TokenRef,
  },
  accent: {
    ring: "{color.accent}" as TokenRef,
    dot: "{color.accent}" as TokenRef,
  },
  neutral: {
    ring: "{color.neutral-subtle}" as TokenRef,
    dot: "{color.neutral-subtle}" as TokenRef,
  },
  negative: {
    ring: "{color.negative}" as TokenRef,
    dot: "{color.negative}" as TokenRef,
  },
};

/** 사이즈별 원 크기 */
export const RADIO_DIMENSIONS: Record<
  string,
  { outer: number; inner: number }
> = {
  sm: { outer: 16, inner: 6 },
  md: { outer: 20, inner: 8 },
  lg: { outer: 24, inner: 10 },
};

/**
 * Radio Component Spec
 */
export const RadioSpec: ComponentSpec<RadioProps> = {
  name: "Radio",
  description: "React Aria 기반 라디오 버튼 컴포넌트",
  archetype: "toggle-indicator",
  element: "label",

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.layer-2}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    accent: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.layer-2}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    neutral: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.layer-2}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    negative: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.negative-subtle}" as TokenRef,
      backgroundPressed: "{color.negative-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 6,
    },
    md: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-md}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 8,
    },
    lg: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 10,
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
      outline: "2px solid var(--accent)",
      outlineOffset: "2px",
    },
  },

  render: {
    shapes: (props, variant, size, state = "default") => {
      const variantName = props.variant ?? "default";
      const sizeName = props.size ?? "md";
      const radioSize = RADIO_DIMENSIONS[sizeName] ?? RADIO_DIMENSIONS.md;
      const selectedColors =
        RADIO_SELECTED_COLORS[variantName] ?? RADIO_SELECTED_COLORS.default;
      const gap = size.gap ?? 8;
      const outerRadius = radioSize.outer / 2;

      // 사용자 스타일 우선
      const styleBw = props.style?.borderWidth;
      const borderWidth =
        styleBw != null
          ? typeof styleBw === "number"
            ? styleBw
            : parseFloat(String(styleBw)) || 0
          : 2;

      const ringBorder =
        RADIO_RING_BORDER[variantName] ?? RADIO_RING_BORDER.default;
      const borderColor =
        props.style?.borderColor ??
        (props.isSelected ? selectedColors.ring : ringBorder);

      const shapes: Shape[] = [];

      // 외곽 원 (테두리)
      shapes.push({
        id: "ring",
        type: "circle" as const,
        x: outerRadius,
        y: outerRadius,
        radius: outerRadius,
        fill: resolveStateColors(variant, state).background,
        fillAlpha: 0,
      });

      // 외곽 원 테두리
      shapes.push({
        type: "border" as const,
        target: "ring",
        borderWidth,
        color: borderColor,
        radius: outerRadius,
      });

      // 내부 원 (선택된 경우)
      if (props.isSelected) {
        shapes.push({
          type: "circle" as const,
          x: outerRadius,
          y: outerRadius,
          radius: radioSize.inner / 2,
          fill: selectedColors.dot,
        });
      }

      // 라벨 텍스트 — 자식 Element가 있으면 스킵 (TextSprite가 렌더링)
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      const labelText = props.children || props.label || props.text;
      if (!hasChildren && labelText) {
        const textColor = props.style?.color ?? variant.text;
        const rawFontSize = props.style?.fontSize ?? size.fontSize;
        const resolvedFs =
          typeof rawFontSize === "number"
            ? rawFontSize
            : typeof rawFontSize === "string" && rawFontSize.startsWith("{")
              ? resolveToken(rawFontSize as TokenRef)
              : rawFontSize;
        const fontSize = typeof resolvedFs === "number" ? resolvedFs : 16;
        const ff = (props.style?.fontFamily as string) || fontFamily.sans;
        const textAlign =
          (props.style?.textAlign as "left" | "center" | "right") || "left";

        shapes.push({
          type: "text" as const,
          x: radioSize.outer + gap,
          y: outerRadius,
          text: labelText,
          fontSize,
          fontFamily: ff,
          fill: textColor,
          align: textAlign,
          baseline: "middle" as const,
        });
      }

      return shapes;
    },

    react: (props) => ({
      "data-selected": props.isSelected || undefined,
      "aria-checked": props.isSelected || undefined,
    }),

    pixi: (props) => ({
      eventMode: "static" as const,
      cursor: props.isDisabled ? "not-allowed" : "pointer",
    }),
  },
};
