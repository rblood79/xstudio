/**
 * useViewportCulling
 *
 * 🚀 Phase 11: Viewport Culling 최적화
 *
 * 수동 visibility 방식으로 뷰포트 외부 요소를 렌더링에서 제외합니다.
 * PixiJS v8의 Culler API 대신 간단한 수동 방식 사용.
 *
 * 성능 효과:
 * - 화면 밖 요소가 50%+ 일 때: 20-40% GPU 부하 감소
 * - 대형 캔버스에서 줌아웃 시 특히 효과적
 *
 * @since 2025-12-20 Phase 11 Viewport Culling
 * @updated 2026-01-31 스크린 좌표 기반 culling으로 전환 (pan 깜빡임 수정)
 */

import { useMemo } from 'react';
import type { Element } from '../../../../types/core/store.types';
import { getElementContainer } from '../elementRegistry';
import { WASM_FLAGS } from '../wasm-bindings/featureFlags';
import { queryVisibleElements } from '../wasm-bindings/spatialIndex';

// ============================================
// Types
// ============================================

export interface ViewportBounds {
  /** 뷰포트 좌측 경계 */
  left: number;
  /** 뷰포트 상단 경계 */
  top: number;
  /** 뷰포트 우측 경계 */
  right: number;
  /** 뷰포트 하단 경계 */
  bottom: number;
  /** 뷰포트 너비 */
  width: number;
  /** 뷰포트 높이 */
  height: number;
}

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CullingResult {
  /** 뷰포트 내에 있는 요소들 */
  visibleElements: Element[];
  /** 컬링된 요소 수 */
  culledCount: number;
  /** 전체 요소 수 */
  totalCount: number;
  /** 컬링 비율 (0-1) */
  cullingRatio: number;
}

// ============================================
// Constants
// ============================================

/**
 * 뷰포트 경계 외부로 확장할 마진 (px)
 * 스크롤/팬 시 깜빡임 방지를 위해 약간의 여유 영역 포함
 */
const VIEWPORT_MARGIN = 100;

// ============================================
// Utilities
// ============================================

/**
 * 스크린 좌표 기반 뷰포트 경계 계산
 *
 * container.getBounds()가 스크린(글로벌) 좌표를 반환하므로,
 * 뷰포트도 스크린 좌표로 계산하면 좌표 변환이 불필요합니다.
 */
export function calculateViewportBounds(
  screenWidth: number,
  screenHeight: number,
  _zoom?: number,
  _panOffset?: { x: number; y: number },
  margin: number = VIEWPORT_MARGIN
): ViewportBounds {
  return {
    left: -margin,
    top: -margin,
    right: screenWidth + margin,
    bottom: screenHeight + margin,
    width: screenWidth + 2 * margin,
    height: screenHeight + 2 * margin,
  };
}

/**
 * 요소의 경계 박스 추출 (style 기반 fallback)
 */
export function getElementBounds(
  element: Element,
  layoutPosition?: { x: number; y: number; width: number; height: number }
): ElementBounds {
  if (layoutPosition) {
    return {
      x: layoutPosition.x,
      y: layoutPosition.y,
      width: layoutPosition.width,
      height: layoutPosition.height,
    };
  }

  const style = element.props?.style as Record<string, unknown> | undefined;
  return {
    x: Number(style?.left) || 0,
    y: Number(style?.top) || 0,
    width: Number(style?.width) || 100,
    height: Number(style?.height) || 100,
  };
}

/**
 * 요소가 뷰포트 내에 있는지 확인 (AABB 충돌 검사)
 */
export function isElementInViewport(
  elementBounds: ElementBounds,
  viewport: ViewportBounds
): boolean {
  // AABB (Axis-Aligned Bounding Box) 충돌 검사
  // 두 사각형이 겹치지 않는 조건의 부정
  return !(
    elementBounds.x + elementBounds.width < viewport.left ||
    elementBounds.x > viewport.right ||
    elementBounds.y + elementBounds.height < viewport.top ||
    elementBounds.y > viewport.bottom
  );
}

// ============================================
// Hook
// ============================================

export interface UseViewportCullingOptions {
  /** 요소 목록 */
  elements: Element[];
  /** 현재 줌 레벨 */
  zoom: number;
  /** 팬 오프셋 */
  panOffset: { x: number; y: number };
  /** 화면 너비 (기본값: window.innerWidth) */
  screenWidth?: number;
  /** 화면 높이 (기본값: window.innerHeight) */
  screenHeight?: number;
  /** 컬링 활성화 여부 (기본값: true) */
  enabled?: boolean;
}

/**
 * Viewport Culling Hook
 *
 * 뷰포트 외부에 있는 요소를 필터링하여 렌더링 성능을 최적화합니다.
 *
 * 🔧 스크린 좌표 기반 culling:
 * - 뷰포트: 스크린 좌표 (화면 크기 + margin)
 * - 요소 bounds: container.getBounds() 실시간 스크린 좌표
 * - 좌표 변환 불필요 → pan/zoom 시 stale 좌표 문제 없음
 *
 * @example
 * ```tsx
 * const { visibleElements, culledCount } = useViewportCulling({
 *   elements: pageElements,
 *   zoom,
 *   panOffset,
 * });
 *
 * // visibleElements만 렌더링
 * {visibleElements.map(el => <ElementSprite key={el.id} element={el} />)}
 * ```
 */
export function useViewportCulling({
  elements,
  zoom,
  panOffset,
  screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920,
  screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080,
  enabled = true,
}: UseViewportCullingOptions): CullingResult {
  return useMemo(() => {
    // 컬링 비활성화 시 모든 요소 반환
    if (!enabled || elements.length === 0) {
      return {
        visibleElements: elements,
        culledCount: 0,
        totalCount: elements.length,
        cullingRatio: 0,
      };
    }

    // ── Phase 1: WASM SpatialIndex 경로 ──
    // layoutBoundsRegistry는 스크린 좌표(pan/zoom 포함)를 저장하므로
    // 뷰포트도 스크린 좌표로 쿼리한다 (JS 폴백과 동일한 좌표계)
    if (WASM_FLAGS.SPATIAL_INDEX) {
      const visibleIds = queryVisibleElements(
        -VIEWPORT_MARGIN,
        -VIEWPORT_MARGIN,
        screenWidth + VIEWPORT_MARGIN,
        screenHeight + VIEWPORT_MARGIN,
      );
      const visibleIdSet = new Set(visibleIds);

      // 부모-자식 overflow 처리:
      // SpatialIndex 결과에 없어도 부모가 visible이면 자식 포함
      const visibleElements = elements.filter((element) => {
        if (visibleIdSet.has(element.id)) return true;
        // 부모가 visible이면 자식도 포함 (overflow: visible 기본)
        if (element.parent_id && visibleIdSet.has(element.parent_id)) return true;
        // body 직속 자식 (parent_id 없음) → body는 항상 화면에 있음
        if (!element.parent_id) return true;
        // container 미등록 요소 → 안전하게 포함
        if (!getElementContainer(element.id)) return true;
        return false;
      });

      const culledCount = elements.length - visibleElements.length;
      return {
        visibleElements,
        culledCount,
        totalCount: elements.length,
        cullingRatio: elements.length > 0 ? culledCount / elements.length : 0,
      };
    }

    // ── JS 폴백 경로 (WASM 비활성화 시) ──
    // 뷰포트를 스크린 좌표로 계산
    // container.getBounds()가 스크린 좌표를 반환하므로 좌표 변환 불필요
    const viewport = calculateViewportBounds(screenWidth, screenHeight);

    // 실시간 container.getBounds()로 현재 스크린 좌표 비교
    // layoutBoundsRegistry는 stale 글로벌 좌표를 가질 수 있으므로 사용하지 않음
    //
    // 부모-자식 관계 고려:
    // - 자식이 부모보다 클 수 있음 (overflow: visible 기본)
    // - 요소가 culled → unmount → unregister → 다음 체크에서 재포함 → render → cull → 무한 cycle
    // - 부모가 화면에 있으면 자식은 overflow 가능성이 있으므로 cull하지 않음
    const parentVisibilityCache = new Map<string, boolean>();

    const isParentOnScreen = (parentId: string | null | undefined): boolean => {
      if (!parentId) return true; // 부모 없음(body 직접 자식) → body는 항상 화면에 있음
      const cached = parentVisibilityCache.get(parentId);
      if (cached !== undefined) return cached;

      const parentContainer = getElementContainer(parentId);
      if (!parentContainer) {
        // 부모 container 미등록 (body 등 항상 렌더링되는 요소) → 화면에 있다고 간주
        parentVisibilityCache.set(parentId, true);
        return true;
      }
      try {
        const bounds = parentContainer.getBounds();
        if (bounds.width <= 0 && bounds.height <= 0) {
          parentVisibilityCache.set(parentId, true);
          return true;
        }
        const visible = isElementInViewport(
          { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
          viewport
        );
        parentVisibilityCache.set(parentId, visible);
        return visible;
      } catch {
        parentVisibilityCache.set(parentId, true);
        return true;
      }
    };

    const visibleElements = elements.filter((element) => {
      const container = getElementContainer(element.id);
      if (!container) return true; // 컨테이너 미등록 → 렌더링 포함 (cull하지 않음)

      try {
        const bounds = container.getBounds();
        // 아직 렌더링되지 않은 요소 (bounds 0) → 포함
        if (bounds.width <= 0 && bounds.height <= 0) return true;
        // 요소 자체가 뷰포트에 있으면 포함
        if (isElementInViewport(
          { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
          viewport
        )) return true;

        // 요소는 뷰포트 밖이지만, 부모가 화면에 있으면 포함
        // (자식이 부모를 overflow하여 화면에 보일 가능성)
        if (isParentOnScreen(element.parent_id)) return true;

        return false;
      } catch {
        return true; // getBounds 실패 → 포함
      }
    });

    const culledCount = elements.length - visibleElements.length;

    return {
      visibleElements,
      culledCount,
      totalCount: elements.length,
      cullingRatio: elements.length > 0 ? culledCount / elements.length : 0,
    };
  // zoom/panOffset은 직접 사용하지 않지만 뷰 변경 시 재계산 트리거
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, zoom, panOffset, screenWidth, screenHeight, enabled]);
}

// ============================================
// Debug Utilities
// ============================================

/**
 * 컬링 상태 로깅 (개발 환경)
 */
export function logCullingStats(result: CullingResult): void {
  if (process.env.NODE_ENV !== 'development') return;

  const { visibleElements, culledCount, totalCount, cullingRatio } = result;

  console.log(
    `🎯 [ViewportCulling] visible: ${visibleElements.length}/${totalCount} ` +
      `(culled: ${culledCount}, ratio: ${(cullingRatio * 100).toFixed(1)}%)`
  );
}

export default useViewportCulling;
