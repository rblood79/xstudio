/**
 * Preview Router - MemoryRouter 기반 내부 라우팅
 *
 * Preview Runtime 내에서 독립적인 라우팅을 처리합니다.
 * Builder의 BrowserRouter와 완전히 분리되어 동작합니다.
 */

import React, { useEffect, useRef } from 'react';
import {
  MemoryRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
  type NavigateFunction,
} from 'react-router-dom';
import { usePreviewStore } from '../store';
import type { PreviewPage } from '../store/types';

// ============================================
// Router Context (navigate 함수 공유용)
// ============================================

interface RouterContextValue {
  navigate: NavigateFunction | null;
}

const RouterContext = React.createContext<RouterContextValue>({ navigate: null });

export function usePreviewNavigate() {
  const ctx = React.useContext(RouterContext);
  return ctx.navigate;
}

// ============================================
// Page Renderer Component
// ============================================

interface PageRendererProps {
  pageId: string;
  renderElements: () => React.ReactNode;
}

function PageRenderer({ pageId, renderElements }: PageRendererProps) {
  const setCurrentPageId = usePreviewStore((s) => s.setCurrentPageId);

  useEffect(() => {
    setCurrentPageId(pageId);
  }, [pageId, setCurrentPageId]);

  return <>{renderElements()}</>;
}

// ============================================
// Not Found Component
// ============================================

function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>404</h1>
      <p style={{ color: '#666' }}>Page not found</p>
    </div>
  );
}

// ============================================
// Router Navigator (navigate 함수 추출용)
// ============================================

interface RouterNavigatorProps {
  onNavigateReady: (navigate: NavigateFunction) => void;
}

function RouterNavigator({ onNavigateReady }: RouterNavigatorProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const setCurrentPath = usePreviewStore((s) => s.setCurrentPath);

  useEffect(() => {
    onNavigateReady(navigate);
  }, [navigate, onNavigateReady]);

  // 경로 변경 시 스토어 업데이트
  useEffect(() => {
    setCurrentPath(location.pathname);
  }, [location.pathname, setCurrentPath]);

  return null;
}

// ============================================
// Preview Router Component
// ============================================

interface PreviewRouterProps {
  renderElements: () => React.ReactNode;
  children?: React.ReactNode;
}

export function PreviewRouter({ renderElements, children }: PreviewRouterProps) {
  const pages = usePreviewStore((s) => s.pages);
  const currentPath = usePreviewStore((s) => s.currentPath);
  const navigateRef = useRef<NavigateFunction | null>(null);

  const handleNavigateReady = React.useCallback((nav: NavigateFunction) => {
    navigateRef.current = nav;
  }, []);

  // 초기 경로 설정
  const initialEntries = [currentPath || '/'];

  return (
    <RouterContext.Provider value={{ navigate: navigateRef.current }}>
      <MemoryRouter initialEntries={initialEntries}>
        <RouterNavigator onNavigateReady={handleNavigateReady} />
        <Routes>
          {/* 동적으로 페이지 라우트 생성 */}
          {pages.map((page: PreviewPage) => (
            <Route
              key={page.id}
              path={page.slug || '/'}
              element={
                <PageRenderer pageId={page.id} renderElements={renderElements} />
              }
            />
          ))}

          {/* 페이지가 없을 때 기본 라우트 */}
          {pages.length === 0 && (
            <Route
              path="/"
              element={<>{renderElements()}</>}
            />
          )}

          {/* 404 페이지 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        {children}
      </MemoryRouter>
    </RouterContext.Provider>
  );
}

// ============================================
// Navigation Helper (EventEngine에서 사용)
// ============================================

let globalNavigate: NavigateFunction | null = null;

export function setGlobalNavigate(navigate: NavigateFunction) {
  globalNavigate = navigate;
}

export function getGlobalNavigate(): NavigateFunction | null {
  return globalNavigate;
}

/**
 * Preview 내부에서 네비게이션 수행
 * EventEngine에서 호출됩니다.
 */
export function navigateInPreview(path: string, options?: { replace?: boolean }) {
  if (globalNavigate) {
    globalNavigate(path, options);
    return true;
  }

  console.warn('[PreviewRouter] Navigate function not available yet');
  return false;
}
