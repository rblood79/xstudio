/**
 * Element Hover Interaction Hook
 *
 * 캔버스 위에서 마우스 이동 시 요소 호버를 감지한다.
 * - pointermove (window, RAF 스로틀): 요소 바운드 히트 테스트
 * - ref 기반 상태 관리 (React 리렌더 없음)
 * - overlayVersionRef.current++ 로 Skia 리렌더 트리거
 *
 * @see useWorkflowInteraction.ts — 동일 패턴 (window-level 리스너, RAF 스로틀)
 */

import { useCallback, useEffect, useRef } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import { useStore } from '../../../stores';
import { useCanvasSyncStore } from '../canvasSync';
import type { BoundingBox } from '../selection/types';

// ============================================
// Types
// ============================================

export interface ElementHoverState {
  hoveredElementId: string | null;
}

interface UseElementHoverInteractionOptions {
  /** 부모 컨테이너 DOM 요소 */
  containerEl: HTMLDivElement | null;
  /** 호버 상태 ref (60fps 갱신, Zustand 아님) */
  hoverStateRef: MutableRefObject<ElementHoverState>;
  /** overlayVersion ref (리렌더 트리거) */
  overlayVersionRef: MutableRefObject<number>;
  /** treeBoundsMap ref (Skia 트리 기반 씬-로컬 절대 바운드) */
  treeBoundsMapRef: RefObject<Map<string, BoundingBox>>;
}

// ============================================
// Hook
// ============================================

export function useElementHoverInteraction({
  containerEl,
  hoverStateRef,
  overlayVersionRef,
  treeBoundsMapRef,
}: UseElementHoverInteractionOptions): void {
  const rafRef = useRef<number | null>(null);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  const handlePointerMove = useCallback((e: PointerEvent) => {
    // 좌표 변화 없으면 스킵 (subpixel jitter 방지)
    if (e.clientX === lastMouseRef.current.x && e.clientY === lastMouseRef.current.y) return;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    // RAF 스로틀: 프레임당 1회
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (!containerEl) return;

      const rect = containerEl.getBoundingClientRect();
      const mouseX = lastMouseRef.current.x;
      const mouseY = lastMouseRef.current.y;

      // 캔버스 밖이면 호버 해제
      if (mouseX < rect.left || mouseX > rect.right || mouseY < rect.top || mouseY > rect.bottom) {
        if (hoverStateRef.current.hoveredElementId !== null) {
          hoverStateRef.current.hoveredElementId = null;
          overlayVersionRef.current++;
        }
        return;
      }

      // 스크린 → 씬-로컬 좌표 변환
      const { zoom, panOffset } = useCanvasSyncStore.getState();
      const sceneX = (mouseX - rect.left - panOffset.x) / zoom;
      const sceneY = (mouseY - rect.top - panOffset.y) / zoom;

      // editingContext의 직계 자식만 대상으로 히트 테스트
      const state = useStore.getState();
      const { editingContextId, childrenMap, elementsMap, selectedElementIdsSet } = state;

      // 후보 요소 수집
      let candidates: Array<{ id: string }>;
      if (editingContextId) {
        candidates = childrenMap.get(editingContextId) ?? [];
      } else {
        // 루트: body의 직계 자식 수집
        const allElements = Array.from(elementsMap.values());
        candidates = allElements.filter(el => {
          if (!el.parent_id) return false;
          const parent = elementsMap.get(el.parent_id);
          return parent?.tag === 'body';
        });
      }

      // treeBoundsMap에서 AABB 히트 테스트 (역순 = z-order 높은 것 우선)
      const boundsMap = treeBoundsMapRef.current;
      let hoveredId: string | null = null;

      if (boundsMap) {
        for (let i = candidates.length - 1; i >= 0; i--) {
          const candidate = candidates[i];
          const bounds = boundsMap.get(candidate.id);
          if (!bounds) continue;

          if (
            sceneX >= bounds.x &&
            sceneX <= bounds.x + bounds.width &&
            sceneY >= bounds.y &&
            sceneY <= bounds.y + bounds.height
          ) {
            hoveredId = candidate.id;
            break;
          }
        }
      }

      // 선택된 요소는 호버 제외
      if (hoveredId && selectedElementIdsSet.has(hoveredId)) {
        hoveredId = null;
      }

      // 상태 변경 시 overlayVersion++ → Skia 리렌더 트리거
      if (hoveredId !== hoverStateRef.current.hoveredElementId) {
        hoverStateRef.current.hoveredElementId = hoveredId;
        overlayVersionRef.current++;
      }
    });
  }, [containerEl, hoverStateRef, overlayVersionRef, treeBoundsMapRef]);

  useEffect(() => {
    if (!containerEl) return;

    window.addEventListener('pointermove', handlePointerMove);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [containerEl, handlePointerMove]);
}
