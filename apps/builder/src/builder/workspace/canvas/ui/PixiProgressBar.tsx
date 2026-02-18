/**
 * Pixi ProgressBar
 *
 * 투명 히트 영역(pixiGraphics) 기반 ProgressBar
 * - Skia가 시각적 렌더링을 담당, PixiJS는 이벤트 히트 영역만 제공
 * - 히트 영역 크기는 LayoutComputedSizeContext(엔진 계산 결과) 우선 사용
 * - convertToProgressBarStyle()은 fallback 크기 계산에만 사용
 *
 * @since 2025-12-13 Phase 6.4
 * @updated 2026-02-18 @pixi/ui ProgressBar 의존성 제거 (Skia 렌더링 전환)
 * @updated 2026-02-19 Wave 4: LayoutComputedSizeContext로 히트 영역 통합
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback, useMemo, useContext } from 'react';
import { Graphics as PixiGraphics } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
import { LayoutComputedSizeContext } from '../layoutContext';

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
 * LayoutComputedSizeContext가 없을 때 fallback으로 사용
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
 * - 크기: LayoutComputedSizeContext에서 엔진(Taffy/Dropflow) 계산 결과 우선 사용
 * - 위치: DirectContainer가 x/y 설정 (이 컴포넌트에서 처리하지 않음)
 * - 시각: Skia specShapeConverter에서 렌더링 (이 컴포넌트에서 처리하지 않음)
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

  // 레이아웃 엔진(Taffy/Dropflow) 계산 결과 — DirectContainer가 제공
  const computedSize = useContext(LayoutComputedSizeContext);

  // size prop 추출 (기본값: 'md')
  const size = useMemo(() => String(props?.size || 'md'), [props?.size]);

  // fallback 크기 계산 (Spec 기반)
  const fallbackLayout = useMemo(
    () => convertToProgressBarStyle(style, size),
    [style, size]
  );

  // 히트 영역 크기: 엔진 계산 결과 우선, 없으면 Spec fallback
  const barWidth = computedSize?.width ?? fallbackLayout.width;
  const barHeight = computedSize?.height ?? fallbackLayout.height;

  // 이벤트 핸들러
  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  // 투명 히트 영역
  const drawHitArea = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      g.rect(0, 0, barWidth, barHeight);
      g.fill({ color: 0xffffff, alpha: 0.001 });
    },
    [barWidth, barHeight]
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
