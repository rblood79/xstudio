/**
 * Select Component Spec
 *
 * React Aria 기반 드롭다운 셀렉트 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import type { StoredSelectItem } from "../types/select-items";
import { fontFamily, getLabelLineHeight } from "../primitives/typography";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";
import {
  Hash,
  SquareX,
  CheckSquare,
  PointerOff,
  Layout,
  Tag,
  FileText,
  AlertTriangle,
  SpellCheck2,
  AlignLeft,
  HelpCircle,
  Columns,
  EyeOff,
  Loader,
  ArrowUpDown,
  FlipVertical,
} from "lucide-react";

/**
 * Select Props
 */
export interface SelectProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  label?: string;
  placeholder?: string;
  name?: string;
  value?: string;
  defaultSelectedKey?: string;
  selectedValue?: string;
  selectedText?: string;
  description?: string;
  errorMessage?: string;
  isOpen?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  isQuiet?: boolean;
  isLoading?: boolean;
  autoFocus?: boolean;
  labelPosition?: "top" | "side";
  labelAlign?: "start" | "end";
  align?: "start" | "end";
  direction?: "bottom" | "top";
  shouldFlip?: boolean;
  necessityIndicator?: "icon" | "label";
  disallowEmptySelection?: boolean;
  validationBehavior?: "native" | "aria";
  form?: string;
  /** 드롭다운 아이템 목록 (ADR-073 P2: StoredSelectItem[] SSOT) */
  items?: StoredSelectItem[];
  /** 선택된 아이템 인덱스 (하이라이트용) */
  selectedIndex?: number;
  menuWidth?: string;
  contextualHelp?: string;
  children?: string;
  /** ElementSprite 주입: 엔진 계산 최종 폭 */
  _containerWidth?: number;
  style?: Record<string, string | number | undefined>;
  /** ElementSprite에서 주입: 자식 Element 존재 시 spec shapes에서 label 렌더링 스킵 */
  _hasChildren?: boolean;
}

/**
 * Select Component Spec
 */
export const SelectSpec: ComponentSpec<SelectProps> = {
  name: "Select",
  description: "React Aria 기반 드롭다운 셀렉트 컴포넌트",
  element: "div",
  skipCSSGeneration: false,

  defaultSize: "md",

  // ADR-096: DEFAULT_ELEMENT_WIDTHS/HEIGHTS["select"] = 150/36 이관. BC 영향 0.
  defaultWidth: 150,
  defaultHeight: 36,

  properties: {
    sections: [
      {
        title: "Content",
        fields: [
          {
            key: "label",
            type: "string",
            label: "Label",
            icon: Tag,
            emptyToUndefined: true,
          },
          {
            key: "description",
            type: "string",
            label: "Description",
            icon: FileText,
            emptyToUndefined: true,
          },
          {
            key: "errorMessage",
            type: "string",
            label: "Error Message",
            icon: AlertTriangle,
            emptyToUndefined: true,
          },
          {
            key: "placeholder",
            type: "string",
            label: "Placeholder",
            icon: SpellCheck2,
            emptyToUndefined: true,
          },
          {
            key: "contextualHelp",
            type: "string",
            label: "Contextual Help",
            icon: HelpCircle,
            emptyToUndefined: true,
          },
        ],
      },
      {
        title: "Appearance",
        fields: [
          { type: "size" },
          {
            key: "labelPosition",
            type: "enum",
            label: "Label Position",
            icon: Layout,
            options: [
              { value: "top", label: "Top" },
              { value: "side", label: "Side" },
            ],
            defaultValue: "top",
          },
          {
            key: "labelAlign",
            type: "enum",
            label: "Label Align",
            icon: AlignLeft,
            options: [
              { value: "start", label: "Start" },
              { value: "end", label: "End" },
            ],
            defaultValue: "start",
          },
          { key: "isQuiet", type: "boolean", label: "Quiet", icon: EyeOff },
          { key: "isLoading", type: "boolean", label: "Loading", icon: Loader },
          {
            key: "align",
            type: "enum",
            label: "Align",
            icon: AlignLeft,
            options: [
              { value: "start", label: "Start" },
              { value: "end", label: "End" },
            ],
            defaultValue: "start",
          },
          {
            key: "direction",
            type: "enum",
            label: "Direction",
            icon: ArrowUpDown,
            options: [
              { value: "bottom", label: "Bottom" },
              { value: "top", label: "Top" },
            ],
            defaultValue: "bottom",
          },
          {
            key: "shouldFlip",
            type: "boolean",
            label: "Should Flip",
            icon: FlipVertical,
            defaultValue: true,
          },
          {
            key: "menuWidth",
            type: "string",
            label: "Menu Width",
            icon: Columns,
            emptyToUndefined: true,
            placeholder: "auto",
          },
        ],
      },
      {
        title: "State",
        fields: [
          {
            key: "selectedValue",
            type: "string",
            label: "Value",
            icon: Hash,
            emptyToUndefined: true,
          },
          {
            key: "defaultSelectedKey",
            type: "string",
            label: "Default Selected Key",
            icon: Hash,
            emptyToUndefined: true,
          },
          {
            key: "disallowEmptySelection",
            type: "boolean",
            label: "Disallow Empty Selection",
            icon: SquareX,
          },
          {
            key: "necessityIndicator",
            type: "enum",
            label: "Required",
            icon: CheckSquare,
            emptyToUndefined: true,
            derivedUpdateFn: (value) => {
              if (value === undefined || value === "") {
                return {
                  isRequired: false,
                  necessityIndicator: undefined,
                };
              }

              return {
                isRequired: true,
                necessityIndicator: value as "icon" | "label",
              };
            },
            options: [
              { value: "", label: "None" },
              { value: "icon", label: "Icon (*)" },
              { value: "label", label: "Label (required/optional)" },
            ],
          },
          {
            key: "isInvalid",
            type: "boolean",
            label: "Invalid",
            icon: AlertTriangle,
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
        title: "Item Management",
        fields: [
          {
            key: "items",
            type: "items-manager",
            label: "Options",
            itemsKey: "items",
            itemTypeName: "Option",
            defaultItem: {
              id: "",
              label: "Option",
              value: "",
              isDisabled: false,
            },
            itemSchema: [
              { key: "label", type: "string", label: "Label" },
              { key: "value", type: "string", label: "Value" },
              { key: "textValue", type: "string", label: "Text Value" },
              { key: "description", type: "string", label: "Description" },
              { key: "icon", type: "icon", label: "Icon" },
              { key: "isDisabled", type: "boolean", label: "Disabled" },
              { key: "onActionId", type: "event-id", label: "On Action" },
            ],
            labelKey: "label",
            allowNested: false,
          },
        ],
      },
    ],
  },

  // BUTTON_FAMILY_HEIGHTS (primitives/buttonSizes.ts) 와 동일 metric.
  // height = lineHeight + paddingY×2 + borderWidth×2
  sizes: {
    xs: {
      height: 20,
      paddingX: 4,
      paddingY: 1,
      fontSize: "{typography.text-2xs}" as TokenRef,
      borderRadius: "{radius.xs}" as TokenRef,
      iconSize: 10,
      gap: 2,
    },
    sm: {
      height: 22,
      paddingX: 8,
      paddingY: 2,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      iconSize: 14,
      gap: 4,
    },
    md: {
      height: 30,
      paddingX: 12,
      paddingY: 4,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      iconSize: 18,
      gap: 6,
    },
    lg: {
      height: 42,
      paddingX: 16,
      paddingY: 8,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      iconSize: 22,
      gap: 8,
    },
    xl: {
      height: 54,
      paddingX: 24,
      paddingY: 12,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.xl}" as TokenRef,
      iconSize: 28,
      gap: 10,
    },
  },

  // ADR-036 Phase 3a: Tier 2 Composite CSS 생성 메타데이터
  composition: {
    layout: "flex-column",
    gap: "var(--spacing-xs)",
    containerStyles: {
      color: "var(--fg)",
    },
    containerVariants: {
      "label-position": {
        side: {
          styles: {
            "flex-direction": "row",
            "align-items": "flex-start",
          },
        },
      },
      disabled: {
        true: {
          nested: [
            {
              selector: ".react-aria-Button",
              styles: {
                background: "color-mix(in srgb, var(--fg) 4%, transparent)",
                "border-color":
                  "color-mix(in srgb, var(--fg) 12%, transparent)",
                color: "color-mix(in srgb, var(--fg) 38%, transparent)",
                cursor: "not-allowed",
                opacity: "0.38",
              },
            },
            {
              selector: ".react-aria-Button .select-chevron",
              styles: {
                background: "color-mix(in srgb, var(--fg) 12%, transparent)",
                color: "color-mix(in srgb, var(--fg) 38%, transparent)",
              },
            },
          ],
        },
      },
      quiet: {
        true: {
          nested: [
            {
              selector: ".react-aria-Button",
              styles: {
                background: "transparent",
                "border-color": "transparent",
                "box-shadow": "none",
                "border-radius": "0",
                "border-bottom": "1px solid var(--border)",
              },
            },
            {
              selector:
                ".react-aria-Button[data-hovered]:not([data-pressed]):not([data-disabled])",
              styles: {
                background: "transparent",
                "border-color": "transparent",
                "box-shadow": "none",
                "border-bottom-color": "var(--border-hover)",
              },
            },
            {
              selector:
                ".react-aria-Button[data-focus-visible]:not([data-disabled])",
              styles: {
                outline: "none",
                background: "transparent",
                "border-color": "transparent",
                "box-shadow": "none",
                "border-bottom-color": "var(--accent)",
              },
            },
            {
              selector: ".react-aria-Button[data-focused]:not([data-disabled])",
              styles: {
                outline: "none",
                background: "transparent",
                "border-color": "transparent",
                "box-shadow": "none",
                "border-bottom-color": "var(--accent)",
              },
            },
            {
              selector: ".react-aria-Button[data-pressed]:not([data-disabled])",
              styles: {
                outline: "none",
                background: "transparent",
                "border-color": "transparent",
                "box-shadow": "none",
                "border-bottom-color": "var(--accent)",
              },
            },
            {
              selector: "&[data-invalid] .react-aria-Button",
              styles: {
                "border-color": "transparent",
                "border-bottom-color": "var(--negative)",
              },
            },
          ],
        },
      },
    },
    externalStyles: [
      {
        selector: '.react-aria-Popover[data-trigger="Select"]',
        styles: {
          "min-width": "var(--trigger-width)",
          "max-height": "300px",
          overflow: "auto",
          border: "1px solid var(--border)",
          "border-radius": "var(--border-radius)",
          background: "var(--bg-raised)",
          "box-shadow": "var(--shadow-lg)",
          contain: "layout style",
        },
        nested: [
          {
            selector: ".react-aria-ListBox",
            styles: {
              border: "none",
              background: "transparent",
              "max-height": "none",
              "min-height": "24px",
            },
          },
        ],
      },
    ],
    delegation: [
      {
        childSelector: ".react-aria-Label",
        prefix: "select-label",
        variables: {
          xs: { "--select-label-size": "var(--text-2xs)" },
          sm: { "--select-label-size": "var(--text-xs)" },
          md: { "--select-label-size": "var(--text-sm)" },
          lg: { "--select-label-size": "var(--text-base)" },
          xl: { "--select-label-size": "var(--text-lg)" },
        },
        bridges: {
          "--label-font-size": "var(--select-label-size)",
          "--label-font-weight": "600",
          "--label-margin": "var(--spacing-xs)",
        },
      },
      {
        childSelector: ".react-aria-Button",
        prefix: "select-btn",
        variables: {
          xs: {
            "--select-btn-padding":
              "var(--spacing-3xs) var(--spacing-3xs) var(--spacing-3xs) var(--spacing-xs)",
            "--select-btn-font-size": "var(--text-2xs)",
            "--select-btn-line-height": "var(--text-2xs--line-height)",
          },
          sm: {
            "--select-btn-padding":
              "var(--spacing-2xs) var(--spacing-2xs) var(--spacing-2xs) var(--spacing-sm)",
            "--select-btn-font-size": "var(--text-xs)",
            "--select-btn-line-height": "var(--text-xs--line-height)",
          },
          md: {
            "--select-btn-padding":
              "var(--spacing-xs) var(--spacing-xs) var(--spacing-xs) var(--spacing-md)",
            "--select-btn-font-size": "var(--text-sm)",
            "--select-btn-line-height": "var(--text-sm--line-height)",
          },
          lg: {
            "--select-btn-padding":
              "var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) var(--spacing-lg)",
            "--select-btn-font-size": "var(--text-base)",
            "--select-btn-line-height": "var(--text-base--line-height)",
          },
          xl: {
            "--select-btn-padding":
              "var(--spacing-md) var(--spacing-md) var(--spacing-md) var(--spacing-xl)",
            "--select-btn-font-size": "var(--text-lg)",
            "--select-btn-line-height": "var(--text-lg--line-height)",
          },
        },
        bridges: {
          width: "100%",
          padding: "var(--select-btn-padding)",
          "text-align": "left",
          border: "1px solid var(--border)",
          "border-radius": "var(--border-radius)",
          background: "var(--bg-inset)",
          color: "var(--fg)",
          "forced-color-adjust": "none",
          "font-size": "var(--select-btn-font-size)",
          "line-height": "var(--select-btn-line-height)",
        },
        states: {
          "[data-hovered]:not([data-pressed]):not([data-disabled])": {
            "border-color": "var(--border-hover)",
            background: "var(--bg-overlay)",
          },
          "[data-pressed]:not([data-disabled])": {
            background: "var(--accent-subtle)",
            outline: "2px solid var(--accent)",
            "outline-offset": "-1px",
          },
          "[data-focus-visible]": {
            outline: "2px solid var(--accent)",
            "outline-offset": "-1px",
          },
          "[data-disabled]": {
            background: "color-mix(in srgb, var(--fg) 4%, transparent)",
            "border-color": "color-mix(in srgb, var(--fg) 12%, transparent)",
            color: "color-mix(in srgb, var(--fg) 38%, transparent)",
            cursor: "not-allowed",
            opacity: "0.38",
          },
        },
      },
      {
        childSelector: ".react-aria-SelectValue",
        bridges: {
          "font-size": "var(--select-btn-font-size)",
          color: "var(--fg)",
          flex: "1",
          display: "flex",
          "white-space": "nowrap",
          "text-overflow": "ellipsis",
          overflow: "hidden",
        },
        states: {
          "[data-placeholder]": {
            "font-style": "normal",
            color: "var(--fg-muted)",
            opacity: "0.6",
          },
        },
      },
      {
        childSelector: '.react-aria-SelectValue [slot="description"]',
        bridges: {
          display: "none",
        },
      },
      {
        childSelector: ".select-chevron",
        prefix: "select-chevron",
        variables: {
          xs: {
            "--select-chevron-size": "14px",
            "--select-chevron-margin": "var(--spacing-xs)",
          },
          sm: {
            "--select-chevron-size": "16px",
            "--select-chevron-margin": "var(--spacing-sm)",
          },
          md: {
            "--select-chevron-size": "18px",
            "--select-chevron-margin": "var(--spacing)",
          },
          lg: {
            "--select-chevron-size": "22px",
            "--select-chevron-margin": "var(--spacing-md)",
          },
          xl: {
            "--select-chevron-size": "28px",
            "--select-chevron-margin": "var(--spacing-lg)",
          },
        },
        bridges: {
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          width: "var(--select-chevron-size)",
          height: "var(--select-chevron-size)",
          "margin-left": "var(--select-chevron-margin)",
          "border-radius": "var(--radius-xs)",
          background: "var(--bg-overlay)",
          color: "var(--fg)",
          transition: "all 150ms ease",
          "forced-color-adjust": "none",
          "box-shadow": "var(--shadow-sm)",
        },
      },
      {
        childSelector: ".react-aria-FieldError",
        prefix: "select-hint",
        variables: {
          xs: { "--select-hint-size": "var(--text-2xs)" },
          sm: { "--select-hint-size": "var(--text-2xs)" },
          md: { "--select-hint-size": "var(--text-xs)" },
          lg: { "--select-hint-size": "var(--text-sm)" },
          xl: { "--select-hint-size": "var(--text-base)" },
        },
        bridges: {
          "--error-font-size": "var(--select-hint-size)",
          "--error-margin": "var(--spacing-xs)",
        },
      },
      {
        childSelector: '[slot="description"]',
        bridges: {
          "font-size": "var(--select-hint-size)",
          color: "var(--fg-muted)",
        },
      },
    ],
  },

  states: {
    hover: {},
    pressed: {},
    disabled: {
      opacity: 0.38,
      cursor: "not-allowed",
      pointerEvents: "none",
    },
    focusVisible: {
      focusRing: "{focus.ring.default}",
    },
  },

  propagation: {
    rules: [
      { parentProp: "size", childPath: "SelectTrigger", override: true },
      {
        parentProp: "size",
        childPath: ["SelectTrigger", "SelectValue"],
        override: true,
      },
      {
        parentProp: "size",
        childPath: ["SelectTrigger", "SelectIcon"],
        override: true,
      },
      { parentProp: "size", childPath: "Label", override: true },
      {
        parentProp: "label",
        childPath: "Label",
        childProp: "children",
        override: true,
      },
      {
        parentProp: "placeholder",
        childPath: ["SelectTrigger", "SelectValue"],
        childProp: "children",
        override: true,
      },
    ],
  },

  render: {
    shapes: (props, size, state = "default") => {
      const width =
        typeof props._containerWidth === "number" && props._containerWidth > 0
          ? props._containerWidth
          : (props.style?.width as number) || 200;
      const chevronSize = size.iconSize ?? 18;

      const styleBr = props.style?.borderRadius;
      const borderRadius =
        styleBr != null
          ? typeof styleBr === "number"
            ? styleBr
            : parseFloat(String(styleBr)) || 0
          : (size.borderRadius as unknown as number);

      const bgColor =
        props.style?.backgroundColor ??
        (state === "hover"
          ? ("{color.layer-1}" as TokenRef)
          : state === "pressed"
            ? ("{color.layer-1}" as TokenRef)
            : ("{color.elevated}" as TokenRef));

      const borderColor = props.style?.borderColor;

      const styleBw = props.style?.borderWidth;
      const defaultBw = props.isInvalid ? 2 : 1;
      const borderWidth =
        styleBw != null
          ? typeof styleBw === "number"
            ? styleBw
            : parseFloat(String(styleBw)) || 0
          : defaultBw;

      // size.fontSize는 TokenRef 문자열('{typography.text-sm}')일 수 있으므로
      // resolveSpecFontSize로 숫자 변환 후 산술 연산에 사용
      const fontSize = resolveSpecFontSize(
        props.style?.fontSize ?? size.fontSize,
        14,
      );

      // CSS 정합성: size.height는 CSS와 동기화된 값 (lineHeight + paddingY*2 + borderWidth*2)
      const labelLineHeight = getLabelLineHeight(fontSize);
      const labelGap = 8;
      const labelOffset = labelLineHeight + labelGap;
      const triggerHeight = size.height as number;
      const triggerY = props.label ? labelOffset : 0;

      const fwRaw = props.style?.fontWeight;
      const fontWeight =
        fwRaw != null
          ? typeof fwRaw === "number"
            ? fwRaw
            : parseInt(String(fwRaw), 10) || 500
          : 500;

      const ff = (props.style?.fontFamily as string) || fontFamily.sans;

      const textAlign =
        (props.style?.textAlign as "left" | "center" | "right") || "left";

      const textColor = props.style?.color ?? ("{color.neutral}" as TokenRef);

      const stylePx =
        props.style?.paddingLeft ??
        props.style?.paddingRight ??
        props.style?.padding;
      const paddingX =
        stylePx != null
          ? typeof stylePx === "number"
            ? stylePx
            : parseFloat(String(stylePx)) || 0
          : size.paddingX;

      const shapes: Shape[] = [];
      // Compositional Architecture: 자식 Element가 있으면
      // Label, SelectTrigger(SelectValue, SelectIcon)가 각자 spec으로 렌더링
      // Select 자체에서는 드롭다운 패널만 담당
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;

      if (!hasChildren) {
        // fallback: 자식이 없는 레거시 데이터 → 전체 렌더링
        if (props.label) {
          shapes.push({
            type: "text" as const,
            x: 0,
            y: 0,
            text: props.label,
            fontSize,
            fontFamily: ff,
            fontWeight,
            fill: textColor,
            align: textAlign,
            baseline: "top" as const,
          });
        }

        shapes.push({
          id: "trigger",
          type: "roundRect" as const,
          x: 0,
          y: triggerY,
          width,
          height: triggerHeight,
          radius: borderRadius,
          fill: bgColor,
        });

        if (borderColor) {
          shapes.push({
            type: "border" as const,
            target: "trigger",
            borderWidth,
            color: props.isInvalid
              ? ("{color.negative}" as TokenRef)
              : borderColor,
            radius: borderRadius,
          });
        }

        const displayText =
          props.selectedText || props.value || props.placeholder || "";
        if (displayText) {
          const isPlaceholder =
            !props.selectedText && !props.value && !!props.placeholder;
          shapes.push({
            type: "text" as const,
            x: paddingX,
            y: triggerY + triggerHeight / 2,
            text: displayText,
            fontSize,
            fontFamily: ff,
            fill: isPlaceholder
              ? ("{color.neutral-subdued}" as TokenRef)
              : textColor,
            align: textAlign,
            baseline: "middle" as const,
          });
        }

        const chevX = width - paddingX - chevronSize / 2;
        const chevY = triggerY + triggerHeight / 2;
        shapes.push({
          type: "icon_font" as const,
          iconName: "chevron-down",
          x: chevX,
          y: chevY,
          fontSize: chevronSize,
          fill: "{color.neutral-subdued}" as TokenRef,
          strokeWidth: 2,
        });
      }

      // 드롭다운 패널 (열린 상태) — hasChildren 여부와 무관하게 렌더링
      if (props.isOpen) {
        const storedItems = props.items ?? [];
        const displayItems: ReadonlyArray<{
          id: string;
          label: string;
          value?: string;
        }> =
          storedItems.length > 0
            ? storedItems
            : [
                { id: "opt-1", label: "Option 1" },
                { id: "opt-2", label: "Option 2" },
                { id: "opt-3", label: "Option 3" },
              ];

        const itemH = 36;
        const dropdownPaddingY = 4;
        const dropdownHeight =
          displayItems.length * itemH + dropdownPaddingY * 2;
        const dropdownY = triggerY + triggerHeight + 4;

        shapes.push({
          type: "shadow" as const,
          target: "dropdown",
          offsetX: 0,
          offsetY: 4,
          blur: 8,
          color: "rgba(0, 0, 0, 0.1)",
          alpha: 0.1,
        });
        shapes.push({
          id: "dropdown",
          type: "roundRect" as const,
          x: 0,
          y: dropdownY,
          width,
          height: dropdownHeight,
          radius: borderRadius,
          fill: "{color.layer-1}" as TokenRef,
        });
        shapes.push({
          type: "border" as const,
          target: "dropdown",
          borderWidth: 1,
          color: "{color.border}" as TokenRef,
          radius: borderRadius,
        });

        // 드롭다운 아이템 렌더링
        const selectedIdx =
          props.selectedIndex ??
          (props.value != null
            ? displayItems.findIndex(
                (it) => it.value === props.value || it.label === props.value,
              )
            : props.selectedText != null
              ? displayItems.findIndex(
                  (it) =>
                    it.label === props.selectedText ||
                    it.value === props.selectedText,
                )
              : -1);

        displayItems.forEach((item, i) => {
          const itemY = dropdownY + dropdownPaddingY + i * itemH;
          const isSelected = selectedIdx === i;

          // 선택된 아이템 하이라이트 배경
          if (isSelected) {
            shapes.push({
              type: "roundRect" as const,
              x: 4,
              y: itemY + 2,
              width: width - 8,
              height: itemH - 4,
              radius: borderRadius,
              fill: "{color.accent-subtle}" as TokenRef,
            });
          }

          // 아이템 텍스트
          shapes.push({
            type: "text" as const,
            x: paddingX,
            y: itemY + itemH / 2,
            text: item.label,
            fontSize,
            fontFamily: ff,
            fontWeight: isSelected ? 600 : 400,
            fill: isSelected
              ? ("{color.neutral}" as TokenRef)
              : ("{color.neutral}" as TokenRef),
            align: textAlign,
            baseline: "middle" as const,
          });
        });
      }

      // 설명 / 에러 메시지
      const descText =
        props.isInvalid && props.errorMessage
          ? props.errorMessage
          : props.description;
      if (descText) {
        const descItemCount =
          props.items && props.items.length > 0 ? props.items.length : 3;
        const descY = props.isOpen
          ? triggerY + triggerHeight + 4 + descItemCount * 36 + 8 + 4
          : triggerY + triggerHeight + 4;
        shapes.push({
          type: "text" as const,
          x: 0,
          y: descY,
          text: descText,
          fontSize: fontSize - 2,
          fontFamily: ff,
          fill: props.isInvalid
            ? ("{color.negative}" as TokenRef)
            : ("{color.neutral-subdued}" as TokenRef),
          align: textAlign,
          baseline: "top" as const,
        });
      }

      return shapes;
    },

    react: (props) => ({
      "data-open": props.isOpen || undefined,
      "data-invalid": props.isInvalid || undefined,
      "data-disabled": props.isDisabled || undefined,
      "data-required": props.isRequired || undefined,
    }),

    pixi: (props) => ({
      eventMode: "static" as const,
      cursor: props.isDisabled ? "not-allowed" : "pointer",
    }),
  },
};
