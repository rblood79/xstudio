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

// ============================================
// Types
// ============================================

export interface GridLayerProps {
  /** 뷰포트 너비 */
  width: number;
  /** 뷰포트 높이 */
  height: number;
  /** 현재 줌 레벨 */
  zoom: number;
  /** 기본 그리드 크기 */
  gridSize?: number;
}

// ============================================
// Constants
// ============================================

const GRID_COLOR = 0xe2e8f0; // slate-200
const GRID_ALPHA = 0.5;

const MAJOR_GRID_COLOR = 0x94a3b8; // slate-400
const MAJOR_GRID_ALPHA = 0.3;

const CENTER_LINE_COLOR = 0x64748b; // slate-500
const CENTER_LINE_ALPHA = 0.7;
const CENTER_LINE_WIDTH = 1;

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
  gridSize = 20,
}: GridLayerProps) {
  useExtend(PIXI_COMPONENTS);

  // 줌 레벨에 따른 그리드 간격 계산
  const gridInterval = useMemo(() => calculateGridInterval(gridSize, zoom), [gridSize, zoom]);
  const majorGridInterval = useMemo(() => getMajorGridInterval(gridInterval), [gridInterval]);

  // 화면 중앙 기준 그리드 (pan과 무관하게 고정)
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      if (width <= 0 || height <= 0) return;

      // 화면 중앙을 기준으로 그리드 정렬
      const centerX = width / 2;
      const centerY = height / 2;

      // 중앙에서 시작점까지의 오프셋 계산 (그리드 간격에 맞춤)
      const startX = centerX % gridInterval;
      const startY = centerY % gridInterval;

      // PixiJS v8: 각 라인을 rect로 그리기
      const drawLine = (x1: number, y1: number, x2: number, y2: number, lineWidth: number, color: number, alpha: number) => {
        if (x1 === x2) {
          g.rect(x1 - lineWidth / 2, Math.min(y1, y2), lineWidth, Math.abs(y2 - y1));
        } else {
          g.rect(Math.min(x1, x2), y1 - lineWidth / 2, Math.abs(x2 - x1), lineWidth);
        }
        g.fill({ color, alpha });
      };

      // === 일반 그리드 ===
      for (let x = startX; x <= width; x += gridInterval) {
        const relX = x - centerX;
        if (Math.abs(relX % majorGridInterval) < 0.1) continue;
        drawLine(x, 0, x, height, 1, GRID_COLOR, GRID_ALPHA);
      }

      for (let y = startY; y <= height; y += gridInterval) {
        const relY = y - centerY;
        if (Math.abs(relY % majorGridInterval) < 0.1) continue;
        drawLine(0, y, width, y, 1, GRID_COLOR, GRID_ALPHA);
      }

      // === 메이저 그리드 ===
      const majorStartX = centerX % majorGridInterval;
      const majorStartY = centerY % majorGridInterval;

      for (let x = majorStartX; x <= width; x += majorGridInterval) {
        drawLine(x, 0, x, height, 1, MAJOR_GRID_COLOR, MAJOR_GRID_ALPHA);
      }

      for (let y = majorStartY; y <= height; y += majorGridInterval) {
        drawLine(0, y, width, y, 1, MAJOR_GRID_COLOR, MAJOR_GRID_ALPHA);
      }

      // === 중앙선 강조 ===
      drawLine(centerX, 0, centerX, height, CENTER_LINE_WIDTH, CENTER_LINE_COLOR, CENTER_LINE_ALPHA);
      drawLine(0, centerY, width, centerY, CENTER_LINE_WIDTH, CENTER_LINE_COLOR, CENTER_LINE_ALPHA);
    },
    [width, height, gridInterval, majorGridInterval]
  );

  // eventMode="none"으로 이벤트 처리 완전 비활성화 (성능 최적화)
  return <pixiGraphics draw={draw} eventMode="none" />;
});

export default GridLayer;
