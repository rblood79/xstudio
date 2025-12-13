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

import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useApplication } from '@pixi/react';
import { ProgressBar } from '@pixi/ui';
import { Container, Graphics } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
import { cssColorToHex, parseCSSSize } from '../sprites/styleConverter';

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

function convertToProgressBarStyle(style: CSSStyle | undefined): ProgressBarLayoutStyle {
  const primaryColor = cssColorToHex(style?.backgroundColor, 0x3b82f6);
  const trackColor = cssColorToHex(style?.borderColor, 0xe5e7eb);

  return {
    x: parseCSSSize(style?.left, undefined, 0),
    y: parseCSSSize(style?.top, undefined, 0),
    width: parseCSSSize(style?.width, undefined, 200),
    height: parseCSSSize(style?.height, undefined, 8),
    backgroundColor: trackColor,
    fillColor: primaryColor,
    borderColor: trackColor,
    borderWidth: 0,
    borderRadius: parseCSSSize(style?.borderRadius, undefined, 4),
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
  isSelected,
  onClick,
}: PixiProgressBarProps) {
  const { app } = useApplication();
  const containerRef = useRef<Container | null>(null);
  const progressBarRef = useRef<ProgressBar | null>(null);

  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // 프로그레스바 스타일
  const layoutStyle = useMemo(() => convertToProgressBarStyle(style), [style]);

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
      progress: value,
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

    return () => {
      app.stage.removeChild(container);
      container.destroy({ children: true });
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

  // 선택 표시
  useEffect(() => {
    if (!containerRef.current) return;

    // 기존 선택 표시 제거
    const existingSelection = containerRef.current.getChildByName('selection');
    if (existingSelection) {
      containerRef.current.removeChild(existingSelection);
      existingSelection.destroy();
    }

    // 선택 상태이면 테두리 추가
    if (isSelected) {
      const selection = new Graphics();
      selection.name = 'selection';
      selection.roundRect(-4, -4, layoutStyle.width + 8, layoutStyle.height + 8, 4);
      selection.stroke({ width: 2, color: 0x3b82f6, alpha: 1 });
      containerRef.current.addChildAt(selection, 0);
    }
  }, [isSelected, layoutStyle.width, layoutStyle.height]);

  // @pixi/ui는 imperative이므로 JSX 반환 없음
  return null;
});

export default PixiProgressBar;
