/**
 * Pagination Component Spec
 *
 * React Aria 기반 페이지네이션 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";

/**
 * Pagination Props
 */
export interface PaginationProps {
  variant?: "default" | "accent";
  size?: "sm" | "md" | "lg";
  totalPages?: number;
  currentPage?: number;
  style?: Record<string, string | number | undefined>;
}

/**
 * Pagination Component Spec
 */
export const PaginationSpec: ComponentSpec<PaginationProps> = {
  name: "Pagination",
  description: "React Aria 기반 페이지네이션 컴포넌트",
  element: "nav",

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.layer-2}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
    accent: {
      background: "{color.accent}" as TokenRef,
      backgroundHover: "{color.accent-hover}" as TokenRef,
      backgroundPressed: "{color.accent-pressed}" as TokenRef,
      text: "{color.on-accent}" as TokenRef,
      border: "{color.accent}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 28,
      paddingX: 6,
      paddingY: 4,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      gap: 4,
    },
    md: {
      height: 36,
      paddingX: 10,
      paddingY: 6,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 6,
    },
    lg: {
      height: 44,
      paddingX: 14,
      paddingY: 8,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 8,
    },
  },

  states: {
    hover: {},
    disabled: {
      opacity: 0.38,
      pointerEvents: "none",
    },
    focusVisible: {
      focusRing: "{focus.ring.default}",
    },
  },

  render: {
    shapes: (props, size, _state = "default") => {
      const variant =
        PaginationSpec.variants![
          (props as { variant?: keyof typeof PaginationSpec.variants })
            .variant ?? PaginationSpec.defaultVariant!
        ];
      const totalPages = props.totalPages || 5;
      const currentPage = props.currentPage || 1;
      const buttonSize = size.height;

      // 사용자 스타일 우선
      const styleBr = props.style?.borderRadius;
      const borderRadius =
        styleBr != null
          ? typeof styleBr === "number"
            ? styleBr
            : parseFloat(String(styleBr)) || 0
          : size.borderRadius;

      const bgColor = props.style?.backgroundColor ?? variant.background;
      const textColor = props.style?.color ?? variant.text;
      const fontSize = resolveSpecFontSize(
        props.style?.fontSize ?? size.fontSize,
        16,
      );
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;
      const textAlign =
        (props.style?.textAlign as "left" | "center" | "right") || "center";

      const shapes: Shape[] = [];

      // 페이지네이션 컨테이너
      shapes.push({
        type: "container" as const,
        x: 0,
        y: 0,
        width: "auto",
        height: "auto",
        children: [],
        layout: {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: size.gap,
        },
      });

      // Child Composition: 자식 Element가 있으면 spec shapes에서 버튼 렌더링 스킵
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // 이전 버튼
      shapes.push({
        type: "roundRect" as const,
        x: 0,
        y: 0,
        width: buttonSize,
        height: buttonSize,
        radius: borderRadius as unknown as number,
        fill: "{color.layer-2}" as TokenRef,
      });

      // 페이지 버튼들
      for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        const isActive = i === currentPage;
        shapes.push({
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width: buttonSize,
          height: buttonSize,
          radius: borderRadius as unknown as number,
          fill: isActive ? bgColor : ("{color.base}" as TokenRef),
        });

        const fwRaw = props.style?.fontWeight;
        const fw =
          fwRaw != null
            ? typeof fwRaw === "number"
              ? fwRaw
              : parseInt(String(fwRaw), 10) || (isActive ? 600 : 400)
            : isActive
              ? 600
              : 400;

        shapes.push({
          type: "text" as const,
          x: 0,
          y: 0,
          text: String(i),
          fontSize,
          fontFamily: ff,
          fontWeight: fw,
          fill: isActive ? textColor : ("{color.neutral}" as TokenRef),
          align: textAlign,
          baseline: "middle" as const,
        });
      }

      // 다음 버튼
      shapes.push({
        type: "roundRect" as const,
        x: 0,
        y: 0,
        width: buttonSize,
        height: buttonSize,
        radius: borderRadius as unknown as number,
        fill: "{color.layer-2}" as TokenRef,
      });

      return shapes;
    },

    react: () => ({
      role: "navigation",
      "aria-label": "Pagination",
    }),

    pixi: () => ({
      eventMode: "static" as const,
      cursor: "pointer",
    }),
  },

  composition: {
    containerStyles: {
      display: "flex",
      "flex-direction": "column",
      gap: "var(--spacing-sm)",
      "--btn-radius": "var(--radius-md)",
      "--btn-font-size": "var(--text-base)",
      "--btn-transition": "background-color 200ms, opacity 200ms",
    },
    staticSelectors: {
      ".pagination-controls": {
        display: "flex",
        "align-items": "center",
        gap: "6px",
      },
      ".pagination-info": {
        "font-size": "var(--text-base)",
        color: "var(--fg-muted)",
        "text-align": "center",
      },
      ".pagination-ellipsis": {
        color: "var(--fg-muted)",
      },
      '.react-aria-Button[data-current="true"]': {
        "background-color": "var(--accent)",
        color: "var(--fg-on-accent)",
      },
      '.react-aria-Button:not([data-current="true"])': {
        "background-color": "var(--bg-overlay)",
        color: "var(--fg)",
      },
      '.react-aria-Button:not([data-current="true"]):hover:not(:disabled)': {
        "background-color": "color-mix(in srgb, var(--bg-overlay) 92%, black)",
      },
      ".react-aria-Button:disabled": {
        opacity: "0.38",
      },
    },
    delegation: [],
  },
};
