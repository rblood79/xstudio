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
  // isDragging은 내부에서만 사용 — 커서 변경은 CSS로 처리

  // 이벤트 핸들러 cleanup 함수 ref (self-reference 회피)
  const cleanupRef = useRef<(() => void) | null>(null);

  const startDrag = useCallback((pageId: string, pointerX: number, pointerY: number) => {
    const pos = useStore.getState().pagePositions[pageId];
    if (!pos) return;

    stateRef.current = {
      isDragging: true,
      pageId,
      startPointer: { x: pointerX, y: pointerY },
      startPagePos: { x: pos.x, y: pos.y },
    };

    const onPointerMove = (e: PointerEvent) => {
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
    };

    const onPointerUp = () => {
      stateRef.current.isDragging = false;
      stateRef.current.pageId = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      cleanupRef.current = null;
    };

    // 이전 리스너 정리
    cleanupRef.current?.();

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    cleanupRef.current = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [zoom]);

  return {
    startDrag,
  };
}
