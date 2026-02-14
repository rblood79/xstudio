/**
 * Element Hover Interaction Hook — Deep Hover (Pencil 패턴)
 *
 * 캔버스 위에서 마우스 이동 시 요소 호버를 감지한다.
 * Pencil의 SelectionManager.hoveredNode 패턴:
 * - context 레벨에서 히트 테스트 → 컨테이너면 모든 리프 자손 수집
 * - 그룹 호버 시 내부 리프 노드를 모두 하이라이트 (Pencil 동일)
 *
 * - pointermove (window, RAF 스로틀)
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
  /** context 레벨 히트 대상 (변경 감지용) */
  hoveredElementId: string | null;
  /** 렌더링 대상: 리프 노드면 [자신], 컨테이너면 모든 리프 자손 */
  hoveredLeafIds: string[];
  /** 그룹/컨테이너 호버 여부 (true → 점선 렌더링) */
  isGroupHover: boolean;
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
// Leaf Descendants Collection
// ============================================

/**
 * 요소의 모든 리프 자손을 재귀 수집한다.
 * 리프 = childrenMap에 자식이 없는 노드.
 * boundsMap에 bounds가 있는 노드만 반환.
 */
function collectLeafDescendants(
  elementId: string,
  childrenMap: ReadonlyMap<string, ReadonlyArray<{ id: string }>>,
  boundsMap: ReadonlyMap<string, BoundingBox>,
): string[] {
  const children = childrenMap.get(elementId);
  if (!children || children.length === 0) {
    // 리프 노드: bounds가 있으면 반환
    return boundsMap.has(elementId) ? [elementId] : [];
  }

  const result: string[] = [];
  for (const child of children) {
    const leafs = collectLeafDescendants(child.id, childrenMap, boundsMap);
    for (const leaf of leafs) {
      result.push(leaf);
    }
  }
  return result;
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
          hoverStateRef.current.hoveredLeafIds = [];
          hoverStateRef.current.isGroupHover = false;
          overlayVersionRef.current++;
        }
        return;
      }

      // 스크린 → 씬-로컬 좌표 변환
      const { zoom, panOffset } = useCanvasSyncStore.getState();
      const sceneX = (mouseX - rect.left - panOffset.x) / zoom;
      const sceneY = (mouseY - rect.top - panOffset.y) / zoom;

      const state = useStore.getState();
      const { editingContextId, childrenMap, elementsMap } = state;

      // Context 레벨 후보 수집 (editingContext 직계 자식 또는 body 직계 자식)
      let candidates: ReadonlyArray<{ id: string }>;
      if (editingContextId) {
        candidates = childrenMap.get(editingContextId) ?? [];
      } else {
        // 루트: 모든 body의 직계 자식 수집
        const rootCandidates: Array<{ id: string }> = [];
        for (const [, el] of elementsMap) {
          if (el.tag !== 'body') continue;
          const bodyChildren = childrenMap.get(el.id);
          if (bodyChildren) {
            for (const child of bodyChildren) {
              rootCandidates.push(child);
            }
          }
        }
        candidates = rootCandidates;
      }

      // Context 레벨 AABB 히트 테스트 (역순 = z-order 높은 것 우선)
      const boundsMap = treeBoundsMapRef.current;
      let contextHitId: string | null = null;

      if (boundsMap && boundsMap.size > 0) {
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
            contextHitId = candidate.id;
            break;
          }
        }
      }

      // 상태 변경 감지 (context 레벨 히트 대상 비교)
      if (contextHitId !== hoverStateRef.current.hoveredElementId) {
        hoverStateRef.current.hoveredElementId = contextHitId;

        if (contextHitId && boundsMap) {
          // 컨테이너면 모든 리프 자손 수집, 리프면 자신만
          const leafIds = collectLeafDescendants(contextHitId, childrenMap, boundsMap);
          const isGroup = leafIds.length > 1 || (
            leafIds.length === 1 && leafIds[0] !== contextHitId
          );
          hoverStateRef.current.hoveredLeafIds = leafIds;
          hoverStateRef.current.isGroupHover = isGroup;
        } else {
          hoverStateRef.current.hoveredLeafIds = [];
          hoverStateRef.current.isGroupHover = false;
        }

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
