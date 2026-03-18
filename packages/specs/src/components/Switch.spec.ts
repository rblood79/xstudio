/**
 * Switch Component Spec
 *
 * React Aria 기반 스위치(토글) 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";

/**
 * Switch Props
 */
export interface SwitchProps {
  variant?: "default" | "emphasized";
  size?: "sm" | "md" | "lg";
  children?: string;
  label?: string;
  name?: string;
  isSelected?: boolean;
  isDisabled?: boolean;
  isReadOnly?: boolean;
  style?: Record<string, string | number | undefined>;
}

/** variant별 선택 시 트랙 색상 */
export const SWITCH_SELECTED_TRACK_COLORS: Record<string, TokenRef> = {
  default: "{color.neutral}" as TokenRef,
  emphasized: "{color.accent}" as TokenRef,
};

/** 사이즈별 트랙/썸 치수 */
export const SWITCH_DIMENSIONS: Record<
  string,
  {
    trackWidth: number;
    trackHeight: number;
    thumbSize: number;
    thumbOffset: number;
  }
> = {
  sm: { trackWidth: 32, trackHeight: 18, thumbSize: 14, thumbOffset: 2 },
  md: { trackWidth: 36, trackHeight: 20, thumbSize: 16, thumbOffset: 2 },
  lg: { trackWidth: 44, trackHeight: 24, thumbSize: 20, thumbOffset: 2 },
};

/**
 * Switch Component Spec
 */
export const SwitchSpec: ComponentSpec<SwitchProps> = {
  name: "Switch",
  description: "React Aria 기반 스위치(토글) 컴포넌트",
  archetype: "toggle-indicator",
  element: "label",

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    emphasized: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 8,
    },
    md: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 10,
    },
    lg: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 12,
    },
  },

  states: {
    hover: {},
    pressed: {},
    disabled: {
      opacity: 0.38,
      cursor: "not-allowed",
      pointerEvents: "none",
    },
    focusVisible: {
      outline: "2px solid var(--accent)",
      outlineOffset: "2px",
    },
  },

  render: {
    shapes: (props, variant, size, _state = "default") => {
      const variantName = props.variant ?? "default";
      const sizeName = props.size ?? "md";
      const switchSize = SWITCH_DIMENSIONS[sizeName] ?? SWITCH_DIMENSIONS.md;
      const gap = size.gap ?? 10;

      const isChecked = props.isSelected;
      const defaultTrackColor = isChecked
        ? (SWITCH_SELECTED_TRACK_COLORS[variantName] ??
          SWITCH_SELECTED_TRACK_COLORS.default)
        : ("{color.accent-subtle}" as TokenRef);

      const thumbX = isChecked
        ? switchSize.trackWidth - switchSize.thumbSize - switchSize.thumbOffset
        : switchSize.thumbOffset;
      const trackRadius = switchSize.trackHeight / 2;

      // 트랙 색상: indicator 전용 — 사용자 backgroundColor는 라벨 영역이므로 트랙에 적용하지 않음
      const bgColor = defaultTrackColor;

      // 트랙 테두리: indicator 전용 — 사용자 border 스타일은 라벨 영역이므로 트랙에 적용하지 않음
      const borderWidth = 2;
      const borderColor = "{color.border-hover}" as TokenRef;

      const shapes: Shape[] = [];

      // 트랙 배경
      shapes.push({
        id: "track",
        type: "roundRect" as const,
        x: 0,
        y: 0,
        width: switchSize.trackWidth,
        height: switchSize.trackHeight,
        radius: trackRadius,
        fill: bgColor,
      });

      // 트랙 테두리 (비선택 시)
      if (!isChecked) {
        shapes.push({
          type: "border" as const,
          target: "track",
          borderWidth,
          color: borderColor,
          radius: trackRadius,
        });
      }

      // 썸 (동그란 노브)
      // CSS: 선택 시 white, 비선택 시 --button-background-pressed (neutral-100 계열)
      shapes.push({
        id: "thumb",
        type: "circle" as const,
        x: thumbX + switchSize.thumbSize / 2,
        y: switchSize.trackHeight / 2,
        radius: switchSize.thumbSize / 2,
        fill: isChecked
          ? ("{color.white}" as TokenRef)
          : ("{color.border-hover}" as TokenRef),
      });

      // 라벨 텍스트 — 자식 Element가 있으면 스킵 (TextSprite가 렌더링)
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      const labelText = props.children || props.label;
      if (!hasChildren && labelText) {
        const textColor = props.style?.color ?? variant.text;
        const rawFontSize = props.style?.fontSize ?? size.fontSize;
        const resolvedFs =
          typeof rawFontSize === "number"
            ? rawFontSize
            : typeof rawFontSize === "string" && rawFontSize.startsWith("{")
              ? resolveToken(rawFontSize as TokenRef)
              : rawFontSize;
        const fontSize = typeof resolvedFs === "number" ? resolvedFs : 16;
        const ff = (props.style?.fontFamily as string) || fontFamily.sans;
        const textAlign =
          (props.style?.textAlign as "left" | "center" | "right") || "left";

        shapes.push({
          type: "text" as const,
          x: switchSize.trackWidth + gap,
          y: switchSize.trackHeight / 2,
          text: labelText,
          fontSize,
          fontFamily: ff,
          fill: textColor,
          align: textAlign,
          baseline: "middle" as const,
        });
      }

      return shapes;
    },

    react: (props) => ({
      "data-selected": props.isSelected || undefined,
      "aria-checked": props.isSelected || undefined,
      role: "switch",
    }),

    pixi: (props) => ({
      eventMode: "static" as const,
      cursor: props.isDisabled ? "not-allowed" : "pointer",
    }),
  },
};
