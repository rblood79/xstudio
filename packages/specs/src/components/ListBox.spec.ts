/**
 * ListBox Component Spec
 *
 * React Aria 기반 리스트박스 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveStateColors } from "../utils/stateEffect";
import { resolveToken } from "../renderers/utils/tokenResolver";
import {
  List,
  SquareX,
  PointerOff,
  Focus,
  Zap,
  Ruler,
  Rows,
  FormInput,
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
  /** 아이템 목록 (우선순위: items > children 개행 분리) */
  items?: string[];
  /** 선택된 아이템 인덱스 (단일 선택용 하이라이트) */
  selectedIndex?: number;
  /** 선택된 아이템 인덱스 목록 (다중 선택용 하이라이트) */
  selectedIndices?: number[];
  children?: string;
  /** ElementSprite 주입: 엔진 계산 최종 폭 */
  _containerWidth?: number;
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
  skipCSSGeneration: true,

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
              { value: "single", label: "Single" },
              { value: "multiple", label: "Multiple" },
            ],
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
            key: "autoFocus",
            type: "boolean",
            label: "Auto Focus",
            icon: Focus,
          },
          {
            key: "name",
            type: "string",
            label: "Name",
            icon: FormInput,
            emptyToUndefined: true,
            placeholder: "listbox-name",
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
            childTag: "ListBoxItem",
            defaultChildProps: {
              label: "Item",
              value: "",
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
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.layer-2}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
    accent: {
      background: "{color.base}" as TokenRef,
      backgroundHover: "{color.accent-subtle}" as TokenRef,
      backgroundPressed: "{color.accent-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
      border: "{color.border}" as TokenRef,
    },
  },

  sizes: {
    md: {
      height: 0,
      paddingX: 12,
      paddingY: 8,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      gap: 4,
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
      outline: "2px solid var(--accent)",
      outlineOffset: "2px",
    },
  },

  propagation: {
    rules: [
      { parentProp: "variant", childPath: "ListBoxItem", override: true },
    ],
  },

  render: {
    shapes: (props, variant, size, state = "default") => {
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
      const rawFontSize = props.style?.fontSize ?? size.fontSize;
      const resolvedFs =
        typeof rawFontSize === "number"
          ? rawFontSize
          : typeof rawFontSize === "string" && rawFontSize.startsWith("{")
            ? resolveToken(rawFontSize as TokenRef)
            : rawFontSize;
      const fontSize = typeof resolvedFs === "number" ? resolvedFs : 14;
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

      // 리스트 아이템 생성
      const items: string[] =
        props.items ??
        (props.children
          ? props.children.split("\n").filter(Boolean)
          : ["Item 1", "Item 2", "Item 3"]);

      const itemH = fontSize > 16 ? 40 : fontSize > 12 ? 36 : 32;
      const paddingY = (size.paddingY as unknown as number) || 8;
      const gap = (size.gap as unknown as number) || 4;
      const paddingX = (size.paddingX as unknown as number) || 12;
      let itemY = paddingY;

      // 선택 상태 계산
      const selectedSet = new Set<number>(
        props.selectedIndices ??
          (props.selectedIndex != null ? [props.selectedIndex] : [0]),
      );

      for (let i = 0; i < items.length; i++) {
        const isSelected = selectedSet.has(i);

        // 아이템 배경 (선택/hover 상태 표시)
        shapes.push({
          type: "roundRect" as const,
          x: 4,
          y: itemY + 2,
          width: width - 8,
          height: itemH - 4,
          radius: borderRadius as unknown as number,
          fill: isSelected ? variant.backgroundHover : bgColor,
        });

        // 선택 표시 아이콘 (다중 선택 모드)
        if (props.selectionMode === "multiple") {
          shapes.push({
            type: "icon_font" as const,
            iconName: isSelected ? "check-square" : "square",
            x: paddingX + 6,
            y: itemY + itemH / 2,
            fontSize,
            fill: isSelected
              ? ("{color.accent}" as TokenRef)
              : ("{color.neutral-subdued}" as TokenRef),
            strokeWidth: 2,
          });
        }

        // 아이템 텍스트
        const textX =
          props.selectionMode === "multiple"
            ? paddingX + fontSize + 10
            : paddingX;
        shapes.push({
          type: "text" as const,
          x: textX,
          y: itemY + itemH / 2,
          text: items[i],
          fontSize,
          fontFamily: ff,
          fontWeight: 600,
          fill: isSelected ? ("{color.neutral}" as TokenRef) : textColor,
          align: textAlign,
          baseline: "middle" as const,
        });

        itemY += itemH + gap;
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
