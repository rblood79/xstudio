/**
 * SliderThumb Component Spec
 *
 * React Aria 기반 슬라이더 썸(핸들) 컴포넌트
 * Slider compound 컴포넌트의 child 요소 (드래그 가능한 원형 핸들)
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, TokenRef } from "../types";

/**
 * SliderThumb Props
 */
export interface SliderThumbProps {
  size?: "sm" | "md" | "lg";
  /** 트랙 내 위치 계산용 (0-100 퍼센트) */
  value?: number;
  minValue?: number;
  maxValue?: number;
  isDisabled?: boolean;
  isDragging?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * SliderThumb Component Spec
 */
export const SliderThumbSpec: ComponentSpec<SliderThumbProps> = {
  name: "SliderThumb",
  description: "슬라이더 드래그 핸들 (원형) 렌더링",
  element: "div",
  archetype: "slider",
  skipCSSGeneration: false,

  defaultSize: "md",

  sizes: {
    sm: {
      height: 16,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 0,
    },
    md: {
      height: 20,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 0,
    },
    lg: {
      height: 24,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
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
    focusVisible: {
      focusRing: "{focus.ring.default}",
    },
  },

  render: {
    shapes: () => {
      // 시각적 thumb은 SliderTrack spec shapes에서 렌더링 (value 기반 x 좌표 계산)
      // SliderThumb 자체는 빈 shapes 반환 (이벤트 히트 영역 역할만)
      return [];
    },

    react: (props) => ({
      role: "slider",
      "aria-valuemin": props.minValue ?? 0,
      "aria-valuemax": props.maxValue ?? 100,
      "aria-valuenow": props.value ?? 50,
      "data-disabled": props.isDisabled || undefined,
      "data-dragging": props.isDragging || undefined,
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ("none" as const) : ("static" as const),
      cursor: props.isDisabled ? "not-allowed" : "grab",
    }),
  },
};
