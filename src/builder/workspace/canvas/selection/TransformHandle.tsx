/**
 * Transform Handle
 *
 * 🚀 Phase 10 B1.3: 리사이즈/회전 핸들 컴포넌트
 *
 * @since 2025-12-11 Phase 10 B1.3
 */

import { useCallback, memo } from 'react';
import { Graphics as PixiGraphics } from 'pixi.js';
import type {
  HandlePosition,
  HandleConfig,
  CursorStyle,
} from './types';
import {
  HANDLE_SIZE,
  HANDLE_FILL_COLOR,
  HANDLE_STROKE_COLOR,
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
  /** 드래그 시작 콜백 */
  onDragStart?: (position: HandlePosition) => void;
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
  onDragStart,
  onHoverStart,
  onHoverEnd,
}: TransformHandleProps) {
  // 핸들 중심 좌표 계산
  const handleX = boundsX + boundsWidth * config.relativeX - HANDLE_SIZE / 2;
  const handleY = boundsY + boundsHeight * config.relativeY - HANDLE_SIZE / 2;

  // 핸들 그리기
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // 배경 (흰색) - v8 Pattern: shape → fill
      g.rect(0, 0, HANDLE_SIZE, HANDLE_SIZE);
      g.fill({ color: HANDLE_FILL_COLOR, alpha: 1 });

      // 테두리 (파란색) - v8 Pattern: shape → stroke
      g.setStrokeStyle({ width: 1, color: HANDLE_STROKE_COLOR, alpha: 1 });
      g.rect(0, 0, HANDLE_SIZE, HANDLE_SIZE);
      g.stroke();
    },
    []
  );

  // 이벤트 핸들러
  const handlePointerDown = useCallback(() => {
    onDragStart?.(config.position);
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
