/**
 * Input Component Spec
 *
 * React Aria 기반 기본 입력 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";

/**
 * Input Props
 */
export interface InputProps {
  variant?: "default" | "accent" | "negative";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  value?: string;
  placeholder?: string;
  label?: string;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  isInvalid?: boolean;
  /** ElementSprite 주입: 엔진 계산 최종 폭 */
  _containerWidth?: number;
  style?: Record<string, string | number | undefined>;
}

/**
 * Input Component Spec
 */
export const InputSpec: ComponentSpec<InputProps> = {
  name: "Input",
  description: "React Aria 기반 기본 입력 컴포넌트",
  element: "input",
  archetype: "input-base",

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.layer-2}" as TokenRef,
      backgroundHover: "{color.layer-1}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
      borderHover: "{color.border-hover}" as TokenRef,
    },
    accent: {
      background: "{color.layer-2}" as TokenRef,
      backgroundHover: "{color.layer-1}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.accent}" as TokenRef,
      borderHover: "{color.accent-hover}" as TokenRef,
    },
    negative: {
      background: "{color.layer-2}" as TokenRef,
      backgroundHover: "{color.layer-1}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.negative}" as TokenRef,
      borderHover: "{color.negative-hover}" as TokenRef,
    },
  },

  // @sync BUTTON_SIZE_CONFIG (utils.ts) — Input height = Button height
  // CSS height = lineHeight + paddingY×2 + borderWidth×2 (명시적 height 없음)
  // xs: 16 + 1×2 + 1×2 = 20, sm: 16 + 2×2 + 1×2 = 22, md: 20 + 4×2 + 1×2 = 30
  // lg: 24 + 8×2 + 1×2 = 42, xl: 28 + 12×2 + 1×2 = 54
  sizes: {
    xs: {
      height: 20,
      paddingX: 4,
      paddingY: 1,
      fontSize: "{typography.text-2xs}" as TokenRef,
      borderRadius: "{radius.xs}" as TokenRef,
      gap: 2,
    },
    sm: {
      height: 22,
      paddingX: 8,
      paddingY: 2,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      gap: 4,
    },
    md: {
      height: 30,
      paddingX: 12,
      paddingY: 4,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 6,
    },
    lg: {
      height: 42,
      paddingX: 16,
      paddingY: 8,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      gap: 8,
    },
    xl: {
      height: 54,
      paddingX: 24,
      paddingY: 12,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.xl}" as TokenRef,
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
      const width =
        typeof props._containerWidth === "number" && props._containerWidth > 0
          ? props._containerWidth
          : (props.style?.width as number) || 200;
      const height = size.height;

      const styleBr = props.style?.borderRadius;
      const borderRadius =
        styleBr != null
          ? typeof styleBr === "number"
            ? styleBr
            : parseFloat(String(styleBr)) || 0
          : (size.borderRadius as unknown as number);

      const bgColor = props.style?.backgroundColor ?? variant.background;

      const borderColor =
        props.style?.borderColor ??
        (state === "hover" && variant.borderHover
          ? variant.borderHover
          : variant.border);

      const styleBw = props.style?.borderWidth;
      const borderWidth =
        styleBw != null
          ? typeof styleBw === "number"
            ? styleBw
            : parseFloat(String(styleBw)) || 0
          : 1;

      const rawFontSize = props.size
        ? size.fontSize
        : (props.style?.fontSize ?? size.fontSize);
      const resolvedFs =
        typeof rawFontSize === "number"
          ? rawFontSize
          : typeof rawFontSize === "string" && rawFontSize.startsWith("{")
            ? resolveToken(rawFontSize as TokenRef)
            : rawFontSize;
      const fontSize = typeof resolvedFs === "number" ? resolvedFs : 16;

      const fwRaw = props.style?.fontWeight;
      const fontWeight =
        fwRaw != null
          ? typeof fwRaw === "number"
            ? fwRaw
            : parseInt(String(fwRaw), 10) || 400
          : 400;

      const ff = (props.style?.fontFamily as string) || fontFamily.sans;

      const textAlign =
        (props.style?.textAlign as "left" | "center" | "right") || "left";

      const textColor =
        props.style?.color ??
        (props.value ? variant.text : ("{color.neutral-subdued}" as TokenRef));

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
        // 배경
        {
          id: "bg",
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width,
          height,
          radius: borderRadius,
          fill: bgColor,
        },
        // 테두리
        {
          type: "border" as const,
          target: "bg",
          borderWidth,
          color: borderColor ?? ("{color.border-hover}" as TokenRef),
          radius: borderRadius,
        },
      ];

      // 텍스트
      const text = props.value || props.placeholder || "";
      if (text) {
        shapes.push({
          type: "text" as const,
          x: paddingX,
          y: 0,
          text,
          fontSize,
          fontFamily: ff,
          fontWeight,
          fill: textColor,
          align: textAlign,
          baseline: "middle" as const,
        });
      }

      return shapes;
    },

    react: (props) => ({
      "aria-invalid": props.isInvalid || undefined,
      "aria-readonly": props.isReadOnly || undefined,
      "data-disabled": props.isDisabled || undefined,
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ("none" as const) : ("static" as const),
      cursor: props.isDisabled ? "not-allowed" : "text",
    }),
  },
};
