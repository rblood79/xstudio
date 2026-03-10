/**
 * Icon Component Spec
 *
 * 독립 아이콘 컴포넌트 — Lucide 아이콘 렌더링
 * ADR-019: 사용자가 캔버스에 자유롭게 배치 가능
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { resolveToken } from "../renderers/utils/tokenResolver";

export interface IconProps {
  variant?: "default";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Lucide 아이콘 이름 */
  iconName?: string;
  /** 아이콘 라이브러리 (기본: 'lucide') */
  iconFontFamily?: string;
  /** 선 두께 */
  strokeWidth?: number;
  style?: Record<string, string | number | undefined>;
}

export const IconSpec: ComponentSpec<IconProps> = {
  name: "Icon",
  description: "독립 아이콘 컴포넌트",
  element: "span",

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    xs: {
      height: 16,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      iconSize: 16,
      gap: 0,
    },
    sm: {
      height: 18,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      iconSize: 18,
      gap: 0,
    },
    md: {
      height: 24,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-2xl}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      iconSize: 24,
      gap: 0,
    },
    lg: {
      height: 36,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-4xl}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      iconSize: 36,
      gap: 0,
    },
    xl: {
      height: 48,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-5xl}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      iconSize: 48,
      gap: 0,
    },
  },

  states: {
    hover: {},
    pressed: {},
    disabled: {
      opacity: 0.38,
    },
    focusVisible: {},
  },

  render: {
    shapes: (props, variant, size) => {
      const iconSize = size.iconSize ?? 24;

      // 인라인 fontSize가 있으면 크기 오버라이드
      const rawFontSize = props.style?.fontSize;
      const resolvedFs =
        rawFontSize != null
          ? typeof rawFontSize === "number"
            ? rawFontSize
            : typeof rawFontSize === "string" && rawFontSize.startsWith("{")
              ? resolveToken(rawFontSize as TokenRef)
              : rawFontSize
          : undefined;
      const effectiveSize =
        (typeof resolvedFs === "number" ? resolvedFs : undefined) ?? iconSize;

      const fill = props.style?.color ?? variant.text;
      const iconName = props.iconName ?? "circle";
      const strokeWidth = props.strokeWidth ?? 2;

      const shapes: Shape[] = [
        {
          type: "icon_font" as const,
          iconName,
          x: effectiveSize / 2,
          y: effectiveSize / 2,
          fontSize: effectiveSize,
          fill,
          strokeWidth,
        },
      ];

      return shapes;
    },

    react: () => ({}),

    pixi: () => ({
      eventMode: "static" as const,
    }),
  },
};
