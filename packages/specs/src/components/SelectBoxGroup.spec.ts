/**
 * SelectBoxGroup Component Spec
 *
 * 카드형 체크박스/라디오 그룹 컴포넌트 (Spectrum 2)
 * 각 아이템이 카드 레이아웃으로 라벨 + 설명 텍스트를 표시
 * Single Source of Truth - React와 Skia 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, TokenRef } from "../types";

/**
 * SelectBoxGroup Props
 */
export interface SelectBoxGroupProps {
  orientation?: "vertical" | "horizontal";
  selectionMode?: "single" | "multiple";
  size?: "sm" | "md" | "lg";
  isEmphasized?: boolean;
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * SelectBoxGroup Component Spec
 */
export const SelectBoxGroupSpec: ComponentSpec<SelectBoxGroupProps> = {
  name: "SelectBoxGroup",
  description: "카드형 체크박스/라디오 그룹 컴포넌트",
  element: "div",

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
    sm: {
      height: "auto" as unknown as number,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: 0 as unknown as TokenRef,
      gap: 8,
    },
    md: {
      height: "auto" as unknown as number,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: 0 as unknown as TokenRef,
      gap: 12,
    },
    lg: {
      height: "auto" as unknown as number,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-md}" as TokenRef,
      borderRadius: 0 as unknown as TokenRef,
      gap: 16,
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
    shapes: (_props, _variant, _size, _state = "default") => {
      // SelectBoxGroup은 순수 컨테이너 — 자식 SelectBoxItem이 실제 렌더링
      return [];
    },

    react: (props) => ({
      role: props.selectionMode === "multiple" ? "group" : "radiogroup",
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ("none" as const) : ("static" as const),
      cursor: props.isDisabled ? "not-allowed" : "default",
    }),
  },
};
