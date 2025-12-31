/**
 * Page Loader Hook
 *
 * 🚀 Phase 5: 페이지 Lazy Loading을 위한 훅
 *
 * 페이지 전환 시 자동으로 요소를 로드하고 로딩 상태를 제공합니다.
 *
 * @since 2025-12-10 Phase 5 Lazy Loading + LRU Cache
 */

import { useCallback, useEffect, useRef } from 'react';
import { useStore } from '../stores';

export interface UsePageLoaderReturn {
  /** 현재 페이지가 로딩 중인지 */
  isLoading: boolean;
  /** 현재 페이지가 로드 완료되었는지 */
  isLoaded: boolean;
  /** 수동으로 페이지 로드 */
  loadPage: (pageId: string) => Promise<void>;
  /** 페이지 프리로드 (백그라운드) */
  preloadPage: (pageId: string) => void;
  /** LRU 캐시 통계 */
  stats: {
    loadedPages: number;
    maxPages: number;
    hitRate: number;
  };
}

/**
 * 페이지 Lazy Loading 훅
 *
 * @param autoLoad - 현재 페이지 자동 로드 여부 (기본: true)
 *
 * @example
 * ```tsx
 * function Canvas() {
 *   const { isLoading, isLoaded, stats } = usePageLoader();
 *
 *   if (isLoading) {
 *     return <PageLoadingSpinner />;
 *   }
 *
 *   return <CanvasContent />;
 * }
 * ```
 */
export function usePageLoader(autoLoad = true): UsePageLoaderReturn {
  const currentPageId = useStore((state) => state.currentPageId);
  const loadedPages = useStore((state) => state.loadedPages);
  const loadingPages = useStore((state) => state.loadingPages);
  const lazyLoadingEnabled = useStore((state) => state.lazyLoadingEnabled);
  const lazyLoadPageElements = useStore((state) => state.lazyLoadPageElements);
  const preloadPageAction = useStore((state) => state.preloadPage);
  const getLRUStats = useStore((state) => state.getLRUStats);

  const isLoadingRef = useRef(false);

  // 현재 페이지 로딩 상태
  const isLoading = currentPageId ? loadingPages.has(currentPageId) : false;
  const isLoaded = currentPageId ? loadedPages.has(currentPageId) : false;

  /**
   * 페이지 로드
   */
  const loadPage = useCallback(
    async (pageId: string): Promise<void> => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;

      try {
        await lazyLoadPageElements(pageId);
      } finally {
        isLoadingRef.current = false;
      }
    },
    [lazyLoadPageElements]
  );

  /**
   * 페이지 프리로드
   */
  const preloadPage = useCallback(
    (pageId: string): void => {
      preloadPageAction(pageId);
    },
    [preloadPageAction]
  );

  /**
   * 현재 페이지 자동 로드
   */
  useEffect(() => {
    if (!autoLoad) return;
    if (!currentPageId) return;
    if (!lazyLoadingEnabled) return;
    if (isLoaded || isLoading) return;

    loadPage(currentPageId);
  }, [currentPageId, autoLoad, lazyLoadingEnabled, isLoaded, isLoading, loadPage]);

  /**
   * LRU 통계
   */
  const stats = {
    loadedPages: getLRUStats().size,
    maxPages: getLRUStats().maxPages,
    hitRate: getLRUStats().hitRate,
  };

  return {
    isLoading,
    isLoaded,
    loadPage,
    preloadPage,
    stats,
  };
}

/**
 * 인접 페이지 프리로드 훅
 *
 * 현재 페이지의 인접 페이지를 백그라운드에서 프리로드합니다.
 *
 * @example
 * ```tsx
 * function Sidebar() {
 *   useAdjacentPagePreload();
 *   // ...
 * }
 * ```
 */
export function useAdjacentPagePreload(): void {
  const currentPageId = useStore((state) => state.currentPageId);
  const pages = useStore((state) => state.pages);
  const preloadPage = useStore((state) => state.preloadPage);
  const lazyLoadingEnabled = useStore((state) => state.lazyLoadingEnabled);

  useEffect(() => {
    if (!lazyLoadingEnabled) return;
    if (!currentPageId) return;
    if (pages.length === 0) return;

    // 현재 페이지 인덱스 찾기
    const currentIndex = pages.findIndex((p) => p.id === currentPageId);
    if (currentIndex === -1) return;

    // 인접 페이지 프리로드 (이전, 다음)
    const adjacentIndices = [currentIndex - 1, currentIndex + 1];

    adjacentIndices.forEach((index) => {
      if (index >= 0 && index < pages.length) {
        const pageId = pages[index].id;
        // requestIdleCallback으로 백그라운드 로드
        preloadPage(pageId);
      }
    });
  }, [currentPageId, pages, preloadPage, lazyLoadingEnabled]);
}

/**
 * 페이지 로딩 상태 표시 컴포넌트용 훅
 *
 * @example
 * ```tsx
 * function PageLoadingIndicator() {
 *   const { showIndicator, progress } = usePageLoadingIndicator();
 *
 *   if (!showIndicator) return null;
 *
 *   return <ProgressBar value={progress} />;
 * }
 * ```
 */
export function usePageLoadingIndicator(): {
  showIndicator: boolean;
  loadingPageId: string | null;
} {
  const loadingPages = useStore((state) => state.loadingPages);
  const currentPageId = useStore((state) => state.currentPageId);

  // 현재 페이지가 로딩 중일 때만 표시
  const showIndicator = currentPageId ? loadingPages.has(currentPageId) : false;
  const loadingPageId = showIndicator ? currentPageId : null;

  return {
    showIndicator,
    loadingPageId,
  };
}
