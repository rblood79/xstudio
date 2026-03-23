/**
 * GridList Component Spec
 *
 * React Aria 기반 그리드 리스트 컴포넌트 (카드형 선택 UI)
 * S2 SelectBoxGroup 통합 — layout: "stack" | "grid" 지원
 * Single Source of Truth - React와 Skia 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";

/**
 * GridList Item
 */
export interface GridListItem {
  id: string;
  label: string;
  description?: string;
}

/**
 * GridList Props
 */
export interface GridListProps {
  variant?: "default" | "accent";
  size?: "sm" | "md" | "lg";
  layout?: "stack" | "grid";
  selectionMode?: "none" | "single" | "multiple";
  columns?: number;
  items?: GridListItem[];
  style?: Record<string, string | number | undefined>;
}

/**
 * GridList Component Spec
 */
export const GridListSpec: ComponentSpec<GridListProps> = {
  name: "GridList",
  description: "카드형 선택 그리드/리스트 컴포넌트",
  element: "div",
  skipCSSGeneration: true,

  defaultVariant: "default",
  defaultSize: "md",

  variants: {
    default: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    accent: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.accent-subtle}" as TokenRef,
      backgroundPressed: "{color.accent-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: 0 as unknown as TokenRef,
      gap: 8,
    },
    md: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: 0 as unknown as TokenRef,
      gap: 12,
    },
    lg: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-md}" as TokenRef,
      borderRadius: 0 as unknown as TokenRef,
      gap: 16,
    },
  },

  states: {
    hover: {},
    disabled: {
      opacity: 0.38,
      pointerEvents: "none",
    },
    focusVisible: {},
  },

  render: {
    shapes: (props, variant, size, _state = "default") => {
      const DEFAULT_ITEMS: GridListItem[] = [
        { id: "i1", label: "Item 1", description: "Description" },
        { id: "i2", label: "Item 2", description: "Description" },
        { id: "i3", label: "Item 3", description: "Description" },
        { id: "i4", label: "Item 4", description: "Description" },
      ];

      const layout = props.layout ?? "stack";
      const numCols = layout === "grid" ? (props.columns ?? 2) : 1;
      const items =
        props.items && props.items.length > 0 ? props.items : DEFAULT_ITEMS;
      const gap = (size.gap as unknown as number) ?? 12;
      const rawFontSize = size.fontSize;
      const resolvedFs =
        typeof rawFontSize === "number"
          ? rawFontSize
          : typeof rawFontSize === "string" && rawFontSize.startsWith("{")
            ? resolveToken(rawFontSize as TokenRef)
            : rawFontSize;
      const fontSize = typeof resolvedFs === "number" ? resolvedFs : 14;
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;
      const textColor = props.style?.color ?? variant.text;

      // 카드 사이즈 (SelectBoxItem 디자인 기반)
      const cardPaddingX = fontSize > 14 ? 20 : fontSize > 12 ? 16 : 12;
      const cardPaddingY = fontSize > 14 ? 16 : fontSize > 12 ? 12 : 10;
      const cardBorderRadius = fontSize > 14 ? 12 : 8;
      const descGap = fontSize > 14 ? 6 : 4;

      // 컨테이너 전체 너비
      const totalWidth = (props.style?.width as number) || 280;
      const cellWidth =
        layout === "grid"
          ? (totalWidth - gap * (numCols - 1)) / numCols
          : totalWidth;

      // 카드 높이 계산
      const cardContentHeight = (item: GridListItem) => {
        const labelH = fontSize;
        const descH = item.description ? fontSize - 2 + descGap : 0;
        return cardPaddingY * 2 + labelH + descH;
      };

      const shapes: Shape[] = [];

      // Child Composition: 자식 Element가 있으면 spec shapes에서 아이템 렌더링 스킵
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // 카드형 아이템 렌더링
      let currentY = 0;
      items.forEach((item, idx) => {
        const col = idx % numCols;
        const row = Math.floor(idx / numCols);
        const cellH = cardContentHeight(item);

        let cellX: number;
        let cellY: number;

        if (layout === "grid") {
          cellX = col * (cellWidth + gap);
          // 같은 행의 모든 아이템은 동일 Y
          if (col === 0 && idx > 0) {
            // 이전 행의 최대 높이를 계산
            const prevRowStart = (row - 1) * numCols;
            const prevRowEnd = Math.min(prevRowStart + numCols, items.length);
            let maxH = 0;
            for (let i = prevRowStart; i < prevRowEnd; i++) {
              maxH = Math.max(maxH, cardContentHeight(items[i]));
            }
            currentY += maxH + gap;
          }
          cellY = currentY;
        } else {
          // stack: 세로 1열
          cellX = 0;
          cellY = idx === 0 ? 0 : currentY;
          if (idx > 0) {
            // 이전 아이템 높이 + gap
          }
        }

        // 카드 배경
        shapes.push({
          id: `card-${idx}`,
          type: "roundRect" as const,
          x: cellX,
          y: cellY,
          width: cellWidth,
          height: cellH,
          radius: cardBorderRadius,
          fill: "{color.layer-1}" as TokenRef,
        });

        // 카드 테두리
        shapes.push({
          type: "border" as const,
          target: `card-${idx}`,
          borderWidth: 1,
          color: "{color.border}" as TokenRef,
          radius: cardBorderRadius,
        });

        // 라벨 텍스트
        shapes.push({
          type: "text" as const,
          x: cellX + cardPaddingX,
          y: cellY + cardPaddingY,
          text: item.label,
          fontSize,
          fontFamily: ff,
          fontWeight: 600,
          fill: textColor,
        });

        // 설명 텍스트
        if (item.description) {
          shapes.push({
            type: "text" as const,
            x: cellX + cardPaddingX,
            y: cellY + cardPaddingY + fontSize + descGap,
            text: item.description,
            fontSize: fontSize - 2,
            fontFamily: ff,
            fill: "{color.neutral-subdued}" as TokenRef,
          });
        }

        // stack 모드에서 다음 Y 위치
        if (layout === "stack") {
          currentY = cellY + cellH + gap;
        }
      });

      return shapes;
    },

    react: (props) => ({
      role: "grid",
      "aria-multiselectable": props.selectionMode === "multiple" || undefined,
    }),

    pixi: () => ({
      eventMode: "static" as const,
    }),
  },
};
