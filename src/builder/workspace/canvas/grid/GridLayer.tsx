/**
 * Grid Layer
 *
 * 🚀 Phase 10 B1.4: 캔버스 그리드 레이어
 *
 * 기능:
 * - 동적 그리드 렌더링 (줌 레벨에 따라 조정)
 * - 스냅 그리드 표시
 * - 중앙선 강조
 * - 줌 레벨에 따른 그리드 밀도 조정
 *
 * @since 2025-12-11 Phase 10 B1.4
 */

import { useCallback, useMemo, memo } from 'react';
import { Graphics as PixiGraphics } from 'pixi.js';

// ============================================
// Types
// ============================================

export interface GridLayerProps {
  /** 캔버스 너비 */
  width: number;
  /** 캔버스 높이 */
  height: number;
  /** 현재 줌 레벨 */
  zoom: number;
  /** 그리드 표시 여부 */
  showGrid?: boolean;
  /** 스냅 그리드 표시 여부 */
  showSnapGrid?: boolean;
  /** 기본 그리드 크기 */
  gridSize?: number;
  /** 스냅 그리드 크기 */
  snapSize?: number;
}

// ============================================
// Constants
// ============================================

const GRID_COLOR = 0xe2e8f0; // slate-200
const GRID_ALPHA = 0.5;

const MAJOR_GRID_COLOR = 0x94a3b8; // slate-400
const MAJOR_GRID_ALPHA = 0.3;

const CENTER_LINE_COLOR = 0x94a3b8; // slate-400
const CENTER_LINE_ALPHA = 0.5;
const CENTER_LINE_WIDTH = 2;

const SNAP_GRID_COLOR = 0x3b82f6; // blue-500
const SNAP_GRID_ALPHA = 0.2;

// ============================================
// Helper Functions
// ============================================

/**
 * 줌 레벨에 따른 적절한 그리드 간격 계산
 */
function calculateGridInterval(baseSize: number, zoom: number): number {
  // 줌 레벨이 낮을수록 그리드 간격 증가
  if (zoom < 0.25) return baseSize * 4;
  if (zoom < 0.5) return baseSize * 2;
  if (zoom > 2) return baseSize / 2;
  if (zoom > 4) return baseSize / 4;
  return baseSize;
}

/**
 * 메이저 그리드 간격 (일반 그리드의 5배)
 */
function getMajorGridInterval(gridInterval: number): number {
  return gridInterval * 5;
}

// ============================================
// Component
// ============================================

/**
 * GridLayer
 *
 * 캔버스 그리드를 렌더링합니다.
 * 줌 레벨에 따라 그리드 밀도가 자동으로 조정됩니다.
 */
export const GridLayer = memo(function GridLayer({
  width,
  height,
  zoom,
  showGrid = true,
  showSnapGrid = false,
  gridSize = 20,
  snapSize = 10,
}: GridLayerProps) {
  // 줌 레벨에 따른 그리드 간격 계산
  const gridInterval = useMemo(() => calculateGridInterval(gridSize, zoom), [gridSize, zoom]);

  const majorGridInterval = useMemo(() => getMajorGridInterval(gridInterval), [gridInterval]);

  // 그리드 그리기
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      if (!showGrid) return;

      // === 일반 그리드 ===
      g.setStrokeStyle({ width: 1, color: GRID_COLOR, alpha: GRID_ALPHA });

      // 수직선
      for (let x = 0; x <= width; x += gridInterval) {
        // 메이저 그리드 라인 건너뛰기 (별도 렌더링)
        if (x % majorGridInterval === 0) continue;

        g.moveTo(x, 0);
        g.lineTo(x, height);
      }

      // 수평선
      for (let y = 0; y <= height; y += gridInterval) {
        if (y % majorGridInterval === 0) continue;

        g.moveTo(0, y);
        g.lineTo(width, y);
      }

      g.stroke();

      // === 메이저 그리드 (더 진한 색상) ===
      g.setStrokeStyle({ width: 1, color: MAJOR_GRID_COLOR, alpha: MAJOR_GRID_ALPHA });

      // 수직선
      for (let x = 0; x <= width; x += majorGridInterval) {
        g.moveTo(x, 0);
        g.lineTo(x, height);
      }

      // 수평선
      for (let y = 0; y <= height; y += majorGridInterval) {
        g.moveTo(0, y);
        g.lineTo(width, y);
      }

      g.stroke();

      // === 중앙선 강조 ===
      g.setStrokeStyle({ width: CENTER_LINE_WIDTH, color: CENTER_LINE_COLOR, alpha: CENTER_LINE_ALPHA });

      // 수직 중앙선
      g.moveTo(width / 2, 0);
      g.lineTo(width / 2, height);

      // 수평 중앙선
      g.moveTo(0, height / 2);
      g.lineTo(width, height / 2);

      g.stroke();

      // === 스냅 그리드 (선택적) ===
      if (showSnapGrid && snapSize !== gridInterval) {
        g.setStrokeStyle({ width: 1, color: SNAP_GRID_COLOR, alpha: SNAP_GRID_ALPHA });

        // 스냅 포인트 표시 (작은 점)
        for (let x = 0; x <= width; x += snapSize) {
          for (let y = 0; y <= height; y += snapSize) {
            g.circle(x, y, 1);
          }
        }

        g.fill({ color: SNAP_GRID_COLOR, alpha: SNAP_GRID_ALPHA });
      }
    },
    [width, height, gridInterval, majorGridInterval, showGrid, showSnapGrid, snapSize]
  );

  return <pixiGraphics draw={draw} />;
});

export default GridLayer;
