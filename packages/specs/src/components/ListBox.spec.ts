/**
 * ListBox Component Spec
 *
 * React Aria 기반 리스트박스 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import type {
  StoredListBoxItem,
  StoredListBoxEntry,
} from "../types/listbox-items";
import { isListBoxSectionEntry } from "../types/listbox-items";
import { fontFamily } from "../primitives/typography";
import { resolveStateColors } from "../utils/stateEffect";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";
// ADR-078 Phase 2: 자식 Spec inline emit — `.react-aria-ListBoxItem` 블록이 본 Spec
// 의 `generated/ListBox.css` 같은 @layer 에 삽입된다.
// ADR-078 Phase 3: `resolveListBoxItemMetric` 로 Skia/layout 양쪽 item metric 단일 소스화.
import { ListBoxItemSpec, resolveListBoxItemMetric } from "./ListBoxItem.spec";
// ADR-099 Phase 3 (098-c 슬롯): HeaderSpec 도 childSpecs 경로로 inline emit —
// `.react-aria-ListBox .react-aria-Header` 블록이 generated/ListBox.css 에 추가된다.
import { HeaderSpec } from "./Header.spec";
import {
  List,
  SquareX,
  PointerOff,
  Zap,
  Ruler,
  Rows,
  MousePointer2,
} from "lucide-react";
import { FILTERING_SECTION } from "../utils/sharedSections";

/**
 * ListBox Props
 */
export interface ListBoxProps {
  variant?: "default" | "accent";
  isDisabled?: boolean;
  selectionMode?: "none" | "single" | "multiple";
  selectionBehavior?: "toggle" | "replace";
  disallowEmptySelection?: boolean;
  autoFocus?: boolean;
  name?: string;
  enableVirtualization?: boolean;
  height?: number;
  overscan?: number;
  filterText?: string;
  filterFields?: string[];
  /**
   * 아이템 목록 (ADR-076 P2: StoredListBoxItem[] SSOT)
   * ADR-099 Phase 2 (098-c 슬롯): Section 엔트리 지원 — `StoredListBoxEntry[]`
   * (기존 items 는 discriminator 미보유 → default "item" 해석, BC 0%).
   */
  items?: StoredListBoxEntry[];
  /** 선택된 아이템 key — canonical (ADR-076) */
  selectedKey?: string;
  /** 선택된 아이템 key 목록 — canonical (ADR-076) */
  selectedKeys?: string[];
  /** @deprecated selectedKey 사용 (Phase 5 migration 에서 자동 변환) */
  selectedIndex?: number;
  /** @deprecated selectedKeys 사용 (Phase 5 migration 에서 자동 변환) */
  selectedIndices?: number[];
  /** ElementSprite 주입: 엔진 계산 최종 폭 */
  _containerWidth?: number;
  /** ElementSprite 주입: 자식 Element 존재 시 spec shapes 아이템 렌더링 스킵 */
  _hasChildren?: boolean;
  style?: Record<string, string | number | undefined>;
}

/**
 * ListBox Component Spec
 */
export const ListBoxSpec: ComponentSpec<ListBoxProps> = {
  name: "ListBox",
  description: "React Aria 기반 리스트박스 컴포넌트",
  archetype: "collection",
  element: "div",

  // ADR-076: 컨테이너 base 시각 SSOT (ADR-071 Menu 선례 재사용)
  // `variants` 는 Skia 렌더(render.shapes) 전용, CSS 경로는 이 블록만 사용
  // 수동 유지 CSS: ListBoxItem base(60-124) + orientation/layout(127-227) +
  // Popover context(246-293) + variant 5종(296-355) + DnD/virtualized/forced-colors(230-400)
  containerStyles: {
    background: "{color.raised}" as TokenRef,
    text: "{color.neutral}" as TokenRef,
    border: "{color.border}" as TokenRef,
    borderWidth: 1,
    borderRadius: "{radius.lg}" as TokenRef,
    padding: "{spacing.xs}" as TokenRef,
    gap: "{spacing.2xs}" as TokenRef,
    // ADR-078 Phase 5: layout primitive Spec SSOT — CSS / Canvas / Style Panel 3경로 동일 소스.
    display: "flex",
    flexDirection: "column",
    width: "100%",
    maxHeight: "300px",
    overflow: "auto",
    outline: "none",
  },

  // ADR-078 Phase 2: ListBoxItem.spec base/sizes/states 블록을 본 Spec 의 `generated/ListBox.css`
  // 내부에 inline emit. 수동 ListBox.css 의 orientation/layout/Popover cascade 가 같은 @layer
  // 에서 `.react-aria-ListBoxItem` selector 를 override 할 수 있도록 보장.
  // ADR-099 Phase 3 (098-c 슬롯): HeaderSpec 추가 — `.react-aria-ListBox .react-aria-Header`
  // 블록이 동일 generated/ListBox.css 에 inline emit. Preview DOM 의 RAC `<Header>` 가
  // section 엔트리 렌더 시 sticky 위치 + muted 스타일 적용.
  childSpecs: [ListBoxItemSpec, HeaderSpec],

  defaultVariant: "default",
  defaultSize: "md",

  properties: {
    sections: [
      {
        title: "State",
        fields: [
          {
            key: "selectionMode",
            type: "enum",
            label: "Selection Mode",
            icon: List,
            options: [
              { value: "none", label: "None" },
              { value: "single", label: "Single" },
              { value: "multiple", label: "Multiple" },
            ],
            defaultValue: "single",
          },
          {
            key: "selectionBehavior",
            type: "enum",
            label: "Selection Behavior",
            icon: MousePointer2,
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
        ],
      },
      {
        title: "Performance",
        fields: [
          {
            key: "enableVirtualization",
            type: "boolean",
            label: "Enable Virtualization",
            icon: Zap,
            defaultValue: true,
          },
          {
            key: "height",
            type: "number",
            label: "Container Height (px)",
            icon: Ruler,
            visibleWhen: { key: "enableVirtualization", equals: true },
          },
          {
            key: "overscan",
            type: "number",
            label: "Overscan",
            icon: Rows,
            visibleWhen: { key: "enableVirtualization", equals: true },
            defaultValue: 5,
          },
        ],
      },
      {
        title: "Item Management",
        fields: [
          {
            key: "items",
            type: "items-manager",
            label: "Items",
            itemsKey: "items",
            itemTypeName: "ListBoxItem",
            defaultItem: {
              id: "", // runtime에서 crypto.randomUUID() 주입
              label: "New Item",
              value: "",
              isDisabled: false,
            },
            itemSchema: [
              { key: "label", type: "string", label: "Label" },
              { key: "value", type: "string", label: "Value" },
              { key: "textValue", type: "string", label: "Text Value" },
              { key: "description", type: "string", label: "Description" },
              { key: "isDisabled", type: "boolean", label: "Disabled" },
              { key: "href", type: "string", label: "URL" },
            ],
            labelKey: "label",
            allowNested: false,
          },
        ],
      },
      FILTERING_SECTION,
    ],
  },

  // @sync containerStyles.background = {color.raised}
  // Generator CSS 와 Skia render.shapes 가 동일한 컨테이너 배경(raised)을 사용해야
  // D3 symmetric consumer 대칭 유지 (이전 {color.base} 는 페이지 bg 와 혼동 위험)
  variants: {
    default: {
      background: "{color.raised}" as TokenRef,
      backgroundHover: "{color.layer-2}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
    accent: {
      background: "{color.raised}" as TokenRef,
      backgroundHover: "{color.accent-subtle}" as TokenRef,
      backgroundPressed: "{color.accent-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
  },

  // @sync CSS container padding = `--spacing-xs` = 4 (containerStyles.padding 과 일치)
  // 프로젝트 관례 (Menu/MenuItem/Select): `sizes.*.paddingX/Y` = 해당 Spec 컴포넌트
  // 자체의 내부 padding. ListBox 는 container 역할이므로 container padding 만 표현.
  // ADR-078 Phase 3: item padding/lineHeight 는 `ListBoxItemSpec.sizes.md` SSOT +
  //   `resolveListBoxItemMetric(fontSize)` 공급 — Skia render.shapes 와 layout 공유.
  // gap 은 CSS `--spacing-2xs` = 2.
  sizes: {
    md: {
      height: 0,
      paddingX: 4,
      paddingY: 4,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      gap: 2,
    },
  },

  states: {
    hover: {},
    pressed: {},
    disabled: {
      opacity: 0.38,
      pointerEvents: "none",
    },
    focusVisible: {
      focusRing: "{focus.ring.default}",
    },
  },

  // ADR-076: propagation.rules 삭제 — 정적 모드 shapes 가 부모 variant 직접 참조,
  // 템플릿 모드는 Field 자식이 렌더하므로 childPath 전파 불필요

  render: {
    shapes: (props, size, state = "default") => {
      // ADR-076 이후 variants={default, accent} 로 재편. 이전에 DB 에 저장된
      //   element 의 variant 가 현재 variants 키와 맞지 않는 경우 (예: "primary")
      //   lookup 실패 → undefined → resolveStateColors(undefined, ...) crash.
      //   ADR-079 Hard Constraint 1 (migration 금지) 준수 위해 spec 레벨 fallback.
      const requestedVariant = (
        props as { variant?: keyof typeof ListBoxSpec.variants }
      ).variant;
      const variant =
        (requestedVariant
          ? ListBoxSpec.variants![requestedVariant]
          : undefined) ?? ListBoxSpec.variants![ListBoxSpec.defaultVariant!]!;
      const width =
        typeof props._containerWidth === "number" && props._containerWidth > 0
          ? props._containerWidth
          : (props.style?.width as number) || 200;

      // 사용자 스타일 우선, 없으면 spec 기본값
      const bgColor =
        props.style?.backgroundColor ??
        resolveStateColors(variant, state).background;

      const styleBr = props.style?.borderRadius;
      const borderRadius =
        styleBr != null
          ? typeof styleBr === "number"
            ? styleBr
            : parseFloat(String(styleBr)) || 0
          : size.borderRadius;

      const textColor = props.style?.color ?? variant.text;
      const fontSize = resolveSpecFontSize(
        props.style?.fontSize ?? size.fontSize,
        14,
      );
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;
      const textAlign =
        (props.style?.textAlign as "left" | "center" | "right") || "left";

      const shapes: Shape[] = [];

      // 리스트 컨테이너 배경
      shapes.push({
        id: "bg",
        type: "roundRect" as const,
        x: 0,
        y: 0,
        width,
        height: "auto",
        radius: borderRadius as unknown as number,
        fill: bgColor,
      });

      // 테두리
      const borderColor = props.style?.borderColor ?? variant.border;
      const styleBw = props.style?.borderWidth;
      const borderWidth =
        styleBw != null
          ? typeof styleBw === "number"
            ? styleBw
            : parseFloat(String(styleBw)) || 0
          : 1;
      if (borderColor) {
        shapes.push({
          type: "border" as const,
          target: "bg",
          borderWidth,
          color: borderColor,
          radius: borderRadius as unknown as number,
        });
      }

      // Child Composition: 자식 Element가 있으면 spec shapes에서 아이템 렌더링 스킵
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // 리스트 아이템 생성 (ADR-076: StoredListBoxItem[] SSOT / ADR-099 Phase 2: Entry[] 확장)
      // fallback placeholder — items 부재 시 3개 샘플 (Select 선례)
      const entries: StoredListBoxEntry[] =
        props.items && props.items.length > 0
          ? props.items
          : [
              { id: "item-1", label: "Item 1" },
              { id: "item-2", label: "Item 2" },
              { id: "item-3", label: "Item 3" },
            ];

      // ADR-099 Phase 2: flatItems — section 내부 items 를 flat 전개 (selection index 검색용).
      //   RAC 공식 ListBoxSection 은 단일 level (nested section 미지원) — flat 전개 안전.
      const flatItems: StoredListBoxItem[] = [];
      for (const entry of entries) {
        if (isListBoxSectionEntry(entry)) {
          flatItems.push(...entry.items);
        } else {
          flatItems.push(entry);
        }
      }

      // ADR-078 Phase 3: item metric SSOT = ListBoxItemSpec.sizes.md.
      //   paddingX/paddingY/lineHeight/itemHeight 를 `resolveListBoxItemMetric(fontSize)` 로
      //   공급 받아 Skia/layout(calculateContentHeight) 양쪽이 동일 공식 사용.
      const itemMetric = resolveListBoxItemMetric(fontSize);
      const ITEM_PADDING_X = itemMetric.paddingX;
      const itemH = itemMetric.itemHeight;
      // ADR-078 Phase 5 fix #2: container padding/gap 은 `props.style` 우선 읽기.
      //   factory 가 style 에 명시 주입(display/flexDirection/gap/padding) 하므로
      //   스타일 패널 편집값이 Canvas 렌더에 즉시 반영. style 미지정 시 Spec sizes fallback.
      //   PropertyUnitInput 은 `"10px"` 같은 string 을 전달 — number/string 모두 파싱.
      const toPx = (v: unknown, fallback: number): number => {
        if (typeof v === "number") return v;
        if (typeof v === "string") {
          const n = parseFloat(v);
          if (Number.isFinite(n)) return n;
        }
        return fallback;
      };
      const paddingY = toPx(
        props.style?.paddingTop ?? props.style?.padding,
        (size.paddingY as unknown as number) || 4,
      );
      const paddingX = toPx(
        props.style?.paddingLeft ?? props.style?.padding,
        (size.paddingX as unknown as number) || 4,
      );
      const gap = toPx(props.style?.gap, (size.gap as unknown as number) || 2);
      // Skia 좌표는 bg roundRect(border 포함) 0,0 기준이므로 item 배치는 border 안쪽으로
      //   밀어야 Preview DOM (border-box + padding 내부 item) 와 정합.
      //   layout/engines/utils.ts:1545 공식(paddingY*2 + items*itemH + (items-1)*gap + border*2)
      //   과 동일 시각 결과를 재현.
      const innerPaddingX = paddingX + borderWidth;
      const innerPaddingY = paddingY + borderWidth;
      let itemY = innerPaddingY;

      // 선택 상태 계산 — canonical(selectedKey/selectedKeys) 우선, legacy index fallback
      // ADR-099 Phase 2: flatItems 기준 id Set — section 내부 items 포함하여 검색
      const selectedIdSet = new Set<string>();
      if (props.selectedKeys && props.selectedKeys.length > 0) {
        for (const key of props.selectedKeys) selectedIdSet.add(key);
      } else if (props.selectedKey != null) {
        selectedIdSet.add(props.selectedKey);
      } else if (props.selectedIndices && props.selectedIndices.length > 0) {
        for (const idx of props.selectedIndices) {
          const flat = flatItems[idx];
          if (flat) selectedIdSet.add(flat.id);
        }
      } else if (props.selectedIndex != null) {
        const flat = flatItems[props.selectedIndex];
        if (flat) selectedIdSet.add(flat.id);
      } else if (flatItems[0]) {
        selectedIdSet.add(flatItems[0].id);
      }

      // ADR-099 Phase 2: Section Header metric.
      //   fontSize * 1.75 + inter-section padding — RAC 기본 sticky header 시각 근사.
      //   Phase 6 Chrome MCP 실측에서 교정 가능.
      const HEADER_HEIGHT = Math.round(fontSize * 1.75);
      const HEADER_FONT_SIZE = Math.round(fontSize * 0.85);
      const SECTION_TOP_PAD = Math.round(fontSize * 0.5);

      // ADR-099 Phase 2: item 렌더 헬퍼 — 기존 인라인 로직을 entries 순회 내부에서 재사용.
      const renderOneItem = (item: StoredListBoxItem, y: number) => {
        const isSelected = selectedIdSet.has(item.id);
        const isItemDisabled = Boolean(item.isDisabled);

        shapes.push({
          type: "roundRect" as const,
          x: innerPaddingX,
          y,
          width: width - innerPaddingX * 2,
          height: itemH,
          radius: borderRadius as unknown as number,
          fill: isSelected ? variant.backgroundHover : bgColor,
        });

        if (props.selectionMode === "multiple") {
          shapes.push({
            type: "icon_font" as const,
            iconName: isSelected ? "check-square" : "square",
            x: innerPaddingX + ITEM_PADDING_X,
            y: y + itemH / 2,
            fontSize,
            fill: isSelected
              ? ("{color.accent}" as TokenRef)
              : ("{color.neutral-subdued}" as TokenRef),
            strokeWidth: 2,
          });
        }

        const textX =
          props.selectionMode === "multiple"
            ? innerPaddingX + ITEM_PADDING_X + fontSize + 6
            : innerPaddingX + ITEM_PADDING_X;
        const itemTextFill = isItemDisabled
          ? ("{color.neutral-subdued}" as TokenRef)
          : isSelected
            ? ("{color.neutral}" as TokenRef)
            : textColor;
        shapes.push({
          type: "text" as const,
          x: textX,
          y: y + itemH / 2,
          text: item.label,
          fontSize,
          fontFamily: ff,
          fontWeight: 600,
          fill: itemTextFill,
          align: textAlign,
          baseline: "middle" as const,
        });
      };

      // ADR-099 Phase 2: entries 순회 — section 분기 + item 렌더.
      //   Header 는 첫 section 외 앞에 SECTION_TOP_PAD 추가 (섹션 간 시각 구분).
      let hasRenderedEntry = false;
      for (const entry of entries) {
        if (isListBoxSectionEntry(entry)) {
          if (hasRenderedEntry) itemY += SECTION_TOP_PAD;
          // Section Header — text shape (Phase 3 에서 HeaderSpec childSpecs + CSS emit 추가)
          shapes.push({
            type: "text" as const,
            x: innerPaddingX + ITEM_PADDING_X,
            y: itemY + HEADER_HEIGHT / 2,
            text: entry.header,
            fontSize: HEADER_FONT_SIZE,
            fontFamily: ff,
            fontWeight: 700,
            fill: "{color.neutral-subdued}" as TokenRef,
            align: "left" as const,
            baseline: "middle" as const,
          });
          itemY += HEADER_HEIGHT + gap;
          for (const item of entry.items) {
            renderOneItem(item, itemY);
            itemY += itemH + gap;
          }
        } else {
          renderOneItem(entry, itemY);
          itemY += itemH + gap;
        }
        hasRenderedEntry = true;
      }

      return shapes;
    },

    react: (props) => ({
      "data-disabled": props.isDisabled || undefined,
      role: "listbox",
      "aria-multiselectable": props.selectionMode === "multiple" || undefined,
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ("none" as const) : ("static" as const),
      cursor: props.isDisabled ? "not-allowed" : "default",
    }),
  },
};
