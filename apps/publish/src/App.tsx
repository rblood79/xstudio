/**
 * Publish App
 *
 * 🚀 Phase 10 B2.3: Publish 앱 메인 컴포넌트
 *
 * Builder에서 생성된 프로젝트를 렌더링하는 앱입니다.
 *
 * @since 2025-12-11 Phase 10 B2.3
 */

import { useState, useEffect } from 'react';
import type { Element, Page } from '@xstudio/shared';
import { PageRenderer } from './renderer';
import './styles/index.css';

// ============================================
// Types
// ============================================

interface ProjectData {
  pages: Page[];
  elements: Element[];
  currentPageId: string | null;
}

// ============================================
// App Component
// ============================================

export function App() {
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [currentPage, setCurrentPage] = useState<Page | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 프로젝트 데이터 로드 (JSON 파일 또는 API)
  useEffect(() => {
    async function loadProjectData() {
      try {
        // 실제 구현에서는 API 또는 JSON 파일에서 로드
        // 지금은 데모 데이터 사용
        const demoData: ProjectData = {
          pages: [
            {
              id: 'demo-page-1',
              title: 'Home',
              project_id: 'demo-project',
              slug: '/',
            },
          ],
          elements: [
            {
              id: 'demo-element-1',
              tag: 'div',
              props: {
                style: {
                  padding: '20px',
                  backgroundColor: '#f0f0f0',
                  minHeight: '100vh',
                },
              },
              parent_id: null,
              page_id: 'demo-page-1',
              order_num: 0,
            },
            {
              id: 'demo-element-2',
              tag: 'h1',
              props: {
                children: 'Welcome to XStudio Published App',
                style: {
                  color: '#333',
                  fontSize: '2rem',
                  marginBottom: '1rem',
                },
              },
              parent_id: 'demo-element-1',
              page_id: 'demo-page-1',
              order_num: 0,
            },
            {
              id: 'demo-element-3',
              tag: 'p',
              props: {
                children: 'This is a demo page rendered by the Publish App.',
                style: {
                  color: '#666',
                  fontSize: '1rem',
                },
              },
              parent_id: 'demo-element-1',
              page_id: 'demo-page-1',
              order_num: 1,
            },
          ],
          currentPageId: 'demo-page-1',
        };

        setProjectData(demoData);

        // 현재 페이지 설정
        if (demoData.currentPageId) {
          const page = demoData.pages.find((p) => p.id === demoData.currentPageId);
          setCurrentPage(page || null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project');
      }
    }

    loadProjectData();
  }, []);

  // 에러 상태
  if (error) {
    return (
      <div className="publish-error">
        <h1>Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  // 로딩 상태
  if (!projectData || !currentPage) {
    return (
      <div className="publish-loading">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="publish-app">
      <PageRenderer
        page={currentPage}
        elements={projectData.elements}
        className="publish-page"
      />
    </div>
  );
}

export default App;
