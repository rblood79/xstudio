/**
 * Publish App
 *
 * 🚀 Phase 10 B2.3: Publish 앱 메인 컴포넌트
 *
 * Builder에서 생성된 프로젝트를 렌더링하는 앱입니다.
 *
 * @since 2025-12-11 Phase 10 B2.3
 * @updated 2026-01-02 JSON 로드 기능 추가
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Element, Page } from '@xstudio/shared';
import {
  loadProjectFromUrl,
  loadProjectFromFile,
  type ExportedProjectData,
} from '@xstudio/shared/utils';
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

type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

// ============================================
// App Component
// ============================================

export function App() {
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [currentPage, setCurrentPage] = useState<Page | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 프로젝트 데이터 설정
  const setProject = useCallback((data: ExportedProjectData) => {
    const projectData: ProjectData = {
      pages: data.pages,
      elements: data.elements,
      currentPageId: data.currentPageId || null,
    };

    setProjectData(projectData);

    // 현재 페이지 설정
    const pageId = data.currentPageId || data.pages[0]?.id;
    if (pageId) {
      const page = data.pages.find((p) => p.id === pageId);
      setCurrentPage(page || null);
    }

    setLoadingState('loaded');
  }, []);

  // URL 파라미터에서 프로젝트 로드
  useEffect(() => {
    async function loadFromUrlParam() {
      const urlParams = new URLSearchParams(window.location.search);
      const projectUrl = urlParams.get('project');

      if (projectUrl) {
        setLoadingState('loading');
        const result = await loadProjectFromUrl(projectUrl);

        if (result.success && result.data) {
          setProject(result.data);
        } else {
          setError(result.error || 'Failed to load project');
          setLoadingState('error');
        }
        return true;
      }
      return false;
    }

    async function loadFromDefaultPath() {
      // /project.json 파일 시도
      setLoadingState('loading');
      const result = await loadProjectFromUrl('/project.json');

      if (result.success && result.data) {
        setProject(result.data);
        return true;
      }
      return false;
    }

    async function init() {
      // 1. URL 파라미터에서 로드 시도
      const loadedFromUrl = await loadFromUrlParam();
      if (loadedFromUrl) return;

      // 2. /project.json에서 로드 시도
      const loadedFromDefault = await loadFromDefaultPath();
      if (loadedFromDefault) return;

      // 3. 프로젝트 없음 - 파일 드롭 대기
      setLoadingState('idle');
    }

    init();
  }, [setProject]);

  // 파일 드롭 핸들러
  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (!file || !file.name.endsWith('.json')) {
        setError('Please drop a valid JSON file');
        return;
      }

      setLoadingState('loading');
      const result = await loadProjectFromFile(file);

      if (result.success && result.data) {
        setProject(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to load project file');
        setLoadingState('error');
      }
    },
    [setProject]
  );

  // 파일 선택 핸들러
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setLoadingState('loading');
      const result = await loadProjectFromFile(file);

      if (result.success && result.data) {
        setProject(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to load project file');
        setLoadingState('error');
      }
    },
    [setProject]
  );

  // 드래그 이벤트 핸들러
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // 에러 상태
  if (loadingState === 'error' && error) {
    return (
      <div className="publish-error">
        <h1>Error</h1>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  // 로딩 상태
  if (loadingState === 'loading') {
    return (
      <div className="publish-loading">
        <p>Loading project...</p>
      </div>
    );
  }

  // 프로젝트 없음 - 파일 드롭 UI
  if (loadingState === 'idle' || !projectData || !currentPage) {
    return (
      <div
        className={`publish-dropzone ${isDragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="dropzone-content">
          <h1>XStudio Publish</h1>
          <p>Drop a project JSON file here to preview</p>
          <p className="or">or</p>
          <button onClick={() => fileInputRef.current?.click()}>
            Select File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          {error && <p className="error-text">{error}</p>}
        </div>
      </div>
    );
  }

  // 프로젝트 렌더링
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
