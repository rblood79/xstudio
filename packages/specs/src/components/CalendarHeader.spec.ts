/**
 * CalendarHeader Component Spec
 *
 * Calendar compound 컴포넌트의 child 요소
 * 월/년 표시 + 이전/다음 네비게이션 버튼 렌더링
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";

/**
 * CalendarHeader Props
 */
export interface CalendarHeaderProps {
  variant?: "default" | "accent";
  size?: "S" | "M" | "L";
  children?: string;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/** 사이즈별 치수 (Calendar와 동기화) */
const CALENDAR_HEADER_DIMS: Record<
  string,
  {
    fontSize: number;
    iconSize: number;
    gap: number;
  }
> = {
  S: { fontSize: 12, iconSize: 24, gap: 4 },
  M: { fontSize: 14, iconSize: 28, gap: 6 },
  L: { fontSize: 16, iconSize: 32, gap: 8 },
};

/**
 * CalendarHeader Component Spec
 */
export const CalendarHeaderSpec: ComponentSpec<CalendarHeaderProps> = {
  name: "CalendarHeader",
  description: "Calendar 네비게이션 헤더 (이전/다음 + 월/년 텍스트)",
  element: "header",

  defaultVariant: "default",
  defaultSize: "M",

  variants: {
    default: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.base}" as TokenRef,
      backgroundPressed: "{color.base}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    accent: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.base}" as TokenRef,
      backgroundPressed: "{color.base}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    S: {
      height: 28,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 4,
    },
    M: {
      height: 32,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 6,
    },
    L: {
      height: 40,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-md}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 8,
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
    shapes: (props, variant, size) => {
      const sizeName = props.size ?? "M";
      const dims = CALENDAR_HEADER_DIMS[sizeName] ?? CALENDAR_HEADER_DIMS.M;
      const rawFontSize = size.fontSize;
      const resolvedFs =
        typeof rawFontSize === "number"
          ? rawFontSize
          : typeof rawFontSize === "string" && rawFontSize.startsWith("{")
            ? resolveToken(rawFontSize as TokenRef)
            : rawFontSize;
      const fontSize =
        typeof resolvedFs === "number" ? resolvedFs : dims.fontSize;
      const cellSize = dims.iconSize + 4;
      const gap = dims.gap;

      // 부모에서 전달받는 width 또는 기본값 (CSS 문자열 "260px" 대응)
      const rawWidth = props.style?.width;
      const parsedWidth =
        typeof rawWidth === "number"
          ? rawWidth
          : typeof rawWidth === "string"
            ? parseFloat(rawWidth)
            : 0;
      const width = parsedWidth > 0 ? parsedWidth : cellSize * 7 + gap * 6;
      const headerHeight = fontSize + 8;
      const ff = fontFamily.sans;
      const cy = headerHeight / 2;

      const shapes: Shape[] = [
        // 이전 화살표
        {
          type: "icon_font" as const,
          iconName: "chevron-left",
          x: cellSize / 2,
          y: cy,
          fontSize: fontSize + 2,
          fill: variant.text,
          strokeWidth: 2,
        },
        // 월/년 텍스트
        {
          type: "text" as const,
          x: cellSize,
          y: cy,
          text: props.children || "2024년 1월",
          fontSize,
          fontFamily: ff,
          fontWeight: 600,
          fill: variant.text,
          align: "center" as const,
          baseline: "middle" as const,
          maxWidth: width - cellSize * 2,
        },
        // 다음 화살표
        {
          type: "icon_font" as const,
          iconName: "chevron-right",
          x: width - cellSize / 2,
          y: cy,
          fontSize: fontSize + 2,
          fill: variant.text,
          strokeWidth: 2,
        },
      ];

      return shapes;
    },

    react: (_props) => ({
      role: "presentation",
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ("none" as const) : ("static" as const),
      cursor: "pointer",
    }),
  },
};
