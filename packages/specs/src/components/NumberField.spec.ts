/**
 * NumberField Component Spec
 *
 * React Aria 기반 숫자 입력 컴포넌트 (stepper 버튼 포함)
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @sync ComboBox.spec.ts — 동일한 컨테이너/버튼 패턴
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily, getLabelLineHeight } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";
import {
  Globe,
  DollarSign,
  Type,
  Hash,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Move,
  CheckSquare,
  Focus,
  PointerOff,
  PenOff,
  MousePointerClick,
  FileText,
  Tag,
  Layout,
  AlignLeft,
  HelpCircle,
} from "lucide-react";

/**
 * NumberField Props
 */
export interface NumberFieldProps {
  variant?: "default" | "accent" | "negative";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  label?: string;
  placeholder?: string;
  value?: number;
  minValue?: number;
  maxValue?: number;
  step?: number;
  description?: string;
  errorMessage?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isRequired?: boolean;
  isReadOnly?: boolean;
  isWheelDisabled?: boolean;
  autoFocus?: boolean;
  name?: string;
  form?: string;
  labelPosition?: "top" | "side";
  labelAlign?: "start" | "end";
  necessityIndicator?: "icon" | "label";
  locale?: string;
  formatOptions?: Intl.NumberFormatOptions;
  contextualHelp?: string;
  children?: string;
  /** ElementSprite 주입: 엔진 계산 최종 폭 */
  _containerWidth?: number;
  style?: Record<string, string | number | undefined>;
  _hasChildren?: boolean;
}

/**
 * NumberField Component Spec
 */
export const NumberFieldSpec: ComponentSpec<NumberFieldProps> = {
  name: "NumberField",
  description: "React Aria 기반 숫자 입력 컴포넌트",
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
          },
          {
            key: "value",
            type: "number",
            label: "Value",
            icon: Hash,
          },
          {
            key: "description",
            type: "string",
            label: "Description",
            icon: FileText,
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
        ],
      },
      {
        title: "Locale",
        fields: [
          {
            key: "locale",
            type: "enum",
            label: "Locale",
            icon: Globe,
            emptyToUndefined: true,
            options: [
              { value: "", label: "Auto" },
              { value: "ko-KR", label: "한국어" },
              { value: "en-US", label: "English (US)" },
              { value: "en-GB", label: "English (UK)" },
              { value: "ja-JP", label: "日本語" },
              { value: "zh-CN", label: "中文" },
              { value: "de-DE", label: "Deutsch" },
              { value: "fr-FR", label: "Français" },
            ],
          },
        ],
      },
      {
        title: "Format",
        fields: [
          {
            key: "formatOptions.style",
            type: "enum",
            label: "Format Style",
            icon: DollarSign,
            updatePath: ["formatOptions", "style"],
            options: [
              { value: "decimal", label: "Decimal" },
              { value: "currency", label: "Currency" },
              { value: "percent", label: "Percent" },
              { value: "unit", label: "Unit" },
            ],
            defaultValue: "decimal",
          },
          {
            key: "formatOptions.currency",
            type: "enum",
            label: "Currency",
            icon: DollarSign,
            updatePath: ["formatOptions", "currency"],
            visibleWhen: {
              key: "formatOptions.style",
              equals: "currency",
            },
            options: [
              { value: "KRW", label: "KRW (\u20a9)" },
              { value: "USD", label: "USD ($)" },
              { value: "EUR", label: "EUR (\u20ac)" },
              { value: "GBP", label: "GBP (\u00a3)" },
              { value: "JPY", label: "JPY (\u00a5)" },
              { value: "CNY", label: "CNY (\u00a5)" },
              { value: "AUD", label: "AUD ($)" },
              { value: "CAD", label: "CAD ($)" },
            ],
            defaultValue: "KRW",
          },
          {
            key: "formatOptions.unit",
            type: "string",
            label: "Unit",
            icon: Type,
            updatePath: ["formatOptions", "unit"],
            emptyToUndefined: true,
            visibleWhen: {
              key: "formatOptions.style",
              equals: "unit",
            },
            placeholder: "kilometer, celsius, megabyte, etc.",
          },
          {
            key: "formatOptions.notation",
            type: "enum",
            label: "Notation",
            icon: Hash,
            updatePath: ["formatOptions", "notation"],
            options: [
              { value: "standard", label: "Standard" },
              { value: "compact", label: "Compact" },
              { value: "scientific", label: "Scientific" },
              { value: "engineering", label: "Engineering" },
            ],
            defaultValue: "standard",
          },
          {
            key: "formatOptions.minimumFractionDigits",
            type: "number",
            label: "Min Fraction Digits",
            icon: Hash,
            updatePath: ["formatOptions", "minimumFractionDigits"],
          },
          {
            key: "formatOptions.maximumFractionDigits",
            type: "number",
            label: "Max Fraction Digits",
            icon: Hash,
            updatePath: ["formatOptions", "maximumFractionDigits"],
          },
          {
            key: "formatOptions.useGrouping",
            type: "boolean",
            label: "Show Group Separator",
            icon: Hash,
            updatePath: ["formatOptions", "useGrouping"],
          },
        ],
      },
      {
        title: "State",
        fields: [
          {
            key: "autoFocus",
            type: "boolean",
            label: "Auto Focus",
            icon: Focus,
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
            key: "isInvalid",
            type: "boolean",
            label: "Invalid",
            icon: AlertTriangle,
          },
          {
            key: "isWheelDisabled",
            type: "boolean",
            label: "Wheel Disabled",
            icon: MousePointerClick,
          },

          {
            key: "name",
            type: "string",
            label: "Name",
            icon: Tag,
            emptyToUndefined: true,
            placeholder: "field-name",
          },
          {
            key: "form",
            type: "string",
            label: "Form",
            icon: FileText,
            emptyToUndefined: true,
            placeholder: "form-id",
          },
          {
            key: "errorMessage",
            type: "string",
            label: "Error Message",
            icon: AlertTriangle,
          },
          {
            key: "minValue",
            type: "number",
            label: "Min Value",
            icon: ArrowDown,
          },
          {
            key: "maxValue",
            type: "number",
            label: "Max Value",
            icon: ArrowUp,
          },
          {
            key: "step",
            type: "number",
            label: "Step",
            icon: Move,
            defaultValue: 1,
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
    ],
  },

  // @sync ComboBox.spec.ts variants — 동일한 컨테이너 배경
  variants: {
    default: {
      background: "{color.layer-2}" as TokenRef,
      backgroundHover: "{color.layer-1}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    accent: {
      background: "{color.layer-2}" as TokenRef,
      backgroundHover: "{color.layer-1}" as TokenRef,
      backgroundPressed: "{color.layer-1}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    negative: {
      background: "{color.layer-2}" as TokenRef,
      backgroundHover: "{color.negative-subtle}" as TokenRef,
      backgroundPressed: "{color.negative-subtle}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
  },

  // @sync ComboBox.spec.ts sizes — 동일한 height/padding/iconSize
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
  // @sync ComboBox.spec.ts composition — 동일한 컨테이너/버튼 패턴
  composition: {
    layout: "flex-column",
    gap: "var(--spacing-xs)",
    delegation: [
      {
        // Group 대응 — 컨테이너 (bg/border/padding)
        // @sync ComboBox.spec.ts .combobox-container
        childSelector: ".react-aria-Group",
        variables: {
          xs: {
            height: "auto",
            background: "var(--bg-inset)",
            color: "var(--fg)",
            border: "1px solid var(--border)",
            padding: "1px 1px 1px 4px",
          },
          sm: {
            height: "auto",
            background: "var(--bg-inset)",
            color: "var(--fg)",
            border: "1px solid var(--border)",
            padding: "2px 2px 2px 8px",
          },
          md: {
            height: "auto",
            background: "var(--bg-inset)",
            color: "var(--fg)",
            border: "1px solid var(--border)",
            padding: "4px 4px 4px 12px",
          },
          lg: {
            height: "auto",
            background: "var(--bg-inset)",
            color: "var(--fg)",
            border: "1px solid var(--border)",
            padding: "8px 8px 8px 16px",
          },
          xl: {
            height: "auto",
            background: "var(--bg-inset)",
            color: "var(--fg)",
            border: "1px solid var(--border)",
            padding: "12px 12px 12px 24px",
          },
        },
      },
      {
        // Input 대응
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
        // Stepper Button 대응 — @sync ComboBox.spec.ts chevron 버튼
        childSelector: ".react-aria-Button",
        variables: {
          xs: {
            width: "10px",
            height: "10px",
            padding: "0",
            background: "var(--bg-overlay)",
            color: "var(--fg)",
            border: "none",
          },
          sm: {
            width: "14px",
            height: "14px",
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
      {
        childSelector: ".react-aria-FieldError",
        variables: {
          xs: { "--error-font-size": "var(--text-2xs)" },
          sm: { "--error-font-size": "var(--text-2xs)" },
          md: { "--error-font-size": "var(--text-xs)" },
          lg: { "--error-font-size": "var(--text-sm)" },
          xl: { "--error-font-size": "var(--text-base)" },
        },
      },
    ],
  },

  propagation: {
    rules: [
      { parentProp: "size", childPath: "Label", override: true },
      { parentProp: "size", childPath: "ComboBoxWrapper", override: true },
      {
        parentProp: "label",
        childPath: "Label",
        childProp: "children",
        override: true,
      },
      {
        parentProp: "placeholder",
        childPath: ["ComboBoxWrapper", "ComboBoxInput"],
        childProp: "placeholder",
        override: true,
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

  render: {
    shapes: (props, variant, size, state = "default") => {
      const width =
        typeof props._containerWidth === "number" && props._containerWidth > 0
          ? props._containerWidth
          : (props.style?.width as number) || 200;
      const btnSize = size.iconSize ?? 18;

      const styleBr = props.style?.borderRadius;
      const borderRadius =
        styleBr != null
          ? typeof styleBr === "number"
            ? styleBr
            : parseFloat(String(styleBr)) || 0
          : (size.borderRadius as unknown as number);

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

      const rawFontSize = props.size
        ? size.fontSize
        : (props.style?.fontSize ?? size.fontSize);
      const resolvedFs =
        typeof rawFontSize === "number"
          ? rawFontSize
          : typeof rawFontSize === "string" && rawFontSize.startsWith("{")
            ? resolveToken(rawFontSize as TokenRef)
            : rawFontSize;
      const fontSize = typeof resolvedFs === "number" ? resolvedFs : 14;

      const labelLineHeight = getLabelLineHeight(fontSize);
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

      // 버튼 간 간격
      const btnGap = 4;

      const shapes: Shape[] = [];
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      const inputY = props.label ? labelOffset : 0;

      if (hasChildren) {
        // Compositional: Label/Group/Button은 자식이 각자 렌더링
        // NumberField 자체는 빈 shapes 반환 (Group에 컨테이너 Spec 없으므로)
        return shapes;
      }

      // Label
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
          align: "left" as const,
          baseline: "top" as const,
        });
      }

      // 컨테이너 배경 (= ComboBox .combobox-container)
      shapes.push({
        id: "container",
        type: "roundRect" as const,
        x: 0,
        y: inputY,
        width,
        height: inputHeight,
        radius: borderRadius,
        fill: bgColor,
      });

      // 컨테이너 테두리
      if (borderColor) {
        shapes.push({
          type: "border" as const,
          target: "container",
          borderWidth,
          color: props.isInvalid
            ? ("{color.negative}" as TokenRef)
            : borderColor,
          radius: borderRadius,
        });
      }

      // 숫자 값 텍스트 (왼쪽 패딩, 세로 중앙)
      const textMaxWidth = width - paddingX * 2 - (btnSize * 2 + btnGap);
      shapes.push({
        type: "text" as const,
        x: paddingX,
        y: inputY + inputHeight / 2,
        text: String(props.value ?? 0),
        fontSize,
        fontFamily: ff,
        fill: textColor,
        align: "center" as const,
        baseline: "middle" as const,
        maxWidth: textMaxWidth,
      });

      // 감소 아이콘 (-) — @sync ComboBox chevron: 배경 없이 아이콘만
      const btn1X = width - paddingX - btnSize * 2 - btnGap + btnSize / 2;
      const btnCenterY = inputY + inputHeight / 2;
      shapes.push({
        type: "icon_font" as const,
        iconName: "minus",
        x: btn1X,
        y: btnCenterY,
        fontSize: btnSize,
        fill: "{color.neutral-subdued}" as TokenRef,
        strokeWidth: 2,
      });

      // 증가 아이콘 (+) — @sync ComboBox chevron: 배경 없이 아이콘만
      const btn2X = width - paddingX - btnSize + btnSize / 2;
      shapes.push({
        type: "icon_font" as const,
        iconName: "plus",
        x: btn2X,
        y: btnCenterY,
        fontSize: btnSize,
        fill: "{color.neutral-subdued}" as TokenRef,
        strokeWidth: 2,
      });

      // 에러 메시지 / 설명
      const descText =
        props.isInvalid && props.errorMessage
          ? props.errorMessage
          : props.description;
      if (descText) {
        shapes.push({
          type: "text" as const,
          x: 0,
          y: inputY + inputHeight + 4,
          text: descText,
          fontSize: fontSize - 2,
          fontFamily: ff,
          fill: props.isInvalid
            ? ("{color.negative}" as TokenRef)
            : ("{color.neutral-subdued}" as TokenRef),
          align: "left" as const,
          baseline: "top" as const,
        });
      }

      return shapes;
    },

    react: (props) => ({
      "data-invalid": props.isInvalid || undefined,
      "data-disabled": props.isDisabled || undefined,
      "data-required": props.isRequired || undefined,
    }),

    pixi: (props) => ({
      eventMode: "static" as const,
      cursor: props.isDisabled ? "not-allowed" : "default",
    }),
  },
};
