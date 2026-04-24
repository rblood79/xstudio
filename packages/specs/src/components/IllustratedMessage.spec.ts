/**
 * IllustratedMessage Component Spec
 *
 * 일러스트 + 제목 + 설명 텍스트를 포함하는 빈 상태 표시 컴포넌트 (Spectrum 2)
 * Single Source of Truth - React와 Skia 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";
import { Heading, FileText, ArrowLeftRight } from "lucide-react";

/**
 * IllustratedMessage Props
 */
export interface IllustratedMessageProps {
  size?: "sm" | "md" | "lg";
  orientation?: "horizontal" | "vertical";
  heading?: string;
  description?: string;
  style?: Record<string, string | number | undefined>;
}

/** 사이즈별 일러스트 영역 치수 */
export const ILLUSTRATION_DIMENSIONS: Record<
  string,
  { width: number; height: number; iconSize: number }
> = {
  sm: { width: 80, height: 80, iconSize: 40 },
  md: { width: 120, height: 120, iconSize: 56 },
  lg: { width: 160, height: 160, iconSize: 72 },
};

/**
 * IllustratedMessage Component Spec
 */
export const IllustratedMessageSpec: ComponentSpec<IllustratedMessageProps> = {
  name: "IllustratedMessage",
  description: "빈 상태 표시 컴포넌트 (일러스트 + Heading + Description)",
  element: "div",
  archetype: "alert",

  // ADR-083 Phase 1: alert archetype base 의 layout primitive 4 필드를 Spec SSOT 로 리프팅.
  //   CSS / Skia layout (implicitStyles Phase 0 공통 선주입) / Style Panel 3경로 동일 소스.
  //   box-sizing / font-family 는 ContainerStylesSchema 미지원 → archetype table 에 잔존.
  containerStyles: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    width: "100%",
  },

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      fill: {
        default: {
          base: "{color.transparent}" as TokenRef,
          hover: "{color.transparent}" as TokenRef,
          pressed: "{color.transparent}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: "auto" as unknown as number,
      paddingX: 16,
      paddingY: 16,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: 0 as unknown as TokenRef,
      gap: 8,
      headingFontSize: "{typography.text-base}" as TokenRef,
    },
    md: {
      height: "auto" as unknown as number,
      paddingX: 24,
      paddingY: 24,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: 0 as unknown as TokenRef,
      gap: 12,
      headingFontSize: "{typography.text-lg}" as TokenRef,
    },
    lg: {
      height: "auto" as unknown as number,
      paddingX: 32,
      paddingY: 32,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: 0 as unknown as TokenRef,
      gap: 16,
      headingFontSize: "{typography.text-xl}" as TokenRef,
    },
  },

  states: {},

  render: {
    shapes: (props, size, _state = "default") => {
      const variant =
        IllustratedMessageSpec.variants![
          (props as { variant?: keyof typeof IllustratedMessageSpec.variants })
            .variant ?? IllustratedMessageSpec.defaultVariant!
        ];
      const textColor = props.style?.color ?? variant.text;
      const sizeName = props.size ?? "md";
      const dims =
        ILLUSTRATION_DIMENSIONS[sizeName] ?? ILLUSTRATION_DIMENSIONS.md;

      const fontSize = resolveSpecFontSize(
        props.style?.fontSize ?? size.fontSize,
        14,
      );

      const headingFsRaw = size.headingFontSize;
      const headingFsResolved =
        typeof headingFsRaw === "number"
          ? headingFsRaw
          : typeof headingFsRaw === "string" && headingFsRaw.startsWith("{")
            ? resolveToken(headingFsRaw as TokenRef)
            : headingFsRaw;
      const headingFs =
        typeof headingFsResolved === "number" ? headingFsResolved : 18;

      const ff = (props.style?.fontFamily as string) || fontFamily.sans;

      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return [];

      const heading = props.heading ?? "No content";
      const description = props.description ?? "There is nothing to display.";

      const shapes: Shape[] = [];

      // 일러스트 placeholder 영역
      shapes.push({
        id: "illustration",
        type: "roundRect" as const,
        x: 0,
        y: 0,
        width: dims.width,
        height: dims.height,
        radius: 12,
        fill: "{color.neutral-subtle}" as TokenRef,
        fillAlpha: 0.5,
      });

      // Heading 텍스트
      shapes.push({
        id: "heading",
        type: "text" as const,
        x: 0,
        y: dims.height + (size.gap ?? 12),
        text: heading,
        fontSize: headingFs,
        fontFamily: ff,
        fontWeight: 600,
        fill: textColor,
        align: "center" as const,
      });

      // Description 텍스트
      shapes.push({
        id: "description",
        type: "text" as const,
        x: 0,
        y: dims.height + (size.gap ?? 12) + headingFs + 8,
        text: description,
        fontSize,
        fontFamily: ff,
        fill: "{color.neutral-subdued}" as TokenRef,
        align: "center" as const,
      });

      return shapes;
    },

    react: () => ({
      role: "status",
    }),

    pixi: () => ({
      eventMode: "none" as const,
    }),
  },

  properties: {
    sections: [
      {
        title: "Content",
        fields: [
          {
            key: "heading",
            type: "string",
            label: "Heading",
            icon: Heading,
            placeholder: "No content",
          },
          {
            key: "description",
            type: "string",
            label: "Description",
            icon: FileText,
            placeholder: "There is nothing to display.",
          },
        ],
      },
      {
        title: "Appearance",
        fields: [
          { type: "size" },
          {
            key: "orientation",
            type: "enum",
            label: "Orientation",
            icon: ArrowLeftRight,
            options: [
              { value: "vertical", label: "Vertical" },
              { value: "horizontal", label: "Horizontal" },
            ],
            defaultValue: "horizontal",
          },
        ],
      },
    ],
  },
};
