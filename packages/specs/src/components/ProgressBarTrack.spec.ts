/**
 * ProgressBarTrack Component Spec
 *
 * ProgressBar compound 컴포넌트의 child 요소 (트랙 배경 + 채우기 바)
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * variant/sizes의 background/borderRadius는 "{color.transparent}"/"{radius.none}"으로 설정:
 * → preview CSS에서 불필요한 배경/라운딩 방지
 * → 캔버스 spec shapes에서는 직접 색상/반지름 지정
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { parsePxValue } from "../primitives";
import {
  PROGRESSBAR_FILL_COLORS,
  PROGRESSBAR_DIMENSIONS,
} from "./ProgressBar.spec";
import { resolveToken } from "../renderers/utils/tokenResolver";

/**
 * ProgressBarTrack Props
 */
export interface ProgressBarTrackProps {
  variant?: "default";
  size?: "sm" | "md" | "lg" | "xl";
  value?: number;
  isIndeterminate?: boolean;
  isDisabled?: boolean;
  /** ElementSprite 주입: 엔진 계산 최종 폭 */
  _containerWidth?: number;
  style?: Record<string, string | number | undefined>;
}

/** 사이즈별 트랙 borderRadius (ProgressBarSpec.sizes 동기) */
const TRACK_BORDER_RADIUS: Record<string, TokenRef> = {
  sm: "{radius.sm}" as TokenRef,
  md: "{radius.sm}" as TokenRef,
  lg: "{radius.md}" as TokenRef,
  xl: "{radius.lg}" as TokenRef,
};

/** 트랙 배경색 */
const TRACK_BG_COLOR: TokenRef = "{color.neutral-subtle}" as TokenRef;

/**
 * ProgressBarTrack Component Spec
 */
export const ProgressBarTrackSpec: ComponentSpec<ProgressBarTrackProps> = {
  name: "ProgressBarTrack",
  description: "프로그레스바 트랙 배경 + 채우기 바 렌더링",
  element: "div",
  archetype: "progress",

  // ADR-083 Phase 10: progress archetype base 의 layout primitive 1 필드 리프팅.
  containerStyles: {
    display: "grid",
  },

  defaultVariant: "default",
  defaultSize: "md",

  // preview CSS용: 투명 배경 (시각적 렌더링은 shapes가 담당)
  variants: {
    default: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
  },

  // preview CSS용: borderRadius none (shapes가 직접 처리)
  sizes: {
    sm: {
      height: PROGRESSBAR_DIMENSIONS.sm.barHeight,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    md: {
      height: PROGRESSBAR_DIMENSIONS.md.barHeight,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    lg: {
      height: PROGRESSBAR_DIMENSIONS.lg.barHeight,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    xl: {
      height: PROGRESSBAR_DIMENSIONS.xl.barHeight,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
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
      const variantName = props.variant ?? "default";
      const fillColor =
        PROGRESSBAR_FILL_COLORS[variantName] ?? PROGRESSBAR_FILL_COLORS.default;
      const sizeName = props.size ?? "md";

      const width =
        typeof props._containerWidth === "number" && props._containerWidth > 0
          ? props._containerWidth
          : (props.style?.width as number) || 240;
      const barHeight = size.height;

      // borderRadius: 사용자 스타일 우선 → spec 상수 fallback
      const trackRadiusRef =
        TRACK_BORDER_RADIUS[sizeName] ?? TRACK_BORDER_RADIUS.md;
      const resolvedRadius = resolveToken(trackRadiusRef);
      const barRadius = parsePxValue(
        props.style?.borderRadius,
        typeof resolvedRadius === "number" ? resolvedRadius : 4,
      );

      // 배경색: 사용자 스타일 우선 → 트랙 기본색
      const bgColor = props.style?.backgroundColor ?? TRACK_BG_COLOR;

      const value = Math.max(0, Math.min(100, props.value ?? 0));
      const fillWidth = (width * value) / 100;

      const shapes: Shape[] = [
        // 트랙 배경
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

      // 채우기 (determinate 모드)
      if (!props.isIndeterminate && fillWidth > 0) {
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

      // Indeterminate 애니메이션 표현 (정적 50% 위치)
      if (props.isIndeterminate) {
        shapes.push({
          id: "indeterminate-fill",
          type: "roundRect" as const,
          x: width * 0.2,
          y: 0,
          width: width * 0.3,
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
