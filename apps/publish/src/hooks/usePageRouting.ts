/**
 * Page Routing Hook
 *
 * URL 해시 기반 페이지 라우팅
 *
 * @since 2026-01-02 Phase 2
 */

import { useState, useEffect, useCallback } from 'react';
import type { Page } from '@xstudio/shared';

interface UsePageRoutingOptions {
  pages: Page[];
  defaultPageId?: string | null;
}

interface UsePageRoutingReturn {
  currentPageId: string | null;
  currentPage: Page | null;
  setCurrentPageId: (pageId: string) => void;
  goToPage: (pageId: string) => void;
}

/**
 * URL 해시에서 페이지 ID 추출
 */
function getPageIdFromHash(): string | null {
  const hash = window.location.hash;
  if (hash.startsWith('#page-')) {
    return hash.slice(6); // '#page-' 제거
  }
  return null;
}

/**
 * 페이지 라우팅 훅
 */
export function usePageRouting({ pages, defaultPageId }: UsePageRoutingOptions): UsePageRoutingReturn {
  const [currentPageId, setCurrentPageIdState] = useState<string | null>(() => {
    // 초기값: URL 해시 > defaultPageId > 첫 번째 페이지
    const hashPageId = getPageIdFromHash();
    if (hashPageId && pages.some((p) => p.id === hashPageId)) {
      return hashPageId;
    }
    if (defaultPageId && pages.some((p) => p.id === defaultPageId)) {
      return defaultPageId;
    }
    return pages[0]?.id || null;
  });

  // 현재 페이지 객체
  const currentPage = pages.find((p) => p.id === currentPageId) || null;

  // 페이지 ID 변경 시 URL 해시 업데이트
  const setCurrentPageId = useCallback((pageId: string) => {
    if (pages.some((p) => p.id === pageId)) {
      setCurrentPageIdState(pageId);
      window.location.hash = `page-${pageId}`;
    }
  }, [pages]);

  // 페이지 이동 (동일 함수지만 의미상 구분)
  const goToPage = setCurrentPageId;

  // URL 해시 변경 감지
  useEffect(() => {
    function handleHashChange() {
      const pageId = getPageIdFromHash();
      if (pageId && pages.some((p) => p.id === pageId)) {
        setCurrentPageIdState(pageId);
      }
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [pages]);

  // pages가 변경되면 현재 페이지 유효성 확인
  useEffect(() => {
    // 페이지가 있는데 currentPageId가 없으면 첫 페이지로 설정
    if (pages.length > 0 && !currentPageId) {
      const hashPageId = getPageIdFromHash();
      const targetPageId = hashPageId && pages.some((p) => p.id === hashPageId)
        ? hashPageId
        : defaultPageId && pages.some((p) => p.id === defaultPageId)
          ? defaultPageId
          : pages[0]?.id || null;

      if (targetPageId) {
        setCurrentPageIdState(targetPageId);
        window.location.hash = `page-${targetPageId}`;
      }
    }
    // currentPageId가 있는데 해당 페이지가 없으면 첫 페이지로
    else if (currentPageId && !pages.some((p) => p.id === currentPageId)) {
      const firstPageId = pages[0]?.id || null;
      setCurrentPageIdState(firstPageId);
      if (firstPageId) {
        window.location.hash = `page-${firstPageId}`;
      }
    }
  }, [pages, currentPageId, defaultPageId]);

  return {
    currentPageId,
    currentPage,
    setCurrentPageId,
    goToPage,
  };
}

export default usePageRouting;
