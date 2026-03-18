/**
 * Image Component Spec
 *
 * 반응형 이미지 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef, ImageShape } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";

/**
 * Image Props
 */
export interface ImageProps {
  src?: string;
  alt?: string;
  objectFit?: "cover" | "contain" | "fill" | "none";
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/** 사이즈별 이미지 치수 */
export const IMAGE_DIMENSIONS: Record<
  string,
  { width: number; height: number }
> = {
  sm: { width: 160, height: 120 },
  md: { width: 280, height: 200 },
  lg: { width: 480, height: 320 },
};

/**
 * Image Component Spec
 */
export const ImageSpec: ComponentSpec<ImageProps> = {
  name: "Image",
  description: "반응형 이미지 컴포넌트",
  element: "img",
  archetype: "simple",

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.neutral-subtle}" as TokenRef,
      backgroundHover: "{color.neutral-subtle}" as TokenRef,
      backgroundPressed: "{color.neutral-subtle}" as TokenRef,
      text: "{color.neutral-subdued}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 120,
      width: 160,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    md: {
      height: 200,
      width: 280,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    lg: {
      height: 320,
      width: 480,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-md}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
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
      const width = (props.style?.width as number) || size.width || 280;
      const height = (props.style?.height as number) || size.height || 200;
      const bgColor = props.style?.backgroundColor ?? variant.background;
      const textColor = props.style?.color ?? variant.text;
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;
      const rawFs = size.fontSize;
      const resolvedFs =
        typeof rawFs === "number"
          ? rawFs
          : typeof rawFs === "string" && rawFs.startsWith("{")
            ? resolveToken(rawFs as TokenRef)
            : rawFs;
      const fontSize = typeof resolvedFs === "number" ? resolvedFs : 14;

      // Child Composition: 자식 Element가 있으면 스킵
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) {
        return [];
      }

      const shapes: Shape[] = [];

      if (props.src) {
        // 이미지가 있으면 image shape 렌더링
        shapes.push({
          id: "image",
          type: "image" as const,
          x: 0,
          y: 0,
          width,
          height,
          src: props.src,
          fit: (props.objectFit ?? "cover") as ImageShape["fit"],
        });
      } else {
        // placeholder 배경
        shapes.push({
          id: "placeholder-bg",
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width,
          height,
          radius: 0,
          fill: bgColor,
        });

        // placeholder 텍스트
        shapes.push({
          id: "placeholder-text",
          type: "text" as const,
          x: width / 2,
          y: height / 2,
          text: props.alt ?? "Image",
          fontSize,
          fontFamily: ff,
          fill: textColor,
          align: "center" as const,
          baseline: "middle" as const,
        });
      }

      return shapes;
    },

    react: (props) => ({
      role: "img",
      "aria-label": props.alt ?? "Image",
      "data-object-fit": props.objectFit ?? "cover",
    }),

    pixi: (props) => ({
      eventMode: "static" as const,
      cursor: props.isDisabled ? "not-allowed" : "default",
    }),
  },
};
