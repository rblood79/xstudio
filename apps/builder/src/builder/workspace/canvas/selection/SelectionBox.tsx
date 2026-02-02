/**
 * Selection Box
 *
 * 🚀 Phase 10 B1.3: 선택 박스 + Transform 핸들
 * 🚀 Phase 19: 성능 최적화 - imperative 위치 업데이트 지원
 *
 * @since 2025-12-11 Phase 10 B1.3
 * @updated 2025-12-23 Phase 19 성능 최적화
 */

import { useCallback, memo, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { Graphics as PixiGraphics, Container as PixiContainer } from 'pixi.js';
import { useExtend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { TransformHandle } from './TransformHandle';
import type { BoundingBox, HandlePosition, CursorStyle } from './types';
import { SELECTION_COLOR, HANDLE_CONFIGS } from './types';


// ============================================
// Types
// ============================================

/**
 * 🚀 Phase 19: SelectionBox imperative handle
 * 드래그 중 React 리렌더링 없이 PixiJS 직접 조작용
 */
export interface SelectionBoxHandle {
  /** 위치 직접 업데이트 (React 리렌더링 없음) */
  updatePosition: (delta: { x: number; y: number }) => void;
  /** 바운딩 박스 직접 업데이트 (리사이즈용) */
  updateBounds: (bounds: BoundingBox) => void;
  /** 원래 위치로 리셋 */
  resetPosition: () => void;
}

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
  onDragStart?: (handle: HandlePosition, position: { x: number; y: number }) => void;
  /** 이동 드래그 시작 콜백 */
  onMoveStart?: (position: { x: number; y: number }) => void;
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
 * 🚀 Phase 19: forwardRef로 imperative 위치 업데이트 지원
 */
export const SelectionBox = memo(
  forwardRef<SelectionBoxHandle, SelectionBoxProps>(function SelectionBox(
    {
      bounds,
      showHandles = true,
      enableMoveArea = true,
      zoom = 1,
      onDragStart,
      onMoveStart,
      onCursorChange,
    },
    ref
  ) {
    useExtend(PIXI_COMPONENTS);

    // 🚀 Phase 19: PixiJS Container ref (직접 조작용)
    const containerRef = useRef<PixiContainer>(null);
    const borderGraphicsRef = useRef<PixiGraphics>(null);
    const moveAreaGraphicsRef = useRef<PixiGraphics>(null);

    // 🚀 Phase 19: 원본 bounds 저장 (리셋용)
    const originalBoundsRef = useRef<BoundingBox>(bounds);
    // React Compiler 호환: useEffect로 ref 업데이트
    useEffect(() => {
      originalBoundsRef.current = bounds;
    }, [bounds]);

    // Skia가 시각적 렌더링 담당 (alpha=0인 PixiJS는 히트 테스팅 전용)
    // 서브픽셀 좌표를 유지하여 고줌에서 부드러운 이동 보장
    const x = bounds.x;
    const y = bounds.y;
    const width = bounds.width;
    const height = bounds.height;

    // 🚀 Phase 19: Imperative handle 노출
    useImperativeHandle(
      ref,
      () => ({
        updatePosition: (delta: { x: number; y: number }) => {
          if (containerRef.current) {
            const original = originalBoundsRef.current;
            containerRef.current.position.set(
              original.x + delta.x,
              original.y + delta.y
            );
          }
        },
        updateBounds: (newBounds: BoundingBox) => {
          if (containerRef.current) {
            containerRef.current.position.set(
              newBounds.x,
              newBounds.y
            );
          }
          // 테두리와 이동 영역도 업데이트
          const w = newBounds.width;
          const h = newBounds.height;
          const sw = 1 / zoom;

          if (borderGraphicsRef.current) {
            const g = borderGraphicsRef.current;
            g.clear();
            g.setStrokeStyle({ width: sw, color: SELECTION_COLOR, alpha: 1 });
            g.rect(0, 0, w, h);
            g.stroke();
          }
          if (moveAreaGraphicsRef.current) {
            const g = moveAreaGraphicsRef.current;
            g.clear();
            g.rect(0, 0, w, h);
            g.fill({ color: 0x000000, alpha: 0.001 });
          }
        },
        resetPosition: () => {
          if (containerRef.current) {
            const original = originalBoundsRef.current;
            containerRef.current.position.set(
              original.x,
              original.y
            );
          }
        },
      }),
      [zoom]
    );

  // 줌에 독립적인 선 두께 (화면상 항상 1px)
  const strokeWidth = 1 / zoom;

  // 선택 박스 테두리 그리기
  const drawBorder = useCallback(
    (g: PixiGraphics) => {
      g.clear();
      return; // Skia가 Selection 렌더링 담당

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
    (position: HandlePosition, origin: { x: number; y: number }) => {
      onDragStart?.(position, origin);
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
  const handleMovePointerDown = useCallback(
    (e: { global?: { x: number; y: number } }) => {
      const global = e.global;
      if (!global) return;
      onMoveStart?.({ x: global.x, y: global.y });
    },
    [onMoveStart]
  );

  // 이동 영역 호버
  const handleMovePointerOver = useCallback(() => {
    onCursorChange?.('move');
  }, [onCursorChange]);

  const handleMovePointerOut = useCallback(() => {
    onCursorChange?.('default');
  }, [onCursorChange]);

  return (
    <pixiContainer ref={containerRef} x={x} y={y}>
      {/* 이동 영역 (배경) - enableMoveArea가 false면 클릭 투과 */}
      {enableMoveArea && (
        <pixiGraphics
          ref={moveAreaGraphicsRef}
          draw={drawMoveArea}
          eventMode="static"
          cursor="move"
          onPointerDown={handleMovePointerDown}
          onPointerOver={handleMovePointerOver}
          onPointerOut={handleMovePointerOut}
        />
      )}

      {/* 선택 테두리 */}
      <pixiGraphics ref={borderGraphicsRef} draw={drawBorder} />

      {/* Transform 핸들: 엣지(투명 히트 영역) → 코너(시각적 표시) 순서로 렌더링 (z-order) */}
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
  })
);

export default SelectionBox;
