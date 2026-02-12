/**
 * Pixi ProgressBar
 *
 * 🚀 Phase 6.4: @pixi/ui ProgressBar 래퍼
 *
 * @pixi/ui의 ProgressBar 컴포넌트를 xstudio Element 시스템과 통합
 * 진행률 표시 UI를 제공합니다.
 *
 * @since 2025-12-13 Phase 6.4
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useApplication } from '@pixi/react';
import { ProgressBar } from '@pixi/ui';
import { Container, Graphics } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
import { cssColorToHex } from '../sprites/styleConverter';

// 🚀 Component Spec
import {
  ProgressBarSpec,
  PROGRESSBAR_FILL_COLORS,
  PROGRESSBAR_DIMENSIONS,
  getVariantColors as getSpecVariantColors,
  getSizePreset as getSpecSizePreset,
} from '@xstudio/specs';

// ============================================
// Types
// ============================================

export interface PixiProgressBarProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
}

// ============================================
// Style Conversion
// ============================================

interface ProgressBarLayoutStyle {
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: number;
  fillColor: number;
  borderColor: number;
  borderWidth: number;
  borderRadius: number;
}

/** Variant colors type for ProgressBar */
interface VariantColors {
  bg: number;
  text: number;
}

/**
 * CSS 스타일을 ProgressBar 레이아웃 스타일로 변환
 * 🚀 Phase 0: CSS 동기화 - getProgressBarSizePreset() 사용
 * 🚀 테마 색상 지원 - variantColors 파라미터 추가
 */
function convertToProgressBarStyle(
  style: CSSStyle | undefined,
  size: string,
  variantColors: VariantColors
): ProgressBarLayoutStyle {
  // 🚀 테마 색상 사용 (inline style 오버라이드 지원)
  const primaryColor = cssColorToHex(style?.backgroundColor, variantColors.bg);
  const trackColor = cssColorToHex(style?.borderColor, 0xe5e7eb); // track은 회색 유지

  // 🚀 Spec Migration
  const sizeSpec = ProgressBarSpec.sizes[size] || ProgressBarSpec.sizes[ProgressBarSpec.defaultSize];
  const specPreset = getSpecSizePreset(sizeSpec, 'light');
  const sizePreset = {
    width: specPreset.paddingX ?? 200,
    barHeight: specPreset.height ?? 8,
    borderRadius: specPreset.borderRadius ?? 4,
  };

  return {
    x: typeof style?.left === 'number' ? style.left : 0,
    y: typeof style?.top === 'number' ? style.top : 0,
    width: typeof style?.width === 'number' ? style.width : sizePreset.width,
    height: typeof style?.height === 'number' ? style.height : sizePreset.barHeight,
    backgroundColor: trackColor,
    fillColor: primaryColor,
    borderColor: trackColor,
    borderWidth: 0,
    borderRadius: typeof style?.borderRadius === 'number' ? style.borderRadius : sizePreset.borderRadius,
  };
}

// ============================================
// Graphics Creation
// ============================================

/**
 * 프로그레스바 배경(트랙) 생성
 */
function createTrackGraphics(
  width: number,
  height: number,
  color: number,
  borderRadius: number
): Graphics {
  const g = new Graphics();
  g.roundRect(0, 0, width, height, borderRadius);
  g.fill({ color, alpha: 1 });
  return g;
}

/**
 * 프로그레스바 채우기(fill) 생성
 */
function createFillGraphics(
  width: number,
  height: number,
  color: number,
  borderRadius: number
): Graphics {
  const g = new Graphics();
  g.roundRect(0, 0, width, height, borderRadius);
  g.fill({ color, alpha: 1 });
  return g;
}

// ============================================
// Component
// ============================================

/**
 * PixiProgressBar
 *
 * @pixi/ui의 ProgressBar를 사용하여 진행률 표시
 *
 * @example
 * <PixiProgressBar
 *   element={progressElement}
 * />
 */
export const PixiProgressBar = memo(function PixiProgressBar({
  element,
  onClick,
}: PixiProgressBarProps) {
  useExtend(PIXI_COMPONENTS);
  const { app } = useApplication();
  const containerRef = useRef<Container | null>(null);
  const progressBarRef = useRef<ProgressBar | null>(null);

  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // variant에 따른 색상 (default, primary, secondary, tertiary, error, surface)
  const variant = useMemo(() => {
    return String(props?.variant || 'default');
  }, [props?.variant]);

  const variantColors = useMemo(() => {
    const variantSpec = ProgressBarSpec.variants[variant] || ProgressBarSpec.variants[ProgressBarSpec.defaultVariant];
    const colors = getSpecVariantColors(variantSpec, 'light');
    return { bg: colors.bg, text: colors.text } as VariantColors;
  }, [variant]);

  // 🚀 Phase 0: size prop 추출 (기본값: 'md')
  const size = useMemo(() => String(props?.size || 'md'), [props?.size]);

  // 프로그레스바 스타일 (CSS 사이즈 프리셋 + 테마 색상 적용)
  const layoutStyle = useMemo(
    () => convertToProgressBarStyle(style, size, variantColors),
    [style, size, variantColors]
  );

  // 프로그레스바 값 설정
  const value = useMemo(() => {
    const v = Number(props?.value ?? props?.progress ?? 50);
    return Math.max(0, Math.min(100, v));
  }, [props?.value, props?.progress]);

  // 이벤트 핸들러
  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  // ProgressBar 생성 및 관리
  useEffect(() => {
    if (!app?.stage) return;

    // 컨테이너 생성
    const container = new Container();
    container.x = layoutStyle.x;
    container.y = layoutStyle.y;
    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.on('pointerdown', handleClick);

    // 프로그레스바 그래픽 생성
    const bgGraphics = createTrackGraphics(
      layoutStyle.width,
      layoutStyle.height,
      layoutStyle.backgroundColor,
      layoutStyle.borderRadius
    );
    const fillGraphics = createFillGraphics(
      layoutStyle.width,
      layoutStyle.height,
      layoutStyle.fillColor,
      layoutStyle.borderRadius
    );

    // @pixi/ui ProgressBar 생성
    const progressBar = new ProgressBar({
      bg: bgGraphics,
      fill: fillGraphics,
    });

    // 크기 설정
    progressBar.width = layoutStyle.width;
    progressBar.height = layoutStyle.height;

    // 컨테이너에 추가
    container.addChild(progressBar);

    // Stage에 추가
    app.stage.addChild(container);

    containerRef.current = container;
    progressBarRef.current = progressBar;

    // ⚠️ try-catch: CanvasTextSystem이 이미 정리된 경우 에러 방지
    return () => {
      // 이벤트 연결 해제
      try {
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
      } catch {
        // ignore
      }

      // ProgressBar 및 Container destroy
      try {
        if (!progressBar.destroyed) {
          progressBar.destroy({ children: true });
        }
        if (!container.destroyed) {
          container.destroy({ children: true });
        }
      } catch {
        // ignore
      }

      containerRef.current = null;
      progressBarRef.current = null;
    };
  }, [app, layoutStyle, handleClick]);

  // 값 동기화
  useEffect(() => {
    if (progressBarRef.current) {
      progressBarRef.current.progress = value;
    }
  }, [value]);

  // @pixi/ui는 imperative이므로 JSX 반환 없음
  return null;
});

export default PixiProgressBar;
