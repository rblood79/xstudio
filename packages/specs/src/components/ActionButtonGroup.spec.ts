/**
 * ActionButtonGroup Component Spec
 *
 * React Aria 기반 액션 버튼 그룹 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";

/**
 * ActionButtonGroup Props
 */
export interface ActionButtonGroupProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  orientation?: "horizontal" | "vertical";
  isDisabled?: boolean;
  isQuiet?: boolean;
  isJustified?: boolean;
  density?: "compact" | "regular";
  style?: Record<string, string | number | undefined>;
}

/**
 * ActionButtonGroup Component Spec
 *
 * 투명 컨테이너: 자식 ActionButton들을 포함
 * 배경 없음, 자식이 렌더링 담당
 */
export const ActionButtonGroupSpec: ComponentSpec<ActionButtonGroupProps> = {
  name: "ActionButtonGroup",
  description: "React Aria 기반 액션 버튼 그룹 컴포넌트",
  element: "div",

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.transparent}" as TokenRef,
    },
  },

  sizes: {
    xs: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      gap: 2,
    },
    sm: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 4,
    },
    md: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-md}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 4,
    },
    lg: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      gap: 6,
    },
    xl: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xl}" as TokenRef,
      borderRadius: "{radius.xl}" as TokenRef,
      gap: 8,
    },
  },

  states: {
    disabled: {
      opacity: 0.38,
      pointerEvents: "none",
    },
    focusVisible: {
      outline: "2px solid var(--accent)",
      outlineOffset: "2px",
    },
  },

  render: {
    shapes: (props, _variant, size, _state = "default") => {
      const shapes: Shape[] = [];

      // 자식 ActionButton이 렌더링 담당
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // fallback: 자식이 없는 레거시 데이터 → 컨테이너만 렌더링
      shapes.push({
        type: "container" as const,
        x: 0,
        y: 0,
        width: "auto",
        height: "auto",
        children: [],
        layout: {
          display: "flex",
          flexDirection: props.orientation === "vertical" ? "column" : "row",
          gap: size.gap,
        },
      });

      return shapes;
    },

    react: (props) => ({
      "aria-orientation": props.orientation || "horizontal",
      role: "group",
    }),

    pixi: () => ({
      eventMode: "passive" as const,
    }),
  },
};
