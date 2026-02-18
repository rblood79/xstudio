/**
 * Pixi Slider
 *
 * 투명 히트 영역(pixiGraphics) 기반 Slider
 * - Skia가 시각적 렌더링을 담당, PixiJS는 이벤트 히트 영역만 제공
 * - convertToSliderStyle()로 크기 계산 (Skia 렌더링에 필요)
 *
 * @since 2025-12-13 Phase 6.1
 * @updated 2026-02-18 @pixi/ui Slider 의존성 제거 (Skia 렌더링 전환)
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useMemo } from 'react';
import { Graphics as PixiGraphics } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';

// Component Spec
import {
  SliderSpec,
  SLIDER_DIMENSIONS,
  getSizePreset as getSpecSizePreset,
} from '@xstudio/specs';

// ============================================
// Types
// ============================================

export interface PixiSliderProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: number) => void;
}

// ============================================
// Style Conversion
// ============================================

interface SliderLayoutStyle {
  width: number;
  height: number;
  trackHeight: number;
  handleSize: number;
}

/**
 * CSS 스타일을 Slider 레이아웃 스타일로 변환
 */
function convertToSliderStyle(style: CSSStyle | undefined, size: string): SliderLayoutStyle {
  const sizeSpec = SliderSpec.sizes[size] || SliderSpec.sizes[SliderSpec.defaultSize];
  const specPreset = getSpecSizePreset(sizeSpec, 'light');
  const dimensions = SLIDER_DIMENSIONS[size] || SLIDER_DIMENSIONS[SliderSpec.defaultSize];
  const trackHeight = dimensions.trackHeight ?? 4;
  const thumbSize = dimensions.thumbSize ?? 20;
  const defaultHeight = specPreset.height ?? 20;

  return {
    width: typeof style?.width === 'number' ? style.width : 200,
    height: typeof style?.height === 'number' ? style.height : defaultHeight,
    trackHeight,
    handleSize: thumbSize,
  };
}

// ============================================
// Component
// ============================================

/**
 * PixiSlider
 *
 * 투명 히트 영역만 제공 (Skia가 시각적 렌더링 담당)
 *
 * @example
 * <PixiSlider
 *   element={sliderElement}
 *   onChange={(id, value) => handleValueChange(id, value)}
 * />
 */
export const PixiSlider = memo(function PixiSlider({
  element,
  onClick,
}: PixiSliderProps) {
  useExtend(PIXI_COMPONENTS);

  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // size prop 추출 (기본값: 'md')
  const size = useMemo(() => String(props?.size || 'md'), [props?.size]);

  // 슬라이더 스타일 계산 (Skia 렌더링에 필요)
  const layoutStyle = useMemo(() => convertToSliderStyle(style, size), [style, size]);

  // 이벤트 핸들러
  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  // 투명 히트 영역
  const drawHitArea = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.rect(0, 0, layoutStyle.width, layoutStyle.height);
      g.fill({ color: 0xffffff, alpha: 0.001 });
    },
    [layoutStyle.width, layoutStyle.height]
  );

  return (
    <pixiContainer>
      <pixiGraphics
        draw={drawHitArea}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handleClick}
      />
    </pixiContainer>
  );
});

export default PixiSlider;
