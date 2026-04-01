/**
 * Slider Component Spec
 *
 * React Aria 기반 슬라이더 컴포넌트 (트랙 + 썸 + 채우기)
 * Single Source of Truth - React와 PIXI 모두에서 동일한 시각적 결과
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";
import { fontFamily } from "../primitives/typography";
import { resolveToken } from "../renderers/utils/tokenResolver";
import {
  Layout,
  Type,
  Globe,
  DollarSign,
  ArrowDown,
  ArrowUp,
  ArrowLeftRight,
  Move,
  NotebookTabs,
  Tag,
  FormInput,
  PointerOff,
} from "lucide-react";

/**
 * Slider Props
 */
export interface SliderProps {
  variant?: "default" | "accent" | "neutral";
  size?: "sm" | "md" | "lg";
  label?: string;
  name?: string;
  /** 단일 값 또는 범위 값 (React Aria Slider<number | number[]> 패턴) */
  value?: number | number[];
  minValue?: number;
  maxValue?: number;
  step?: number;
  showValue?: boolean;
  locale?: string;
  valueFormat?: "number" | "percent" | "unit" | "custom";
  unit?: string;
  form?: string;
  orientation?: "horizontal" | "vertical";
  isDisabled?: boolean;
  isRequired?: boolean;
  labelPosition?: "top" | "side";
  children?: string;
  style?: Record<string, string | number | undefined>;
}

/** variant별 채우기/핸들 색상 */
export const SLIDER_FILL_COLORS: Record<
  string,
  { fill: TokenRef; handle: TokenRef }
> = {
  default: {
    fill: "{color.accent}" as TokenRef,
    handle: "{color.accent}" as TokenRef,
  },
  accent: {
    fill: "{color.accent}" as TokenRef,
    handle: "{color.accent}" as TokenRef,
  },
  neutral: {
    fill: "{color.neutral-subdued}" as TokenRef,
    handle: "{color.neutral-subdued}" as TokenRef,
  },
};

/** 사이즈별 트랙/핸들 치수 (PROGRESSBAR_DIMENSIONS barHeight 동기) */
export const SLIDER_DIMENSIONS: Record<
  string,
  { trackHeight: number; thumbSize: number }
> = {
  sm: { trackHeight: 4, thumbSize: 14 },
  md: { trackHeight: 8, thumbSize: 18 },
  lg: { trackHeight: 12, thumbSize: 22 },
};

/**
 * Slider Component Spec
 */
export const SliderSpec: ComponentSpec<SliderProps> = {
  name: "Slider",
  description: "React Aria 기반 슬라이더 컴포넌트",
  archetype: "slider",
  skipCSSGeneration: true,
  element: "div",

  defaultVariant: "default",
  defaultSize: "md",

  // preview CSS용: 배경 투명 (track 배경은 SliderTrack child가 담당)
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
      borderRadius: "{radius.full}" as TokenRef,
      gap: 6,
    },
    md: {
      height: 8,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 8,
    },
    lg: {
      height: 12,
      paddingX: 0,
      paddingY: 0,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.full}" as TokenRef,
      gap: 10,
    },
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
      { parentProp: "size", childPath: "SliderTrack", override: true },
      { parentProp: "size", childPath: "SliderOutput", override: true },
      { parentProp: "size", childPath: "SliderThumb", override: true },
      { parentProp: "size", childPath: "Label", override: true },
      {
        parentProp: "label",
        childPath: "Label",
        childProp: "children",
        override: true,
      },
      { parentProp: "value", childPath: "SliderTrack", override: true },
      { parentProp: "minValue", childPath: "SliderTrack", override: true },
      { parentProp: "maxValue", childPath: "SliderTrack", override: true },
    ],
  },

  properties: {
    sections: [
      {
        title: "Content",
        fields: [{ key: "label", type: "string", label: "Label", icon: Type }],
      },
      {
        title: "Appearance",
        fields: [
          { type: "variant" },
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
          },
          {
            key: "orientation",
            type: "enum",
            label: "Orientation",
            icon: ArrowLeftRight,
            options: [
              { value: "horizontal", label: "Horizontal" },
              { value: "vertical", label: "Vertical" },
            ],
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
          {
            key: "valueFormat",
            type: "enum",
            label: "Value Format",
            icon: DollarSign,
            options: [
              { value: "number", label: "Number" },
              { value: "percent", label: "Percent" },
              { value: "unit", label: "Unit" },
              { value: "custom", label: "Custom" },
            ],
          },
          {
            key: "unit",
            type: "string",
            label: "Unit",
            icon: Type,
            placeholder: "kilometer, celsius, meter, etc.",
            emptyToUndefined: true,
            visibleWhen: { key: "valueFormat", equals: "unit" },
          },
          {
            key: "showValue",
            type: "boolean",
            label: "Show Value",
            icon: NotebookTabs,
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
          },
        ],
      },
      {
        title: "State",
        fields: [
          { key: "isDisabled", type: "boolean", icon: PointerOff },
          {
            key: "name",
            type: "string",
            label: "Name",
            icon: Tag,
            emptyToUndefined: true,
          },
          {
            key: "form",
            type: "string",
            label: "Form",
            icon: FormInput,
            emptyToUndefined: true,
          },
        ],
      },
    ],
  },

  render: {
    shapes: (props, variant, size, _state = "default") => {
      const variantName = props.variant ?? "default";
      const sizeName = props.size ?? "md";
      const sliderDims = SLIDER_DIMENSIONS[sizeName] ?? SLIDER_DIMENSIONS.md;
      const fillColors =
        SLIDER_FILL_COLORS[variantName] ?? SLIDER_FILL_COLORS.default;
      const width = (props.style?.width as number) || 200;
      const gap = size.gap ?? 10;

      const min = props.minValue ?? 0;
      const max = props.maxValue ?? 100;
      const rawValue = props.value ?? 50;
      const values = Array.isArray(rawValue) ? rawValue : [rawValue];
      const isRange = values.length >= 2;
      const percents = values.map((v) =>
        Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100)),
      );
      const trackY = sliderDims.thumbSize / 2 - sliderDims.trackHeight / 2;
      const trackRadius = sliderDims.trackHeight / 2;

      // 트랙 배경: CSS var(--bg-muted) = {color.neutral-subtle} 통일
      const trackBgColor =
        props.style?.backgroundColor ?? ("{color.neutral-subtle}" as TokenRef);
      const textColor = props.style?.color ?? variant.text;
      const fwRaw = props.style?.fontWeight;
      const fw =
        fwRaw != null
          ? typeof fwRaw === "number"
            ? fwRaw
            : parseInt(String(fwRaw), 10) || 500
          : 500;
      const ff = (props.style?.fontFamily as string) || fontFamily.sans;

      // Propagation은 size prop만 변경하므로 props.size 있으면 size.fontSize 우선
      const rawFontSize = props.size
        ? size.fontSize
        : (props.style?.fontSize ?? size.fontSize);
      const resolvedFontSize =
        typeof rawFontSize === "number"
          ? rawFontSize
          : typeof rawFontSize === "string" && rawFontSize.startsWith("{")
            ? resolveToken(rawFontSize as TokenRef)
            : 14;
      const numericFontSize =
        typeof resolvedFontSize === "number" ? resolvedFontSize : 14;

      const shapes: Shape[] = [];
      const hasChildren = !!(props as Record<string, unknown>)._hasChildren;

      // 라벨 + 값 행 (자식 Element가 있으면 자식 TextSprite가 렌더링하므로 스킵)
      if (!hasChildren && (props.label || props.showValue)) {
        if (props.label) {
          shapes.push({
            type: "text" as const,
            x: 0,
            y: 0,
            text: props.label,
            fontSize: numericFontSize,
            fontFamily: ff,
            fontWeight: fw,
            fill: textColor,
            align: "left" as const,
            baseline: "top" as const,
          });
        }
        if (props.showValue) {
          const valueText = isRange
            ? values.map(String).join(" – ")
            : String(values[0]);
          shapes.push({
            type: "text" as const,
            x: 0,
            y: 0,
            text: valueText,
            fontSize: numericFontSize,
            fontFamily: ff,
            fill: textColor,
            align: "right" as const,
            baseline: "top" as const,
            maxWidth: width,
          });
        }
      }

      // 자식 Element(SliderTrack, SliderThumb 등)가 있으면
      // 트랙/fill/thumb은 자식 Spec shapes가 담당 → 부모에서 스킵
      if (!hasChildren) {
        const offsetY =
          props.label || props.showValue ? numericFontSize + gap : 0;

        shapes.push({
          id: "track",
          type: "roundRect" as const,
          x: 0,
          y: offsetY + trackY,
          width,
          height: sliderDims.trackHeight,
          radius: trackRadius,
          fill: trackBgColor,
        });

        // 채우기 (single: 0~value, range: value[0]~value[1])
        if (isRange) {
          const fillStartX = (width * percents[0]) / 100;
          const fillEndX = (width * percents[1]) / 100;
          const fillW = fillEndX - fillStartX;
          if (fillW > 0) {
            shapes.push({
              id: "fill",
              type: "roundRect" as const,
              x: fillStartX,
              y: offsetY + trackY,
              width: fillW,
              height: sliderDims.trackHeight,
              radius: trackRadius,
              fill: fillColors.fill,
            });
          }
        } else {
          const fillWidth = (width * percents[0]) / 100;
          if (fillWidth > 0) {
            shapes.push({
              id: "fill",
              type: "roundRect" as const,
              x: 0,
              y: offsetY + trackY,
              width: fillWidth,
              height: sliderDims.trackHeight,
              radius: trackRadius,
              fill: fillColors.fill,
            });
          }
        }

        // 썸 (핸들) — single: 1개, range: 2개
        for (let i = 0; i < percents.length; i++) {
          const thumbX = (width * percents[i]) / 100;
          const thumbId = percents.length === 1 ? "thumb" : `thumb-${i}`;
          shapes.push({
            id: thumbId,
            type: "circle" as const,
            x: thumbX,
            y: offsetY + sliderDims.thumbSize / 2,
            radius: sliderDims.thumbSize / 2,
            fill: fillColors.handle,
          });
          shapes.push({
            type: "border" as const,
            target: thumbId,
            borderWidth: 2,
            color: "{color.base}" as TokenRef,
            radius: sliderDims.thumbSize / 2,
          });
        }
      }

      return shapes;
    },

    react: (props) => ({
      "data-disabled": props.isDisabled || undefined,
      role: Array.isArray(props.value) ? "group" : "slider",
      "aria-valuemin": Array.isArray(props.value)
        ? undefined
        : (props.minValue ?? 0),
      "aria-valuemax": Array.isArray(props.value)
        ? undefined
        : (props.maxValue ?? 100),
      "aria-valuenow": Array.isArray(props.value)
        ? undefined
        : ((props.value as number) ?? 50),
    }),

    pixi: (props) => ({
      eventMode: "static" as const,
      cursor: props.isDisabled ? "not-allowed" : "pointer",
    }),
  },
};
