/**
 * Lasso Selection
 *
 * 🚀 Phase 10 B1.3: 라쏘 (사각형 드래그) 선택
 *
 * @since 2025-12-11 Phase 10 B1.3
 */

import { useCallback, memo } from 'react';
import { Graphics as PixiGraphics } from 'pixi.js';
import type { BoundingBox } from './types';
import { LASSO_COLOR, LASSO_FILL_ALPHA } from './types';

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
// Utility
// ============================================

/**
 * 시작점과 현재점으로부터 정규화된 바운딩 박스 계산
 * (음수 width/height 처리)
 */
function normalizeRect(
  start: { x: number; y: number },
  current: { x: number; y: number }
): BoundingBox {
  const x = Math.min(start.x, current.x);
  const y = Math.min(start.y, current.y);
  const width = Math.abs(current.x - start.x);
  const height = Math.abs(current.y - start.y);

  return { x, y, width, height };
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
  const rect = normalizeRect(start, current);

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

/**
 * 라쏘 선택 영역의 바운딩 박스 계산
 */
export function getLassoBounds(
  start: { x: number; y: number },
  current: { x: number; y: number }
): BoundingBox {
  return normalizeRect(start, current);
}

export default LassoSelection;
