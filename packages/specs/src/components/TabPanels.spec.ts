/**
 * TabPanels Component Spec
 *
 * Tabs 내부의 Panel 컨테이너. 활성 Panel 하나만 렌더링.
 * CSS: .react-aria-TabPanels { flex-grow: 1 }
 * 레이아웃: implicitStyles에서 selectedKey 기반 활성 Panel 필터링.
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";

export interface TabPanelsProps {
  style?: Record<string, string | number | undefined>;
}

export const TabPanelsSpec: ComponentSpec<TabPanelsProps> = {
  name: "TabPanels",
  description: "Tabs 내 Panel 컨테이너 — 활성 Panel만 표시",
  archetype: "collection",
  element: "div",
  skipCSSGeneration: false,

  // ADR-083 Phase 6: collection archetype base 의 layout primitive 2 필드 리프팅.
  containerStyles: {
    display: "flex",
    flexDirection: "column",
  },

  defaultVariant: "default",
  defaultSize: "md",

  properties: { sections: [] },

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
      height: 0,
      paddingX: 8,
      paddingY: 8,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
    },
    md: {
      height: 0,
      paddingX: 12,
      paddingY: 12,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
    },
    lg: {
      height: 0,
      paddingX: 16,
      paddingY: 16,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
    },
  },

  states: {},

  render: {
    shapes: (): Shape[] => [],
  },
};
