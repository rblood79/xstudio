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
import { fontFamily, getLabelLineHeight } from "../primitives/typography";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";

/**
 * Label Props
 */
export interface LabelProps {
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

  // ADR-083 Phase 11: simple archetype base 의 layout primitive 2 필드 리프팅.
  containerStyles: {
    display: "inline-flex",
    alignItems: "center",
  },
  skipCSSGeneration: true,

  defaultSize: "md",

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
    shapes: (props, size) => {
      const LABEL_DEFAULT_TEXT: TokenRef = "{color.neutral}" as TokenRef;
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

      const textColor = props.style?.color ?? LABEL_DEFAULT_TEXT;

      const textAlign =
        (props.style?.textAlign as "left" | "center" | "right") || "left";

      const lineHeight = getLabelLineHeight(fontSize);

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
