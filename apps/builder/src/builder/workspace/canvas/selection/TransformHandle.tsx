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

  // 줌에 독립적인 핸들 크기 (화면상 항상 동일 크기)
  const adjustedSize = HANDLE_SIZE / zoom;
  const strokeWidth = 1 / zoom;

  // 핸들 중심 좌표 계산
  const handleX = boundsX + boundsWidth * config.relativeX - adjustedSize / 2;
  const handleY = boundsY + boundsHeight * config.relativeY - adjustedSize / 2;

  // 핸들 그리기
  const draw = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // 배경 (흰색) - v8 Pattern: shape → fill
      g.rect(0, 0, adjustedSize, adjustedSize);
      g.fill({ color: HANDLE_FILL_COLOR, alpha: 1 });

      // 테두리 (파란색) - 줌에 관계없이 화면상 1px 유지
      g.setStrokeStyle({ width: strokeWidth, color: HANDLE_STROKE_COLOR, alpha: 1 });
      g.rect(0, 0, adjustedSize, adjustedSize);
      g.stroke();
    },
    [adjustedSize, strokeWidth]
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
