/**
 * TabList Component Spec
 *
 * Tabs의 자식 컨테이너. Tab 버튼들을 flex-row로 배치하고 하단에 구분선을 렌더링.
 * CSS: .react-aria-TabList { border-bottom: 1px solid var(--border) }
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";

export interface TabListProps {
  orientation?: "horizontal" | "vertical";
  /** 컨테이너 시스템 주입 */
  _containerWidth?: number;
  _containerHeight?: number;
  style?: Record<string, string | number | undefined>;
}

const TABLIST_DEFAULTS = {
  border: "{color.border}" as TokenRef,
};

export const TabListSpec: ComponentSpec<TabListProps> = {
  name: "TabList",
  description: "Tab 버튼 컨테이너 — 하단 구분선 렌더링",
  element: "div",
  skipCSSGeneration: false,

  defaultSize: "md",

  properties: { sections: [] },

  sizes: {
    sm: {
      height: 21,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    md: {
      height: 29,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    lg: {
      height: 41,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
  },

  states: {
    disabled: { opacity: 0.38, pointerEvents: "none" },
  },

  render: {
    shapes: (props, size): Shape[] => {
      const isVertical = props.orientation === "vertical";
      const w = props._containerWidth ?? 200;
      const h = size.height;

      const borderColor = TABLIST_DEFAULTS.border;

      // 하단(horizontal) 또는 우측(vertical) 구분선
      return [
        {
          type: "line" as const,
          x1: 0,
          y1: isVertical ? 0 : h,
          x2: isVertical ? 0 : (w as unknown as number),
          y2: isVertical ? (h as unknown as number) : h,
          stroke: borderColor,
          strokeWidth: 1,
        } satisfies Shape,
      ];
    },
  },
};
