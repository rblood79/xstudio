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
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";
import { Image, FileText, Maximize, PointerOff } from "lucide-react";

/**
 * Image Props
 */
export interface ImageProps {
  src?: string;
  alt?: string;
  objectFit?: "cover" | "contain" | "fill" | "none";
  isDisabled?: boolean;
  /** ElementSprite 주입: 엔진 계산 최종 폭 */
  _containerWidth?: number;
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

  // ADR-083 Phase 11: simple archetype base 의 layout primitive 2 필드 리프팅.
  containerStyles: {
    display: "inline-flex",
    alignItems: "center",
  },

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
      fontSize: "{typography.text-base}" as TokenRef,
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
    shapes: (props, size, _state = "default") => {
      const variant = ImageSpec.variants![(props as { variant?: keyof typeof ImageSpec.variants }).variant ?? ImageSpec.defaultVariant!];
      const width =
        typeof props._containerWidth === "number" && props._containerWidth > 0
          ? props._containerWidth
          : (props.style?.width as number) || size.width || 280;
      const height = (props.style?.height as number) || size.height || 200;
      const bgColor = props.style?.backgroundColor ?? variant.background;
      const textColor = props.style?.color ?? variant.text;
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;
      const fontSize = resolveSpecFontSize(size.fontSize, 14);

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

  properties: {
    sections: [
      {
        title: "Content",
        fields: [
          {
            key: "src",
            type: "string",
            label: "Source URL",
            icon: Image,
            placeholder: "https://...",
          },
          {
            key: "alt",
            type: "string",
            label: "Alt Text",
            icon: FileText,
            placeholder: "Image description",
          },
        ],
      },
      {
        title: "Appearance",
        fields: [
          {
            key: "objectFit",
            type: "enum",
            label: "Object Fit",
            icon: Maximize,
            options: [
              { value: "cover", label: "Cover" },
              { value: "contain", label: "Contain" },
              { value: "fill", label: "Fill" },
              { value: "none", label: "None" },
            ],
           defaultValue: "cover" },
        ],
      },
      {
        title: "State",
        fields: [{ key: "isDisabled", type: "boolean", icon: PointerOff }],
      },
    ],
  },
};
