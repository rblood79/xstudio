/**
 * Tab Component Spec
 *
 * 개별 탭 버튼. CSS의 .react-aria-Tab 과 동일한 구조:
 * - 텍스트 레이블
 * - 선택된 탭: 하단(horizontal) 또는 우측(vertical) accent 인디케이터
 *
 * _isSelected: buildSpecNodeData에서 부모 Tabs의 selectedKey 비교 후 주입
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";

/** CSS 정합: size별 indicator 두께 (height → thickness) */
const INDICATOR_THICKNESS: Record<number, number> = {
  21: 2, // sm
  29: 3, // md
  41: 4, // lg
};

export interface TabProps {
  /** Tab 레이블 텍스트 */
  title?: string;
  /** React Aria key (부모 Tabs defaultSelectedKey와 매칭용) */
  tabId?: string;
  /** buildSpecNodeData 주입: 이 탭이 선택됐는지 */
  _isSelected?: boolean;
  /** buildSpecNodeData 주입: 부모 Tabs의 showIndicator */
  _showIndicator?: boolean;
  isDisabled?: boolean;
  orientation?: "horizontal" | "vertical";
  /** CONTAINER_DIMENSION_TAGS 주입: Taffy 계산 폭 */
  _containerWidth?: number;
  /** CONTAINER_DIMENSION_TAGS 주입: Taffy 계산 높이 */
  _containerHeight?: number;
  style?: Record<string, string | number | undefined>;
}

export const TabSpec: ComponentSpec<TabProps> = {
  name: "Tab",
  description: "개별 탭 버튼 — 텍스트 + 선택 인디케이터",
  element: "button",
  skipCSSGeneration: false,

  defaultVariant: "default",
  defaultSize: "md",

  properties: { sections: [] },

  variants: {
    default: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral-subdued}" as TokenRef,
      textHover: "{color.neutral}" as TokenRef,
    },
  },

  // TabsSpec.sizes와 동기화 (@sync Tabs.spec.ts)
  sizes: {
    sm: {
      height: 21,
      paddingX: 8,
      paddingY: 2,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    md: {
      height: 29,
      paddingX: 12,
      paddingY: 4,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
      gap: 0,
    },
    lg: {
      height: 41,
      paddingX: 16,
      paddingY: 8,
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
      const variant = TabSpec.variants![(props as { variant?: keyof typeof TabSpec.variants }).variant ?? TabSpec.defaultVariant!];
      const isSelected = props._isSelected === true;
      const isVertical = props.orientation === "vertical";
      const label = props.title ?? "";

      const ff = fontFamily.sans;
      const fontSize = resolveSpecFontSize(size.fontSize, 14);

      const h = size.height;
      const px = size.paddingX;
      // Taffy 계산 실제 폭 (CONTAINER_DIMENSION_TAGS 주입) — 인디케이터 full-width용
      const w = props._containerWidth ?? 60;

      const textColor = isSelected
        ? (variant.textHover ?? variant.text)
        : variant.text;

      const shapes: Shape[] = [];

      // 텍스트 레이블 (수직 중앙)
      shapes.push({
        type: "text" as const,
        x: px,
        y: h / 2,
        text: label,
        fontSize,
        fontFamily: ff,
        fontWeight: isSelected ? 600 : 400,
        fill: textColor,
        baseline: "middle" as const,
      });

      // 선택된 탭: accent 인디케이터 (full-width)
      // CSS 정합: sm=2px, md=3px, lg=4px
      // showIndicator=false → 인디케이터 미표시 (부모 Tabs prop)
      if (isSelected && props._showIndicator !== false) {
        const thickness = INDICATOR_THICKNESS[h] ?? 3;
        shapes.push({
          type: "rect" as const,
          x: isVertical ? w - thickness : 0,
          y: isVertical ? 0 : h - thickness,
          width: isVertical ? thickness : w,
          height: isVertical ? h : thickness,
          fill: "{color.accent}" as TokenRef,
        });
      }

      return shapes;
    },
  },
};
