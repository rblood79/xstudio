/**
 * TabPanel Component Spec
 *
 * RAC `TabPanel` (react-aria-components) 기반 leaf 콘텐츠 컨테이너.
 * - 구조: Tabs > TabList + TabPanels > TabPanel
 * - Props: id (Tab id와 매칭), shouldForceMount, children, className, style
 * - 시각: padding + focus-ring만. 배경/보더/variant 없음 (RAC 기본).
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";

export interface TabPanelProps {
  id?: string;
  tabId?: string;
  title?: string;
  shouldForceMount?: boolean;
  style?: Record<string, string | number | undefined>;
  className?: string;
}

export const TabPanelSpec: ComponentSpec<TabPanelProps> = {
  name: "TabPanel",
  description: "Tabs 활성 콘텐츠 컨테이너 (RAC TabPanel)",
  archetype: "collection",
  element: "div",
  skipCSSGeneration: false,

  defaultVariant: "default",
  defaultSize: "md",

  properties: {
    sections: [
      {
        title: "Content",
        fields: [{ key: "title", type: "string", label: "Title" }],
      },
    ],
  },

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
      borderRadius: "{radius.md}" as TokenRef,
    },
    md: {
      height: 0,
      paddingX: 12,
      paddingY: 12,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
    },
    lg: {
      height: 0,
      paddingX: 16,
      paddingY: 16,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
    },
  },

  states: {
    disabled: {
      opacity: 0.38,
      pointerEvents: "none",
    },
    focusVisible: {
      focusRing: "{focus.ring.default}",
    },
  },

  render: {
    shapes: (): Shape[] => [],
  },
};
