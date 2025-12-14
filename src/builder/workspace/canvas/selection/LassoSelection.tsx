/**
 * Lasso Selection
 *
 * 🚀 Phase 10 B1.3: 라쏘 (사각형 드래그) 선택
 *
 * @since 2025-12-11 Phase 10 B1.3
 */

import { useCallback, memo } from 'react';
import { Graphics as PixiGraphics } from 'pixi.js';
import { LASSO_COLOR, LASSO_FILL_ALPHA } from './types';
import { getLassoBounds } from './LassoSelection.utils';

// ============================================
// Types
// ============================================

export interface LassoSelectionProps {
  /** 시작 위치 */
  start: { x: number; y: number };
  /** 현재 위치 */
  current: { x: number; y: number };
}

// ============================================
// Component
// ============================================

/**
 * LassoSelection
 *
 * 드래그 선택 시 표시되는 선택 영역 사각형입니다.
 */
export const LassoSelection = memo(function LassoSelection({
  start,
  current,
}: LassoSelectionProps) {
  const rect = getLassoBounds(start, current);

  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // 배경 (반투명)
      g.fill({ color: LASSO_COLOR, alpha: LASSO_FILL_ALPHA });
      g.rect(rect.x, rect.y, rect.width, rect.height);
      g.fill();

      // 테두리 (점선 효과)
      g.setStrokeStyle({ width: 1, color: LASSO_COLOR, alpha: 0.8 });
      g.rect(rect.x, rect.y, rect.width, rect.height);
      g.stroke();
    },
    [rect]
  );

  return <pixiGraphics draw={draw} />;
});

export default LassoSelection;
