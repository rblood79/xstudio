/**
 * Pixi Slider
 *
 * 🚀 Phase 6.1: @pixi/ui Slider 래퍼
 *
 * @pixi/ui의 Slider 컴포넌트를 xstudio Element 시스템과 통합
 *
 * @since 2025-12-13 Phase 6.1
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useApplication } from '@pixi/react';
import { Slider } from '@pixi/ui';
import { Container, Graphics } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
import { cssColorToHex } from '../sprites/styleConverter';
import { toLayoutSize } from '../layout/styleToLayout';
import { drawBox, drawCircle } from '../utils';
import { getSliderSizePreset, getVariantColors } from '../utils/cssVariableReader';
import { useThemeColors } from '../hooks/useThemeColors';

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
  x: number;
  y: number;
  width: number;
  height: number;
  trackColor: number;
  fillColor: number;
  handleColor: number;
  trackHeight: number;
  handleSize: number;
}

/**
 * CSS 스타일을 Slider 레이아웃 스타일로 변환
 * 🚀 Phase 0: CSS 동기화 - getSliderSizePreset() 사용
 */
/**
 * 🚀 Phase 8: parseCSSSize 제거 - CSS 프리셋 값 사용
 */
function convertToSliderStyle(style: CSSStyle | undefined, size: string, themeDefaultColor: number): SliderLayoutStyle {
  const primaryColor = cssColorToHex(style?.backgroundColor, themeDefaultColor);
  const trackColor = cssColorToHex(style?.borderColor, 0xe5e7eb);

  // 🚀 CSS에서 사이즈 프리셋 읽기
  const sizePreset = getSliderSizePreset(size);

  return {
    x: typeof style?.left === 'number' ? style.left : 0,
    y: typeof style?.top === 'number' ? style.top : 0,
    width: typeof style?.width === 'number' ? style.width : 200,
    height: typeof style?.height === 'number' ? style.height : sizePreset.trackHeight,
    trackColor,
    fillColor: primaryColor,
    handleColor: primaryColor,
    trackHeight: sizePreset.trackWidth, // CSS의 track width가 실제 track height
    handleSize: sizePreset.thumbSize,
  };
}

// ============================================
// Graphics Creation
// ============================================

/**
 * 슬라이더 배경(트랙) 생성
 * 🚀 Border-Box v2: drawBox 유틸리티 사용
 */
function createTrackGraphics(width: number, height: number, color: number): Graphics {
  const g = new Graphics();
  drawBox(g, {
    width,
    height,
    backgroundColor: color,
    backgroundAlpha: 1,
    borderRadius: height / 2,
  });
  return g;
}

/**
 * 슬라이더 채우기(fill) 생성
 * 🚀 Border-Box v2: drawBox 유틸리티 사용
 */
function createFillGraphics(width: number, height: number, color: number): Graphics {
  const g = new Graphics();
  drawBox(g, {
    width,
    height,
    backgroundColor: color,
    backgroundAlpha: 1,
    borderRadius: height / 2,
  });
  return g;
}

/**
 * 슬라이더 핸들 생성
 * 🚀 Border-Box v2: drawCircle 유틸리티 사용
 */
function createHandleGraphics(size: number, color: number): Graphics {
  const g = new Graphics();
  drawCircle(g, {
    x: 0,
    y: 0,
    radius: size / 2,
    backgroundColor: color,
    backgroundAlpha: 1,
    border: {
      width: 2,
      color: 0xffffff,
      alpha: 1,
    },
  });
  return g;
}

// ============================================
// Component
// ============================================

/**
 * PixiSlider
 *
 * @pixi/ui의 Slider를 사용하여 슬라이더 렌더링
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
  onChange,
}: PixiSliderProps) {
  useExtend(PIXI_COMPONENTS);
  const { app } = useApplication();
  const containerRef = useRef<Container | null>(null);
  const sliderRef = useRef<Slider | null>(null);

  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // 🚀 Phase 0: size prop 추출 (기본값: 'md')
  const size = useMemo(() => String(props?.size || 'md'), [props?.size]);
  const variant = useMemo(() => String(props?.variant || 'default'), [props?.variant]);

  // 🚀 테마 색상 동적 로드
  const themeColors = useThemeColors();

  // 🚀 variant에 따른 테마 색상
  const variantColors = useMemo(
    () => getVariantColors(variant, themeColors),
    [variant, themeColors]
  );

  // 슬라이더 스타일 (CSS 사이즈 프리셋 + 테마 색상 적용)
  const layoutStyle = useMemo(() => convertToSliderStyle(style, size, variantColors.bg), [style, size, variantColors.bg]);

  // 슬라이더 값 설정
  const min = useMemo(() => Number(props?.min ?? 0), [props?.min]);
  const max = useMemo(() => Number(props?.max ?? 100), [props?.max]);
  const step = useMemo(() => Number(props?.step ?? 1), [props?.step]);
  const value = useMemo(() => Number(props?.value ?? 50), [props?.value]);

  // 이벤트 핸들러
  const handleUpdate = useCallback(
    (newValue: number) => {
      onChange?.(element.id, newValue);
    },
    [element.id, onChange]
  );

  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  // 슬라이더 생성 및 관리
  useEffect(() => {
    if (!app?.stage) return;

    // 컨테이너 생성
    const container = new Container();
    container.x = layoutStyle.x;
    container.y = layoutStyle.y;
    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.on('pointerdown', handleClick);

    // 슬라이더 그래픽 생성
    const bgGraphics = createTrackGraphics(
      layoutStyle.width,
      layoutStyle.trackHeight,
      layoutStyle.trackColor
    );
    const fillGraphics = createFillGraphics(
      layoutStyle.width,
      layoutStyle.trackHeight,
      layoutStyle.fillColor
    );
    const handleGraphics = createHandleGraphics(
      layoutStyle.handleSize,
      layoutStyle.handleColor
    );

    // @pixi/ui Slider 생성
    const slider = new Slider({
      bg: bgGraphics,
      fill: fillGraphics,
      slider: handleGraphics,
      min,
      max,
      step,
    });

    // 슬라이더 위치 조정 (수직 중앙)
    slider.y = (layoutStyle.height - layoutStyle.trackHeight) / 2;

    // 이벤트 연결
    slider.onUpdate.connect(handleUpdate);

    // 컨테이너에 추가
    container.addChild(slider);

    // Stage에 추가
    app.stage.addChild(container);

    containerRef.current = container;
    sliderRef.current = slider;

    // ⚠️ try-catch: CanvasTextSystem이 이미 정리된 경우 에러 방지
    return () => {
      // 이벤트 연결 해제
      try {
        slider.onUpdate.disconnectAll();
        container.off('pointerdown', handleClick);
      } catch {
        // ignore
      }

      // Stage에서 제거
      try {
        app.stage.removeChild(container);
      } catch {
        // ignore
      }

      // Graphics 객체 명시적 destroy (GPU 리소스 해제)
      try {
        bgGraphics.destroy(true);
        fillGraphics.destroy(true);
        handleGraphics.destroy(true);
      } catch {
        // ignore
      }

      // Slider 및 Container destroy
      try {
        if (!slider.destroyed) {
          slider.destroy({ children: true });
        }
        if (!container.destroyed) {
          container.destroy({ children: true });
        }
      } catch {
        // ignore
      }

      containerRef.current = null;
      sliderRef.current = null;
    };
  }, [app, layoutStyle, min, max, step, handleClick, handleUpdate]);

  // 값 동기화
  useEffect(() => {
    if (sliderRef.current && sliderRef.current.value !== value) {
      sliderRef.current.value = value;
    }
  }, [value]);

  // @pixi/ui는 imperative이므로 JSX 반환 없음
  return null;
});

export default PixiSlider;
