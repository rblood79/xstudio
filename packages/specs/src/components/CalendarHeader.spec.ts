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
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";

/**
 * CalendarHeader Props
 */
export interface CalendarHeaderProps {
  variant?: "default" | "accent";
  size?: "sm" | "md" | "lg";
  children?: string;
  /** BCP 47 locale (e.g. "ko-KR") */
  locale?: string;
  /** Unicode calendar identifier (e.g. "buddhist") */
  calendarSystem?: string;
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
  sm: { fontSize: 12, iconSize: 20, gap: 4 },
  md: { fontSize: 14, iconSize: 26, gap: 6 },
  lg: { fontSize: 16, iconSize: 32, gap: 8 },
};

/**
 * CalendarHeader Component Spec
 */
export const CalendarHeaderSpec: ComponentSpec<CalendarHeaderProps> = {
  name: "CalendarHeader",
  description: "Calendar 네비게이션 헤더 (이전/다음 + 월/년 텍스트)",
  element: "header",
  archetype: "calendar",
  skipCSSGeneration: true,

  // ADR-083 Phase 4: calendar archetype base 의 layout primitive 1 필드 리프팅.
  //   skipCSSGeneration:true 이므로 CSS 경로 영향 없음. Skia consumer(implicitStyles
  //   Phase 0 공통 선주입) 및 Style Panel 에만 반영.
  containerStyles: {
    display: "grid",
  },

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    accent: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 24,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 4,
    },
    md: {
      height: 30,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 6,
    },
    lg: {
      height: 36,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
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
    shapes: (props, size) => {
      const variant =
        CalendarHeaderSpec.variants![
          (props as { variant?: keyof typeof CalendarHeaderSpec.variants })
            .variant ?? CalendarHeaderSpec.defaultVariant!
        ];
      const sizeName = props.size ?? "md";
      const dims = CALENDAR_HEADER_DIMS[sizeName] ?? CALENDAR_HEADER_DIMS.md;
      const fontSize = resolveSpecFontSize(size.fontSize, dims.fontSize);
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
      const headerHeight = (size.height as unknown as number) || 30;
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
          text: (() => {
            const loc = props.calendarSystem
              ? `${props.locale || "en-US"}-u-ca-${props.calendarSystem}`
              : props.locale;
            if (loc) {
              try {
                return new Intl.DateTimeFormat(loc, {
                  year: "numeric",
                  month: "long",
                }).format(new Date());
              } catch {
                // fallback to children
              }
            }
            return props.children || "2024년 1월";
          })(),
          fontSize,
          fontFamily: ff,
          fontWeight: 700,
          fill: variant.text,
          align: "center" as const,
          baseline: "middle" as const,
          maxWidth: width - cellSize * 2,
          whiteSpace: "nowrap" as const,
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
