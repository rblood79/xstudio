/**
 * DatePicker Component Spec
 *
 * DateField 입력 패턴 + 우측 캘린더 버튼
 * Compositional 자식이 있으면 빈 shapes 반환 (부모 투명 컨테이너)
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";

export interface DatePickerProps {
  variant?: "default" | "accent";
  size?: "sm" | "md" | "lg";
  value?: string;
  placeholder?: string;
  label?: string;
  locale?: string;
  calendarSystem?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  style?: Record<string, string | number | undefined>;
}

/** @sync DateInput.spec.ts */
const INPUT_HEIGHT: Record<string, number> = {
  sm: 22,
  md: 30,
  lg: 42,
};
const INPUT_PADDING: Record<
  string,
  { top: number; right: number; left: number }
> = {
  sm: { top: 2, right: 2, left: 8 },
  md: { top: 4, right: 4, left: 12 },
  lg: { top: 8, right: 8, left: 16 },
};
const INPUT_BORDER_RADIUS: Record<string, number> = {
  sm: 6,
  md: 8,
  lg: 10,
};
const ICON_SIZE: Record<string, number> = {
  sm: 14,
  md: 16,
  lg: 20,
};

/** locale 기반 날짜 placeholder */
function buildDatePlaceholder(locale: string): string {
  const isAsian =
    locale.startsWith("ko") ||
    locale.startsWith("ja") ||
    locale.startsWith("zh");
  const isEuropean =
    locale.startsWith("de") ||
    locale.startsWith("fr") ||
    locale.startsWith("es") ||
    locale.startsWith("it") ||
    locale.startsWith("pt");
  if (isAsian) return "YYYY / MM / DD";
  if (isEuropean) return "DD / MM / YYYY";
  return "MM / DD / YYYY";
}

export const DatePickerSpec: ComponentSpec<DatePickerProps> = {
  name: "DatePicker",
  description: "DateField 입력 + 캘린더 버튼",
  element: "div",
  skipCSSGeneration: true,

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.layer-2}" as TokenRef,
      backgroundHover: "{color.layer-2}" as TokenRef,
      backgroundPressed: "{color.layer-2}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
    accent: {
      background: "{color.layer-2}" as TokenRef,
      backgroundHover: "{color.layer-2}" as TokenRef,
      backgroundPressed: "{color.layer-2}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.accent}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 22,
      paddingX: 8,
      paddingY: 2,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      iconSize: 14,
      gap: 4,
    },
    md: {
      height: 30,
      paddingX: 12,
      paddingY: 4,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      iconSize: 16,
      gap: 4,
    },
    lg: {
      height: 42,
      paddingX: 16,
      paddingY: 8,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      iconSize: 20,
      gap: 4,
    },
  },

  states: {
    hover: {},
    pressed: {},
    disabled: { opacity: 0.38, pointerEvents: "none" },
    focusVisible: {
      outline: "2px solid var(--accent)",
      outlineOffset: "2px",
    },
  },

  render: {
    shapes: (props, variant, _size, _state = "default") => {
      // Compositional: 자식이 있으면 투명 컨테이너
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return [];

      const sizeName = (props.size as string) || "md";
      const inputHeight = INPUT_HEIGHT[sizeName] ?? INPUT_HEIGHT.md;
      const pad = INPUT_PADDING[sizeName] ?? INPUT_PADDING.md;
      const borderRadius =
        INPUT_BORDER_RADIUS[sizeName] ?? INPUT_BORDER_RADIUS.md;
      const iconSz = ICON_SIZE[sizeName] ?? ICON_SIZE.md;
      const gap = 4;

      const containerWidth =
        ((props as Record<string, unknown>)._containerWidth as number) ||
        (props.style?.width as number) ||
        200;

      const rawFontSize = props.style?.fontSize ?? _size.fontSize;
      const resolvedFs =
        typeof rawFontSize === "number"
          ? rawFontSize
          : typeof rawFontSize === "string" && rawFontSize.startsWith("{")
            ? resolveToken(rawFontSize as TokenRef)
            : rawFontSize;
      const fontSize = typeof resolvedFs === "number" ? resolvedFs : 14;
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;

      const locale = props.locale || "en-US";
      const displayText =
        props.value || props.placeholder || buildDatePlaceholder(locale);
      const textColor =
        props.style?.color ??
        (props.value ? variant.text : ("{color.neutral-subdued}" as TokenRef));
      const bgColor = props.style?.backgroundColor ?? variant.background;
      const borderColor = props.style?.borderColor ?? variant.border;

      // 버튼 영역 = iconSz + padding.right
      const btnAreaWidth = iconSz + pad.right + gap;
      const textMaxWidth = containerWidth - pad.left - btnAreaWidth;
      const btnX = containerWidth - pad.right - iconSz;

      const shapes: Shape[] = [
        // 배경
        {
          id: "input-bg",
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width: containerWidth,
          height: inputHeight,
          radius: borderRadius,
          fill: bgColor,
        },
        // 테두리
        {
          type: "border" as const,
          target: "input-bg",
          borderWidth: 1,
          color: borderColor ?? ("{color.border}" as TokenRef),
          radius: borderRadius,
        },
        // 날짜 텍스트
        {
          type: "text" as const,
          x: pad.left,
          y: 0,
          text: displayText,
          fontSize,
          fontFamily: ff,
          fontWeight: 400,
          fill: textColor,
          align: "left" as const,
          baseline: "middle" as const,
          maxWidth: textMaxWidth,
        },
        // 캘린더 아이콘
        {
          type: "icon_font" as const,
          iconName: "calendar",
          x: btnX + iconSz / 2,
          y: inputHeight / 2,
          fontSize: iconSz,
          fill: "{color.neutral-subdued}" as TokenRef,
          strokeWidth: 2,
        },
      ];

      return shapes;
    },

    react: (props) => ({
      "aria-invalid": props.isInvalid || undefined,
      "data-disabled": props.isDisabled || undefined,
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ("none" as const) : ("static" as const),
      cursor: props.isDisabled ? "not-allowed" : "pointer",
    }),
  },
};
