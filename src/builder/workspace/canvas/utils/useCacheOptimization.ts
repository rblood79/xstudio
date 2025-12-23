/**
 * useCacheOptimization Hook
 *
 * Phase F: 정적 요소 캐싱으로 렌더링 성능 향상
 *
 * 드래그/선택되지 않은 정적 요소를 GPU 텍스처로 캐싱합니다.
 * PixiJS v8에서는 cacheAsTexture 사용 (cacheAsBitmap deprecated)
 *
 * @example
 * const containerRef = useCacheOptimization(elementId, isSelected);
 * return <pixiContainer ref={containerRef}>...</pixiContainer>;
 */

import { useEffect, useRef, useCallback } from "react";
import type { Container } from "pixi.js";
import { useStore } from "../../../stores";

/** 캐싱 지연 시간 (ms) - 요소가 정적 상태로 유지된 후 캐싱 */
const CACHE_DELAY = 150;

/**
 * 드래그 상태 확인 (canvasSync store에서)
 */
function useIsDragging(elementId: string): boolean {
  return useStore((state) => {
    // dragState가 있고 해당 요소가 드래그 중인지 확인
    const dragState = (state as unknown as { dragState?: { elementId?: string; elementIds?: string[] } }).dragState;
    if (!dragState) return false;

    // 단일 요소 드래그
    if (dragState.elementId === elementId) return true;

    // 다중 요소 드래그
    if (dragState.elementIds?.includes(elementId)) return true;

    return false;
  });
}

/**
 * 캐싱 최적화 훅
 *
 * @param elementId - 요소 ID
 * @param isSelected - 선택 상태
 * @returns Container ref
 */
export function useCacheOptimization(
  elementId: string,
  isSelected: boolean
): React.RefObject<Container | null> {
  const containerRef = useRef<Container | null>(null);
  const cacheTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging = useIsDragging(elementId);

  // 캐싱 상태 관리
  const updateCache = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // 드래그/선택 중이면 캐싱 해제
    if (isDragging || isSelected) {
      if (cacheTimerRef.current) {
        clearTimeout(cacheTimerRef.current);
        cacheTimerRef.current = null;
      }

      // PixiJS v8: cacheAsTexture(false) 또는 cacheAsBitmap = false
      if ("cacheAsTexture" in container) {
        (container as Container & { cacheAsTexture: (v: boolean) => void }).cacheAsTexture(false);
      } else if ("cacheAsBitmap" in container) {
        (container as Container & { cacheAsBitmap: boolean }).cacheAsBitmap = false;
      }
      return;
    }

    // 정적 상태: 지연 후 캐싱 활성화
    if (cacheTimerRef.current) {
      clearTimeout(cacheTimerRef.current);
    }

    cacheTimerRef.current = setTimeout(() => {
      const c = containerRef.current;
      if (!c) return;

      // PixiJS v8: cacheAsTexture(true) 또는 cacheAsBitmap = true
      if ("cacheAsTexture" in c) {
        (c as Container & { cacheAsTexture: (v: boolean) => void }).cacheAsTexture(true);
      } else if ("cacheAsBitmap" in c) {
        (c as Container & { cacheAsBitmap: boolean }).cacheAsBitmap = true;
      }
    }, CACHE_DELAY);
  }, [isDragging, isSelected]);

  useEffect(() => {
    updateCache();

    return () => {
      if (cacheTimerRef.current) {
        clearTimeout(cacheTimerRef.current);
      }
    };
  }, [updateCache]);

  return containerRef;
}

/**
 * 항상 캐싱 (정적 레이어용)
 * GridLayer, BodyLayer 등 항상 정적인 레이어에 사용
 */
export function useStaticCache(): React.RefObject<Container | null> {
  const containerRef = useRef<Container | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 즉시 캐싱 활성화
    if ("cacheAsTexture" in container) {
      (container as Container & { cacheAsTexture: (v: boolean) => void }).cacheAsTexture(true);
    } else if ("cacheAsBitmap" in container) {
      (container as Container & { cacheAsBitmap: boolean }).cacheAsBitmap = true;
    }

    return () => {
      if (container) {
        if ("cacheAsTexture" in container) {
          (container as Container & { cacheAsTexture: (v: boolean) => void }).cacheAsTexture(false);
        } else if ("cacheAsBitmap" in container) {
          (container as Container & { cacheAsBitmap: boolean }).cacheAsBitmap = false;
        }
      }
    };
  }, []);

  return containerRef;
}
