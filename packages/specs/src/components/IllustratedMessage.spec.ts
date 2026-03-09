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

/**
 * IllustratedMessage Props
 */
export interface IllustratedMessageProps {
  size?: "S" | "M" | "L";
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
  S: { width: 80, height: 80, iconSize: 40 },
  M: { width: 120, height: 120, iconSize: 56 },
  L: { width: 160, height: 160, iconSize: 72 },
};

/**
 * IllustratedMessage Component Spec
 */
export const IllustratedMessageSpec: ComponentSpec<IllustratedMessageProps> = {
  name: "IllustratedMessage",
  description: "빈 상태 표시 컴포넌트 (일러스트 + Heading + Description)",
  element: "div",

  defaultVariant: "default",
  defaultSize: "M",

  variants: {
    default: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    S: {
      height: "auto" as unknown as number,
      paddingX: 16,
      paddingY: 16,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: 0 as unknown as TokenRef,
      gap: 8,
      headingFontSize: "{typography.text-md}" as TokenRef,
    },
    M: {
      height: "auto" as unknown as number,
      paddingX: 24,
      paddingY: 24,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: 0 as unknown as TokenRef,
      gap: 12,
      headingFontSize: "{typography.text-lg}" as TokenRef,
    },
    L: {
      height: "auto" as unknown as number,
      paddingX: 32,
      paddingY: 32,
      fontSize: "{typography.text-md}" as TokenRef,
      borderRadius: 0 as unknown as TokenRef,
      gap: 16,
      headingFontSize: "{typography.text-xl}" as TokenRef,
    },
  },

  states: {},

  render: {
    shapes: (props, variant, size, _state = "default") => {
      const textColor = props.style?.color ?? variant.text;
      const sizeName = props.size ?? "M";
      const dims =
        ILLUSTRATION_DIMENSIONS[sizeName] ?? ILLUSTRATION_DIMENSIONS.M;

      const rawFs = props.style?.fontSize ?? size.fontSize;
      const resolvedFs =
        typeof rawFs === "number"
          ? rawFs
          : typeof rawFs === "string" && rawFs.startsWith("{")
            ? resolveToken(rawFs as TokenRef)
            : rawFs;
      const fontSize = typeof resolvedFs === "number" ? resolvedFs : 14;

      const headingFsRaw = (size as Record<string, unknown>).headingFontSize;
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
};
