/**
 * Selection Box
 *
 * 🚀 Phase 10 B1.3: 선택 박스 + Transform 핸들
 *
 * @since 2025-12-11 Phase 10 B1.3
 */

import { useCallback, memo } from 'react';
import { Container } from '@pixi/react';
import { Graphics as PixiGraphics } from 'pixi.js';
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
  onDragStart,
  onMoveStart,
  onCursorChange,
}: SelectionBoxProps) {
  const { x, y, width, height } = bounds;

  // 선택 박스 테두리 그리기
  const drawBorder = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // 선택 테두리 (점선 효과는 PixiJS에서 복잡하므로 실선 사용)
      g.setStrokeStyle({ width: 1, color: SELECTION_COLOR, alpha: 1 });
      g.rect(0, 0, width, height);
      g.stroke();
    },
    [width, height]
  );

  // 이동 영역 (배경 - 투명하지만 이벤트 감지)
  const drawMoveArea = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      // 투명 영역 (이벤트 감지용)
      g.fill({ color: 0x000000, alpha: 0.001 });
      g.rect(0, 0, width, height);
      g.fill();
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
      {/* 이동 영역 (배경) */}
      <pixiGraphics
        draw={drawMoveArea}
        eventMode="static"
        cursor="move"
        onpointerdown={handleMovePointerDown}
        onpointerover={handleMovePointerOver}
        onpointerout={handleMovePointerOut}
      />

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
            onDragStart={handleDragStart}
            onHoverStart={handleHoverStart}
            onHoverEnd={handleHoverEnd}
          />
        ))}
    </pixiContainer>
  );
});

export default SelectionBox;
