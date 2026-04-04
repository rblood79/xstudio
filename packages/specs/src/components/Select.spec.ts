/**
 * Select Component Spec
 *
 * React Aria 기반 드롭다운 셀렉트 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily, getLabelLineHeight } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";
import {
  FIELD_TRIGGER_VARIABLES,
  FIELD_AUTO_HEIGHT_VARIABLES,
} from "../utils/fieldDelegation";
import {
  Hash,
  SquareX,
  CheckSquare,
  PointerOff,
  PenOff,
  Focus,
  FormInput,
  Layout,
  Tag,
  FileText,
  AlertTriangle,
  SpellCheck2,
} from "lucide-react";

/**
 * Select Props
 */
export interface SelectProps {
  variant?: "default" | "accent" | "negative";
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
  autoFocus?: boolean;
  labelPosition?: "top" | "side";
  necessityIndicator?: "icon" | "label";
  disallowEmptySelection?: boolean;
  validationBehavior?: "native" | "aria";
  /** 드롭다운 아이템 목록 */
  items?: string[];
  /** 선택된 아이템 인덱스 (하이라이트용) */
  selectedIndex?: number;
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
  skipCSSGeneration: true,

  defaultVariant: "default",
  defaultSize: "md",

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
           defaultValue: "top" },
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
          {
            key: "isReadOnly",
            type: "boolean",
            label: "Read Only",
            icon: PenOff,
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
            placeholder: "select-name",
            emptyToUndefined: true,
            icon: FormInput,
          },
          {
            key: "validationBehavior",
            type: "enum",
            label: "Validation Behavior",
            icon: CheckSquare,
            options: [
              { value: "native", label: "Native" },
              { value: "aria", label: "ARIA" },
            ],
           defaultValue: "native" },
        ],
      },
      {
        title: "Item Management",
        fields: [
          {
            key: "items",
            type: "children-manager",
            label: "Options",
            childTag: "SelectItem",
            defaultChildProps: {
              label: "Option",
              value: "",
            },
            labelProp: "label",
          },
        ],
      },
    ],
  },

  variants: {
    default: {
      background: "{color.elevated}" as TokenRef,
      backgroundHover: "{color.layer-1}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    accent: {
      background: "{color.elevated}" as TokenRef,
      backgroundHover: "{color.layer-1}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    negative: {
      background: "{color.elevated}" as TokenRef,
      backgroundHover: "{color.negative-subtle}" as TokenRef,
      backgroundPressed: "{color.negative-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
  },

  // @sync BUTTON_SIZE_CONFIG (utils.ts) — Select trigger height = Button height
  // CSS height = lineHeight + paddingY×2 + borderWidth×2 (명시적 height 없음)
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
    delegation: [
      // Label은 LabelSpec에서 variant 기반으로 color/font-size 결정 (단일 소스)
      {
        childSelector: ".react-aria-Button",
        variables: FIELD_TRIGGER_VARIABLES,
      },
      {
        childSelector: ".react-aria-SelectValue",
        variables: FIELD_AUTO_HEIGHT_VARIABLES,
      },
      {
        childSelector: ".react-aria-ListBox .react-aria-ListBoxItem",
        variables: {
          sm: {
            padding: "var(--spacing-sm) var(--spacing)",
            "font-size": "var(--text-xs)",
          },
          md: {
            padding: "var(--spacing-sm) var(--spacing-md)",
            "font-size": "var(--text-sm)",
          },
          lg: {
            padding: "var(--spacing) var(--spacing-lg)",
            "font-size": "var(--text-base)",
          },
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
      outline: "2px solid var(--accent)",
      outlineOffset: "2px",
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
    shapes: (props, variant, size, state = "default") => {
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
          ? variant.backgroundHover
          : state === "pressed"
            ? variant.backgroundPressed
            : variant.background);

      const borderColor =
        props.style?.borderColor ??
        (state === "hover" && variant.borderHover
          ? variant.borderHover
          : variant.border);

      const styleBw = props.style?.borderWidth;
      const defaultBw = props.isInvalid ? 2 : 1;
      const borderWidth =
        styleBw != null
          ? typeof styleBw === "number"
            ? styleBw
            : parseFloat(String(styleBw)) || 0
          : defaultBw;

      // size.fontSize는 TokenRef 문자열('{typography.text-sm}')일 수 있으므로
      // resolveToken으로 숫자 변환 후 산술 연산에 사용
      const rawFontSize = props.style?.fontSize ?? size.fontSize;
      const resolvedFs =
        typeof rawFontSize === "number"
          ? rawFontSize
          : typeof rawFontSize === "string" && rawFontSize.startsWith("{")
            ? resolveToken(rawFontSize as TokenRef)
            : rawFontSize;
      const fontSize = typeof resolvedFs === "number" ? resolvedFs : 14;

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

      const textColor = props.style?.color ?? variant.text;

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
        const dropdownItems = props.items ?? [
          "Option 1",
          "Option 2",
          "Option 3",
        ];
        const itemH = 36;
        const dropdownPaddingY = 4;
        const dropdownHeight =
          dropdownItems.length * itemH + dropdownPaddingY * 2;
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
            ? dropdownItems.indexOf(props.value)
            : props.selectedText != null
              ? dropdownItems.indexOf(props.selectedText)
              : -1);

        dropdownItems.forEach((item, i) => {
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
            text: String(item),
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
        const descY = props.isOpen
          ? triggerY +
            triggerHeight +
            4 +
            (props.items ?? ["Option 1", "Option 2", "Option 3"]).length * 36 +
            8 +
            4
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
