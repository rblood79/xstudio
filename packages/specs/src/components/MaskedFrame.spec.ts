/**
 * MaskedFrame Component Spec
 *
 * React Aria 기반 마스크 프레임 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { parsePxValue, parseBorderWidth } from "../primitives";
// ADR-908 Phase 3-A-2: Fill token dual-read seam
import { resolveFillTokens } from "../utils/fillTokens";

/**
 * MaskedFrame Props
 */
export interface MaskedFrameProps {
  variant?: "default" | "accent";
  size?: "sm" | "md" | "lg";
  maskShape?: "rect" | "circle" | "roundRect";
  style?: Record<string, string | number | undefined>;
}

/**
 * MaskedFrame Component Spec
 */
export const MaskedFrameSpec: ComponentSpec<MaskedFrameProps> = {
  name: "MaskedFrame",
  description: "React Aria 기반 마스크 프레임 컴포넌트",
  element: "div",
  archetype: "simple",

  // ADR-083 Phase 11: simple archetype base 의 layout primitive 2 필드 리프팅.
  containerStyles: {
    display: "inline-flex",
    alignItems: "center",
  },

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.layer-2}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
    accent: {
      background: "{color.accent-subtle}" as TokenRef,
      backgroundHover: "{color.accent-subtle}" as TokenRef,
      backgroundPressed: "{color.accent-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.accent}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 80,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
    },
    md: {
      height: 120,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
    },
    lg: {
      height: 200,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.xl}" as TokenRef,
    },
  },

  states: {
    hover: {},
    focusVisible: {
      focusRing: "{focus.ring.default}",
    },
  },

  render: {
    shapes: (props, size, _state = "default") => {
      const variant =
        MaskedFrameSpec.variants![
          (props as { variant?: keyof typeof MaskedFrameSpec.variants })
            .variant ?? MaskedFrameSpec.defaultVariant!
        ];
      // 사용자 스타일 우선, 없으면 spec 기본값
      const fill = resolveFillTokens(variant);
      const bgColor = props.style?.backgroundColor ?? fill.default.base;

      const borderRadius = parsePxValue(
        props.style?.borderRadius,
        size.borderRadius,
      );

      const maskShape = props.maskShape || "roundRect";
      // 배경 roundRect는 항상 'auto'를 사용하여 specShapesToSkia의 containerWidth에 맞춤
      const width = "auto" as const;
      const height = size.height;

      const shapes: Shape[] = [];

      // 마스크 영역에 따라 다른 Shape 생성
      if (maskShape === "circle") {
        const radius =
          Math.min(typeof width === "number" ? width : height, height) / 2;
        shapes.push({
          id: "mask",
          type: "circle" as const,
          x: radius,
          y: radius,
          radius,
          fill: bgColor,
        });
      } else if (maskShape === "rect") {
        shapes.push({
          id: "mask",
          type: "rect" as const,
          x: 0,
          y: 0,
          width,
          height,
          fill: bgColor,
        });
      } else {
        // roundRect (기본)
        shapes.push({
          id: "mask",
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width,
          height,
          radius: borderRadius as unknown as number,
          fill: bgColor,
        });
      }

      // 테두리
      const borderColor = props.style?.borderColor ?? variant.border;
      const borderWidth = parseBorderWidth(props.style?.borderWidth, 1);
      if (borderColor) {
        shapes.push({
          type: "border" as const,
          target: "mask",
          borderWidth,
          color: borderColor,
          radius:
            maskShape === "roundRect"
              ? (borderRadius as unknown as number)
              : undefined,
        });
      }

      // Child Composition: 자식 Element가 있으면 mask + border만 반환
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // 콘텐츠 컨테이너 (클리핑 적용)
      shapes.push({
        type: "container" as const,
        x: 0,
        y: 0,
        width,
        height,
        children: [],
        clip: true,
      });

      return shapes;
    },

    react: (props) => ({
      "data-mask-shape": props.maskShape || "roundRect",
    }),

    pixi: () => ({
      eventMode: "static" as const,
    }),
  },
};
