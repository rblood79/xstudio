/**
 * Selection Box
 *
 * 🚀 Phase 10 B1.3: 선택 박스 + Transform 핸들
 *
 * @since 2025-12-11 Phase 10 B1.3
 */

import { useCallback, memo } from 'react';
import { Graphics as PixiGraphics } from 'pixi.js';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { TransformHandle } from './TransformHandle';
import type { BoundingBox, HandlePosition, CursorStyle } from './types';
import { SELECTION_COLOR, HANDLE_CONFIGS } from './types';

// ============================================
// Types
// ============================================

export interface SelectionBoxProps {
  /** 바운딩 박스 */
  bounds: BoundingBox;
  /** 핸들 표시 여부 */
  showHandles?: boolean;
  /** 이동 영역 활성화 여부 (false면 클릭 투과) */
  enableMoveArea?: boolean;
  /** 현재 줌 레벨 (핸들/테두리 크기 유지용) */
  zoom?: number;
  /** 드래그 시작 콜백 */
  onDragStart?: (handle: HandlePosition) => void;
  /** 이동 드래그 시작 콜백 */
  onMoveStart?: () => void;
  /** 커서 변경 콜백 */
  onCursorChange?: (cursor: CursorStyle) => void;
}

// ============================================
// Component
// ============================================

/**
 * SelectionBox
 *
 * 선택된 요소의 바운딩 박스와 Transform 핸들을 표시합니다.
 */
export const SelectionBox = memo(function SelectionBox({
  bounds,
  showHandles = true,
  enableMoveArea = true,
  zoom = 1,
  onDragStart,
  onMoveStart,
  onCursorChange,
}: SelectionBoxProps) {
  useExtend(PIXI_COMPONENTS);
  // 서브픽셀 렌더링 방지: 좌표와 크기를 정수로 반올림
  const x = Math.round(bounds.x);
  const y = Math.round(bounds.y);
  const width = Math.round(bounds.width);
  const height = Math.round(bounds.height);

  // 줌에 독립적인 선 두께 (화면상 항상 1px)
  const strokeWidth = 1 / zoom;

  // 선택 박스 테두리 그리기
  const drawBorder = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // 줌에 관계없이 화면상 1px 유지
      g.setStrokeStyle({ width: strokeWidth, color: SELECTION_COLOR, alpha: 1 });
      g.rect(0, 0, width, height);
      g.stroke();
    },
    [width, height, strokeWidth]
  );

  // 이동 영역 (배경 - 투명하지만 이벤트 감지)
  const drawMoveArea = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      // 투명 영역 (이벤트 감지용) - v8 Pattern: shape → fill
      g.rect(0, 0, width, height);
      g.fill({ color: 0x000000, alpha: 0.001 });
    },
    [width, height]
  );

  // 핸들 드래그 시작
  const handleDragStart = useCallback(
    (position: HandlePosition) => {
      onDragStart?.(position);
    },
    [onDragStart]
  );

  // 핸들 호버 시작
  const handleHoverStart = useCallback(
    (cursor: CursorStyle) => {
      onCursorChange?.(cursor);
    },
    [onCursorChange]
  );

  // 핸들 호버 종료
  const handleHoverEnd = useCallback(() => {
    onCursorChange?.('default');
  }, [onCursorChange]);

  // 이동 영역 포인터 다운
  const handleMovePointerDown = useCallback(() => {
    onMoveStart?.();
  }, [onMoveStart]);

  // 이동 영역 호버
  const handleMovePointerOver = useCallback(() => {
    onCursorChange?.('move');
  }, [onCursorChange]);

  const handleMovePointerOut = useCallback(() => {
    onCursorChange?.('default');
  }, [onCursorChange]);

  return (
    <pixiContainer x={x} y={y}>
      {/* 이동 영역 (배경) - enableMoveArea가 false면 클릭 투과 */}
      {enableMoveArea && (
        <pixiGraphics
          draw={drawMoveArea}
          eventMode="static"
          cursor="move"
          onPointerDown={handleMovePointerDown}
          onPointerOver={handleMovePointerOver}
          onPointerOut={handleMovePointerOut}
        />
      )}

      {/* 선택 테두리 */}
      <pixiGraphics draw={drawBorder} />

      {/* Transform 핸들 (8방향) */}
      {showHandles &&
        HANDLE_CONFIGS.map((config) => (
          <TransformHandle
            key={config.position}
            config={config}
            boundsX={0}
            boundsY={0}
            boundsWidth={width}
            boundsHeight={height}
            zoom={zoom}
            onDragStart={handleDragStart}
            onHoverStart={handleHoverStart}
            onHoverEnd={handleHoverEnd}
          />
        ))}
    </pixiContainer>
  );
});

export default SelectionBox;
