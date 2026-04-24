/**
 * Meter Component Spec
 *
 * React Aria 기반 미터 컴포넌트 (트랙 + 채우기)
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { parsePxValue } from "../primitives";
import { fontFamily } from "../primitives/typography";
import { resolveSpecFontSize } from "../renderers/utils/resolveSpecFontSize";
import {
  Tag,
  Gauge,
  Layout,
  ArrowDown,
  ArrowUp,
  Hash,
  AlignLeft,
} from "lucide-react";
import { STATIC_COLOR_FIELD } from "../utils/sharedSections";

/**
 * Meter Props
 */
export interface MeterProps {
  variant?: "informative" | "positive" | "warning" | "critical";
  size?: "sm" | "md" | "lg" | "xl";
  label?: string;
  value?: number;
  minValue?: number;
  maxValue?: number;
  showValueLabel?: boolean;
  valueLabel?: string;
  locale?: string;
  formatOptions?: Intl.NumberFormatOptions;
  staticColor?: "white" | "black" | "auto";
  isDisabled?: boolean;
  labelAlign?: "start" | "end";
  labelPosition?: "top" | "side";
  children?: string;
  /** ElementSprite 주입: 엔진 계산 최종 폭 */
  _containerWidth?: number;
  style?: Record<string, string | number | undefined>;
}

/** variant별 채우기 색상 */
export const METER_FILL_COLORS: Record<string, TokenRef> = {
  informative: "{color.informative}" as TokenRef,
  positive: "{color.positive}" as TokenRef,
  warning: "{color.notice}" as TokenRef,
  critical: "{color.negative}" as TokenRef,
};

/** 사이즈별 바 치수 */
export const METER_DIMENSIONS: Record<string, { barHeight: number }> = {
  sm: { barHeight: 4 },
  md: { barHeight: 8 },
  lg: { barHeight: 12 },
  xl: { barHeight: 16 },
};

/**
 * Meter Component Spec
 */
export const MeterSpec: ComponentSpec<MeterProps> = {
  name: "Meter",
  description: "React Aria 기반 미터 컴포넌트",
  archetype: "progress",
  element: "div",

  defaultVariant: "informative",
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
            placeholder: "Storage usage",
            icon: Tag,
          },
          {
            key: "value",
            type: "number",
            label: "Value",
            min: 0,
            icon: Gauge,
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
            placeholder: "Custom label (e.g. 75%)",
            icon: Tag,
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
            ],
          },
          STATIC_COLOR_FIELD,
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
        ],
      },
    ],
  },

  variants: {
    informative: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    positive: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    warning: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    critical: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
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
    focusVisible: {},
  },

  // ADR-085 P3: grid-template-areas/columns 를 legacy composition.containerStyles 에서
  //   정식 containerStyles (ContainerStylesSchema) 로 이관. Spec/CSS/Taffy 3경로 SSOT.
  //   나머지 legacy 필드 (box-sizing / row-gap / column-gap / width / color / font-size /
  //   CSS custom properties) 는 ContainerStylesSchema 미지원이므로 composition.containerStyles
  //   에 유지 (후속 Schema 확장 시 추가 이관 가능).
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
      "--fill-color": "var(--color-info-600)",
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
        background: "var(--accent-subtle)",
      },
      ".fill": {
        background: "var(--fill-color)",
        height: "100%",
        transition: "width 200ms ease-out",
        "forced-color-adjust": "auto",
      },
    },
    containerVariants: {
      variant: {
        informative: {
          styles: {
            "--fill-color": "var(--color-info-600)",
          },
        },
        positive: {
          styles: {
            "--fill-color": "var(--color-green-600)",
          },
        },
        warning: {
          styles: {
            "--fill-color": "var(--color-warning-600)",
          },
        },
        critical: {
          styles: {
            "--fill-color": "var(--negative)",
          },
        },
      },
      size: {
        sm: { styles: { "--label-font-size": "var(--text-xs)" } },
        md: { styles: { "--label-font-size": "var(--text-sm)" } },
        lg: { styles: { "--label-font-size": "var(--text-base)" } },
        xl: { styles: { "--label-font-size": "var(--text-lg)" } },
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
    },
    sizeSelectors: {
      sm: {
        ".bar": {
          height: "var(--spacing-xs)",
          "border-radius": "var(--radius-sm)",
        },
        ".value": { "font-size": "var(--text-xs)" },
      },
      md: {
        ".bar": {
          height: "var(--spacing-sm)",
          "border-radius": "var(--radius-sm)",
        },
        ".value": { "font-size": "var(--text-sm)" },
      },
      lg: {
        ".bar": {
          height: "var(--spacing-md)",
          "border-radius": "var(--radius-lg)",
        },
        ".value": { "font-size": "var(--text-base)" },
      },
      xl: {
        ".bar": {
          height: "var(--spacing-lg)",
          "border-radius": "var(--radius-lg)",
        },
        ".value": { "font-size": "var(--text-lg)" },
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
      { parentProp: "size", childPath: "MeterTrack", override: true },
      { parentProp: "size", childPath: "MeterValue", override: true },
      { parentProp: "size", childPath: "Label", override: true },
    ],
  },

  render: {
    shapes: (props, size, _state = "default") => {
      const variant =
        MeterSpec.variants![
          (props as { variant?: keyof typeof MeterSpec.variants }).variant ??
            MeterSpec.defaultVariant!
        ];
      const variantName = props.variant ?? "informative";
      const sizeName = props.size ?? "md";
      const meterDims = METER_DIMENSIONS[sizeName] ?? METER_DIMENSIONS.md;
      const fillColor =
        METER_FILL_COLORS[variantName] ?? METER_FILL_COLORS.informative;
      const width =
        typeof props._containerWidth === "number" && props._containerWidth > 0
          ? props._containerWidth
          : (props.style?.width as number) || 240;
      const barHeight = meterDims.barHeight;
      const gap = parsePxValue(props.style?.gap, size.gap ?? 8);

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
      const value = Math.max(min, Math.min(max, props.value ?? 0));
      const percent = ((value - min) / (max - min)) * 100;
      const fillWidth = (width * percent) / 100;

      const shapes: Shape[] = [];

      // Child Composition: 자식 Element가 있으면 모든 shapes 스킵 (child가 담당)
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;

      if (hasChildren) {
        return shapes; // empty
      }

      // Standalone 모드: 라벨 + 값 행
      const hasLabelRow = props.label || props.showValueLabel !== false;
      if (hasLabelRow) {
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
          });
        }
        if (props.showValueLabel !== false) {
          const fo = props.formatOptions;
          const autoFormatted = (() => {
            if (!fo?.style || fo.style === "percent")
              return `${Math.round(percent)}%`;
            if (fo.style === "currency" && fo.currency) {
              try {
                return new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: fo.currency,
                }).format(value);
              } catch {
                return String(value);
              }
            }
            if (fo.style === "unit" && fo.unit) {
              try {
                return new Intl.NumberFormat(undefined, {
                  style: "unit",
                  unit: fo.unit,
                }).format(value);
              } catch {
                return String(value);
              }
            }
            return String(value);
          })();
          const formattedValue = props.valueLabel ?? autoFormatted;
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

      // 채우기
      if (fillWidth > 0) {
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

      return shapes;
    },

    react: (props) => ({
      role: "meter",
      "aria-valuemin": props.minValue ?? 0,
      "aria-valuemax": props.maxValue ?? 100,
      "aria-valuenow": props.value ?? 50,
    }),

    pixi: (props) => ({
      eventMode: "static" as const,
      cursor: props.isDisabled ? "not-allowed" : "default",
    }),
  },
};
