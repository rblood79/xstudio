/**
 * Label Component Spec
 *
 * React Aria 기반 라벨 컴포넌트
 * TextField, NumberField 등 compound 컴포넌트의 child 요소
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily, typography } from "../primitives/typography";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";

/** fontSize(px) → CSS lineHeight(px) 매핑 */
const FONT_SIZE_TO_LINE_HEIGHT: Record<number, number> = {
  10: typography["text-2xs--line-height"], // 16
  12: typography["text-xs--line-height"], // 16
  14: typography["text-sm--line-height"], // 20
  16: typography["text-base--line-height"], // 24
  18: typography["text-lg--line-height"], // 28
};

/**
 * Label Props
 */
export interface LabelProps {
  /** Label 자체 variant 또는 parent field의 --field-accent 매핑 */
  variant?: "default" | "accent" | "neutral" | "purple" | "negative";
  size?: "sm" | "md" | "lg";
  children?: string;
  label?: string;
  isDisabled?: boolean;
  /** 부모 field에서 주입되는 necessity indicator 설정 */
  _necessityIndicator?: "icon" | "label";
  _isRequired?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * Label Component Spec
 */
export const LabelSpec: ComponentSpec<LabelProps> = {
  name: "Label",
  description: "compound 컴포넌트의 라벨 텍스트 렌더링",
  element: "label",
  archetype: "simple",
  skipCSSGeneration: true,

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    // standalone Label (parent가 field가 아닐 때)
    default: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    // accent — 기본 텍스트 색상 (S2 accent 색상 대신 neutral 사용)
    accent: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    // S2 neutral — 보조 필드 라벨 (neutral-subdued)
    neutral: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral-subdued}" as TokenRef,
    },
    // S2 purple — Named Color 라벨 (purple-600)
    purple: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.purple}" as TokenRef,
    },
    // S2 negative — 에러 필드 라벨 (invalid-color)
    negative: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.negative}" as TokenRef,
    },
  },

  sizes: {
    xs: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-2xs}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    sm: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    md: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    lg: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    xl: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
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
    focusVisible: {},
  },

  render: {
    shapes: (props, variant, size) => {
      const text = props.children ?? props.label ?? "";
      if (!text) return [];

      const width = (props.style?.width as number) || "auto";

      // props.size가 명시적으로 설정된 경우 size.fontSize를 우선 사용
      // (propagation이 size prop만 변경하고 style.fontSize는 갱신하지 않으므로)
      const fontSize = resolveSpecFontSize(
        props.size ? size.fontSize : (props.style?.fontSize ?? size.fontSize),
        14,
      );

      const fwRaw = props.style?.fontWeight;
      const fontWeight =
        fwRaw != null
          ? typeof fwRaw === "number"
            ? fwRaw
            : parseInt(String(fwRaw), 10) || 600
          : 600;

      const ff = (props.style?.fontFamily as string) || fontFamily.sans;

      const textColor = props.style?.color ?? variant.text;

      const textAlign =
        (props.style?.textAlign as "left" | "center" | "right") || "left";

      const lineHeight = FONT_SIZE_TO_LINE_HEIGHT[fontSize] ?? fontSize * 1.5;

      const shapes: Shape[] = [
        {
          type: "text" as const,
          x: 0,
          y: 0,
          text,
          fontSize,
          lineHeight,
          fontFamily: ff,
          fontWeight,
          fill: textColor,
          align: textAlign,
          baseline: "middle" as const,
          maxWidth: typeof width === "number" ? width : undefined,
        },
      ];

      return shapes;
    },

    react: (props) => ({
      "data-disabled": props.isDisabled || undefined,
    }),

    pixi: () => ({
      eventMode: "none" as const,
    }),
  },
};
