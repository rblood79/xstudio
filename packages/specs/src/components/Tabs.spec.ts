/**
 * Tabs Component Spec
 *
 * React Aria 기반 탭 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * CSS Preview와 동일한 사이즈를 위해 React-Aria 기본 렌더링 기준으로 측정:
 * - Tab: padding 4px 16px, border-bottom 1px
 * - TabPanel: padding 16px
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";
import { Ratio, PointerOff, MousePointer2 } from "lucide-react";

/**
 * Tabs Props
 */
export interface TabsProps {
  variant?: "default";
  density?: "compact" | "regular";
  size?: "sm" | "md" | "lg";
  orientation?: "horizontal" | "vertical";
  selectedKey?: string;
  defaultSelectedKey?: string;
  isDisabled?: boolean;
  showIndicator?: boolean;
  /** 컨테이너 시스템에서 주입하는 실제 Tab 레이블 */
  _tabLabels?: string[];
  style?: Record<string, string | number | undefined>;
}

/**
 * Tabs Component Spec
 */
export const TabsSpec: ComponentSpec<TabsProps> = {
  name: "Tabs",
  description: "React Aria 기반 탭 컴포넌트",
  element: "div",
  skipCSSGeneration: true,

  defaultVariant: "default",
  defaultSize: "md",

  properties: {
    sections: [
      {
        title: "Design",
        fields: [
          {
            key: "density",
            type: "enum",
            label: "Density",
            icon: Ratio,
            options: [
              { value: "compact", label: "Compact" },
              { value: "regular", label: "Regular" },
            ],
          },
          {
            key: "orientation",
            type: "enum",
            label: "Orientation",
            icon: Ratio,
            options: [
              { value: "horizontal", label: "Horizontal" },
              { value: "vertical", label: "Vertical" },
            ],
          },
          {
            key: "showIndicator",
            type: "boolean",
            label: "Show Indicator",
            icon: MousePointer2,
          },
        ],
      },
      {
        title: "Behavior",
        fields: [
          {
            key: "isDisabled",
            type: "boolean",
            label: "Disabled",
            icon: PointerOff,
          },
        ],
      },
    ],
  },

  variants: {
    // S2에서 Tabs는 단일 스타일 (accent 기반 indicator)
    default: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral-subdued}" as TokenRef,
      textHover: "{color.accent}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
  },

  // @sync Button.spec.ts padding/fontSize 패턴 + Tabs.css
  // sm: 2*2 + 16(lh) + 1 = 21, md: 4*2 + 20(lh) + 1 = 29, lg: 8*2 + 24(lh) + 1 = 41
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

  // ADR-036 Phase 3a: Tier 2 Composite CSS 생성 메타데이터
  composition: {
    layout: "flex-column",
    delegation: [
      {
        childSelector: ".react-aria-Tab",
        variables: {
          sm: {
            "--tab-padding": "var(--spacing-2xs) var(--spacing-sm)",
            "--tab-font-size": "var(--text-xs)",
          },
          md: {
            "--tab-padding": "var(--spacing-xs) var(--spacing-md)",
            "--tab-font-size": "var(--text-sm)",
          },
          lg: {
            "--tab-padding": "var(--spacing-sm) var(--spacing-lg)",
            "--tab-font-size": "var(--text-base)",
          },
        },
      },
    ],
  },

  states: {
    hover: {},
    disabled: {
      opacity: 0.38,
      pointerEvents: "none",
    },
    focusVisible: {
      outline: "2px solid var(--accent)",
      outlineOffset: "-2px",
    },
  },

  render: {
    shapes: (props, variant, size, _state = "default") => {
      const isVertical = props.orientation === "vertical";

      // 사용자 스타일 우선
      const borderColor =
        props.style?.borderColor ??
        (variant.border || ("{color.border}" as TokenRef));

      const ff = fontFamily.sans;
      const rawFontSize = props.style?.fontSize ?? size.fontSize;
      const resolvedFs =
        typeof rawFontSize === "number"
          ? rawFontSize
          : typeof rawFontSize === "string" && rawFontSize.startsWith("{")
            ? resolveToken(rawFontSize as TokenRef)
            : rawFontSize;
      const fontSize = typeof resolvedFs === "number" ? resolvedFs : 14;

      // 실제 Tab children 레이블 (컨테이너 시스템에서 주입) or 기본값
      const tabLabels =
        props._tabLabels && props._tabLabels.length > 0
          ? props._tabLabels
          : ["Tab 1", "Tab 2"];
      const selectedIdx = 0; // 기본 첫 번째 탭 선택

      // 콘텐츠 기반 탭 너비 추정 (CSS Preview와 유사)
      const estimateTabWidth = (label: string): number => {
        const charWidth = fontSize * 0.55; // Pretendard 평균 문자 폭 추정
        return Math.max(
          48,
          Math.ceil(label.length * charWidth) + size.paddingX * 2,
        );
      };

      const shapes: Shape[] = [];

      // 탭 버튼 Shape 생성
      let tabX = 0;
      let tabY = 0;
      for (let i = 0; i < tabLabels.length; i++) {
        const isSelected = i === selectedIdx;
        const tabWidth = isVertical ? 120 : estimateTabWidth(tabLabels[i]);

        // 탭 배경
        shapes.push({
          type: "rect" as const,
          x: isVertical ? 0 : tabX,
          y: isVertical ? tabY : 0,
          width: tabWidth,
          height: size.height,
          fill: isSelected ? variant.backgroundHover : variant.background,
        });

        // 탭 텍스트
        shapes.push({
          type: "text" as const,
          x: isVertical ? 0 : tabX,
          y: (isVertical ? tabY : 0) + size.height / 2,
          text: tabLabels[i],
          fontSize,
          fontFamily: ff,
          fontWeight: isSelected ? 600 : 400,
          fill: isSelected ? (variant.textHover ?? variant.text) : variant.text,
          align: "center" as const,
          baseline: "middle" as const,
          maxWidth: tabWidth,
        });

        // 선택된 탭의 하단 인디케이터
        if (isSelected) {
          shapes.push({
            type: "line" as const,
            x1: isVertical ? 0 : tabX,
            y1: isVertical ? tabY + size.height : size.height - 2,
            x2: isVertical ? 0 : tabX + tabWidth,
            y2: isVertical ? tabY + size.height : size.height - 2,
            stroke: "{color.accent}" as TokenRef,
            strokeWidth: 3,
          });
        }

        if (isVertical) {
          tabY += size.height;
        } else {
          tabX += tabWidth;
        }
      }

      // 탭 리스트 하단/우측 구분선
      shapes.push({
        type: "line" as const,
        x1: 0,
        y1: isVertical ? 0 : size.height,
        x2: isVertical ? 0 : ("auto" as unknown as number),
        y2: isVertical ? ("auto" as unknown as number) : size.height,
        stroke: borderColor,
        strokeWidth: 1,
      });

      return shapes;
    },

    react: (props) => ({
      "data-orientation": props.orientation || "horizontal",
    }),

    pixi: () => ({
      eventMode: "static" as const,
    }),
  },
};
