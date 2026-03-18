/**
 * MeterTrack Component Spec
 *
 * Meter compound 컴포넌트의 child 요소 (트랙 배경 + 채우기 바)
 *
 * variant/sizes의 background/borderRadius는 transparent/none으로 설정:
 * → preview CSS에서 불필요한 배경/라운딩 방지
 * → 캔버스 spec shapes에서는 직접 색상/반지름 지정
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { METER_FILL_COLORS, METER_DIMENSIONS } from "./Meter.spec";
import { resolveToken } from "../renderers/utils/tokenResolver";

/**
 * MeterTrack Props
 */
export interface MeterTrackProps {
  variant?: "informative" | "positive" | "notice" | "negative";
  size?: "sm" | "md" | "lg";
  value?: number;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/** 사이즈별 트랙 borderRadius (MeterSpec.sizes 동기) */
const TRACK_BORDER_RADIUS: Record<string, TokenRef> = {
  sm: "{radius.sm}" as TokenRef,
  md: "{radius.sm}" as TokenRef,
  lg: "{radius.md}" as TokenRef,
};

/** 트랙 배경색 */
const TRACK_BG_COLOR: TokenRef = "{color.neutral-subtle}" as TokenRef;

/**
 * MeterTrack Component Spec
 */
export const MeterTrackSpec: ComponentSpec<MeterTrackProps> = {
  name: "MeterTrack",
  description: "미터 트랙 배경 + 채우기 바 렌더링",
  element: "div",
  archetype: "progress",

  defaultVariant: "informative",
  defaultSize: "md",

  variants: {
    informative: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    positive: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    notice: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    negative: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: METER_DIMENSIONS.sm.barHeight,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    md: {
      height: METER_DIMENSIONS.md.barHeight,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    lg: {
      height: METER_DIMENSIONS.lg.barHeight,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-md}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
  },

  states: {
    hover: {},
    pressed: {},
    disabled: { opacity: 0.38, pointerEvents: "none" },
    focusVisible: {},
  },

  render: {
    shapes: (props, _variant, size) => {
      const variantName = props.variant ?? "informative";
      const fillColor =
        METER_FILL_COLORS[variantName] ?? METER_FILL_COLORS.informative;
      const sizeName = props.size ?? "md";

      const width = (props.style?.width as number) || 240;
      const barHeight = size.height;

      const styleBr = props.style?.borderRadius;
      const trackRadiusRef =
        TRACK_BORDER_RADIUS[sizeName] ?? TRACK_BORDER_RADIUS.md;
      const resolvedRadius = resolveToken(trackRadiusRef);
      const barRadius =
        styleBr != null
          ? typeof styleBr === "number"
            ? styleBr
            : parseFloat(String(styleBr)) || 0
          : typeof resolvedRadius === "number"
            ? resolvedRadius
            : 4;

      const bgColor = props.style?.backgroundColor ?? TRACK_BG_COLOR;

      const value = Math.max(0, Math.min(100, props.value ?? 0));
      const fillWidth = (width * value) / 100;

      const shapes: Shape[] = [
        {
          id: "track",
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width,
          height: barHeight,
          radius: barRadius,
          fill: bgColor,
        },
      ];

      if (fillWidth > 0) {
        shapes.push({
          id: "fill",
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width: fillWidth,
          height: barHeight,
          radius: barRadius,
          fill: fillColor,
        });
      }

      return shapes;
    },

    react: (props) => ({
      role: "presentation",
      "data-disabled": props.isDisabled || undefined,
    }),

    pixi: (props) => ({
      eventMode: "static" as const,
      cursor: props.isDisabled ? "not-allowed" : "default",
    }),
  },
};
