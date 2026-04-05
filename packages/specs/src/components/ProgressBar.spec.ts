/**
 * ProgressBar Component Spec
 *
 * React Aria 기반 프로그레스바 컴포넌트 (트랙 + 채우기)
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";
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
  skipCSSGeneration: true,
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
            updatePath: ["formatOptions", "style"],
            options: [
              { value: "decimal", label: "Decimal" },
              { value: "percent", label: "Percent" },
              { value: "currency", label: "Currency" },
              { value: "unit", label: "Unit" },
            ],
            defaultValue: "percent",
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
            type: "string",
            label: "Unit",
            icon: Hash,
            updatePath: ["formatOptions", "unit"],
            emptyToUndefined: true,
            visibleWhen: { key: "formatOptions.style", equals: "unit" },
            placeholder: "kilometer, celsius, etc.",
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
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    accent: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
    neutral: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 4,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-xs}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      gap: 4,
    },
    md: {
      height: 8,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.sm}" as TokenRef,
      gap: 4,
    },
    lg: {
      height: 12,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.md}" as TokenRef,
      gap: 4,
    },
    xl: {
      height: 16,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-lg}" as TokenRef,
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
    shapes: (props, variant, size, _state = "default") => {
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
      const styleGap = props.style?.gap;
      const gap =
        styleGap != null
          ? typeof styleGap === "number"
            ? styleGap
            : parseFloat(String(styleGap)) || 0
          : (size.gap ?? 8);
      // 사용자 스타일 우선
      const styleBr = props.style?.borderRadius;
      const barRadius =
        styleBr != null
          ? typeof styleBr === "number"
            ? styleBr
            : parseFloat(String(styleBr)) || 0
          : size.borderRadius;

      const bgColor =
        props.style?.backgroundColor ?? ("{color.neutral-subtle}" as TokenRef);
      const textColor = props.style?.color ?? variant.text;
      const rawFontSize = props.style?.fontSize ?? size.fontSize;
      const resolvedFs =
        typeof rawFontSize === "number"
          ? rawFontSize
          : typeof rawFontSize === "string" && rawFontSize.startsWith("{")
            ? resolveToken(rawFontSize as TokenRef)
            : rawFontSize;
      const fontSize = typeof resolvedFs === "number" ? resolvedFs : 16;
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

        const formatStyle = (
          props.formatOptions as Intl.NumberFormatOptions | undefined
        )?.style;
        const autoFormatted = showValueLabel
          ? formatStyle === "decimal"
            ? String(Math.round(value))
            : `${Math.round(percent)}%`
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
