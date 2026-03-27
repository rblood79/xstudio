/**
 * ButtonGroup Component Spec
 *
 * React Aria 기반 버튼 그룹 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";

/**
 * ButtonGroup Props
 */
export interface ButtonGroupProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  orientation?: "horizontal" | "vertical";
  align?: "start" | "center" | "end";
  isDisabled?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * ButtonGroup Component Spec
 *
 * 투명 컨테이너: 자식 Button들을 포함
 * 배경 없음, 자식이 렌더링 담당
 */
export const ButtonGroupSpec: ComponentSpec<ButtonGroupProps> = {
  name: "ButtonGroup",
  description: "React Aria 기반 버튼 그룹 컴포넌트",
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
      gap: 4,
    },
    sm: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 6,
    },
    md: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-md}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 8,
    },
    lg: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      gap: 10,
    },
    xl: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xl}" as TokenRef,
      borderRadius: "{radius.xl}" as TokenRef,
      gap: 12,
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

  properties: {
    sections: [
      {
        title: "Appearance",
        fields: [
          { type: "size" },
          {
            key: "orientation",
            type: "enum",
            label: "Orientation",
            options: [
              { value: "horizontal", label: "Horizontal" },
              { value: "vertical", label: "Vertical" },
            ],
          },
          {
            key: "align",
            type: "enum",
            label: "Align",
            options: [
              { value: "start", label: "Start" },
              { value: "center", label: "Center" },
              { value: "end", label: "End" },
            ],
          },
        ],
      },
      {
        title: "State",
        fields: [{ key: "isDisabled", type: "boolean" }],
      },
    ],
  },

  render: {
    shapes: (props, _variant, size, _state = "default") => {
      const shapes: Shape[] = [];

      // 자식 Button이 렌더링 담당
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // fallback: 자식이 없는 레거시 데이터 → 컨테이너만 렌더링
      type JustifyContent =
        | "flex-start"
        | "center"
        | "flex-end"
        | "space-between"
        | "space-around"
        | "space-evenly";
      const alignMap: Record<string, JustifyContent> = {
        start: "flex-start",
        center: "center",
        end: "flex-end",
      };
      const justifyContent: JustifyContent =
        alignMap[props.align ?? "end"] ?? "flex-end";

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
          justifyContent,
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
