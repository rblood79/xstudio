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
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { useViewportSyncStore } from '../stores';

// ============================================
// Types
// ============================================

export interface GridLayerProps {
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

const CENTER_LINE_COLOR = 0x475569; // slate-600
const CENTER_LINE_ALPHA = 0.6;
const CENTER_LINE_WIDTH = 1;

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
  zoom,
  showGrid = true,
  showSnapGrid = false,
  gridSize = 20,
  snapSize = 10,
}: GridLayerProps) {
  useExtend(PIXI_COMPONENTS);

  // 🚀 자체 구독: BuilderCanvas 리렌더링 없이 GridLayer만 독립적으로 업데이트
  const containerSize = useViewportSyncStore((state) => state.containerSize);
  const { width, height } = containerSize;

  // 줌 레벨에 따른 그리드 간격 계산
  const gridInterval = useMemo(() => calculateGridInterval(gridSize, zoom), [gridSize, zoom]);

  const majorGridInterval = useMemo(() => getMajorGridInterval(gridInterval), [gridInterval]);

  // 그리드 그리기
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      if (!showGrid) return;

      // PixiJS v8: 각 라인을 rect로 그리기 (moveTo/lineTo 대신)
      const drawLine = (x1: number, y1: number, x2: number, y2: number, lineWidth: number, color: number, alpha: number) => {
        if (x1 === x2) {
          // 수직선
          g.rect(x1 - lineWidth / 2, Math.min(y1, y2), lineWidth, Math.abs(y2 - y1));
        } else {
          // 수평선
          g.rect(Math.min(x1, x2), y1 - lineWidth / 2, Math.abs(x2 - x1), lineWidth);
        }
        g.fill({ color, alpha });
      };

      // === 일반 그리드 ===
      // 수직선
      for (let x = 0; x <= width; x += gridInterval) {
        if (x % majorGridInterval === 0) continue;
        drawLine(x, 0, x, height, 1, GRID_COLOR, GRID_ALPHA);
      }

      // 수평선
      for (let y = 0; y <= height; y += gridInterval) {
        if (y % majorGridInterval === 0) continue;
        drawLine(0, y, width, y, 1, GRID_COLOR, GRID_ALPHA);
      }

      // === 메이저 그리드 (더 진한 색상) ===
      // 수직선
      for (let x = 0; x <= width; x += majorGridInterval) {
        drawLine(x, 0, x, height, 1, MAJOR_GRID_COLOR, MAJOR_GRID_ALPHA);
      }

      // 수평선
      for (let y = 0; y <= height; y += majorGridInterval) {
        drawLine(0, y, width, y, 1, MAJOR_GRID_COLOR, MAJOR_GRID_ALPHA);
      }

      // === 중앙선 강조 ===
      drawLine(width / 2, 0, width / 2, height, CENTER_LINE_WIDTH, CENTER_LINE_COLOR, CENTER_LINE_ALPHA);
      drawLine(0, height / 2, width, height / 2, CENTER_LINE_WIDTH, CENTER_LINE_COLOR, CENTER_LINE_ALPHA);

      // === 스냅 그리드 (선택적) ===
      if (showSnapGrid && snapSize !== gridInterval) {
        for (let x = 0; x <= width; x += snapSize) {
          for (let y = 0; y <= height; y += snapSize) {
            g.circle(x, y, 1);
            g.fill({ color: SNAP_GRID_COLOR, alpha: SNAP_GRID_ALPHA });
          }
        }
      }
    },
    [width, height, gridInterval, majorGridInterval, showGrid, showSnapGrid, snapSize]
  );

  return <pixiGraphics draw={draw} />;
});

export default GridLayer;
