/**
 * 페이지 타이틀 드래그 훅
 *
 * 페이지 타이틀 영역에서 pointerdown → pointermove → pointerup으로
 * 페이지 위치를 자유롭게 변경한다.
 * 요소 드래그와 분리되며, RAF 스로틀링으로 프레임당 1회만 업데이트.
 */

import { useCallback, useRef } from 'react';
import { useStore } from '../../../stores';

interface PageDragState {
  isDragging: boolean;
  pageId: string | null;
  startPointer: { x: number; y: number } | null;
  startPagePos: { x: number; y: number } | null;
}

interface UsePageDragReturn {
  isDragging: boolean;
  startDrag: (pageId: string, pointerX: number, pointerY: number) => void;
}

export function usePageDrag(zoom: number): UsePageDragReturn {
  const stateRef = useRef<PageDragState>({
    isDragging: false,
    pageId: null,
    startPointer: null,
    startPagePos: null,
  });
  const rafRef = useRef<number | null>(null);
  // isDragging을 React state로 관리하지 않음 — 커서 변경은 CSS로 처리
  // 드래그 중 React 리렌더링 방지

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const s = stateRef.current;
    if (!s.isDragging || !s.pageId || !s.startPointer || !s.startPagePos) return;

    // RAF 스로틀: 프레임당 1회 업데이트
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const dx = (e.clientX - s.startPointer!.x) / zoom;
      const dy = (e.clientY - s.startPointer!.y) / zoom;
      useStore.getState().updatePagePosition(
        s.pageId!,
        s.startPagePos!.x + dx,
        s.startPagePos!.y + dy,
      );
    });
  }, [zoom]);

  const handlePointerUp = useCallback(() => {
    stateRef.current.isDragging = false;
    stateRef.current.pageId = null;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  }, [handlePointerMove]);

  const startDrag = useCallback((pageId: string, pointerX: number, pointerY: number) => {
    const pos = useStore.getState().pagePositions[pageId];
    if (!pos) return;

    stateRef.current = {
      isDragging: true,
      pageId,
      startPointer: { x: pointerX, y: pointerY },
      startPagePos: { x: pos.x, y: pos.y },
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [handlePointerMove, handlePointerUp]);

  return {
    isDragging: stateRef.current.isDragging,
    startDrag,
  };
}
