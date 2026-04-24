/**
 * Skeleton Component Spec
 *
 * React Aria 기반 스켈레톤 로딩 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { parsePxValue } from "../primitives";
// ADR-908 Phase 3-A-2: Fill token dual-read seam
import { resolveFillTokens } from "../utils/fillTokens";

/**
 * Skeleton Props
 */
export interface SkeletonProps {
  variant?: "default" | "accent";
  size?: "sm" | "md" | "lg";
  skeletonVariant?: "text" | "avatar" | "card" | "list";
  width?: number;
  height?: number;
  /** ElementSprite 주입: 엔진 계산 최종 폭 */
  _containerWidth?: number;
  style?: Record<string, string | number | undefined>;
}

/**
 * Skeleton Component Spec
 */
export const SkeletonSpec: ComponentSpec<SkeletonProps> = {
  name: "Skeleton",
  description: "React Aria 기반 스켈레톤 로딩 플레이스홀더 컴포넌트",
  archetype: "simple",

  // ADR-083 Phase 11: simple archetype base 의 layout primitive 2 필드 리프팅.
  containerStyles: {
    display: "inline-flex",
    alignItems: "center",
  },
  element: "div",

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      fill: {
        default: {
          base: "{color.layer-2}" as TokenRef,
          hover: "{color.layer-2}" as TokenRef,
          pressed: "{color.layer-2}" as TokenRef,
        },
      },
      text: "{color.neutral-subdued}" as TokenRef,
    },
    accent: {
      fill: {
        default: {
          base: "{color.accent-subtle}" as TokenRef,
          hover: "{color.accent-subtle}" as TokenRef,
          pressed: "{color.accent-subtle}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 16,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
    },
    md: {
      height: 20,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
    },
    lg: {
      height: 24,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
    },
  },

  states: {},

  render: {
    shapes: (props, size, _state = "default") => {
      const variant =
        SkeletonSpec.variants![
          (props as { variant?: keyof typeof SkeletonSpec.variants }).variant ??
            SkeletonSpec.defaultVariant!
        ];
      const skeletonType = props.skeletonVariant || "text";
      const width =
        typeof props._containerWidth === "number" && props._containerWidth > 0
          ? props._containerWidth
          : props.width || 200;
      const height = props.height || size.height;

      // 사용자 스타일 우선, 없으면 spec 기본값
      const borderRadius = parsePxValue(
        props.style?.borderRadius,
        size.borderRadius,
      );

      const fill = resolveFillTokens(variant);
      const bgColor = props.style?.backgroundColor ?? fill.default.base;

      const shapes: Shape[] = [];

      if (skeletonType === "avatar") {
        // 원형 아바타 스켈레톤
        const avatarSize = height;
        shapes.push({
          type: "circle" as const,
          x: avatarSize / 2,
          y: avatarSize / 2,
          radius: avatarSize / 2,
          fill: bgColor,
        });
      } else if (skeletonType === "card") {
        // 카드 스켈레톤
        shapes.push({
          id: "bg",
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width,
          height,
          radius: borderRadius as unknown as number,
          fill: bgColor,
        });
        // 이미지 영역
        shapes.push({
          type: "rect" as const,
          x: 0,
          y: 0,
          width,
          height: height * 0.5,
          fill: "{color.layer-1}" as TokenRef,
        });
        // 제목 라인
        shapes.push({
          type: "roundRect" as const,
          x: 12,
          y: height * 0.55,
          width: width * 0.7,
          height: size.height * 0.8,
          radius: 4,
          fill: "{color.layer-1}" as TokenRef,
        });
      } else if (skeletonType === "list") {
        // 리스트 스켈레톤 (3행)
        for (let i = 0; i < 3; i++) {
          const rowY = i * (size.height + 12);
          // 아바타
          shapes.push({
            type: "circle" as const,
            x: size.height / 2,
            y: rowY + size.height / 2,
            radius: size.height / 2,
            fill: bgColor,
          });
          // 텍스트 라인
          shapes.push({
            type: "roundRect" as const,
            x: size.height + 12,
            y: rowY + 2,
            width: width * 0.5,
            height: size.height * 0.6,
            radius: 4,
            fill: bgColor,
          });
        }
      } else {
        // 텍스트 스켈레톤 (기본)
        shapes.push({
          id: "bg",
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width,
          height,
          radius: borderRadius as unknown as number,
          fill: bgColor,
        });
      }

      return shapes;
    },

    react: () => ({
      "aria-hidden": true,
      role: "presentation",
    }),

    pixi: () => ({
      eventMode: "none" as const,
    }),
  },
};
