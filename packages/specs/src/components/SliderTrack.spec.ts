/**
 * SliderTrack Component Spec
 *
 * React Aria 기반 슬라이더 트랙 컴포넌트
 * Slider compound 컴포넌트의 child 요소 (트랙 배경 + 채우기 바)
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { SLIDER_FILL_COLORS, SliderSpec } from "./Slider.spec";
import { getSliderIndicator } from "../renderers/utils/indicatorResolver";

/**
 * SliderTrack Props
 */
export interface SliderTrackProps {
  variant?: "default" | "accent" | "neutral";
  size?: "sm" | "md" | "lg" | "xl";
  /** 단일 값 또는 범위 값 (부모 Slider에서 상속) */
  value?: number | number[];
  minValue?: number;
  maxValue?: number;
  orientation?: "horizontal" | "vertical";
  isDisabled?: boolean;
  /** ElementSprite 주입: 엔진 계산 최종 폭 */
  _containerWidth?: number;
  style?: Record<string, string | number | undefined>;
}

/**
 * SliderTrack Component Spec
 */
export const SliderTrackSpec: ComponentSpec<SliderTrackProps> = {
  name: "SliderTrack",
  description: "슬라이더 트랙 배경 + 채우기 바 렌더링",
  element: "div",
  archetype: "slider",
  skipCSSGeneration: true,

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
    accent: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    neutral: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
  },

  // preview CSS용: borderRadius none (shapes가 직접 처리)
  // ADR-060: height는 부모 Slider.sizes.*.indicator.trackHeight SSOT에서 파생
  sizes: {
    sm: {
      height: getSliderIndicator(SliderSpec, "sm").trackHeight,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    md: {
      height: getSliderIndicator(SliderSpec, "md").trackHeight,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    lg: {
      height: getSliderIndicator(SliderSpec, "lg").trackHeight,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    xl: {
      height: getSliderIndicator(SliderSpec, "xl").trackHeight,
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
      cursor: "not-allowed",
      pointerEvents: "none",
    },
    focusVisible: {},
  },

  render: {
    shapes: (props, _variant, _size) => {
      const sizeName = props.size ?? "md";
      const sliderIndicator = getSliderIndicator(SliderSpec, sizeName);
      const trackDims = { trackHeight: sliderIndicator.trackHeight };
      const variantName = props.variant ?? "default";
      const fillColors =
        SLIDER_FILL_COLORS[variantName] ?? SLIDER_FILL_COLORS.default;

      const width =
        typeof props._containerWidth === "number" && props._containerWidth > 0
          ? props._containerWidth
          : (props.style?.width as number) || 200;
      const trackHeight = trackDims.trackHeight;
      const trackRadius = trackHeight / 2;

      // thumb 크기 기준 세로 중앙 배치: track bar를 레이아웃 영역 가운데에 위치
      const thumbSize = sliderIndicator.thumbSize;
      const trackY = (thumbSize - trackHeight) / 2;

      const min = props.minValue ?? 0;
      const max = props.maxValue ?? 100;
      const rawValue = props.value ?? 50;
      const values = Array.isArray(rawValue) ? rawValue : [rawValue];
      const isRange = values.length >= 2;
      const percents = values.map((v) =>
        Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100)),
      );

      const bgColor =
        props.style?.backgroundColor ?? ("{color.neutral-subtle}" as TokenRef);

      const shapes: Shape[] = [
        // 트랙 배경 (세로 중앙)
        {
          id: "track",
          type: "roundRect" as const,
          x: 0,
          y: trackY,
          width,
          height: trackHeight,
          radius: trackRadius,
          fill: bgColor,
        },
      ];

      // 채우기 (single: 0~value, range: value[0]~value[1])
      if (isRange) {
        const fillStartX = (width * percents[0]) / 100;
        const fillEndX = (width * percents[1]) / 100;
        const fillW = fillEndX - fillStartX;
        if (fillW > 0) {
          shapes.push({
            id: "fill",
            type: "roundRect" as const,
            x: fillStartX,
            y: trackY,
            width: fillW,
            height: trackHeight,
            radius: trackRadius,
            fill: fillColors.fill,
          });
        }
      } else {
        const fillWidth = (width * percents[0]) / 100;
        if (fillWidth > 0) {
          shapes.push({
            id: "fill",
            type: "roundRect" as const,
            x: 0,
            y: trackY,
            width: fillWidth,
            height: trackHeight,
            radius: trackRadius,
            fill: fillColors.fill,
          });
        }
      }

      // 썸 (핸들) — SliderTrack shapes에서 직접 렌더링 (Taffy absolute 미사용)
      for (let i = 0; i < percents.length; i++) {
        const thumbX = (width * percents[i]) / 100;
        const thumbId = percents.length === 1 ? "thumb" : `thumb-${i}`;
        shapes.push({
          id: thumbId,
          type: "circle" as const,
          x: thumbX,
          y: thumbSize / 2,
          radius: thumbSize / 2,
          fill: fillColors.handle,
        });
        shapes.push({
          type: "border" as const,
          target: thumbId,
          borderWidth: 2,
          color: "{color.base}" as TokenRef,
          radius: thumbSize / 2,
        });
      }

      return shapes;
    },

    react: (props) => ({
      "data-disabled": props.isDisabled || undefined,
      "data-orientation": props.orientation ?? "horizontal",
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ("none" as const) : ("static" as const),
      cursor: props.isDisabled ? "not-allowed" : "pointer",
    }),
  },
};
