/**
 * Input Component Spec
 *
 * React Aria 기반 기본 입력 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { parsePxValue, parseBorderWidth } from "../primitives";
import { fontFamily } from "../primitives/typography";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";

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

  // ADR-083 Phase 2: input-base archetype base 의 layout primitive 2 필드 리프팅.
  //   CSS / Skia layout (implicitStyles Phase 0) / Style Panel 3경로 동일 소스.
  //   box-sizing / font-family 는 ContainerStylesSchema 미지원 → archetype table 잔존.
  containerStyles: {
    display: "flex",
    alignItems: "center",
  },

  defaultVariant: "default",
  defaultSize: "md",

  // ADR-096: DEFAULT_ELEMENT_WIDTHS["input"] = 180 이관. BC 영향 0.
  // defaultHeight 미설정 — InputSpec.sizes 기반 동적 계산 (utils.ts step 2.5).
  defaultWidth: 180,

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

  // BUTTON_FAMILY_HEIGHTS (primitives/buttonSizes.ts) 와 동일 metric.
  // height = lineHeight + paddingY×2 + borderWidth×2
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
      focusRing: "{focus.ring.default}",
    },
  },

  render: {
    shapes: (props, size, state = "default") => {
      const variant =
        InputSpec.variants![
          (props as { variant?: keyof typeof InputSpec.variants }).variant ??
            InputSpec.defaultVariant!
        ];
      const width =
        typeof props._containerWidth === "number" && props._containerWidth > 0
          ? props._containerWidth
          : (props.style?.width as number) || 200;
      const height = size.height;

      const borderRadius = parsePxValue(
        props.style?.borderRadius,
        size.borderRadius as unknown as number,
      );

      const bgColor = props.style?.backgroundColor ?? variant.background;

      const borderColor =
        props.style?.borderColor ??
        (state === "hover" && variant.borderHover
          ? variant.borderHover
          : variant.border);

      const borderWidth = parseBorderWidth(props.style?.borderWidth, 1);

      const fontSize = resolveSpecFontSize(
        props.size ? size.fontSize : (props.style?.fontSize ?? size.fontSize),
        16,
      );

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

      const paddingX = parsePxValue(
        props.style?.paddingLeft ??
          props.style?.paddingRight ??
          props.style?.padding,
        size.paddingX,
      );

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
