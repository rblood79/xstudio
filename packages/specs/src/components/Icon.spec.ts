/**
 * Icon Component Spec
 *
 * 독립 아이콘 컴포넌트 — Lucide 아이콘 렌더링
 * ADR-019: 사용자가 캔버스에 자유롭게 배치 가능
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";
import { Image, Pen } from "lucide-react";

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
  archetype: "simple",

  // ADR-083 Phase 11: simple archetype base 의 layout primitive 2 필드 리프팅.
  containerStyles: {
    display: "inline-flex",
    alignItems: "center",
  },
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

  properties: {
    sections: [
      {
        title: "Icon",
        fields: [
          { key: "iconName", type: "icon", label: "Icon", icon: Image },
          {
            type: "size",
            derivedUpdateFn: (value, currentProps) => {
              const SIZE_TO_FONT: Record<string, number> = {
                xs: 16,
                sm: 18,
                md: 24,
                lg: 36,
                xl: 48,
              };
              const fontSize = SIZE_TO_FONT[value as string] ?? 24;
              const existingStyle =
                (currentProps.style as Record<string, unknown>) ?? {};
              return {
                size: value,
                style: { ...existingStyle, fontSize: String(fontSize) },
              };
            },
          },
          {
            key: "strokeWidth",
            type: "number",
            label: "Stroke Width",
            icon: Pen,
            min: 0.5,
            max: 4,
            step: 0.5,
           defaultValue: 2 },
        ],
      },
    ],
  },

  render: {
    shapes: (props, size) => {
      const variant = IconSpec.variants![(props as { variant?: keyof typeof IconSpec.variants }).variant ?? IconSpec.defaultVariant!];
      const iconSize = size.iconSize ?? 24;

      // 인라인 fontSize가 있으면 크기 오버라이드
      const effectiveSize =
        props.style?.fontSize != null
          ? resolveSpecFontSize(props.style.fontSize, iconSize)
          : iconSize;

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
