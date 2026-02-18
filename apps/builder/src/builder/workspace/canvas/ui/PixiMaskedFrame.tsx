/**
 * Pixi MaskedFrame
 *
 * 투명 히트 영역 전용 컴포넌트
 * Skia가 모든 시각적 렌더링을 담당하므로 @pixi/ui MaskedFrame은 불필요.
 * 이벤트 히트 영역만 제공합니다.
 *
 * @since 2025-12-13 Phase 6.9
 */

import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { memo, useCallback } from 'react';
import { Graphics as PixiGraphics } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';
// ============================================
// Types
// ============================================

export interface PixiMaskedFrameProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
}

// ============================================
// Component
// ============================================

/**
 * PixiMaskedFrame
 *
 * 투명 히트 영역만 제공하는 마스크 프레임 컴포넌트
 * 시각적 렌더링은 Skia가 담당
 */
export const PixiMaskedFrame = memo(function PixiMaskedFrame({
  element,
  onClick,
}: PixiMaskedFrameProps) {
  useExtend(PIXI_COMPONENTS);

  const style = element.props?.style as CSSStyle | undefined;

  // 크기 계산
  const width = typeof style?.width === 'number' ? style.width : 100;
  const height = typeof style?.height === 'number' ? style.height : 100;

  // 이벤트 핸들러
  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  // 투명 히트 영역 그리기
  const drawHitArea = useCallback((g: PixiGraphics) => {
    g.clear();
    g.rect(0, 0, width, height);
    g.fill({ color: 0xffffff, alpha: 0.001 });
  }, [width, height]);

  return (
    <pixiContainer>
      <pixiGraphics
        draw={drawHitArea}
        x={0}
        y={0}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handleClick}
      />
    </pixiContainer>
  );
});

export default PixiMaskedFrame;
