/**
 * ComboBox Component Spec
 *
 * React Aria 기반 콤보박스 컴포넌트 (입력 + 드롭다운)
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";
import {
  Tag,
  Binary,
  CheckSquare,
  Focus,
  PointerOff,
  PenOff,
  FormInput,
  FileText,
} from "lucide-react";

/**
 * ComboBox Props
 */
export interface ComboBoxProps {
  variant?: "default" | "accent" | "negative";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  label?: string;
  placeholder?: string;
  name?: string;
  inputValue?: string;
  selectedText?: string;
  description?: string;
  errorMessage?: string;
  isOpen?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  autoFocus?: boolean;
  allowsCustomValue?: boolean;
  validationBehavior?: "native" | "aria";
  necessityIndicator?: "icon" | "label";
  /** 트리거 아이콘 이름 */
  iconName?: string;
  /** 드롭다운 아이템 목록 */
  items?: string[];
  /** 선택된 아이템 인덱스 (하이라이트용) */
  selectedIndex?: number;
  children?: string;
  style?: Record<string, string | number | undefined>;
  /** ElementSprite에서 주입: 자식 Element 존재 시 spec shapes에서 label 렌더링 스킵 */
  _hasChildren?: boolean;
}

/**
 * ComboBox Component Spec
 */
export const ComboBoxSpec: ComponentSpec<ComboBoxProps> = {
  name: "ComboBox",
  description: "React Aria 기반 콤보박스 컴포넌트 (입력 + 드롭다운)",
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
            key: "selectedValue",
            type: "string",
            label: "Value",
            icon: Tag,
            emptyToUndefined: true,
            placeholder: "선택된 값이 여기에 표시됩니다",
          },
          {
            key: "allowsCustomValue",
            type: "boolean",
            label: "Allows Custom Value",
            icon: Binary,
          },
          {
            key: "necessityIndicator",
            type: "enum",
            label: "Required",
            icon: CheckSquare,
            options: [
              { value: "", label: "None" },
              { value: "icon", label: "Icon (*)" },
              { value: "label", label: "Label (required/optional)" },
            ],
            derivedUpdateFn: (value) => {
              if (value === "") {
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
        ],
      },
      {
        title: "Form Integration",
        fields: [
          {
            key: "name",
            type: "string",
            label: "Name",
            icon: FormInput,
            emptyToUndefined: true,
            placeholder: "combobox-name",
          },
          {
            key: "validationBehavior",
            type: "enum",
            label: "Validation Behavior",
            icon: FileText,
            options: [
              { value: "native", label: "Native" },
              { value: "aria", label: "ARIA" },
            ],
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

  // @sync Select.spec.ts sizes — CSS height = lineHeight + paddingY×2 + borderWidth×2
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
        // ComboBoxWrapper 대응 — 컨테이너 (bg/border/padding)
        // Select의 .react-aria-Button과 동일 역할
        childSelector: ".combobox-container",
        variables: {
          xs: {
            height: "auto",
            background: "var(--bg)",
            color: "var(--fg)",
            border: "1px solid var(--border-hover)",
            padding: "1px 1px 1px 4px",
            "font-size": "var(--text-2xs)",
          },
          sm: {
            height: "auto",
            background: "var(--bg)",
            color: "var(--fg)",
            border: "1px solid var(--border-hover)",
            padding: "2px 2px 2px 8px",
            "font-size": "var(--text-xs)",
          },
          md: {
            height: "auto",
            background: "var(--bg)",
            color: "var(--fg)",
            border: "1px solid var(--border-hover)",
            padding: "4px 4px 4px 12px",
            "font-size": "var(--text-sm)",
          },
          lg: {
            height: "auto",
            background: "var(--bg)",
            color: "var(--fg)",
            border: "1px solid var(--border-hover)",
            padding: "8px 8px 8px 16px",
            "font-size": "var(--text-base)",
          },
          xl: {
            height: "auto",
            background: "var(--bg)",
            color: "var(--fg)",
            border: "1px solid var(--border-hover)",
            padding: "12px 12px 12px 24px",
            "font-size": "var(--text-lg)",
          },
        },
      },
      {
        // ComboBoxInput 대응 — 텍스트 입력
        // Select의 .react-aria-SelectValue와 동일 역할
        childSelector: ".react-aria-Input",
        variables: {
          xs: { height: "auto" },
          sm: { height: "auto" },
          md: { height: "auto" },
          lg: { height: "auto" },
          xl: { height: "auto" },
        },
      },
      {
        // ComboBoxTrigger 대응 — chevron 버튼
        // Select의 .select-chevron과 동일: bg-overlay + color: fg → SVG stroke: currentColor
        childSelector: ".react-aria-Button",
        variables: {
          xs: {
            width: "14px",
            height: "14px",
            padding: "0",
            background: "var(--bg-overlay)",
            color: "var(--fg)",
            border: "none",
          },
          sm: {
            width: "16px",
            height: "16px",
            padding: "0",
            background: "var(--bg-overlay)",
            color: "var(--fg)",
            border: "none",
          },
          md: {
            width: "18px",
            height: "18px",
            padding: "0",
            background: "var(--bg-overlay)",
            color: "var(--fg)",
            border: "none",
          },
          lg: {
            width: "22px",
            height: "22px",
            padding: "0",
            background: "var(--bg-overlay)",
            color: "var(--fg)",
            border: "none",
          },
          xl: {
            width: "28px",
            height: "28px",
            padding: "0",
            background: "var(--bg-overlay)",
            color: "var(--fg)",
            border: "none",
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
      { parentProp: "size", childPath: "ComboBoxWrapper" },
      { parentProp: "size", childPath: "ComboBoxInput" },
      { parentProp: "size", childPath: "ComboBoxTrigger" },
      { parentProp: "size", childPath: "Label" },
    ],
  },

  render: {
    shapes: (props, variant, size, state = "default") => {
      const width = (props.style?.width as number) || 200;
      const chevronSize = size.iconSize ?? 18;

      const styleBr = props.style?.borderRadius;
      const borderRadius =
        styleBr != null
          ? typeof styleBr === "number"
            ? styleBr
            : parseFloat(String(styleBr)) || 0
          : (size.borderRadius as unknown as number);

      // backgroundColor: 'transparent'는 factory 기본값 → spec variant 사용
      const userBg = props.style?.backgroundColor;
      const bgColor =
        userBg != null && userBg !== "transparent"
          ? userBg
          : state === "hover"
            ? variant.backgroundHover
            : state === "pressed"
              ? variant.backgroundPressed
              : variant.background;

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
      const labelLineHeight = Math.ceil(fontSize * 1.5);
      const labelGap = 8;
      const labelOffset = labelLineHeight + labelGap;
      const inputHeight = size.height as number;

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
      // Label, ComboBoxWrapper(ComboBoxInput, ComboBoxTrigger)가 각자 spec으로 렌더링
      // ComboBox 자체에서는 드롭다운 패널만 담당
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      const inputY = props.label ? labelOffset : 0;

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

        // 입력 영역 배경
        shapes.push({
          id: "input",
          type: "roundRect" as const,
          x: 0,
          y: inputY,
          width,
          height: inputHeight,
          radius: borderRadius,
          fill: bgColor,
        });

        // 테두리
        if (borderColor) {
          shapes.push({
            type: "border" as const,
            target: "input",
            borderWidth,
            color: props.isInvalid
              ? ("{color.negative}" as TokenRef)
              : borderColor,
            radius: borderRadius,
          });
        }

        // 입력 텍스트 또는 placeholder
        const displayText = props.inputValue || props.placeholder || "";
        if (displayText) {
          const isPlaceholder = !props.inputValue && !!props.placeholder;
          shapes.push({
            type: "text" as const,
            x: paddingX,
            y: inputY + inputHeight / 2,
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

        // 쉐브론 아이콘
        const chevX = width - paddingX - chevronSize / 2;
        const chevY = inputY + inputHeight / 2;
        shapes.push({
          type: "icon_font" as const,
          iconName: props.iconName ?? "chevron-down",
          x: chevX,
          y: chevY,
          fontSize: chevronSize,
          fill: "{color.neutral-subdued}" as TokenRef,
          strokeWidth: 2,
        });
      }

      // 드롭다운 패널 (열린 상태) — hasChildren 여부와 무관하게 렌더링
      if (props.isOpen) {
        // inputValue로 아이템 필터링 (입력값이 있으면 포함된 항목만 표시)
        const allItems = props.items ?? ["Option 1", "Option 2", "Option 3"];
        const filterText = props.inputValue?.toLowerCase() ?? "";
        const dropdownItems = filterText
          ? allItems.filter((item) => item.toLowerCase().includes(filterText))
          : allItems;

        const itemH = 36;
        const dropdownPaddingY = 4;
        const dropdownHeight =
          dropdownItems.length > 0
            ? dropdownItems.length * itemH + dropdownPaddingY * 2
            : itemH + dropdownPaddingY * 2;
        const dropdownY = inputY + inputHeight + 4;

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

        if (dropdownItems.length === 0) {
          // 결과 없음 텍스트
          shapes.push({
            type: "text" as const,
            x: paddingX,
            y: dropdownY + dropdownPaddingY + itemH / 2,
            text: "No results",
            fontSize,
            fontFamily: ff,
            fontWeight: 400,
            fill: "{color.neutral-subdued}" as TokenRef,
            align: "left" as const,
            baseline: "middle" as const,
          });
        } else {
          // 선택 인덱스 결정
          const selectedIdx =
            props.selectedIndex ??
            (props.selectedText != null
              ? allItems.indexOf(props.selectedText)
              : -1);

          dropdownItems.forEach((item, i) => {
            const itemY = dropdownY + dropdownPaddingY + i * itemH;
            const isSelected =
              selectedIdx >= 0 && allItems[selectedIdx] === item;

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
      }

      // 설명 / 에러 메시지
      const descText =
        props.isInvalid && props.errorMessage
          ? props.errorMessage
          : props.description;
      if (descText) {
        const allItems = props.items ?? ["Option 1", "Option 2", "Option 3"];
        const filterText = props.inputValue?.toLowerCase() ?? "";
        const visibleCount = props.isOpen
          ? filterText
            ? allItems.filter((item) => item.toLowerCase().includes(filterText))
                .length
            : allItems.length
          : 0;
        const descY = props.isOpen
          ? inputY + inputHeight + 4 + Math.max(visibleCount, 1) * 36 + 8 + 4
          : inputY + inputHeight + 4;
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
      role: "combobox",
      "aria-expanded": props.isOpen || undefined,
    }),

    pixi: (props) => ({
      eventMode: "static" as const,
      cursor: props.isDisabled ? "not-allowed" : "text",
    }),
  },
};
