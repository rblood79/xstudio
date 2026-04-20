/**
 * TextField Component Spec
 *
 * React Aria 기반 텍스트 입력 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";
import {
  Keyboard,
  AlertTriangle,
  Hash,
  CheckSquare,
  PointerOff,
  PenOff,
  FileText,
  Tag,
  Layout,
  HelpCircle,
  Minimize2,
  Image,
} from "lucide-react";

/**
 * TextField Props
 */
export interface TextFieldProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  label?: string;
  placeholder?: string;
  name?: string;
  defaultValue?: string;
  value?: string;
  description?: string;
  errorMessage?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  isQuiet?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
  autoCorrect?: "on" | "off";
  inputMode?:
    | "none"
    | "text"
    | "tel"
    | "url"
    | "email"
    | "numeric"
    | "decimal"
    | "search";
  enterKeyHint?:
    | "enter"
    | "done"
    | "go"
    | "next"
    | "previous"
    | "search"
    | "send";
  icon?: string;
  labelPosition?: "top" | "side";
  labelAlign?: "start" | "end";
  necessityIndicator?: "icon" | "label";
  form?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  contextualHelp?: string;
  children?: string;
  /** ElementSprite 주입: 엔진 계산 최종 폭 */
  _containerWidth?: number;
  style?: Record<string, string | number | undefined>;
}

/**
 * TextField Component Spec
 */
export const TextFieldSpec: ComponentSpec<TextFieldProps> = {
  name: "TextField",
  description: "React Aria 기반 텍스트 입력 컴포넌트",
  element: "div",
  skipCSSGeneration: false,

  // ADR-087 SP3: outer Field container static display 리프팅.
  //   flexDirection 은 labelPosition prop runtime 결정 (implicitStyles 잔존).
  containerStyles: {
    display: "flex",
  },

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
            type: "string",
            label: "Value",
            icon: Hash,
          },
          {
            key: "placeholder",
            type: "string",
            label: "Placeholder",
            icon: FileText,
            placeholder: "Enter text...",
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
            key: "isQuiet",
            type: "boolean",
            label: "Quiet",
            icon: Minimize2,
          },
          {
            key: "icon",
            type: "string",
            label: "Icon",
            icon: Image,
            emptyToUndefined: true,
            placeholder: "icon-name",
          },
        ],
      },
      {
        title: "Input Type",
        fields: [
          {
            key: "type",
            type: "enum",
            label: "Input Type",
            icon: Keyboard,
            options: [
              { value: "text", label: "Text" },
              { value: "email", label: "Email" },
              { value: "password", label: "Password" },
              { value: "search", label: "Search" },
              { value: "tel", label: "Tel" },
              { value: "url", label: "URL" },
              { value: "number", label: "Number" },
            ],
            defaultValue: "text",
          },
        ],
      },
      {
        title: "State",
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
            key: "isInvalid",
            type: "boolean",
            label: "Invalid",
            icon: AlertTriangle,
          },
          {
            key: "errorMessage",
            type: "string",
            label: "Error Message",
            icon: AlertTriangle,
          },
          {
            key: "minLength",
            type: "number",
            label: "Min Length",
            icon: Hash,
          },
          {
            key: "maxLength",
            type: "number",
            label: "Max Length",
            icon: Hash,
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

  // @sync Button.spec.ts sizes — Input height = Button height
  sizes: {
    xs: {
      height: 18,
      paddingX: 4,
      paddingY: 1,
      fontSize: "{typography.text-2xs}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      gap: 2,
    },
    sm: {
      height: 22,
      paddingX: 8,
      paddingY: 2,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      gap: 4,
    },
    md: {
      height: 30,
      paddingX: 12,
      paddingY: 4,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 6,
    },
    lg: {
      height: 42,
      paddingX: 16,
      paddingY: 8,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      gap: 8,
    },
    xl: {
      height: 54,
      paddingX: 24,
      paddingY: 12,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.xl}" as TokenRef,
      gap: 10,
    },
  },

  // ADR-036 Phase 3a: Tier 2 Composite CSS 생성 메타데이터
  composition: {
    layout: "flex-column",
    gap: "var(--spacing-xs)",
    containerStyles: {
      width: "fit-content",
    },
    containerVariants: {
      "label-position": {
        side: {
          styles: {
            display: "grid",
            "grid-template-columns":
              "var(--form-label-width, max-content) minmax(0, 1fr)",
            "column-gap": "var(--form-field-gap, var(--spacing-md))",
            "row-gap": "var(--spacing-xs)",
            "align-items": "start",
            width: "100%",
          },
          nested: [
            {
              selector: "> .react-aria-Label",
              styles: {
                "grid-column": "1",
                "justify-self": "stretch",
                "text-align": "var(--form-label-align, start)",
              },
            },
            {
              selector: "> :not(.react-aria-Label)",
              styles: {
                "grid-column": "2",
                "min-width": "0",
              },
            },
          ],
        },
      },
      quiet: {
        true: {
          styles: {
            "--tf-border": "transparent",
            "--tf-bg": "transparent",
          },
          nested: [
            {
              selector: ".react-aria-Input",
              styles: {
                background: "transparent",
                "border-color": "transparent",
                "box-shadow": "none",
                "border-radius": "0",
                "border-bottom": "1px solid var(--border)",
              },
            },
            {
              selector: ".react-aria-Input:where([data-focused])",
              styles: {
                outline: "none",
                "border-bottom-color": "var(--accent)",
              },
            },
            {
              selector: ".react-aria-Input:where([data-invalid])",
              styles: {
                "border-bottom-color": "var(--negative)",
              },
            },
          ],
        },
      },
    },
    delegation: [
      {
        childSelector: ".react-aria-Label",
        prefix: "tf-label",
        variables: {
          xs: {
            "--tf-label-size": "var(--text-2xs)",
            "--tf-label-margin": "0px",
          },
          sm: {
            "--tf-label-size": "var(--text-xs)",
            "--tf-label-margin": "0px",
          },
          md: {
            "--tf-label-size": "var(--text-sm)",
            "--tf-label-margin": "2px",
          },
          lg: {
            "--tf-label-size": "var(--text-base)",
            "--tf-label-margin": "4px",
          },
          xl: {
            "--tf-label-size": "var(--text-lg)",
            "--tf-label-margin": "6px",
          },
        },
        bridges: {
          "--label-font-size": "var(--tf-label-size)",
          "--label-font-weight": "600",
          "--label-margin": "var(--tf-label-margin)",
        },
      },
      {
        childSelector: ".react-aria-Input",
        prefix: "tf-input",
        variables: {
          xs: {
            "--tf-input-padding": "var(--spacing-3xs) var(--spacing-xs)",
            "--tf-input-size": "var(--text-2xs)",
            "--tf-input-line-height": "var(--text-2xs--line-height)",
          },
          sm: {
            "--tf-input-padding": "var(--spacing-2xs) var(--spacing-sm)",
            "--tf-input-size": "var(--text-xs)",
            "--tf-input-line-height": "var(--text-xs--line-height)",
          },
          md: {
            "--tf-input-padding": "var(--spacing-xs) var(--spacing-md)",
            "--tf-input-size": "var(--text-sm)",
            "--tf-input-line-height": "var(--text-sm--line-height)",
          },
          lg: {
            "--tf-input-padding": "var(--spacing-sm) var(--spacing-lg)",
            "--tf-input-size": "var(--text-base)",
            "--tf-input-line-height": "var(--text-base--line-height)",
          },
          xl: {
            "--tf-input-padding": "var(--spacing-md) var(--spacing-xl)",
            "--tf-input-size": "var(--text-lg)",
            "--tf-input-line-height": "var(--text-lg--line-height)",
          },
        },
        bridges: {
          "--input-padding": "var(--tf-input-padding)",
          "--input-font-size": "var(--tf-input-size)",
          "--input-line-height": "var(--tf-input-line-height)",
        },
        states: {
          "[data-hovered]:not([data-focused]):not([data-disabled])": {
            "border-color": "var(--border-hover)",
          },
          "[data-focused]": {
            outline: "2px solid var(--accent)",
            "outline-offset": "-1px",
            "border-color": "var(--accent)",
          },
          "[data-invalid]": {
            "border-color": "var(--negative)",
          },
          "[data-invalid][data-focused]": {
            "outline-color": "var(--negative)",
          },
          "[data-disabled]": {
            "border-color": "color-mix(in srgb, var(--fg) 12%, transparent)",
            color: "color-mix(in srgb, var(--fg) 38%, transparent)",
            cursor: "not-allowed",
            opacity: "0.38",
          },
        },
      },
      {
        childSelector: ".react-aria-FieldError",
        prefix: "tf-hint",
        variables: {
          xs: { "--tf-hint-size": "var(--text-2xs)" },
          sm: { "--tf-hint-size": "var(--text-xs)" },
          md: { "--tf-hint-size": "var(--text-sm)" },
          lg: { "--tf-hint-size": "var(--text-base)" },
          xl: { "--tf-hint-size": "var(--text-lg)" },
        },
        bridges: {
          "--error-font-size": "var(--tf-hint-size)",
        },
      },
      {
        childSelector: '[slot="description"]',
        bridges: {
          "font-size": "var(--tf-hint-size)",
          color: "var(--fg-muted)",
        },
      },
    ],
  },

  propagation: {
    rules: [
      { parentProp: "size", childPath: "Label", override: true },
      { parentProp: "size", childPath: "Input", override: true },
      {
        parentProp: "label",
        childPath: "Label",
        childProp: "children",
        override: true,
      },
      {
        parentProp: "placeholder",
        childPath: "Input",
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
      focusRing: "{focus.ring.default}",
    },
  },

  render: {
    shapes: (props, size, state = "default") => {
      const width =
        typeof props._containerWidth === "number" && props._containerWidth > 0
          ? props._containerWidth
          : (props.style?.width as number) || 240;
      const height = size.height;

      const styleBr = props.style?.borderRadius;
      const borderRadius =
        styleBr != null
          ? typeof styleBr === "number"
            ? styleBr
            : parseFloat(String(styleBr)) || 0
          : (size.borderRadius as unknown as number);

      const bgColor =
        props.style?.backgroundColor ??
        (state === "hover" || state === "pressed"
          ? ("{color.layer-1}" as TokenRef)
          : ("{color.layer-2}" as TokenRef));

      const borderColor =
        props.style?.borderColor ??
        (state === "hover"
          ? ("{color.accent}" as TokenRef)
          : ("{color.border}" as TokenRef));

      const styleBw = props.style?.borderWidth;
      const defaultBw = props.isInvalid ? 2 : 1;
      const borderWidth =
        styleBw != null
          ? typeof styleBw === "number"
            ? styleBw
            : parseFloat(String(styleBw)) || 0
          : defaultBw;

      // fontSize: Propagation은 size prop만 변경하므로 props.size 있으면 size.fontSize 우선
      const fontSize = resolveSpecFontSize(
        props.size ? size.fontSize : (props.style?.fontSize ?? size.fontSize),
        16,
      );

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
      // CONTAINER_TAGS에 등록된 경우 자식 Element가 시각 렌더링 담당
      // (Label→라벨텍스트, Input→배경/테두리/placeholder, FieldError→에러텍스트)
      // TextField 자체에는 배경/테두리가 없으므로 Card와 동일한 패턴:
      // spec = 자신의 시각 요소만, 자식 = 자식의 시각 요소
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // fallback: 자식이 없는 레거시 데이터 → 전체 렌더링
      const labelFontSize = fontSize - 2;
      const descFontSize = labelFontSize - 2;
      const labelHeight = Math.ceil(labelFontSize * 1.2);
      const labelGap = size.gap ?? 6;
      const labelOffset = props.label ? labelHeight + labelGap : 0;

      if (props.label) {
        shapes.push({
          type: "text" as const,
          x: 0,
          y: 0,
          text: props.label,
          fontSize: labelFontSize,
          fontFamily: ff,
          fontWeight,
          fill: textColor,
          align: textAlign,
          baseline: "top" as const,
        });
      }

      // 입력 필드 배경
      shapes.push({
        id: "bg",
        type: "roundRect" as const,
        x: 0,
        y: labelOffset,
        width,
        height,
        radius: borderRadius,
        fill: bgColor,
      });

      // 테두리
      if (borderColor) {
        shapes.push({
          type: "border" as const,
          target: "bg",
          borderWidth,
          color: props.isInvalid
            ? ("{color.negative}" as TokenRef)
            : borderColor,
          radius: borderRadius,
        });
      }

      // 입력 텍스트 / 플레이스홀더
      const displayText = props.value || props.placeholder || "";
      if (displayText) {
        shapes.push({
          type: "text" as const,
          x: paddingX,
          y: labelOffset + height / 2,
          text: displayText,
          fontSize,
          fontFamily: ff,
          fill: props.value
            ? textColor
            : ("{color.neutral-subdued}" as TokenRef),
          align: textAlign,
          baseline: "middle" as const,
        });
      }

      // 설명 / 에러 메시지
      {
        const descText =
          props.isInvalid && props.errorMessage
            ? props.errorMessage
            : props.description;
        if (descText) {
          shapes.push({
            type: "text" as const,
            x: 0,
            y: labelOffset + height + 4,
            text: descText,
            fontSize: descFontSize,
            fontFamily: ff,
            fill: props.isInvalid
              ? ("{color.negative}" as TokenRef)
              : ("{color.neutral-subdued}" as TokenRef),
            align: textAlign,
            baseline: "top" as const,
          });
        }
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
      cursor: props.isDisabled ? "not-allowed" : "text",
    }),
  },
};
