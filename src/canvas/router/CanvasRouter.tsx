/**
 * Canvas Router - MemoryRouter 기반 내부 라우팅
 *
 * Canvas Runtime 내에서 독립적인 라우팅을 처리합니다.
 * Builder의 BrowserRouter와 완전히 분리되어 동작합니다.
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  MemoryRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
  type NavigateFunction,
} from 'react-router-dom';
import { useRuntimeStore } from '../store';
import type { RuntimeLayout } from '../store/types';
import { generatePageUrl } from '../../utils/urlGenerator';
import type { Page } from '../../types/builder/unified.types';

// ============================================
// Router Context (navigate 함수 공유용)
// ============================================

interface RouterContextValue {
  navigate: NavigateFunction | null;
}

const RouterContext = React.createContext<RouterContextValue>({ navigate: null });

export function useCanvasNavigate() {
  const ctx = React.useContext(RouterContext);
  return ctx.navigate;
}

// Legacy alias
export const usePreviewNavigate = useCanvasNavigate;

// ============================================
// Page Renderer Component
// ============================================

interface PageRendererProps {
  pageId: string;
  renderElements: () => React.ReactNode;
}

function PageRenderer({ pageId, renderElements }: PageRendererProps) {
  const setCurrentPageId = useRuntimeStore((s) => s.setCurrentPageId);

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
  const setCurrentPath = useRuntimeStore((s) => s.setCurrentPath);

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
// Canvas Router Component
// ============================================

interface CanvasRouterProps {
  renderElements: () => React.ReactNode;
  children?: React.ReactNode;
}

export function CanvasRouter({ renderElements, children }: CanvasRouterProps) {
  const pages = useRuntimeStore((s) => s.pages);
  const layouts = useRuntimeStore((s) => s.layouts);
  const currentPath = useRuntimeStore((s) => s.currentPath);
  const [navigate, setNavigate] = useState<NavigateFunction | null>(null);

  const handleNavigateReady = React.useCallback((nav: NavigateFunction) => {
    setNavigate(() => nav);
  }, []);

  // 초기 경로 설정
  const initialEntries = [currentPath || '/'];

  // ⭐ Nested Routes & Slug System: 각 페이지의 최종 URL 계산
  const routeConfigs = useMemo(() => {
    // RuntimePage를 Page 타입으로 변환 (generatePageUrl 호환)
    const pagesAsPage: Page[] = pages.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      project_id: '', // Canvas에서는 사용하지 않음
      parent_id: p.parent_id,
      layout_id: p.layout_id,
      order_num: p.order_num,
    }));

    return pages.map((page) => {
      // Layout 찾기
      const layout = page.layout_id
        ? layouts.find((l: RuntimeLayout) => l.id === page.layout_id)
        : null;

      // 최종 URL 계산
      const finalUrl = generatePageUrl({
        page: {
          id: page.id,
          title: page.title,
          slug: page.slug,
          project_id: '',
          parent_id: page.parent_id,
          layout_id: page.layout_id,
          order_num: page.order_num,
        },
        layout: layout
          ? { id: layout.id, name: layout.name, project_id: '', slug: layout.slug || undefined }
          : null,
        allPages: pagesAsPage,
      });

      return {
        pageId: page.id,
        path: finalUrl,
        layoutId: page.layout_id,
      };
    });
  }, [pages, layouts]);

  return (
    <RouterContext.Provider value={{ navigate }}>
      <MemoryRouter initialEntries={initialEntries}>
        <RouterNavigator onNavigateReady={handleNavigateReady} />
        <Routes>
          {/* ⭐ Nested Routes: 동적으로 계산된 URL로 페이지 라우트 생성 */}
          {routeConfigs.map(({ pageId, path }) => (
            <Route
              key={pageId}
              path={path}
              element={
                <PageRenderer pageId={pageId} renderElements={renderElements} />
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

// Legacy alias
export const PreviewRouter = CanvasRouter;
export type PreviewRouterProps = CanvasRouterProps;

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
 * Canvas 내부에서 네비게이션 수행
 * EventEngine에서 호출됩니다.
 */
export function navigateInCanvas(path: string, options?: { replace?: boolean }) {
  if (globalNavigate) {
    globalNavigate(path, options);
    return true;
  }

  console.warn('[CanvasRouter] Navigate function not available yet');
  return false;
}

// Legacy alias
export const navigateInPreview = navigateInCanvas;
