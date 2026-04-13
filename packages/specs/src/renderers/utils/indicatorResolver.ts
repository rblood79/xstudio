/**
 * Indicator Resolver (ADR-060)
 *
 * Form control 컴포넌트의 indicator 치수를 spec.sizes.*.indicator에서 조회.
 * 레거시 매직 테이블 (CHECKBOX_BOX_SIZES 등)을 대체한다.
 *
 * @packageDocumentation
 */

import type { ComponentSpec, SizeSpec, IndicatorSpec } from "../../types";

function getSize(spec: ComponentSpec, sizeName?: string): SizeSpec | undefined {
  const sizes = spec.sizes;
  if (!sizes) return undefined;
  return sizes[sizeName ?? spec.defaultSize] ?? sizes[spec.defaultSize];
}

function getIndicator(
  spec: ComponentSpec,
  sizeName?: string,
): IndicatorSpec | undefined {
  return getSize(spec, sizeName)?.indicator;
}

/** Checkbox indicator — { boxSize, boxRadius } */
export function getCheckboxIndicator(
  spec: ComponentSpec,
  sizeName?: string,
): { boxSize: number; boxRadius: number } {
  const ind = getIndicator(spec, sizeName);
  return {
    boxSize: ind?.boxSize ?? 20,
    boxRadius: ind?.boxRadius ?? 4,
  };
}

/** Radio indicator — { outer, inner } */
export function getRadioIndicator(
  spec: ComponentSpec,
  sizeName?: string,
): { outer: number; inner: number } {
  const ind = getIndicator(spec, sizeName);
  return {
    outer: ind?.boxSize ?? 20,
    inner: ind?.dotSize ?? 8,
  };
}

/** Switch indicator — { trackWidth, trackHeight, thumbSize, thumbOffset } */
export function getSwitchIndicator(
  spec: ComponentSpec,
  sizeName?: string,
): {
  trackWidth: number;
  trackHeight: number;
  thumbSize: number;
  thumbOffset: number;
} {
  const ind = getIndicator(spec, sizeName);
  return {
    trackWidth: ind?.trackWidth ?? 36,
    trackHeight: ind?.trackHeight ?? 20,
    thumbSize: ind?.thumbSize ?? 16,
    thumbOffset: ind?.thumbOffset ?? 2,
  };
}

/** Slider indicator — { trackHeight, thumbSize } */
export function getSliderIndicator(
  spec: ComponentSpec,
  sizeName?: string,
): { trackHeight: number; thumbSize: number } {
  const ind = getIndicator(spec, sizeName);
  return {
    trackHeight: ind?.trackHeight ?? 8,
    thumbSize: ind?.thumbSize ?? 18,
  };
}
