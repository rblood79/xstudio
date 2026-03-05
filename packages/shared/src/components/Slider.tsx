import {
  Label,
  Slider as AriaSlider,
  SliderOutput,
  SliderProps as AriaSliderProps,
  SliderThumb,
  SliderTrack,
  composeRenderProps,
} from "react-aria-components";
import type { ComponentSizeSubset } from "../types";
import {
  formatNumber,
  formatPercent,
  formatUnit,
} from "../utils/core/numberUtils";
import { Skeleton } from "./Skeleton";

import "./styles/Slider.css";

export interface SliderProps<T> extends AriaSliderProps<T> {
  label?: string;
  thumbLabels?: string[];
  /**
   * Emphasizes the slider with accent color (S2)
   * @default false
   */
  isEmphasized?: boolean;
  /**
   * Size of the slider
   * @default 'md'
   */
  size?: ComponentSizeSubset;
  /**
   * 로케일
   * @default 'ko-KR'
   */
  locale?: string;
  /**
   * 값 표시 형식
   * - number: 숫자로 표시 (75)
   * - percent: 퍼센트로 표시 (75%)
   * - unit: 단위와 함께 표시 (75 km)
   * - custom: 커스텀 포맷터 사용
   * @default 'number'
   */
  valueFormat?: "number" | "percent" | "unit" | "custom";
  /**
   * 단위 (valueFormat이 'unit'일 때 사용)
   * @example 'kilometer', 'celsius', 'meter'
   */
  unit?: string;
  /**
   * 커스텀 포맷터 함수
   */
  customFormatter?: (value: number) => string;
  /**
   * 값 표시 여부
   * @default true
   */
  showValue?: boolean;
  /**
   * Show loading skeleton instead of slider
   * @default false
   */
  isLoading?: boolean;
}

/**
 * S2 variant 전환: isEmphasized data-* 패턴
 * - data-emphasized: accent color 강조 (선택 시)
 * - data-size: 크기
 */
export function Slider<T extends number | number[]>({
  label,
  thumbLabels,
  isEmphasized = false,
  size = "md",
  locale = "ko-KR",
  valueFormat = "number",
  unit,
  customFormatter,
  showValue = true,
  isLoading,
  ...props
}: SliderProps<T>) {
  if (isLoading) {
    return (
      <Skeleton
        componentVariant="slider"
        size={size}
        className={props.className as string}
        aria-label="Loading slider..."
      />
    );
  }

  const sliderClassName = composeRenderProps(props.className, (className) =>
    className ? `react-aria-Slider ${className}` : "react-aria-Slider",
  );

  // 값 포맷팅 함수
  const formatValue = (value: number): string => {
    if (customFormatter) {
      return customFormatter(value);
    }

    switch (valueFormat) {
      case "percent":
        return formatPercent(value / 100, locale, 0);
      case "unit":
        return unit
          ? formatUnit(value, unit, locale)
          : formatNumber(value, locale);
      case "number":
      default:
        return formatNumber(value, locale);
    }
  };

  return (
    <AriaSlider
      {...props}
      className={sliderClassName}
      data-emphasized={isEmphasized || undefined}
      data-size={size}
    >
      {label && <Label>{label}</Label>}
      {showValue && (
        <SliderOutput>
          {({ state }) =>
            state.values.map((value) => formatValue(value)).join(" – ")
          }
        </SliderOutput>
      )}
      <SliderTrack>
        {({ state }) =>
          state.values.map((_, i) => (
            <SliderThumb key={i} index={i} aria-label={thumbLabels?.[i]} />
          ))
        }
      </SliderTrack>
    </AriaSlider>
  );
}
