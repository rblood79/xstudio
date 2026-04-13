/**
 * ColorField Component Spec
 *
 * React Aria 기반 색상 입력 필드 컴포넌트
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";
import {
  Tag,
  FileText,
  AlertTriangle,
  Palette,
  CheckSquare,
  PointerOff,
  PenOff,
  Layout,
  HelpCircle,
  Minimize2,
} from "lucide-react";

/**
 * ColorField Props
 */
export interface ColorFieldProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  isQuiet?: boolean;
  value?: string;
  defaultValue?: string;
  label?: string;
  description?: string;
  errorMessage?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isReadOnly?: boolean;
  isRequired?: boolean;
  autoFocus?: boolean;
  name?: string;
  form?: string;
  channel?:
    | "hue"
    | "saturation"
    | "lightness"
    | "brightness"
    | "red"
    | "green"
    | "blue"
    | "alpha";
  colorSpace?: "rgb" | "hsl" | "hsb";
  validationBehavior?: "native" | "aria";
  necessityIndicator?: "icon" | "label";
  labelPosition?: "top" | "side";
  labelAlign?: "start" | "center" | "end";
  contextualHelp?: string;
  /** ElementSprite 주입: 엔진 계산 최종 폭 */
  _containerWidth?: number;
  style?: Record<string, string | number | undefined>;
}

/**
 * ColorField Component Spec
 */
export const ColorFieldSpec: ComponentSpec<ColorFieldProps> = {
  name: "ColorField",
  description: "React Aria 기반 색상 입력 필드 (color swatch + hex input)",
  element: "div",
  skipCSSGeneration: false,

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
            emptyToUndefined: true,
            icon: Tag,
          },
          {
            key: "description",
            type: "string",
            label: "Description",
            emptyToUndefined: true,
            icon: FileText,
          },
          {
            key: "errorMessage",
            type: "string",
            label: "Error Message",
            emptyToUndefined: true,
            icon: AlertTriangle,
          },
          {
            key: "defaultValue",
            type: "string",
            label: "Default Value",
            placeholder: "#000000",
            emptyToUndefined: true,
            icon: Palette,
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
        title: "State",
        fields: [
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
                necessityIndicator: value,
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
        ],
      },
      {
        title: "Appearance",
        fields: [
          {
            type: "size",
            label: "Size",
            options: [
              { value: "xs", label: "XS" },
              { value: "sm", label: "S" },
              { value: "md", label: "M" },
              { value: "lg", label: "L" },
              { value: "xl", label: "XL" },
            ],
          },
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
            key: "labelAlign",
            type: "enum",
            label: "Label Alignment",
            icon: Tag,
            options: [
              { value: "start", label: "Left" },
              { value: "center", label: "Center" },
              { value: "end", label: "Right" },
            ],
            defaultValue: "start",
          },
          {
            key: "channel",
            type: "enum",
            label: "Channel",
            icon: Palette,
            emptyToUndefined: true,
            options: [
              { value: "", label: "Default (Hex)" },
              { value: "hue", label: "Hue" },
              { value: "saturation", label: "Saturation" },
              { value: "lightness", label: "Lightness" },
              { value: "brightness", label: "Brightness" },
              { value: "red", label: "Red" },
              { value: "green", label: "Green" },
              { value: "blue", label: "Blue" },
              { value: "alpha", label: "Alpha" },
            ],
          },
          {
            key: "colorSpace",
            type: "enum",
            label: "Color Space",
            icon: Palette,
            emptyToUndefined: true,
            options: [
              { value: "", label: "Default" },
              { value: "rgb", label: "RGB" },
              { value: "hsl", label: "HSL" },
              { value: "hsb", label: "HSB" },
            ],
          },
        ],
      },
    ],
  },

  sizes: {
    xs: {
      height: 28,
      paddingX: 6,
      paddingY: 4,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      iconSize: 18,
      gap: 6,
    },
    sm: {
      height: 32,
      paddingX: 8,
      paddingY: 4,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      iconSize: 20,
      gap: 6,
    },
    md: {
      height: 40,
      paddingX: 10,
      paddingY: 6,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      iconSize: 26,
      gap: 8,
    },
    lg: {
      height: 48,
      paddingX: 12,
      paddingY: 8,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      iconSize: 32,
      gap: 10,
    },
    xl: {
      height: 56,
      paddingX: 14,
      paddingY: 10,
      fontSize: "{typography.text-lg}" as TokenRef,
      borderRadius: "{radius.lg}" as TokenRef,
      iconSize: 36,
      gap: 12,
    },
  },

  // ADR-059 v2 Pre-Phase 0-B: Composite delegation SSOT 선언
  composition: {
    layout: "flex-column",
    gap: "var(--spacing-xs)",
    containerStyles: {
      width: "fit-content",
      color: "var(--fg)",
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
              styles: { "grid-column": "2", "min-width": "0" },
            },
          ],
        },
      },
      "label-align": {
        center: { styles: { "--form-label-align": "center" } },
        end: { styles: { "--form-label-align": "end" } },
      },
      quiet: {
        true: {
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
              styles: { "border-bottom-color": "var(--negative)" },
            },
          ],
        },
      },
    },
    delegation: [
      {
        childSelector: ".react-aria-Label",
        prefix: "cf-label",
        variables: {
          xs: { "--cf-label-size": "var(--text-2xs)" },
          sm: { "--cf-label-size": "var(--text-xs)" },
          md: { "--cf-label-size": "var(--text-sm)" },
          lg: { "--cf-label-size": "var(--text-base)" },
          xl: { "--cf-label-size": "var(--text-lg)" },
        },
        bridges: {
          "--label-font-size": "var(--cf-label-size)",
          "--label-font-weight": "600",
          "--label-margin": "var(--spacing-xs)",
        },
      },
      {
        childSelector: ".react-aria-Input",
        prefix: "cf-input",
        variables: {
          xs: {
            "--cf-input-padding": "var(--spacing-3xs) var(--spacing-xs)",
            "--cf-input-size": "var(--text-2xs)",
            "--cf-input-line-height": "var(--text-2xs--line-height)",
            "--cf-input-max-width": "9ch",
          },
          sm: {
            "--cf-input-padding": "var(--spacing-2xs) var(--spacing-sm)",
            "--cf-input-size": "var(--text-xs)",
            "--cf-input-line-height": "var(--text-xs--line-height)",
            "--cf-input-max-width": "10ch",
          },
          md: {
            "--cf-input-padding": "var(--spacing-xs) var(--spacing-md)",
            "--cf-input-size": "var(--text-sm)",
            "--cf-input-line-height": "var(--text-sm--line-height)",
            "--cf-input-max-width": "12ch",
          },
          lg: {
            "--cf-input-padding": "var(--spacing-sm) var(--spacing-lg)",
            "--cf-input-size": "var(--text-base)",
            "--cf-input-line-height": "var(--text-base--line-height)",
            "--cf-input-max-width": "14ch",
          },
          xl: {
            "--cf-input-padding": "var(--spacing-md) var(--spacing-xl)",
            "--cf-input-size": "var(--text-lg)",
            "--cf-input-line-height": "var(--text-lg--line-height)",
            "--cf-input-max-width": "16ch",
          },
        },
        bridges: {
          "--input-padding": "var(--cf-input-padding)",
          "--input-font-size": "var(--cf-input-size)",
          "--input-line-height": "var(--cf-input-line-height)",
          "border-radius": "var(--radius-sm)",
          "max-width": "var(--cf-input-max-width)",
          "box-sizing": "border-box",
        },
      },
      {
        childSelector: ".react-aria-FieldError",
        prefix: "cf-hint",
        variables: {
          xs: { "--cf-hint-size": "var(--text-2xs)" },
          sm: { "--cf-hint-size": "var(--text-2xs)" },
          md: { "--cf-hint-size": "var(--text-xs)" },
          lg: { "--cf-hint-size": "var(--text-sm)" },
          xl: { "--cf-hint-size": "var(--text-base)" },
        },
        bridges: {
          "--error-font-size": "var(--cf-hint-size)",
        },
      },
      {
        childSelector: '[slot="description"]',
        bridges: {
          "font-size": "var(--cf-hint-size)",
          color: "var(--fg-muted)",
        },
      },
    ],
  },

  propagation: {
    rules: [{ parentProp: "size", childPath: "Label", override: true }],
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
    shapes: (props, size, _state = "default") => {
      const width =
        typeof props._containerWidth === "number" && props._containerWidth > 0
          ? props._containerWidth
          : (props.style?.width as number) || 160;
      const height = size.height;
      const swatchSize = size.iconSize ?? 26;

      const styleBr = props.style?.borderRadius;
      const borderRadius =
        styleBr != null
          ? typeof styleBr === "number"
            ? styleBr
            : parseFloat(String(styleBr)) || 0
          : (size.borderRadius as unknown as number);

      const bgColor =
        props.style?.backgroundColor ?? ("{color.layer-2}" as TokenRef);

      const borderColor =
        props.style?.borderColor ?? ("{color.border}" as TokenRef);

      const styleBw = props.style?.borderWidth;
      const borderWidth =
        styleBw != null
          ? typeof styleBw === "number"
            ? styleBw
            : parseFloat(String(styleBw)) || 0
          : 1;

      const fontSize = resolveSpecFontSize(
        props.style?.fontSize ?? size.fontSize,
        16,
      );

      const fwRaw = props.style?.fontWeight;
      const fontWeight =
        fwRaw != null
          ? typeof fwRaw === "number"
            ? fwRaw
            : parseInt(String(fwRaw), 10) || 400
          : 400;

      const ff = (props.style?.fontFamily as string) || fontFamily.mono;

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

      const shapes: Shape[] = [
        // 배경
        {
          id: "bg",
          type: "roundRect" as const,
          x: 0,
          y: 0,
          width,
          height,
          radius: borderRadius,
          fill: bgColor,
        },
        // 테두리
        {
          type: "border" as const,
          target: "bg",
          borderWidth,
          color: borderColor ?? ("{color.border-hover}" as TokenRef),
          radius: borderRadius,
        },
      ];
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
      if (hasChildren) return shapes;

      // Color swatch (왼쪽)
      const swatchX = paddingX;
      const swatchY = (height - swatchSize) / 2;
      shapes.push({
        id: "swatch",
        type: "roundRect" as const,
        x: swatchX,
        y: swatchY,
        width: swatchSize,
        height: swatchSize,
        radius: 4,
        fill: props.value || props.defaultValue || "#3B82F6",
      });

      // Swatch 테두리
      shapes.push({
        type: "border" as const,
        target: "swatch",
        borderWidth: 1,
        color: "{color.border}" as TokenRef,
        radius: 4,
      });

      // Hex 텍스트
      const hexValue = props.value || props.defaultValue || "#3B82F6";
      shapes.push({
        type: "text" as const,
        x: swatchX + swatchSize + (size.gap ?? 8),
        y: 0,
        text: hexValue.toUpperCase(),
        fontSize,
        fontFamily: ff,
        fontWeight,
        fill: textColor,
        align: textAlign,
        baseline: "middle" as const,
      });

      return shapes;
    },

    react: (props) => ({
      "aria-invalid": props.isInvalid || undefined,
      "data-disabled": props.isDisabled || undefined,
    }),

    pixi: (props) => ({
      eventMode: props.isDisabled ? ("none" as const) : ("static" as const),
      cursor: props.isDisabled ? "not-allowed" : "pointer",
    }),
  },
};
