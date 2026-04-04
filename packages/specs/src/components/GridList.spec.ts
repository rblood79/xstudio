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
import {
  Grid,
  Binary,
  Rows,
  SquareX,
  PointerOff,
  Focus,
  MoveHorizontal,
  Square,
  FormInput,
} from "lucide-react";
import { FILTERING_SECTION } from "../utils/sharedSections";

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
  layout?: "stack" | "grid";
  selectionMode?: "none" | "single" | "multiple";
  selectionBehavior?: "toggle" | "replace";
  disallowEmptySelection?: boolean;
  isDisabled?: boolean;
  autoFocus?: boolean;
  allowsDragging?: boolean;
  renderEmptyState?: boolean;
  name?: string;
  validationBehavior?: "native" | "aria";
  columns?: number;
  filterText?: string;
  filterFields?: string[];
  items?: GridListItem[];
  /** ElementSprite 주입: 엔진 계산 최종 폭 */
  _containerWidth?: number;
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

  properties: {
    sections: [
      {
        title: "Layout",
        fields: [
          {
            key: "variant",
            type: "variant",
          },
          {
            key: "layout",
            type: "enum",
            label: "Layout",
            icon: Grid,
            options: [
              { value: "stack", label: "Stack" },
              { value: "grid", label: "Grid" },
            ],
           defaultValue: "stack" },
          {
            key: "columns",
            type: "number",
            label: "Columns",
            icon: Binary,
            min: 1,
            max: 12,
            visibleWhen: { key: "layout", equals: "grid" },
           defaultValue: 3 },
        ],
      },
      {
        title: "State",
        fields: [
          {
            key: "selectionMode",
            type: "enum",
            label: "Selection Mode",
            icon: Grid,
            options: [
              { value: "none", label: "None" },
              { value: "single", label: "Single" },
              { value: "multiple", label: "Multiple" },
            ],
           defaultValue: "none" },
          {
            key: "selectionBehavior",
            type: "enum",
            label: "Selection Behavior",
            icon: Rows,
            options: [
              { value: "toggle", label: "Toggle" },
              { value: "replace", label: "Replace" },
            ],
           defaultValue: "toggle" },
          {
            key: "disallowEmptySelection",
            type: "boolean",
            label: "Disallow Empty Selection",
            icon: SquareX,
          },
          {
            key: "isDisabled",
            type: "boolean",
            label: "Disabled",
            icon: PointerOff,
          },
          {
            key: "autoFocus",
            type: "boolean",
            label: "Auto Focus",
            icon: Focus,
          },
          {
            key: "allowsDragging",
            type: "boolean",
            label: "Allows Dragging",
            icon: MoveHorizontal,
          },
          {
            key: "renderEmptyState",
            type: "boolean",
            label: "Render Empty State",
            icon: Square,
          },
          {
            key: "name",
            type: "string",
            label: "Name",
            icon: FormInput,
            emptyToUndefined: true,
            placeholder: "gridlist-name",
          },
        ],
      },
      {
        title: "Item Management",
        fields: [
          {
            key: "items",
            type: "children-manager",
            label: "Items",
            childTag: "GridListItem",
            defaultChildProps: {
              label: "Item",
              value: "",
              textValue: "Item",
            },
            labelProp: "label",
          },
        ],
      },
      FILTERING_SECTION,
    ],
  },

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
    md: {
      height: 0,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: 0 as unknown as TokenRef,
      gap: 12,
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

  propagation: {
    rules: [
      { parentProp: "variant", childPath: "GridListItem", override: true },
    ],
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
      // description font size: CSS 정합성 — sm:text-2xs(10), md:text-xs(12), lg:text-sm(14)
      const descFontSize = fontSize - 2;
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;
      const textColor = props.style?.color ?? variant.text;

      // 카드 사이즈 (SelectBoxItem 디자인 기반)
      const cardPaddingX = fontSize > 14 ? 20 : fontSize > 12 ? 16 : 12;
      const cardPaddingY = fontSize > 14 ? 16 : fontSize > 12 ? 12 : 10;
      const cardBorderRadius = fontSize > 14 ? 12 : 8;
      const descGap = fontSize > 14 ? 6 : 4;

      // 컨테이너 전체 너비
      const totalWidth =
        typeof props._containerWidth === "number" && props._containerWidth > 0
          ? props._containerWidth
          : (props.style?.width as number) || 280;
      const cellWidth =
        layout === "grid"
          ? (totalWidth - gap * (numCols - 1)) / numCols
          : totalWidth;

      // 카드 높이 계산
      const cardContentHeight = (item: GridListItem) => {
        const labelH = fontSize;
        const descH = item.description ? descFontSize + descGap : 0;
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
          // stack: 세로 1열 — currentY는 루프 말미에서 갱신
          cellX = 0;
          cellY = currentY;
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
            fontSize: descFontSize,
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
