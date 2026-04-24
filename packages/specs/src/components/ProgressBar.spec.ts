/**
 * ProgressBar Component Spec
 *
 * React Aria 기반 프로그레스바 컴포넌트 (트랙 + 채우기)
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { parsePxValue } from "../primitives";
import { fontFamily } from "../primitives/typography";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";
import { measureSpecTextWidth } from "../renderers/utils/measureText";
import {
  Tag,
  BarChart3,
  ToggleLeft,
  Layout,
  ArrowDown,
  ArrowUp,
  Hash,
} from "lucide-react";
import { STATIC_COLOR_FIELD } from "../utils/sharedSections";

/**
 * ProgressBar Props
 */
export interface ProgressBarProps {
  variant?: "default" | "accent" | "neutral";
  size?: "sm" | "md" | "lg" | "xl";
  label?: string;
  value?: number;
  minValue?: number;
  maxValue?: number;
  locale?: string;
  showValueLabel?: boolean;
  valueLabel?: string;
  formatOptions?: Intl.NumberFormatOptions;
  isIndeterminate?: boolean;
  staticColor?: "white" | "black" | "auto";
  isDisabled?: boolean;
  labelPosition?: "top" | "side";
  children?: string;
  /** ElementSprite 주입: 엔진 계산 최종 폭 */
  _containerWidth?: number;
  style?: Record<string, string | number | undefined>;
}

/** variant별 채우기 색상 */
export const PROGRESSBAR_FILL_COLORS: Record<string, TokenRef> = {
  default: "{color.accent}" as TokenRef,
  accent: "{color.accent}" as TokenRef,
  neutral: "{color.neutral}" as TokenRef,
};

/** 사이즈별 바 치수 */
export const PROGRESSBAR_DIMENSIONS: Record<string, { barHeight: number }> = {
  sm: { barHeight: 4 },
  md: { barHeight: 8 },
  lg: { barHeight: 12 },
  xl: { barHeight: 16 },
};

/**
 * ProgressBar Component Spec
 */
export const ProgressBarSpec: ComponentSpec<ProgressBarProps> = {
  name: "ProgressBar",
  description: "React Aria 기반 프로그레스바 컴포넌트",
  archetype: "progress",
  element: "div",

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
            placeholder: "Upload progress",
            icon: Tag,
          },
          {
            key: "value",
            type: "number",
            label: "Value",
            min: 0,
            icon: BarChart3,
            defaultValue: 0,
          },
        ],
      },
      {
        title: "Locale",
        fields: [
          {
            key: "formatOptions.style",
            type: "enum",
            label: "Format Options",
            icon: Hash,
            options: [
              { value: "decimal", label: "Decimal" },
              { value: "percent", label: "Percent" },
              { value: "currency", label: "Currency" },
              { value: "unit", label: "Unit" },
            ],
            defaultValue: "percent",
            derivedUpdateFn: (
              value: unknown,
              props: Record<string, unknown>,
            ) => {
              const prev =
                (props.formatOptions as Record<string, unknown>) ?? {};
              const base: Record<string, unknown> = { ...prev, style: value };
              if (value === "currency" && !prev.currency) base.currency = "KRW";
              if (value === "unit" && !prev.unit) base.unit = "kilometer";
              return { formatOptions: base };
            },
          },
          {
            key: "formatOptions.currency",
            type: "enum",
            label: "Currency",
            icon: Hash,
            updatePath: ["formatOptions", "currency"],
            visibleWhen: { key: "formatOptions.style", equals: "currency" },
            options: [
              { value: "KRW", label: "KRW (₩)" },
              { value: "USD", label: "USD ($)" },
              { value: "EUR", label: "EUR (€)" },
              { value: "GBP", label: "GBP (£)" },
              { value: "JPY", label: "JPY (¥)" },
            ],
            defaultValue: "KRW",
          },
          {
            key: "formatOptions.unit",
            type: "enum",
            label: "Unit",
            icon: Hash,
            updatePath: ["formatOptions", "unit"],
            visibleWhen: { key: "formatOptions.style", equals: "unit" },
            options: [
              { value: "kilometer", label: "Kilometer (km)" },
              { value: "meter", label: "Meter (m)" },
              { value: "centimeter", label: "Centimeter (cm)" },
              { value: "millimeter", label: "Millimeter (mm)" },
              { value: "mile", label: "Mile (mi)" },
              { value: "kilogram", label: "Kilogram (kg)" },
              { value: "gram", label: "Gram (g)" },
              { value: "pound", label: "Pound (lb)" },
              { value: "celsius", label: "Celsius (°C)" },
              { value: "fahrenheit", label: "Fahrenheit (°F)" },
              { value: "liter", label: "Liter (L)" },
              { value: "milliliter", label: "Milliliter (mL)" },
              { value: "byte", label: "Byte (B)" },
              { value: "kilobyte", label: "Kilobyte (KB)" },
              { value: "megabyte", label: "Megabyte (MB)" },
              { value: "gigabyte", label: "Gigabyte (GB)" },
              { value: "second", label: "Second (s)" },
              { value: "minute", label: "Minute (min)" },
              { value: "hour", label: "Hour (h)" },
              { value: "day", label: "Day" },
              { value: "percent", label: "Percent (%)" },
            ],
            defaultValue: "kilometer",
          },
          {
            key: "valueLabel",
            type: "string",
            label: "Value Label",
            placeholder: "Custom label (e.g. 50%)",
            icon: BarChart3,
          },
        ],
      },
      {
        title: "Appearance",
        fields: [
          {
            type: "variant",
            label: "Variant",
            icon: Layout,
          },
          {
            type: "size",
            label: "Size",
            options: [
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
          STATIC_COLOR_FIELD,
        ],
      },
      {
        title: "Range",
        fields: [
          {
            key: "minValue",
            type: "number",
            label: "Min Value",
            icon: ArrowDown,
            defaultValue: 0,
          },
          {
            key: "maxValue",
            type: "number",
            label: "Max Value",
            icon: ArrowUp,
            defaultValue: 100,
          },
          {
            key: "isIndeterminate",
            type: "boolean",
            label: "Indeterminate",
            icon: ToggleLeft,
          },
        ],
      },
    ],
  },

  // preview CSS용: 배경 투명 (track 배경은 ProgressBarTrack child가 담당)
  variants: {
    default: {
      fill: {
        default: {
          base: "{color.transparent}" as TokenRef,
          hover: "{color.transparent}" as TokenRef,
          pressed: "{color.transparent}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
    },
    accent: {
      fill: {
        default: {
          base: "{color.transparent}" as TokenRef,
          hover: "{color.transparent}" as TokenRef,
          pressed: "{color.transparent}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
    },
    neutral: {
      fill: {
        default: {
          base: "{color.transparent}" as TokenRef,
          hover: "{color.transparent}" as TokenRef,
          pressed: "{color.transparent}" as TokenRef,
        },
      },
      text: "{color.neutral}" as TokenRef,
    },
  },

  // ADR-086 P1: lineHeight 추가 (SIZE_LINE_HEIGHT Record 와 일치 — 16/20/24/28).
  //   P2 에서 implicitStyles 의 Record 가 제거되고 본 spec.sizes.lineHeight 를 직접 소비.
  sizes: {
    sm: {
      height: 4,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      lineHeight: "{typography.text-xs--line-height}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      gap: 4,
    },
    md: {
      height: 8,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      lineHeight: "{typography.text-sm--line-height}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      gap: 4,
    },
    lg: {
      height: 12,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      lineHeight: "{typography.text-base--line-height}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 4,
    },
    xl: {
      height: 16,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
      lineHeight: "{typography.text-lg--line-height}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
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
    focusVisible: {},
  },

  // ADR-085 P3: grid-template-areas/columns 를 legacy composition.containerStyles 에서
  //   정식 containerStyles (ContainerStylesSchema) 로 이관. Spec/CSS/Taffy 3경로 SSOT.
  containerStyles: {
    display: "grid",
    gridTemplateAreas: '"label value" "bar bar"',
    gridTemplateColumns: "1fr auto",
  },

  composition: {
    layout: "grid",
    containerStyles: {
      "box-sizing": "border-box",
      "row-gap": "var(--spacing-xs)",
      "column-gap": "var(--spacing-md)",
      width: "100%",
      color: "var(--fg)",
      "font-size": "var(--text-sm)",
      "--label-font-size": "var(--text-sm)",
      "--fill-color": "var(--accent)",
      "--track-color": "var(--accent-subtle)",
    },
    staticSelectors: {
      ".react-aria-Label": {
        "grid-area": "label",
        "white-space": "nowrap",
      },
      ".value": {
        "grid-area": "value",
        "font-size": "var(--text-sm)",
        color: "var(--fg-muted)",
        "white-space": "nowrap",
      },
      ".bar": {
        "grid-area": "bar",
        "box-shadow": "var(--inset-shadow-xs)",
        "forced-color-adjust": "none",
        height: "var(--spacing-sm)",
        "border-radius": "var(--radius-sm)",
        overflow: "hidden",
        "will-change": "transform",
        background: "var(--track-color)",
      },
      ".fill": {
        "border-radius": "var(--radius-sm)",
        background: "var(--fill-color)",
        height: "100%",
        transition: "width 200ms ease-out",
      },
    },
    containerVariants: {
      variant: {
        default: {
          styles: {
            "--fill-color": "var(--accent)",
            "--track-color": "var(--accent-subtle)",
          },
        },
        accent: {
          styles: {
            "--fill-color": "var(--accent)",
            "--track-color": "var(--accent-subtle)",
          },
        },
        neutral: {
          styles: {
            "--fill-color": "var(--fg-muted)",
            "--track-color": "var(--bg-muted)",
          },
        },
      },
      indeterminate: {
        true: {
          nested: [
            {
              selector: ".fill",
              styles: {
                width: "120px",
                "border-radius": "inherit",
                animation:
                  "ProgressBar-indeterminate 1.5s infinite ease-in-out",
                "will-change": "transform",
              },
            },
          ],
        },
      },
      disabled: {
        true: {
          styles: {
            opacity: "0.38",
            cursor: "not-allowed",
            "pointer-events": "none",
          },
        },
      },
      size: {
        sm: { styles: { "--label-font-size": "var(--text-xs)" } },
        md: { styles: { "--label-font-size": "var(--text-sm)" } },
        lg: { styles: { "--label-font-size": "var(--text-base)" } },
        xl: { styles: { "--label-font-size": "var(--text-lg)" } },
      },
    },
    sizeSelectors: {
      sm: {
        ".bar": {
          height: "var(--spacing-xs)",
          "border-radius": "var(--radius-sm)",
        },
        ".fill": { "border-radius": "var(--radius-sm)" },
        ".value": { "font-size": "var(--text-xs)" },
      },
      md: {
        ".bar": {
          height: "var(--spacing-sm)",
          "border-radius": "var(--radius-sm)",
        },
        ".fill": { "border-radius": "var(--radius-sm)" },
        ".value": { "font-size": "var(--text-sm)" },
      },
      lg: {
        ".bar": {
          height: "var(--spacing-md)",
          "border-radius": "var(--radius-lg)",
        },
        ".fill": { "border-radius": "var(--radius-md)" },
        ".value": { "font-size": "var(--text-base)" },
      },
      xl: {
        ".bar": {
          height: "var(--spacing-lg)",
          "border-radius": "var(--radius-lg)",
        },
        ".fill": { "border-radius": "var(--radius-lg)" },
        ".value": { "font-size": "var(--text-lg)" },
      },
    },
    animations: {
      indeterminate: {
        keyframes: {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(250px)" },
        },
        reducedMotion: { "transition-duration": "0s" },
      },
    },
    delegation: [],
  },

  propagation: {
    rules: [
      {
        parentProp: "label",
        childPath: "Label",
        childProp: "children",
        override: true,
      },
      { parentProp: "size", childPath: "ProgressBarTrack", override: true },
      { parentProp: "size", childPath: "ProgressBarValue", override: true },
      { parentProp: "size", childPath: "Label", override: true },
    ],
  },

  render: {
    shapes: (props, size, _state = "default") => {
      const variant =
        ProgressBarSpec.variants![
          (props as { variant?: keyof typeof ProgressBarSpec.variants })
            .variant ?? ProgressBarSpec.defaultVariant!
        ];
      const variantName = props.variant ?? "default";
      const sizeName = props.size ?? "md";
      const barDims =
        PROGRESSBAR_DIMENSIONS[sizeName] ?? PROGRESSBAR_DIMENSIONS.md;
      const fillColor =
        PROGRESSBAR_FILL_COLORS[variantName] ?? PROGRESSBAR_FILL_COLORS.default;
      const width =
        typeof props._containerWidth === "number" && props._containerWidth > 0
          ? props._containerWidth
          : (props.style?.width as number) || 240;
      const barHeight = barDims.barHeight;
      const gap = parsePxValue(
        props.style?.rowGap ?? props.style?.columnGap ?? props.style?.gap,
        size.gap ?? 8,
      );
      // 사용자 스타일 우선
      const barRadius = parsePxValue(
        props.style?.borderRadius,
        size.borderRadius,
      );

      const bgColor =
        props.style?.backgroundColor ?? ("{color.neutral-subtle}" as TokenRef);
      const textColor = props.style?.color ?? variant.text;
      const fontSize = resolveSpecFontSize(
        props.style?.fontSize ?? size.fontSize,
        16,
      );
      const fwRaw = props.style?.fontWeight;
      const fw =
        fwRaw != null
          ? typeof fwRaw === "number"
            ? fwRaw
            : parseInt(String(fwRaw), 10) || 500
          : 500;
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;

      const min = props.minValue ?? 0;
      const max = props.maxValue ?? 100;
      const rawValue = props.value ?? 0;
      const value = Math.max(min, Math.min(max, rawValue));
      const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
      const fillWidth = (width * percent) / 100;

      const shapes: Shape[] = [];

      // Child Composition: 자식 Element가 있으면 label 스킵 + track/fill은 ProgressBarTrack가 담당
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;

      // hasChildren일 때: Label → child, ProgressBarOutput → child, ProgressBarTrack → child
      // ProgressBar spec shapes는 완전 스킵 (모든 렌더링이 child에서 처리)
      const showValueLabel = props.showValueLabel !== false;

      if (hasChildren) {
        // 모든 렌더링은 child element가 담당 → shapes 비어있음
      } else {
        // Standalone 모드: 기존 monolithic 렌더링
        const hasLabelRow = !!props.label || showValueLabel;

        const fo = props.formatOptions as Intl.NumberFormatOptions | undefined;
        const autoFormatted = showValueLabel
          ? (() => {
              if (!fo?.style || fo.style === "percent")
                return `${Math.round(percent)}%`;
              if (fo.style === "currency" && fo.currency) {
                try {
                  return new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: fo.currency,
                  }).format(value);
                } catch {
                  return String(Math.round(value));
                }
              }
              if (fo.style === "unit" && fo.unit) {
                try {
                  return new Intl.NumberFormat(undefined, {
                    style: "unit",
                    unit: fo.unit,
                  }).format(value);
                } catch {
                  return String(Math.round(value));
                }
              }
              return String(Math.round(value));
            })()
          : "";
        const formattedValue = props.valueLabel ?? autoFormatted;
        // ADR-051: 실측 기반 value 텍스트 폭 (추정값 제거)
        const measuredValueWidth = showValueLabel
          ? measureSpecTextWidth(formattedValue, fontSize, ff) + 4 // 4px 여유 (kerning)
          : 0;

        if (props.label) {
          shapes.push({
            type: "text" as const,
            x: 0,
            y: 0,
            text: props.label,
            fontSize,
            fontFamily: ff,
            fontWeight: fw,
            fill: textColor,
            align: "left" as const,
            baseline: "top" as const,
            maxWidth: showValueLabel ? width - measuredValueWidth : undefined,
          });
        }
        if (showValueLabel) {
          shapes.push({
            type: "text" as const,
            x: width,
            y: 0,
            text: formattedValue,
            fontSize,
            fontFamily: ff,
            fill: textColor,
            align: "right" as const,
            baseline: "top" as const,
          });
        }

        const offsetY = hasLabelRow ? fontSize + gap : 0;

        // 트랙 배경
        shapes.push({
          id: "track",
          type: "roundRect" as const,
          x: 0,
          y: offsetY,
          width,
          height: barHeight,
          radius: barRadius as unknown as number,
          fill: bgColor,
        });

        // 채우기 (determinate 모드)
        if (!props.isIndeterminate && fillWidth > 0) {
          shapes.push({
            id: "fill",
            type: "roundRect" as const,
            x: 0,
            y: offsetY,
            width: fillWidth,
            height: barHeight,
            radius: barRadius as unknown as number,
            fill: fillColor,
          });
        }

        // Indeterminate 애니메이션 표현 (정적 50% 위치)
        if (props.isIndeterminate) {
          shapes.push({
            id: "indeterminate-fill",
            type: "roundRect" as const,
            x: width * 0.2,
            y: offsetY,
            width: width * 0.3,
            height: barHeight,
            radius: barRadius as unknown as number,
            fill: fillColor,
          });
        }
      }

      return shapes;
    },

    react: (props) => ({
      role: "progressbar",
      "aria-valuemin": props.minValue ?? 0,
      "aria-valuemax": props.maxValue ?? 100,
      "aria-valuenow": props.isIndeterminate
        ? undefined
        : (props.value ?? props.minValue ?? 0),
      "data-indeterminate": props.isIndeterminate || undefined,
    }),

    pixi: (props) => ({
      eventMode: "static" as const,
      cursor: props.isDisabled ? "not-allowed" : "default",
    }),
  },
};
