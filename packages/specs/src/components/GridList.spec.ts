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
import type {
  StoredGridListItem,
  StoredGridListEntry,
} from "../types/gridlist-items";
import { isGridListSectionEntry } from "../types/gridlist-items";
import { fontFamily } from "../primitives/typography";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";
import { Grid, Binary, Rows, SquareX, PointerOff, Square } from "lucide-react";
import { FILTERING_SECTION } from "../utils/sharedSections";
import {
  GridListItemSpec,
  resolveGridListItemMetric,
} from "./GridListItem.spec";
// ADR-099 Phase 5: HeaderSpec 도 childSpecs 경로로 관계 선언 —
// GridList.skipCSSGeneration=true 이므로 Generator emit 안 하지만,
// Spec 계층 관계를 SSOT 로 선언해 향후 skipCSSGeneration 해체 시 자동 연동.
import { HeaderSpec } from "./Header.spec";

/**
 * @deprecated GridList.spec.ts 내부에서만 사용 — StoredGridListItem 으로 대체.
 * ADR-099 Phase 5 이후 외부 참조는 `StoredGridListItem` (gridlist-items.ts) 사용.
 */
export type GridListItem = StoredGridListItem;

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
  /**
   * 아이템 목록 (ADR-099 Phase 5: Section 엔트리 지원 — `StoredGridListEntry[]`)
   * 기존 items 는 discriminator 미보유 → default "item" 해석, BC 0%.
   */
  items?: StoredGridListEntry[];
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

  // ADR-090 Phase 2: GridListItemSpec 관계 선언.
  //   Generator 는 GridList.skipCSSGeneration=true 이므로 emit 안 하지만, Spec 계층 관계를
  //   SSOT 로 선언해 향후 skipCSSGeneration 해체 시 자식 selector emit 자동 연동.
  // ADR-099 Phase 5: HeaderSpec 추가 — Section Header Spec 계층 관계 SSOT 선언.
  childSpecs: [GridListItemSpec, HeaderSpec],

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
            defaultValue: "stack",
          },
          {
            key: "columns",
            type: "number",
            label: "Columns",
            icon: Binary,
            min: 1,
            max: 12,
            visibleWhen: { key: "layout", equals: "grid" },
            defaultValue: 3,
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
            icon: Grid,
            options: [
              { value: "none", label: "None" },
              { value: "single", label: "Single" },
              { value: "multiple", label: "Multiple" },
            ],
            defaultValue: "none",
          },
          {
            key: "selectionBehavior",
            type: "enum",
            label: "Selection Behavior",
            icon: Rows,
            options: [
              { value: "toggle", label: "Toggle" },
              { value: "replace", label: "Replace" },
            ],
            defaultValue: "toggle",
          },
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
            key: "renderEmptyState",
            type: "boolean",
            label: "Render Empty State",
            icon: Square,
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
    shapes: (props, size, _state = "default") => {
      const variant =
        GridListSpec.variants![
          (props as { variant?: keyof typeof GridListSpec.variants }).variant ??
            GridListSpec.defaultVariant!
        ];
      const DEFAULT_ENTRIES: StoredGridListEntry[] = [
        { id: "i1", label: "Item 1", description: "Description" },
        { id: "i2", label: "Item 2", description: "Description" },
        { id: "i3", label: "Item 3", description: "Description" },
        { id: "i4", label: "Item 4", description: "Description" },
      ];

      const layout = props.layout ?? "stack";
      const numCols = layout === "grid" ? (props.columns ?? 2) : 1;
      // ADR-099 Phase 5: StoredGridListEntry[] SSOT — section + item 혼합 지원
      const entries: StoredGridListEntry[] =
        props.items && props.items.length > 0 ? props.items : DEFAULT_ENTRIES;
      const gap = (size.gap as unknown as number) ?? 12;
      const fontSize = resolveSpecFontSize(size.fontSize, 14);
      // description font size: CSS 정합성 — sm:text-2xs(10), md:text-xs(12), lg:text-sm(14)
      const descFontSize = fontSize - 2;
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;
      const textColor = props.style?.color ?? variant.text;

      // 카드 사이즈 — ADR-090 Phase 3: GridListItemSpec.sizes.md SSOT 에서 resolver 경유 소비.
      //   fontSize-based 분기(>14/>12/else) 는 resolveGridListItemMetric 내부 캡슐화.
      const { cardPaddingX, cardPaddingY, cardBorderRadius, descGap } =
        resolveGridListItemMetric(fontSize);

      // 컨테이너 전체 너비
      const totalWidth =
        typeof props._containerWidth === "number" && props._containerWidth > 0
          ? props._containerWidth
          : (props.style?.width as number) || 280;
      const cellWidth =
        layout === "grid"
          ? (totalWidth - gap * (numCols - 1)) / numCols
          : totalWidth;

      // ADR-099 Phase 5: Section Header metric (ListBox 와 동일 공식 — 독립 계산)
      const HEADER_HEIGHT = Math.round(fontSize * 1.75);
      const HEADER_FONT_SIZE = Math.round(fontSize * 0.85);
      const SECTION_TOP_PAD = Math.round(fontSize * 0.5);

      // 카드 높이 계산
      const cardContentHeight = (item: StoredGridListItem) => {
        const labelH = fontSize;
        const descH = item.description ? descFontSize + descGap : 0;
        return cardPaddingY * 2 + labelH + descH;
      };

      const shapes: Shape[] = [];

      // Child Composition: 자식 Element가 있으면 spec shapes에서 아이템 렌더링 스킵
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // ADR-099 Phase 5: entries 순회 — section 분기 + 카드형 item 렌더.
      //   stack 모드: 세로 1열로 section header + 카드 순서대로 쌓기.
      //   grid 모드: section header 는 전체 컨테이너 폭으로 렌더 (columns span),
      //              내부 items 는 grid 레이아웃 재개.
      let currentY = 0;
      let globalCardIdx = 0; // grid 모드 col/row 계산용 전역 카드 인덱스
      let hasRenderedEntry = false;

      // ADR-099 Phase 5: 카드 렌더 헬퍼 — stack/grid 모드 공통
      const renderOneCard = (item: StoredGridListItem, cardIdx: number) => {
        const col = cardIdx % numCols;
        const row = Math.floor(cardIdx / numCols);
        const cellH = cardContentHeight(item);

        let cellX: number;
        let cellY: number;

        if (layout === "grid") {
          cellX = col * (cellWidth + gap);
          if (col === 0 && cardIdx > 0) {
            // 이전 행의 최대 높이를 계산
            const prevRowStart = (row - 1) * numCols;
            // grid 모드에서 이전 행 items 를 알기 위해 flatItems 필요하지만
            // 단순화: 이전 행의 첫 카드와 같은 높이로 추정 (동일 descFontSize 공식)
            const prevRowEnd = Math.min(prevRowStart + numCols, globalCardIdx);
            let maxH = 0;
            for (let i = prevRowStart; i < prevRowEnd; i++) {
              // 높이 재계산: description 있는 카드 기준 최대값
              const h = cardPaddingY * 2 + fontSize + descFontSize + descGap;
              maxH = Math.max(maxH, h);
            }
            // fallback: 최소 카드 높이
            if (maxH === 0) maxH = cardPaddingY * 2 + fontSize;
            currentY += maxH + gap;
          }
          cellY = currentY;
        } else {
          cellX = 0;
          cellY = currentY;
        }

        const shapeId = `card-${cardIdx}`;

        shapes.push({
          id: shapeId,
          type: "roundRect" as const,
          x: cellX,
          y: cellY,
          width: cellWidth,
          height: cellH,
          radius: cardBorderRadius,
          fill: "{color.layer-1}" as TokenRef,
        });

        shapes.push({
          type: "border" as const,
          target: shapeId,
          borderWidth: 1,
          color: "{color.border}" as TokenRef,
          radius: cardBorderRadius,
        });

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

        if (layout === "stack") {
          currentY = cellY + cellH + gap;
        }
      };

      for (const entry of entries) {
        if (isGridListSectionEntry(entry)) {
          // Section header 전 간격 (첫 section 제외)
          if (hasRenderedEntry) currentY += SECTION_TOP_PAD;

          // Section Header — grid 모드: 전체 컨테이너 폭 span
          shapes.push({
            type: "text" as const,
            x: cardPaddingX,
            y: currentY + HEADER_HEIGHT / 2,
            text: entry.header,
            fontSize: HEADER_FONT_SIZE,
            fontFamily: ff,
            fontWeight: 700,
            fill: "{color.neutral-subdued}" as TokenRef,
            align: "left" as const,
            baseline: "middle" as const,
          });
          currentY += HEADER_HEIGHT + gap;

          // Section 내부 items 렌더 — grid 모드에서 section 시작 시 새 행으로
          if (layout === "grid" && hasRenderedEntry) {
            // 새 section 은 새 행에서 시작 (col 리셋)
            const remainder = globalCardIdx % numCols;
            if (remainder !== 0) {
              globalCardIdx += numCols - remainder;
            }
          }

          for (const item of entry.items) {
            renderOneCard(item, globalCardIdx);
            globalCardIdx++;
          }

          // grid 모드: section 끝 후 새 행으로 초기화
          if (layout === "grid") {
            const remainder = globalCardIdx % numCols;
            if (remainder !== 0) {
              globalCardIdx += numCols - remainder;
            }
          }
        } else {
          renderOneCard(entry, globalCardIdx);
          globalCardIdx++;
        }
        hasRenderedEntry = true;
      }

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
