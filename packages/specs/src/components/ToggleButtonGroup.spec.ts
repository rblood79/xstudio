/**
 * ToggleButtonGroup Component Spec
 *
 * React Aria 기반 토글 버튼 그룹 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import {
  Eye,
  ArrowLeftRight,
  List,
  PointerOff,
  LayoutGrid,
  AlignJustify,
} from "lucide-react";

/**
 * ToggleButtonGroup Props
 */
export interface ToggleButtonGroupProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  orientation?: "horizontal" | "vertical";
  selectionMode?: "single" | "multiple";
  isEmphasized?: boolean;
  isQuiet?: boolean;
  density?: "compact" | "regular";
  isJustified?: boolean;
  indicator?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * ToggleButtonGroup Component Spec
 *
 * Container 컴포넌트: 자식 ToggleButton들을 포함
 * variant/size는 React 컴포넌트에서 Context로 자식에 전파
 */
export const ToggleButtonGroupSpec: ComponentSpec<ToggleButtonGroupProps> = {
  name: "ToggleButtonGroup",
  description: "React Aria 기반 토글 버튼 그룹 컴포넌트",
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
  },

  sizes: {
    xs: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      gap: 0,
    },
    sm: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 0,
    },
    md: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      gap: 0,
    },
    lg: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.xl}" as TokenRef,
      gap: 0,
    },
    xl: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xl}" as TokenRef,
      borderRadius: "{radius.xl}" as TokenRef,
      gap: 0,
    },
  },

  // ADR-036 Phase 3a: Tier 2 Composite CSS 생성 메타데이터
  composition: {
    layout: "flex-row",
    delegation: [
      {
        childSelector: ".react-aria-ToggleButton",
        variables: {
          sm: { "--btn-border-radius": "var(--radius-sm)" },
          md: { "--btn-border-radius": "var(--radius-md)" },
          lg: { "--btn-border-radius": "var(--radius-lg)" },
        },
      },
    ],
  },

  states: {
    focusVisible: {
      focusRing: "{focus.ring.default}",
    },
  },

  properties: {
    sections: [
      {
        title: "Appearance",
        fields: [
          { key: "isEmphasized", type: "boolean", icon: Eye },
          { key: "isQuiet", type: "boolean", label: "Quiet", icon: Eye },
          { type: "size" },
          {
            key: "orientation",
            type: "enum",
            label: "Orientation",
            icon: ArrowLeftRight,
            options: [
              { value: "horizontal", label: "Horizontal" },
              { value: "vertical", label: "Vertical" },
            ],
            defaultValue: "horizontal",
          },
          { key: "indicator", type: "boolean", label: "Indicator", icon: Eye },
          {
            key: "density",
            type: "enum",
            label: "Density",
            icon: LayoutGrid,
            options: [
              { value: "compact", label: "Compact" },
              { value: "regular", label: "Regular" },
            ],
            defaultValue: "regular",
          },
          {
            key: "isJustified",
            type: "boolean",
            label: "Justified",
            icon: AlignJustify,
          },
        ],
      },
      {
        title: "State",
        fields: [
          {
            key: "selectionMode",
            type: "enum",
            label: "Selection Mode",
            icon: List,
            options: [
              { value: "single", label: "Single" },
              { value: "multiple", label: "Multiple" },
            ],
            defaultValue: "single",
          },
          { key: "isDisabled", type: "boolean", icon: PointerOff },
        ],
      },
      {
        title: "Item Management",
        fields: [
          {
            key: "items",
            type: "children-manager",
            label: "Buttons",
            childTag: "ToggleButton",
            defaultChildProps: { children: "Button" },
            labelProp: "children",
          },
        ],
      },
    ],
  },

  render: {
    shapes: (props, variant, size, _state = "default") => {
      // 사용자 스타일 우선, 없으면 spec 기본값
      const bgColor = props.style?.backgroundColor ?? variant.background;

      const styleBr = props.style?.borderRadius;
      const borderRadius =
        styleBr != null
          ? typeof styleBr === "number"
            ? styleBr
            : parseFloat(String(styleBr)) || 0
          : size.borderRadius;

      const borderColor =
        props.style?.borderColor ?? variant.border ?? variant.text;
      const styleBw = props.style?.borderWidth;
      const borderWidth =
        styleBw != null
          ? typeof styleBw === "number"
            ? styleBw
            : parseFloat(String(styleBw)) || 0
          : 1;

      const shapes: Shape[] = [
        // 그룹 배경
        {
          id: "bg",
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width: "auto",
          height: "auto",
          radius: borderRadius as unknown as number,
          fill: bgColor,
        },
        // 그룹 테두리
        {
          type: "border" as const,
          target: "bg",
          borderWidth,
          color: borderColor,
          radius: borderRadius as unknown as number,
        },
      ];

      // 자식 Element가 ToggleButton 렌더링 담당
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // fallback: 자식이 없는 레거시 데이터 → 전체 렌더링
      // 자식 ToggleButton 컨테이너
      shapes.push({
        type: "container" as const,
        x: 0,
        y: 0,
        width: "auto",
        height: "auto",
        children: [], // 자식은 렌더러에서 주입
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
      "data-indicator": props.indicator || undefined,
      role: "group",
    }),

    pixi: () => ({
      eventMode: "passive" as const,
    }),
  },
};
