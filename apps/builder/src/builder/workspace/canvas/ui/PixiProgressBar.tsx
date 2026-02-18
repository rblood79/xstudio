/**
 * Pixi ProgressBar
 *
 * 투명 히트 영역(pixiGraphics) 기반 ProgressBar
 * - Skia가 시각적 렌더링을 담당, PixiJS는 이벤트 히트 영역만 제공
 * - convertToProgressBarStyle()로 크기 계산 (Skia 렌더링에 필요)
 *
 * @since 2025-12-13 Phase 6.4
 * @updated 2026-02-18 @pixi/ui ProgressBar 의존성 제거 (Skia 렌더링 전환)
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useMemo } from 'react';
import { Graphics as PixiGraphics } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';

// Component Spec
import {
  ProgressBarSpec,
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
  width: number;
  height: number;
}

/**
 * CSS 스타일을 ProgressBar 레이아웃 스타일로 변환
 */
function convertToProgressBarStyle(
  style: CSSStyle | undefined,
  size: string
): ProgressBarLayoutStyle {
  const sizeSpec = ProgressBarSpec.sizes[size] || ProgressBarSpec.sizes[ProgressBarSpec.defaultSize];
  const specPreset = getSpecSizePreset(sizeSpec, 'light');
  const defaultWidth = specPreset.paddingX ?? 200;
  const defaultHeight = specPreset.height ?? 8;

  return {
    width: typeof style?.width === 'number' ? style.width : defaultWidth,
    height: typeof style?.height === 'number' ? style.height : defaultHeight,
  };
}

// ============================================
// Component
// ============================================

/**
 * PixiProgressBar
 *
 * 투명 히트 영역만 제공 (Skia가 시각적 렌더링 담당)
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

  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as Record<string, unknown> | undefined;

  // size prop 추출 (기본값: 'md')
  const size = useMemo(() => String(props?.size || 'md'), [props?.size]);

  // 프로그레스바 스타일 계산 (Skia 렌더링에 필요)
  const layoutStyle = useMemo(
    () => convertToProgressBarStyle(style, size),
    [style, size]
  );

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

export default PixiProgressBar;
