/**
 * Transform Handle
 *
 * 🚀 Phase 10 B1.3: 리사이즈/회전 핸들 컴포넌트
 *
 * @since 2025-12-11 Phase 10 B1.3
 */

import { useCallback, memo } from 'react';
import { Graphics as PixiGraphics } from 'pixi.js';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import type {
  HandlePosition,
  HandleConfig,
  CursorStyle,
} from './types';
import {
  HANDLE_SIZE,
  HANDLE_FILL_COLOR,
  HANDLE_STROKE_COLOR,
  EDGE_HIT_THICKNESS,
} from './types';

// ============================================
// Types
// ============================================

export interface TransformHandleProps {
  /** 핸들 설정 */
  config: HandleConfig;
  /** 바운딩 박스 X 좌표 */
  boundsX: number;
  /** 바운딩 박스 Y 좌표 */
  boundsY: number;
  /** 바운딩 박스 너비 */
  boundsWidth: number;
  /** 바운딩 박스 높이 */
  boundsHeight: number;
  /** 현재 줌 레벨 (핸들 크기 유지용) */
  zoom?: number;
  /** 드래그 시작 콜백 */
  onDragStart?: (position: HandlePosition, origin: { x: number; y: number }) => void;
  /** 호버 시작 콜백 */
  onHoverStart?: (cursor: CursorStyle) => void;
  /** 호버 종료 콜백 */
  onHoverEnd?: () => void;
}

// ============================================
// Component
// ============================================

/**
 * TransformHandle
 *
 * 리사이즈를 위한 8방향 핸들 컴포넌트입니다.
 */
export const TransformHandle = memo(function TransformHandle({
  config,
  boundsX,
  boundsY,
  boundsWidth,
  boundsHeight,
  zoom = 1,
  onDragStart,
  onHoverStart,
  onHoverEnd,
}: TransformHandleProps) {
  useExtend(PIXI_COMPONENTS);

  const { isCorner } = config;

  // 줌에 독립적인 크기
  const cornerSize = HANDLE_SIZE / zoom;
  const edgeThickness = EDGE_HIT_THICKNESS / zoom;
  const strokeWidth = 1 / zoom;

  // 핸들 위치 & 크기 계산
  let handleX: number;
  let handleY: number;
  let handleW: number;
  let handleH: number;

  if (isCorner) {
    // 코너 핸들: 6×6 정사각형
    handleX = boundsX + boundsWidth * config.relativeX - cornerSize / 2;
    handleY = boundsY + boundsHeight * config.relativeY - cornerSize / 2;
    handleW = cornerSize;
    handleH = cornerSize;
  } else {
    // 엣지 핸들: 보이지 않는 히트 영역 (엣지 전체 길이)
    const isHorizontal = config.relativeY === 0 || config.relativeY === 1;
    if (isHorizontal) {
      // 상단/하단 엣지: 전체 너비, 얇은 높이
      handleX = boundsX;
      handleY = boundsY + boundsHeight * config.relativeY - edgeThickness / 2;
      handleW = boundsWidth;
      handleH = edgeThickness;
    } else {
      // 좌측/우측 엣지: 얇은 너비, 전체 높이
      handleX = boundsX + boundsWidth * config.relativeX - edgeThickness / 2;
      handleY = boundsY;
      handleW = edgeThickness;
      handleH = boundsHeight;
    }
  }

  // 핸들 그리기
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      if (isCorner) {
        // 코너: 흰색 배경 + 파란 테두리 (시각적으로 표시)
        g.rect(0, 0, handleW, handleH);
        g.fill({ color: HANDLE_FILL_COLOR, alpha: 1 });

        g.setStrokeStyle({ width: strokeWidth, color: HANDLE_STROKE_COLOR, alpha: 1 });
        g.rect(0, 0, handleW, handleH);
        g.stroke();
      } else {
        // 엣지: 투명 히트 영역 (시각적으로 보이지 않음)
        g.rect(0, 0, handleW, handleH);
        g.fill({ color: 0x000000, alpha: 0.001 });
      }
    },
    [isCorner, handleW, handleH, strokeWidth]
  );

  // 이벤트 핸들러
  const handlePointerDown = useCallback((e: { global?: { x: number; y: number } }) => {
    const global = e.global;
    if (!global) return;
    onDragStart?.(config.position, { x: global.x, y: global.y });
  }, [config.position, onDragStart]);

  const handlePointerOver = useCallback(() => {
    onHoverStart?.(config.cursor);
  }, [config.cursor, onHoverStart]);

  const handlePointerOut = useCallback(() => {
    onHoverEnd?.();
  }, [onHoverEnd]);

  return (
    <pixiGraphics
      draw={draw}
      x={handleX}
      y={handleY}
      eventMode="static"
      cursor={config.cursor}
      onPointerDown={handlePointerDown}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    />
  );
});

export default TransformHandle;
