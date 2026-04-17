/**
 * MenuItem Component Spec
 *
 * CSS 자동 생성 전용 (Builder Skia 미등록 — Q5=i)
 * Menu.items[] 배열 내 항목의 시각 스타일을 정의한다.
 * Preview/Publish의 RAC <MenuItem> 컴포넌트에 CSS를 공급.
 *
 * @packageDocumentation
 */

import type { ComponentSpec, TokenRef } from "../types";

/**
 * MenuItem Props (CSS 생성 전용)
 */
export interface MenuItemProps {
  size?: "sm" | "md" | "lg" | "xl";
}

/**
 * MenuItem Component Spec
 *
 * skipCSSGeneration: false — CSS 자동 생성 활성화
 * render.shapes: () => [] — Skia shapes 없음 (Q5=i, Builder Skia 미등록)
 */
export const MenuItemSpec: ComponentSpec<MenuItemProps> = {
  name: "MenuItem",
  description: "Menu item — CSS 자동 생성 전용 (Builder Skia 미등록, Q5=i)",
  archetype: "simple",
  element: "div",
  skipCSSGeneration: false,

  defaultSize: "md",

  sizes: {
    sm: {
      height: 24,
      paddingX: 9,
      paddingY: 2,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      lineHeight: "{typography.text-xs--line-height}" as TokenRef,
      gap: 6,
    },
    md: {
      height: 32,
      paddingX: 12,
      paddingY: 4,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      lineHeight: "{typography.text-sm--line-height}" as TokenRef,
      gap: 8,
    },
    lg: {
      height: 40,
      paddingX: 15,
      paddingY: 8,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      lineHeight: "{typography.text-base--line-height}" as TokenRef,
      gap: 10,
    },
    xl: {
      height: 48,
      paddingX: 18,
      paddingY: 12,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.xl}" as TokenRef,
      lineHeight: "{typography.text-lg--line-height}" as TokenRef,
      gap: 12,
    },
  },

  states: {
    hover: {},
    focusVisible: {
      focusRing: "{focus.ring.default}",
    },
    disabled: {
      opacity: 0.38,
      pointerEvents: "none",
    },
  },

  render: {
    // Skia 미사용 — CSS 메타데이터 전용 (Q5=i)
    shapes: () => [],
    react: () => ({}),
  },
};
